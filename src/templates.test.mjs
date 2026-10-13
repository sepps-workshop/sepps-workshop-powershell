import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import tokens from "@sepps-workshop/design-system";
import { psreadlineEntries, psstyleEntries, psValue } from "./shell-roles.mjs";
import {
  buildTheme,
  buildModule,
  buildManifest,
  statements,
  THEME_ID,
  MODULE_NAME,
  FUNCTION_NAME,
  MODULE_GUID,
} from "./templates.mjs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url));
const { version } = JSON.parse(read("package.json"));
const theme = buildTheme(tokens);
const module = buildModule(tokens);
const manifest = buildManifest(version);
// The tables are aligned; compare without the padding.
const flat = (text) => text.replace(/ +=/g, " =");
const psr = psreadlineEntries(tokens);
const pss = psstyleEntries(tokens);

test("every PSReadLine key and $PSStyle path is set to its token value", () => {
  for (const text of [theme, module]) {
    for (const entry of psr)
      assert.ok(
        flat(text).includes(`${entry.key} = ${psValue(entry)}\n`),
        entry.key,
      );
    for (const entry of pss)
      assert.ok(
        text.includes(
          `try { $PSStyle.${entry.key} = ${psValue(entry)} } catch { }`,
        ),
        entry.key,
      );
  }
});

test("nothing else is set", () => {
  for (const text of [theme, module]) {
    const keys = [...text.matchAll(/^ +(\w+) += \$PSStyle\./gm)].map(
      (m) => m[1],
    );
    assert.deepEqual(
      keys,
      psr
        .filter((e) => !e.prediction)
        .concat(psr.filter((e) => e.prediction))
        .map((e) => e.key),
    );
    const paths = [...text.matchAll(/\$PSStyle\.(\w+\.\w+) = /g)].map(
      (m) => m[1],
    );
    assert.deepEqual(
      paths,
      pss.map((e) => e.key),
    );
    assert.equal(text.match(/Set-PSReadLineOption/g).length, 2);
  }
});

test("the prediction keys are in the guarded call and nowhere else", () => {
  const lines = statements(tokens);
  const from = lines.findIndex((l) => l.trim() === "try {");
  const to = lines.findIndex((l) => l.trim() === "} catch { }");
  assert.ok(from > 0 && to > from, "a multi-line try block exists");
  const guarded = lines.slice(from, to).join("\n");
  const rest = [...lines.slice(0, from), ...lines.slice(to)].join("\n");
  for (const entry of psr.filter((e) => e.prediction)) {
    assert.match(guarded, new RegExp(`\\b${entry.key} +=`));
    assert.doesNotMatch(rest, new RegExp(`\\b${entry.key} +=`));
  }
  for (const entry of psr.filter((e) => !e.prediction))
    assert.doesNotMatch(guarded, new RegExp(`\\b${entry.key} +=`));
});

test("the guard for old PowerShell comes before anything is set", () => {
  const lines = statements(tokens);
  assert.equal(lines[0], "if (-not $PSStyle) {");
  assert.match(lines[1], /Write-Warning '.*PowerShell 7\.2.*'$/);
  assert.equal(lines[2].trim(), "return");
});

test("the script and the module share their statements", () => {
  for (const line of statements(tokens).filter(Boolean)) {
    assert.ok(theme.includes(`\n${line}\n`), `script: ${line}`);
    assert.ok(module.includes(`\n    ${line}\n`), `module: ${line}`);
  }
});

test("the generated files are ASCII only", () => {
  // Windows PowerShell 5.1 reads a script without a byte order mark in
  // the ANSI code page, and it is the host that prints the warning.
  for (const [name, text] of Object.entries({ theme, module, manifest })) {
    const at = [...text].findIndex((char) => char.charCodeAt(0) > 0x7e);
    assert.equal(at, -1, `${name}: non-ASCII character at ${at}`);
    assert.ok(text.endsWith("\n") && !text.endsWith("\n\n"), name);
    assert.ok(!text.includes("\r"), name);
  }
});

test("the module exports one function and the manifest names it", () => {
  assert.match(module, new RegExp(`^function ${FUNCTION_NAME} \\{$`, "m"));
  assert.ok(
    module.includes(`Export-ModuleMember -Function ${FUNCTION_NAME}\n`),
  );
  assert.ok(manifest.includes(`RootModule        = '${MODULE_NAME}.psm1'`));
  assert.ok(manifest.includes(`ModuleVersion     = '${version}'`));
  assert.ok(manifest.includes(`GUID              = '${MODULE_GUID}'`));
  assert.equal(MODULE_GUID, "24a11770-ee2f-4732-9eb5-8f6b14a6e157");
  assert.ok(manifest.includes(`PowerShellVersion = '7.2'`));
  assert.ok(manifest.includes(`FunctionsToExport = @('${FUNCTION_NAME}')`));
});

test("the sources contain no colour value", () => {
  for (const file of [
    "src/shell-roles.mjs",
    "src/templates.mjs",
    "build.mjs",
  ]) {
    assert.doesNotMatch(
      read(file).toString("utf8"),
      /#[0-9a-f]{3,8}\b|\balphaOver\b/i,
      `${file} must take every colour from the tokens`,
    );
  }
});

test("the committed files are what the build produces", () => {
  const stale = "is stale: run `npm run build`";
  assert.equal(
    read(`themes/${THEME_ID}.ps1`).toString("utf8"),
    theme,
    `themes/ ${stale}`,
  );
  assert.equal(
    read(`${MODULE_NAME}/${MODULE_NAME}.psm1`).toString("utf8"),
    module,
    `the module ${stale}`,
  );
  assert.equal(
    read(`${MODULE_NAME}/${MODULE_NAME}.psd1`).toString("utf8"),
    manifest,
    `the manifest ${stale}`,
  );
  for (const image of ["sepps-workshop-header.jpg", "sepp-recruiting.png"]) {
    const source = readFileSync(
      fileURLToPath(
        import.meta.resolve(`@sepps-workshop/design-system/assets/${image}`),
      ),
    );
    assert.ok(read(`images/${image}`).equals(source), `${image} is stale`);
  }
});
