// Applies the built theme in a real PowerShell and reads the colours back.
// -NoProfile keeps the user's own profile and theme out of it. On WSL the
// Windows executables are reached through interop.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import tokens from "@sepps-workshop/design-system";
import {
  psreadlineEntries,
  psstyleEntries,
  rgbTriple,
} from "./shell-roles.mjs";
import { THEME_ID, MODULE_NAME, FUNCTION_NAME } from "./templates.mjs";

const run = (command, args) => spawnSync(command, args, { encoding: "utf8" });
const works = (exe) =>
  run(exe, ["-NoProfile", "-Command", "exit 0"]).status === 0;
const pwsh = ["pwsh", "pwsh.exe"].find(works);
const legacy = ["powershell.exe"].find(works);
const needsPwsh =
  !pwsh && "needs PowerShell 7 (pwsh, or pwsh.exe through WSL interop)";
const needsLegacy =
  !legacy && "needs Windows PowerShell 5.1 (Windows, or WSL with interop)";

// A path the given executable understands, inside single quotes.
function quoted(exe, relative) {
  const path = fileURLToPath(new URL(`../${relative}`, import.meta.url));
  const interop = exe.endsWith(".exe") && process.platform !== "win32";
  const native = interop ? run("wslpath", ["-w", path]).stdout.trim() : path;
  return `'${native.replaceAll("'", "''")}'`;
}

// -EncodedCommand takes the script as UTF-16LE in Base64: no quoting to get wrong.
function ps(exe, script) {
  return run(exe, [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-EncodedCommand",
    Buffer.from(
      `$ErrorActionPreference = 'Stop'\n$ProgressPreference = 'SilentlyContinue'\n${script}`,
      "utf16le",
    ).toString("base64"),
  ]);
}

const CODE = { italic: 3, bold: 1, underline: 4 };
// The escape sequence PowerShell builds from an entry.
const ansi = ({ fg, bg, style }) =>
  [
    ...style.map((name) => `\x1b[${CODE[name]}m`),
    fg && `\x1b[38;2;${rgbTriple(fg).join(";")}m`,
    bg && `\x1b[48;2;${rgbTriple(bg).join(";")}m`,
  ]
    .filter(Boolean)
    .join("");

const psr = psreadlineEntries(tokens);
const pss = psstyleEntries(tokens);
const list = (names) => names.map((name) => `'${name}'`).join(", ");
// Keys the theme must leave alone: no role in the foundation.
const UNSET = "ListPredictionTooltip";

// Prints every colour the theme sets, and one it does not, as JSON.
const DUMP = `
$o = Get-PSReadLineOption
$r = [ordered]@{}
foreach ($k in @(${list([...psr.map((e) => e.key), UNSET])})) {
    $p = if ($k -eq 'Default') { 'DefaultTokenColor' } else { $k + 'Color' }
    $r["psreadline.$k"] = $o.$p
}
foreach ($k in @(${list(pss.map((e) => e.key))})) {
    $a, $b = $k.Split('.')
    $r["psstyle.$k"] = $PSStyle.$a.$b
}
$r | ConvertTo-Json -Compress`;

function dump(apply) {
  const result = ps(pwsh, `Import-Module PSReadLine\n${apply}\n${DUMP}`);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return JSON.parse(result.stdout);
}

function assertThemed(actual, untouched) {
  for (const entry of psr)
    assert.equal(actual[`psreadline.${entry.key}`], ansi(entry), entry.key);
  for (const entry of pss)
    assert.equal(actual[`psstyle.${entry.key}`], ansi(entry), entry.key);
  assert.equal(actual[`psreadline.${UNSET}`], untouched[`psreadline.${UNSET}`]);
}

test(
  "the script sets every colour, also when it runs twice",
  { skip: needsPwsh },
  () => {
    const script = quoted(pwsh, `themes/${THEME_ID}.ps1`);
    assertThemed(dump(`. ${script}\n. ${script}`), dump(""));
  },
);

test("the module sets the same colours", { skip: needsPwsh }, () => {
  const manifest = quoted(pwsh, `${MODULE_NAME}/${MODULE_NAME}.psd1`);
  assertThemed(
    dump(`Import-Module ${manifest}\n${FUNCTION_NAME}\n${FUNCTION_NAME}`),
    dump(""),
  );
});

test(
  "the script leaves no function or variable behind",
  { skip: needsPwsh },
  () => {
    const script = quoted(pwsh, `themes/${THEME_ID}.ps1`);
    const result = ps(
      pwsh,
      `Import-Module PSReadLine
$before = @(Get-ChildItem function:, variable: | ForEach-Object Name)
. ${script}
$after = @(Get-ChildItem function:, variable: | ForEach-Object Name)
(Compare-Object $before $after | ForEach-Object InputObject) -join ','`,
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(result.stdout.trim(), "before");
  },
);

test(
  "PowerShell accepts the manifest and sees one function",
  { skip: needsPwsh },
  () => {
    const manifest = quoted(pwsh, `${MODULE_NAME}/${MODULE_NAME}.psd1`);
    const result = ps(
      pwsh,
      `$m = Test-ModuleManifest -Path ${manifest}\n"$($m.Name) $($m.ExportedFunctions.Keys -join ',')"`,
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(result.stdout.trim(), `${MODULE_NAME} ${FUNCTION_NAME}`);
  },
);

test("PSReadLine throws on a key it does not know", { skip: needsPwsh }, () => {
  // It stops there and leaves the rest of the table unset: the reason the
  // prediction keys are set in a call of their own.
  const result = ps(
    pwsh,
    `Import-Module PSReadLine
try { Set-PSReadLineOption -Colors @{ NoSuchKey = $PSStyle.Bold }; 'accepted' } catch { 'thrown' }`,
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(result.stdout.trim(), "thrown");
});

test(
  "an unknown $PSStyle property is skipped, not fatal",
  { skip: needsPwsh },
  () => {
    const result = ps(
      pwsh,
      "try { $PSStyle.Formatting.NoSuchProperty = $PSStyle.Bold } catch { }\n'survived'",
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(result.stdout.trim(), "survived");
  },
);

test(
  "Windows PowerShell 5.1 gets a warning and nothing else",
  { skip: needsLegacy },
  () => {
    const script = quoted(legacy, `themes/${THEME_ID}.ps1`);
    const result = ps(legacy, `. ${script}\n'after'`);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(
      result.stdout + result.stderr,
      /Sepp's Workshop needs PowerShell 7\.2/,
    );
    assert.match(result.stdout, /after/);
  },
);
