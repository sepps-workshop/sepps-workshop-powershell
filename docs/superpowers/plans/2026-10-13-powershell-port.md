# Sepp’s Workshop PowerShell port: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship one generated PowerShell theme (PSReadLine and `$PSStyle`) as a standalone script and as a Gallery-ready module, after giving the design system the roles PowerShell's output needs.

**Architecture:** Two repositories. The foundation (`sepps-workshop-design-system`) lets a shell role list `$PSStyle` paths, adds nine output roles and a text role for a PSReadLine selection. The port (`sepps-workshop-powershell`) has one mapping module that turns `tokens.shell_roles` into two entry lists, and two thin templates (script, module) that render the same statements from them.

**Tech stack:** Node.js 20+ (ESM, `node:test`), PowerShell 7.2+ (tested with 7.6.6 and PSReadLine 2.4.5 through `pwsh.exe` and WSL interop), Windows PowerShell 5.1 for the guard test, Prettier. No runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-13-powershell-port-design.md`

Paths: `FOUNDATION` is `/home/vanlaarmi12/Git-Repos/sepps-workshop/sepps-workshop-design-system`, `PORT` is `/home/vanlaarmi12/Git-Repos/sepps-workshop/sepps-workshop-powershell`, `FISH` is `/home/vanlaarmi12/Git-Repos/sepps-workshop/sepps-workshop-fish`, `WT` is `/home/vanlaarmi12/Git-Repos/sepps-workshop/sepps-workshop-windows-terminal`, `VIVID` is `/home/vanlaarmi12/Git-Repos/vivid-life-theme/vivid-life-powershell`.

## Global constraints

- No hex value and no alpha arithmetic in the port's `src/` or `build.mjs`. A missing value is fixed in the foundation.
- One theme, no variants. Script `themes/sepps-workshop.ps1`, module `SeppsWorkshopPowerShell`, one exported function `Set-SeppsWorkshopTheme` without parameters.
- The module GUID is `24a11770-ee2f-4732-9eb5-8f6b14a6e157`, permanent.
- Generated `.ps1`, `.psm1` and `.psd1` are ASCII only; there the product is written "Sepp's Workshop" with a straight apostrophe.
- A PSReadLine key or `$PSStyle` path with no role in the foundation is not written.
- `resolveTarget` throws on an unknown name; add no fallback.
- PowerShell 7.2 is the floor. `ListPrediction` and `ListPredictionSelected` go in a second, guarded `Set-PSReadLineOption` call.
- Docs are English, no emoji, paragraphs on one line (no hard wraps). The product is written "Sepp’s Workshop" with a typographic apostrophe, the company "sepp.med gmbh".
- Commits use Conventional Commits with a gitmoji and end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Check `git status --short` before each commit.
- Nothing is pushed, tagged or published. The foundation release and the Gallery are the user's steps.
- In the foundation, never hand-edit `tokens.json`, `dist/tokens.js`, `colors.css`, `preview/*.html` or the README tables between `<!-- tokens:… -->` markers; run `npm run build`.
- Deviations from the spec: the foundation's `CHANGELOG.md` is not edited here, because its `/release` skill writes the entry from the commits. The shell preview is not extended. Hex parsing lives in `src/shell-roles.mjs`, not in a file of its own.

## Review focus

1. A user on PSReadLine 2.1.0 (bundled with PowerShell 7.2): `Set-PSReadLineOption` throws at the first key it does not know and leaves the rest of the table unset (found in Task 4: it is not atomic, the keys before the unknown one are applied). Task 3 tests that the prediction keys are only in the guarded call; Task 4 proves in a real `pwsh` that an unknown key throws, so the split is needed.
2. A user who dot-sources the script from Windows PowerShell 5.1: it must warn and change nothing, and the warning must be readable. Task 3 tests ASCII, Task 4 runs the script in `powershell.exe`.
3. A user whose `$PROFILE` runs the theme twice, or script and module both: the result must be the same. Task 4 applies the theme twice before reading back.
4. A future foundation role that gives one key two foregrounds: the port must fail the build, not pick one. Task 2 tests the error.
5. A clone made with Git for Windows: CRLF would break the stale-build test and nothing else. Task 3 adds `.gitattributes`.

---

## Task 1: Foundation: `$PSStyle` paths and the selection text role

**Files:**

- Modify: `FOUNDATION/tokens.json5` (`shell_roles`, from line 414)
- Modify: `FOUNDATION/tools/build-tokens.mjs:332-334` (`NOT_A_TARGET`, `ROLE_KEYS`)
- Modify: `FOUNDATION/tools/build-readme.mjs:231-241` (shell table)
- Modify: `FOUNDATION/README.md` (prose in "Shell and prompt roles" and "For ports", ports table)
- Modify: `FOUNDATION/handoff/SKILL.md` (shell row)
- Test: `FOUNDATION/tools/gates.test.mjs`

**Interfaces:**

- Produces: `tokens.shell_roles[name].psstyle`, an array of property paths below `$PSStyle` such as `"Formatting.Error"`. New roles `error_accent`, `warning`, `verbose`, `debug`, `format_accent`, `table_header`, `directory`, `symlink`, `executable`, `selection_text`. `Selection` is now listed by two roles: `selection` (overlay) and `selection_text` (`fg`).

- [ ] **Step 1: Write the failing tests.** Append to `tools/gates.test.mjs`:

```js
test("shell roles list the $PSStyle paths PowerShell's output needs", () => {
  const t = resolveTokens(parseTokens(SRC));
  const listed = Object.values(t.shell_roles).flatMap((r) => r.psstyle ?? []);
  assert.deepEqual(listed.sort(), [
    "FileInfo.Directory",
    "FileInfo.Executable",
    "FileInfo.SymbolicLink",
    "Formatting.CustomTableHeaderLabel",
    "Formatting.Debug",
    "Formatting.Error",
    "Formatting.ErrorAccent",
    "Formatting.FormatAccent",
    "Formatting.TableHeader",
    "Formatting.Verbose",
    "Formatting.Warning",
  ]);
});

test("text a shell role gives PowerShell is readable on the terminal", () => {
  const t = resolveTokens(parseTokens(SRC));
  for (const [name, role] of Object.entries(t.shell_roles)) {
    if (!role.psstyle && !role.psreadline) continue;
    if (!role.color || role.color.startsWith("overlay.")) continue;
    assert.ok(
      contrast(resolveTarget(t, role.color), t.surface.bg_terminal) >= 4.5,
      `shell_roles.${name} on the terminal background`,
    );
  }
});

test("gate 2: the text of a PSReadLine selection is gated on the selection overlay", () => {
  const t = resolveTokens(parseTokens(SRC));
  assert.deepEqual(t.shell_roles.selection_text.psreadline, ["Selection"]);
  assertFails((r) => {
    r.shell_roles.selection_text.color = "fg_disabled";
  }, /shell_roles\.selection_text .* on overlay\.selection over surface\.bg_terminal/);
});
```

- [ ] **Step 2: Run them and see them fail.**

Run: `cd FOUNDATION && node --test tools/gates.test.mjs`
Expected: the first test fails on the empty list, the third with `Cannot read properties of undefined (reading 'psreadline')`.

- [ ] **Step 3: Allow the key.** In `tools/build-tokens.mjs` replace the two sets:

```js
/** Keys inside role maps that hold metadata, not colour targets. */
const NOT_A_TARGET = new Set(["style", "fish", "psreadline", "psstyle"]);
/** The only keys a role object may have, and the font styles it may name. */
const ROLE_KEYS = new Set(["color", "style", "fish", "psreadline", "psstyle"]);
```

- [ ] **Step 4: Add the roles.** In `tokens.json5`, give `error` the list:

```js
    error: {
      color: "semantic.danger",
      fish: ["fish_color_error", "fish_color_status"],
      psreadline: ["Error"],
      psstyle: ["Formatting.Error"],
    },
```

Directly after the `selection` role:

```js
    // PSReadLine draws a selection in one colour: it stops emitting token
    // colours inside it. fish keeps the syntax colours and needs no text role.
    selection_text: { color: "fg", psreadline: ["Selection"] },
```

After `host_remote`, at the end of `shell_roles`:

```js
    // PowerShell's own output: paths below $PSStyle.
    error_accent: {
      color: "semantic.danger",
      style: ["bold"],
      psstyle: ["Formatting.ErrorAccent"],
    },
    warning: { color: "semantic.warning", psstyle: ["Formatting.Warning"] },
    verbose: { color: "semantic.info", psstyle: ["Formatting.Verbose"] },
    debug: { color: "fg_subtle", psstyle: ["Formatting.Debug"] },
    format_accent: { color: "accent", psstyle: ["Formatting.FormatAccent"] },
    table_header: {
      color: "accent",
      style: ["bold"],
      psstyle: ["Formatting.TableHeader", "Formatting.CustomTableHeaderLabel"],
    },
    directory: {
      color: "accent",
      style: ["bold"],
      psstyle: ["FileInfo.Directory"],
    },
    symlink: { color: "constant", psstyle: ["FileInfo.SymbolicLink"] },
    executable: { color: "semantic.success", psstyle: ["FileInfo.Executable"] },
```

The PostToolUse hook runs `npm run build` after each edit of `tokens.json5`. If it did not run, run it by hand.

- [ ] **Step 5: Add the README column.** In `tools/build-readme.mjs` replace the `shell` table:

```js
    shell: () =>
      table(
        ["Role", "Colour", "Style", "fish", "PSReadLine", "$PSStyle"],
        Object.entries(tokens.shell_roles).map(([k, r]) => [
          code(k),
          r.color ? code(r.color) : "inherits",
          styles(r.style),
          names(r.fish),
          names(r.psreadline),
          names(r.psstyle),
        ]),
      ),
```

- [ ] **Step 6: Update the prose.** In `README.md`:

Replace the first paragraph of "Shell and prompt roles" with:

```markdown
fish and PowerShell both need to know what colour a command, an option or an autosuggestion is. `shell_roles` answers that once, and lists the fish variables, the PSReadLine keys and the `$PSStyle` paths each role feeds. A `$PSStyle` path is written from below `$PSStyle`: `Formatting.Error` is `$PSStyle.Formatting.Error`.
```

After the paragraph that starts "The selected pager row lightens the canvas", add:

```markdown
PSReadLine draws a selection in one colour, so `selection_text` restates the text on it; a port puts both roles under the one `Selection` key. fish keeps the syntax colours on a selection and reads the overlay alone.
```

In "For ports", item 4 becomes:

```markdown
4. Shell ports take every colour from `shell_roles`; prompt ports from `prompt_roles`. Two roles may list the same key, one as a background and one as its text.
```

In the ports table, the PowerShell row becomes (link, status `in development`):

```markdown
| PowerShell | [`sepps-workshop-powershell`](https://github.com/sepps-workshop/sepps-workshop-powershell) | in development |
```

In `handoff/SKILL.md` replace the shell row with:

```markdown
| Shell highlighting and output (fish, PSReadLine, `$PSStyle`) | `tokens.shell_roles` — each role lists the variables, keys and `$PSStyle` paths it feeds; a role whose colour is `overlay.<name>` is a background, read `overlay.<name>.hex_terminal`; two roles may share a key as background and text |
```

- [ ] **Step 7: Build, test, check.**

Run: `cd FOUNDATION && npm run build && npm test && npm run check && npx prettier --check README.md handoff/SKILL.md 2>/dev/null || true`
Expected: build prints no gate failure, all tests pass, `check` reports nothing stale. The README shell table has six columns and eleven filled `$PSStyle` cells.

- [ ] **Step 8: Check that the fish port still passes against this checkout.**

Run: `cd FISH && node -e 'import("FOUNDATION/dist/tokens.js").then(async ({default:t})=>{const {themeVars}=await import("./src/theme-template.mjs");console.log(themeVars(t).length)})'` (with `FOUNDATION` written out)
Expected: the same number as `grep -c '^fish_' themes/sepps-workshop.theme`: no new role lists a fish variable.

- [ ] **Step 9: Commit.**

```bash
cd FOUNDATION && git status --short
git add tokens.json5 tokens.json dist/tokens.js colors.css preview README.md handoff/SKILL.md tools/build-tokens.mjs tools/build-readme.mjs tools/gates.test.mjs
git commit -m "✨ feat(tokens): add \$PSStyle paths and a selection text role for PowerShell

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 2: Port: project skeleton and the mapping module

**Files:**

- Create: `PORT/package.json`, `PORT/.gitignore`, `PORT/.prettierignore`, `PORT/.claudeignore`, `PORT/.gitattributes`
- Create: `PORT/src/shell-roles.mjs`
- Test: `PORT/src/shell-roles.test.mjs`

**Interfaces:**

- Consumes: `tokens.shell_roles` with `psreadline` and `psstyle` lists (Task 1); `resolveTarget(tokens, target)` from `@sepps-workshop/design-system/tools/build-tokens`.
- Produces, from `src/shell-roles.mjs`:
  - `psreadlineEntries(tokens)` → `[{ key, fg?, bg?, style: string[], prediction: boolean }]`, one per PSReadLine key, in role order.
  - `psstyleEntries(tokens)` → `[{ key, fg?, bg?, style: string[] }]`, `key` is a path such as `"Formatting.Error"`.
  - `rgbTriple(hex)` → `[r, g, b]`.
  - `psValue(entry)` → a PowerShell expression string, e.g. `$PSStyle.Italic + $PSStyle.Foreground.FromRgb(158, 173, 199)`.

- [ ] **Step 1: Write the project files.**

`package.json`:

```json
{
  "name": "sepps-workshop-powershell",
  "description": "One dark color theme for PowerShell (PSReadLine and $PSStyle) in the sepp.med brand colors. WCAG AA verified.",
  "version": "0.1.0",
  "private": true,
  "license": "MIT",
  "author": {
    "name": "sepp.med gmbh"
  },
  "homepage": "https://github.com/sepps-workshop/sepps-workshop-powershell",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/sepps-workshop/sepps-workshop-powershell.git"
  },
  "bugs": {
    "url": "https://github.com/sepps-workshop/sepps-workshop-powershell/issues"
  },
  "keywords": [
    "powershell",
    "pwsh",
    "psreadline",
    "theme",
    "color-theme",
    "dark-theme",
    "wcag",
    "accessibility",
    "sepps-workshop"
  ],
  "type": "module",
  "scripts": {
    "build": "node build.mjs",
    "test": "node --test src/shell-roles.test.mjs src/templates.test.mjs src/pwsh.test.mjs",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "prettier": "^3.9.9"
  }
}
```

`.gitignore`: copy `FISH/.gitignore` unchanged.

`.prettierignore`:

```
node_modules/
themes/
SeppsWorkshopPowerShell/
package-lock.json
images/
```

`.claudeignore`:

```
node_modules/
themes/
SeppsWorkshopPowerShell/
```

`.gitattributes`:

```
# The generated files are compared byte for byte with a fresh build, which
# writes LF. Without this, Git for Windows checks them out with CRLF.
themes/** text eol=lf
SeppsWorkshopPowerShell/** text eol=lf
```

- [ ] **Step 2: Install the dependencies, the foundation from the local checkout.**

Run: `cd PORT && npm install --save-dev prettier@^3.9.9 && npm install --save-dev ../sepps-workshop-design-system`
Expected: `package.json` names `@sepps-workshop/design-system` as `file:../sepps-workshop-design-system`. Task 6 replaces this with the npm version.

- [ ] **Step 3: Write the failing tests.** `src/shell-roles.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import tokens from "@sepps-workshop/design-system";
import { resolveTarget } from "@sepps-workshop/design-system/tools/build-tokens";
import {
  psreadlineEntries,
  psstyleEntries,
  psValue,
  rgbTriple,
} from "./shell-roles.mjs";

const psr = Object.fromEntries(
  psreadlineEntries(tokens).map((e) => [e.key, e]),
);
const pss = Object.fromEntries(psstyleEntries(tokens).map((e) => [e.key, e]));
const listed = (list) => [
  ...new Set(Object.values(tokens.shell_roles).flatMap((r) => r[list] ?? [])),
];

test("every key a shell role lists has exactly one entry", () => {
  assert.ok(
    listed("psreadline").length >= 18,
    "the foundation lists PSReadLine keys",
  );
  assert.ok(
    listed("psstyle").length >= 11,
    "the foundation lists $PSStyle paths",
  );
  assert.deepEqual(Object.keys(psr).sort(), listed("psreadline").sort());
  assert.deepEqual(Object.keys(pss).sort(), listed("psstyle").sort());
  assert.equal(psreadlineEntries(tokens).length, listed("psreadline").length);
});

test("a text role is a foreground resolved from the tokens", () => {
  assert.equal(
    psr.Command.fg,
    resolveTarget(tokens, tokens.shell_roles.command.color),
  );
  assert.equal(psr.Default.fg, resolveTarget(tokens, "fg"));
  assert.equal(psr.Command.bg, undefined);
  assert.equal(
    pss["Formatting.Warning"].fg,
    resolveTarget(tokens, "semantic.warning"),
  );
});

test("an overlay role is a background flattened over the terminal", () => {
  assert.equal(
    psr.ListPredictionSelected.bg,
    tokens.overlay.selected_item.hex_terminal,
  );
  assert.equal(psr.ListPredictionSelected.fg, undefined);
});

test("Selection merges the overlay and its text role", () => {
  assert.equal(psr.Selection.bg, tokens.overlay.selection.hex_terminal);
  assert.equal(
    psr.Selection.fg,
    resolveTarget(tokens, tokens.shell_roles.selection_text.color),
  );
});

test("styles travel with the entry", () => {
  assert.deepEqual(psr.Comment.style, ["italic"]);
  assert.deepEqual(pss["FileInfo.Directory"].style, ["bold"]);
  assert.deepEqual(psr.Command.style, []);
});

test("only the two keys PSReadLine 2.2 added are marked as prediction keys", () => {
  const marked = psreadlineEntries(tokens)
    .filter((e) => e.prediction)
    .map((e) => e.key);
  assert.deepEqual(marked.sort(), ["ListPrediction", "ListPredictionSelected"]);
});

test("two foregrounds for one key are refused", () => {
  const broken = structuredClone(tokens);
  broken.shell_roles.second = { color: "fg", psreadline: ["Command"] };
  assert.throws(() => psreadlineEntries(broken), /Command.*two foregrounds/);
});

test("an unknown colour target is refused, not replaced", () => {
  const broken = structuredClone(tokens);
  broken.shell_roles.command.color = "fuction";
  assert.throws(() => psreadlineEntries(broken), /Unknown colour target/);
});

test("rgbTriple reads a six-digit hex string", () => {
  const hex = tokens.text.fg;
  assert.deepEqual(
    rgbTriple(hex),
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)),
  );
});

test("psValue writes styles first, then foreground, then background", () => {
  const [r, g, b] = rgbTriple(psr.Comment.fg);
  assert.equal(
    psValue(psr.Comment),
    `$PSStyle.Italic + $PSStyle.Foreground.FromRgb(${r}, ${g}, ${b})`,
  );
  assert.match(
    psValue(psr.Selection),
    /^\$PSStyle\.Foreground\.FromRgb\(\d+, \d+, \d+\) \+ \$PSStyle\.Background\.FromRgb\(\d+, \d+, \d+\)$/,
  );
  assert.match(
    psValue(psr.ListPredictionSelected),
    /^\$PSStyle\.Background\.FromRgb\(/,
  );
});
```

- [ ] **Step 4: Run them and see them fail.**

Run: `cd PORT && node --test src/shell-roles.test.mjs`
Expected: FAIL, `Cannot find module ... shell-roles.mjs`.

- [ ] **Step 5: Write the module.** `src/shell-roles.mjs`:

```js
// Reads the foundation's shell roles into two lists: the PSReadLine keys
// and the $PSStyle paths, each with the colour and style its role names.
// The port decides nothing about colour: a key no role lists is not here.

import { resolveTarget } from "@sepps-workshop/design-system/tools/build-tokens";

// Added in PSReadLine 2.2.0. The templates send them in a call of their
// own, so 2.1.0 (bundled with PowerShell 7.2) still takes every other key.
const PREDICTION_KEYS = new Set(["ListPrediction", "ListPredictionSelected"]);

// Foundation style name -> $PSStyle property.
const STYLE = { italic: "Italic", bold: "Bold", underline: "Underline" };

// A role's colour as { fg } or { bg }. An overlay is a background.
// PowerShell cannot blend, so it takes the value the foundation flattened
// over the terminal background.
function colourPart(tokens, target) {
  if (!target) return {};
  const [group, name] = target.split(".");
  return group === "overlay"
    ? { bg: tokens.overlay[name].hex_terminal }
    : { fg: resolveTarget(tokens, target) };
}

// One entry per key that a role lists under `list`. Two roles may share a
// key as background and text (Selection); anything else twice is a mistake
// in the foundation.
function entries(tokens, list) {
  const byKey = new Map();
  for (const role of Object.values(tokens.shell_roles)) {
    const part = colourPart(tokens, role.color);
    for (const key of role[list] ?? []) {
      const entry = byKey.get(key) ?? { key, style: [] };
      for (const [side, word] of [
        ["fg", "foregrounds"],
        ["bg", "backgrounds"],
      ]) {
        if (part[side] && entry[side])
          throw new Error(`${key} has two ${word} in shell_roles`);
      }
      byKey.set(key, {
        ...entry,
        ...part,
        style: [...entry.style, ...(role.style ?? [])],
      });
    }
  }
  return [...byKey.values()];
}

export const psreadlineEntries = (tokens) =>
  entries(tokens, "psreadline").map((entry) => ({
    ...entry,
    prediction: PREDICTION_KEYS.has(entry.key),
  }));

export const psstyleEntries = (tokens) => entries(tokens, "psstyle");

export function rgbTriple(hex) {
  return [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16));
}

// An entry as a PowerShell expression: styles, then foreground, then background.
export function psValue({ fg, bg, style }) {
  const colour = (ground, hex) =>
    `$PSStyle.${ground}.FromRgb(${rgbTriple(hex).join(", ")})`;
  return [
    ...style.map((name) => `$PSStyle.${STYLE[name]}`),
    fg && colour("Foreground", fg),
    bg && colour("Background", bg),
  ]
    .filter(Boolean)
    .join(" + ");
}
```

- [ ] **Step 6: Run the tests and see them pass.**

Run: `cd PORT && node --test src/shell-roles.test.mjs`
Expected: 10 tests pass.

- [ ] **Step 7: Format and commit.**

```bash
cd PORT && npx prettier --write . && git status --short
git add package.json package-lock.json .gitignore .prettierignore .claudeignore .gitattributes src/shell-roles.mjs src/shell-roles.test.mjs
git commit -m "✨ feat: read PSReadLine keys and \$PSStyle paths from the shell roles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 3: Port: templates, build and generated files

**Files:**

- Create: `PORT/src/templates.mjs`, `PORT/build.mjs`
- Create (generated): `PORT/themes/sepps-workshop.ps1`, `PORT/SeppsWorkshopPowerShell/SeppsWorkshopPowerShell.psm1`, `PORT/SeppsWorkshopPowerShell/SeppsWorkshopPowerShell.psd1`, `PORT/images/*`
- Test: `PORT/src/templates.test.mjs`

**Interfaces:**

- Consumes: `psreadlineEntries`, `psstyleEntries`, `psValue` from `src/shell-roles.mjs` (Task 2).
- Produces, from `src/templates.mjs`: constants `THEME_ID = "sepps-workshop"`, `MODULE_NAME = "SeppsWorkshopPowerShell"`, `FUNCTION_NAME = "Set-SeppsWorkshopTheme"`, `MODULE_GUID`; `statements(tokens)` → `string[]` (the PowerShell lines both artefacts share); `buildTheme(tokens)`, `buildModule(tokens)`, `buildManifest(version)` → file content strings.

- [ ] **Step 1: Write the failing tests.** `src/templates.test.mjs`:

```js
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
```

- [ ] **Step 2: Run them and see them fail.**

Run: `cd PORT && node --test src/templates.test.mjs`
Expected: FAIL, `Cannot find module ... templates.mjs`.

- [ ] **Step 3: Write the templates.** `src/templates.mjs`:

```js
// Renders the foundation's shell roles as PowerShell: a standalone script
// to dot-source and a module with one function. Both run the same
// statements, so the two install paths cannot drift.
//
// PowerShell's own colour surface is PSReadLine (the command line) and
// $PSStyle.Formatting / $PSStyle.FileInfo (its output). The sixteen ANSI
// colours belong to the terminal emulator, not to this port.

import { psreadlineEntries, psstyleEntries, psValue } from "./shell-roles.mjs";

// The file name without extension, as in the other ports.
export const THEME_ID = "sepps-workshop";
export const MODULE_NAME = "SeppsWorkshopPowerShell";
export const FUNCTION_NAME = "Set-SeppsWorkshopTheme";
// The PowerShell Gallery identifies the module by this. Never regenerate it.
export const MODULE_GUID = "24a11770-ee2f-4732-9eb5-8f6b14a6e157";
const HOMEPAGE = "https://github.com/sepps-workshop/sepps-workshop-powershell";

// The generated files stay ASCII: Windows PowerShell 5.1 reads a script
// without a byte order mark in the ANSI code page, and 5.1 is the host
// that prints the warning below. Hence the straight apostrophe, doubled
// where it sits inside a single-quoted PowerShell string.
const NAME = "Sepp's Workshop";
const QUOTED_NAME = NAME.replace("'", "''");
const GENERATED =
  "# Generated: do not edit. Change src/templates.mjs and run `npm run build`.";

const indent = (lines, by) => lines.map((line) => (line ? by + line : line));

// Set-PSReadLineOption applies its table as a whole.
function colorTable(entries) {
  const width = Math.max(...entries.map((entry) => entry.key.length));
  return [
    "Set-PSReadLineOption -Colors @{",
    ...entries.map(
      (entry) => `    ${entry.key.padEnd(width)} = ${psValue(entry)}`,
    ),
    "}",
  ];
}

// The lines the script and the module function share.
export function statements(tokens) {
  const keys = psreadlineEntries(tokens);
  return [
    "if (-not $PSStyle) {",
    `    Write-Warning '${QUOTED_NAME} needs PowerShell 7.2 or later. Nothing was changed.'`,
    "    return",
    "}",
    "",
    "if (Get-Module -ListAvailable -Name PSReadLine) {",
    ...indent(colorTable(keys.filter((entry) => !entry.prediction)), "    "),
    "",
    "    # These keys need PSReadLine 2.2.0, and one unknown key makes",
    "    # PSReadLine reject the whole table. So they are set on their own.",
    "    try {",
    ...indent(colorTable(keys.filter((entry) => entry.prediction)), "        "),
    "    } catch { }",
    "}",
    "",
    "# $PSStyle has gained properties since PowerShell 7.2: one at a time.",
    ...psstyleEntries(tokens).map(
      (entry) => `try { $PSStyle.${entry.key} = ${psValue(entry)} } catch { }`,
    ),
  ];
}

export function buildTheme(tokens) {
  return (
    [
      `# ${NAME} for PowerShell`,
      `# ${HOMEPAGE}`,
      GENERATED,
      "#",
      "# Dot-source this file from your $PROFILE.",
      "",
      ...statements(tokens),
    ].join("\n") + "\n"
  );
}

export function buildModule(tokens) {
  return (
    [
      `# ${NAME} for PowerShell`,
      `# ${HOMEPAGE}`,
      GENERATED,
      "",
      `function ${FUNCTION_NAME} {`,
      "    <#",
      "    .SYNOPSIS",
      `        Applies the ${NAME} colors to PSReadLine and $PSStyle.`,
      "    .DESCRIPTION",
      "        Sets the PSReadLine colors of the command line and the",
      "        $PSStyle.Formatting and $PSStyle.FileInfo colors of the output.",
      "        Call it from your $PROFILE to apply the theme in every session.",
      "    .EXAMPLE",
      `        ${FUNCTION_NAME}`,
      "    #>",
      "    [CmdletBinding()]",
      "    param()",
      "",
      ...indent(statements(tokens), "    "),
      "}",
      "",
      `Export-ModuleMember -Function ${FUNCTION_NAME}`,
    ].join("\n") + "\n"
  );
}

export function buildManifest(version) {
  return `@{
    RootModule        = '${MODULE_NAME}.psm1'
    ModuleVersion     = '${version}'
    GUID              = '${MODULE_GUID}'
    Author            = 'sepp.med gmbh'
    CompanyName       = 'sepp.med gmbh'
    Copyright         = '(c) sepp.med gmbh. MIT License.'
    Description       = 'One dark color theme for PowerShell (PSReadLine and $PSStyle) in the sepp.med brand colors. WCAG AA verified.'
    PowerShellVersion = '7.2'
    FunctionsToExport = @('${FUNCTION_NAME}')
    CmdletsToExport   = @()
    VariablesToExport = @()
    AliasesToExport   = @()
    PrivateData       = @{
        PSData = @{
            Tags       = @('theme', 'color-theme', 'dark-theme', 'psreadline', 'pwsh', 'powershell', 'wcag', 'accessibility', 'sepps-workshop')
            LicenseUri = '${HOMEPAGE}/blob/main/LICENSE'
            ProjectUri = '${HOMEPAGE}'
        }
    }
}
`;
}
```

- [ ] **Step 4: Write the build script.** `build.mjs`:

```js
// Reads foundation tokens from @sepps-workshop/design-system, emits the
// standalone theme script and the module, and copies the README images
// from the foundation.

import { mkdirSync, writeFileSync, copyFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import tokens from "@sepps-workshop/design-system";

import {
  buildTheme,
  buildModule,
  buildManifest,
  THEME_ID,
  MODULE_NAME,
} from "./src/templates.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const IMAGES = join(ROOT, "images");
const { version } = JSON.parse(
  readFileSync(join(ROOT, "package.json"), "utf8"),
);

const files = {
  [join("themes", `${THEME_ID}.ps1`)]: buildTheme(tokens),
  [join(MODULE_NAME, `${MODULE_NAME}.psm1`)]: buildModule(tokens),
  [join(MODULE_NAME, `${MODULE_NAME}.psd1`)]: buildManifest(version),
};
for (const [path, content] of Object.entries(files)) {
  mkdirSync(dirname(join(ROOT, path)), { recursive: true });
  writeFileSync(join(ROOT, path), content, "utf8");
}

// The images are the foundation's; copying them here keeps them from drifting.
mkdirSync(IMAGES, { recursive: true });
for (const image of ["sepps-workshop-header.jpg", "sepp-recruiting.png"]) {
  copyFileSync(
    fileURLToPath(
      import.meta.resolve(`@sepps-workshop/design-system/assets/${image}`),
    ),
    join(IMAGES, image),
  );
}

console.log(`Built ${Object.keys(files).join(", ")} (v${version}) and images/`);
```

- [ ] **Step 5: Build, then run the tests and see them pass.**

Run: `cd PORT && npm run build && node --test src/shell-roles.test.mjs src/templates.test.mjs`
Expected: the build names three files; all tests pass. Read `themes/sepps-workshop.ps1` once: 16 keys in the first table (with `Selection` as foreground plus background and `Comment` starting with `$PSStyle.Italic`), 2 in the guarded one, 11 `$PSStyle` lines.

- [ ] **Step 6: Format and commit.**

```bash
cd PORT && npx prettier --write . && npm run build && git status --short
git add build.mjs src/templates.mjs src/templates.test.mjs themes SeppsWorkshopPowerShell images
git commit -m "✨ feat: generate the theme script and the module

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 4: Port: integration test with a real PowerShell

**Files:**

- Test: `PORT/src/pwsh.test.mjs`

**Interfaces:**

- Consumes: the built `themes/sepps-workshop.ps1` and `SeppsWorkshopPowerShell/` (Task 3); `psreadlineEntries`, `psstyleEntries`, `rgbTriple` (Task 2); `THEME_ID`, `MODULE_NAME`, `FUNCTION_NAME` (Task 3).

Facts established with `pwsh.exe` 7.6.6 before this plan was written: `Get-PSReadLineOption` returns a colour exactly as it was set (`ESC[3mESC[38;2;158;173;199m` for italic plus foreground); `$PSStyle.Bold`, `.Italic` and `.Underline` are `ESC[1m`, `ESC[3m` and `ESC[4m`; `ConvertTo-Json` writes ESC as `\u001b`. With `-EncodedCommand`, PowerShell may write progress and errors to stderr as CLIXML, so the tests judge by exit status and stdout, never by an empty stderr.

- [ ] **Step 1: Write the test.** `src/pwsh.test.mjs`:

```js
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

test(
  "PSReadLine rejects a whole table over one unknown key",
  { skip: needsPwsh },
  () => {
    // The reason the prediction keys are set in a call of their own.
    const result = ps(
      pwsh,
      `Import-Module PSReadLine
$before = (Get-PSReadLineOption).CommandColor
try { Set-PSReadLineOption -Colors @{ Command = $PSStyle.Foreground.FromRgb(1, 2, 3); NoSuchKey = $PSStyle.Bold } } catch { }
(Get-PSReadLineOption).CommandColor -eq $before`,
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(result.stdout.trim(), "True");
  },
);

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
```

- [ ] **Step 2: Run it.**

Run: `cd PORT && node --test src/pwsh.test.mjs`
Expected: 7 tests pass (on a machine without PowerShell they are skipped with the reason). The "leaves nothing behind" test expects the single name `before`: the variable the test itself creates between the two listings.

If a test fails, the theme is wrong, not the test, with two known exceptions to check first: PowerShell 5.1 may print the warning localised with a prefix (`WARNUNG:`), which the pattern allows; and if `Get-ChildItem variable:` lists more than `before`, print the difference and decide whether the script leaks.

- [ ] **Step 3: Run the whole suite, format, commit.**

```bash
cd PORT && npm test && npx prettier --write . && git status --short
git add src/pwsh.test.mjs
git commit -m "✅ test: apply the theme in a real PowerShell and read it back

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Task 5: Port: documentation and scaffolding

**Files:**

- Create: `PORT/README.md`, `PORT/CLAUDE.md`, `PORT/CHANGELOG.md`, `PORT/LICENSE`
- Create: `PORT/.claude/settings.json`, `PORT/.claude/learnings.md`, `PORT/.claude/skills/sepps-workshop/SKILL.md`, `PORT/.claude/skills/release/SKILL.md`
- Create: `PORT/.githooks/pre-commit`, `PORT/scripts/sync-config-table.sh`
- Create: `PORT/.github/workflows/claude.yml`, `claude-code-review.yml`, `publish-to-powershell-gallery.yml`

- [ ] **Step 1: Copy what is the same in every port.**

```bash
cd PORT
mkdir -p .claude/skills/sepps-workshop .claude/skills/release .githooks scripts .github/workflows
cp FISH/LICENSE LICENSE
cp FISH/.githooks/pre-commit .githooks/pre-commit
cp FISH/scripts/sync-config-table.sh scripts/sync-config-table.sh
cp FISH/.github/workflows/claude.yml FISH/.github/workflows/claude-code-review.yml .github/workflows/
cp FOUNDATION/handoff/SKILL.md .claude/skills/sepps-workshop/SKILL.md
chmod +x .githooks/pre-commit scripts/sync-config-table.sh
git config core.hooksPath .githooks
```

`.claude/settings.json`: copy `WT/.claude/settings.json` unchanged (it has the allow list without the fish entries).

`.claude/learnings.md`:

```markdown
# Learnings

- 2026-10-13: PSReadLine stops emitting token colours inside a selection (`Render.cs`, `UpdateColorsIfNecessary`), so `Selection` needs a foreground of its own: the foundation's `selection_text` on the `selection` overlay. `ListPredictionSelected` is drawn under the row and stays a background alone.
- 2026-10-13: `Set-PSReadLineOption -Colors` throws at the first key it does not know and leaves the rest of the table unset; the keys before it are applied, in hashtable order. Keys that a supported PSReadLine version lacks go in a call of their own inside `try`/`catch`.
- 2026-10-13: Generated PowerShell files stay ASCII: Windows PowerShell 5.1 reads a script without a byte order mark in the ANSI code page, and it is the host that prints the version warning.
- 2026-10-13: With `-EncodedCommand`, PowerShell may write progress and errors to stderr as CLIXML. A test judges by exit status and stdout.
```

- [ ] **Step 2: Write the publish workflow.** `.github/workflows/publish-to-powershell-gallery.yml`:

```yaml
name: Publish to PowerShell Gallery

on:
  push:
    tags:
      - "v*"

permissions:
  contents: read

jobs:
  publish:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v5
      - shell: pwsh
        run: Test-ModuleManifest -Path ./SeppsWorkshopPowerShell/SeppsWorkshopPowerShell.psd1
      - shell: pwsh
        run: |
          Publish-Module -Path ./SeppsWorkshopPowerShell -Repository PSGallery -NuGetApiKey $env:PSGALLERY_API_KEY
        env:
          PSGALLERY_API_KEY: ${{ secrets.PSGALLERY_API_KEY }}
```

- [ ] **Step 3: Write the release skill.** `.claude/skills/release/SKILL.md`: start from `FISH/.claude/skills/release/SKILL.md` and change exactly this:

- Front matter description and title name `sepps-workshop-powershell`; the description says "bumps version, rebuilds the module manifest, updates CHANGELOG, commits, tags, pushes, and creates a GitHub release; CI runs `Publish-Module`".
- The intro paragraph: the tag push triggers `publish-to-powershell-gallery.yml`, which publishes `SeppsWorkshopPowerShell/` to the PowerShell Gallery with the `PSGALLERY_API_KEY` secret; never run `Publish-Module` locally.
- Pre-flight: "the generated files in `themes/` and `SeppsWorkshopPowerShell/` are committed". Add one check: on the first release, the repository secret `PSGALLERY_API_KEY` must exist (`gh secret list` names it); stop if it does not.
- Version guidance: minor is "a foundation minor bump, newly covered PSReadLine keys or `$PSStyle` properties"; major is "a renamed module or function, a renamed script file, a raised PowerShell floor".
- After "Bump Version" add: run `npm run build` so `ModuleVersion` in the manifest takes the new version; confirm with `grep ModuleVersion SeppsWorkshopPowerShell/SeppsWorkshopPowerShell.psd1`.
- Commit: `git add package.json package-lock.json CHANGELOG.md SeppsWorkshopPowerShell/SeppsWorkshopPowerShell.psd1`.
- Keep the GitHub release step; replace its closing paragraph with: the Gallery publication runs in CI after the tag push.
- Confirm: report the release URL, the Actions URL `https://github.com/sepps-workshop/sepps-workshop-powershell/actions` and the Gallery page `https://www.powershellgallery.com/packages/SeppsWorkshopPowerShell`.

- [ ] **Step 4: Write `CHANGELOG.md`.**

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- The Sepp’s Workshop theme for PowerShell: the PSReadLine colours of the command line and the `$PSStyle` colours of PowerShell's output, built from the shell roles of `@sepps-workshop/design-system`.
- Two ways to install it: the module `SeppsWorkshopPowerShell` with `Set-SeppsWorkshopTheme`, and the standalone script `themes/sepps-workshop.ps1`.
- Tests that derive every expected value from the design system and apply the built theme in a real PowerShell.
```

- [ ] **Step 5: Write `CLAUDE.md`.** Structure and wording follow `FISH/CLAUDE.md`. Content:

- Intro line: PowerShell port of the Sepp’s Workshop design system; Node.js + ESM; reads tokens from `@sepps-workshop/design-system`; emits one script to `themes/` and one module to `SeppsWorkshopPowerShell/`; one theme, no variants.
- `## Key Config Files`: one row per file the sync script lists (run `bash scripts/sync-config-table.sh` after writing the section with an empty table, then replace every `TODO: add description` with a description in the style of the fish port's rows).
- `## Commands`: `npm install`, `npm run build`, `npm test` ("template tests, then an integration test that applies the theme in a real PowerShell; needs `pwsh` or `pwsh.exe`"), `npm run format`; the `git config core.hooksPath .githooks` line.
- `## Structure`: `build.mjs`; `src/shell-roles.mjs` (roles to entries, merges background and text for one key); `src/templates.mjs` (`statements`, `buildTheme`, `buildModule`, `buildManifest`); the three test files; `themes/` and `SeppsWorkshopPowerShell/` generated and committed; `images/` generated.
- `## References`: the handoff skill, the foundation README, the spec, each with a "Read when".
- `## Conventions`: no colour in this repository; the foundation decides which keys exist; overlays are backgrounds read from `hex_terminal`; two roles may share one key as background and text, anything else twice is an error; foundation gaps go upstream; `resolveTarget` without fallback; both artefacts render `statements(tokens)`, change it there and never in one template alone; generated PowerShell is ASCII with "Sepp's Workshop"; PowerShell 7.2 floor, prediction keys in the guarded call, each `$PSStyle` assignment in its own `try`; `MODULE_GUID` is permanent; releases go through `/release`, `Publish-Module` runs in CI only; determinism (`npm test` fails on stale output); writing rules as in the fish port.
- `## Don't`: hand-edit `themes/`, `SeppsWorkshopPowerShell/` or `images/`; add a second theme, a variant or a parameter to `Set-SeppsWorkshopTheme`; regenerate the GUID; run `Publish-Module`; commit secrets; use `--force`.
- `## Learnings` and `## Compact Instructions`: verbatim from `FISH/CLAUDE.md`.

- [ ] **Step 6: Write `README.md`.** The header image, badges, licence and recruiting sections are verbatim from `FISH/README.md`. Full content:

````markdown
<p align="center">
  <img src="./images/sepps-workshop-header.jpg" width="100%" alt="Sepp, the blue robot, assembling code blocks with a wrench in his workshop" />
</p>

# Sepp’s Workshop for PowerShell

<p>
  <img src="https://img.shields.io/badge/WCAG-AA-3aaa35" alt="WCAG AA" />
  <img src="https://img.shields.io/badge/license-MIT-b2b2b2" alt="MIT license" />
</p>

One dark colour theme for [PowerShell](https://learn.microsoft.com/powershell/), in the sepp.med colours, with Sunset yellow as the accent. It colours what you type (PSReadLine: syntax highlighting, predictions, the selection) and what PowerShell prints by itself (`$PSStyle`: errors, warnings, table headers, directory listings). There are no variants and nothing to configure: this is the one theme.

The colours come from the [Sepp’s Workshop design system](https://github.com/sepps-workshop/sepps-workshop-design-system), whose build refuses to ship a text colour that fails WCAG AA on its background. That includes the text on a selection and on the selected row of the prediction list.

## Requirements

PowerShell 7.2 or later. The theme uses `$PSStyle`, which arrived in that release. On an older host, Windows PowerShell 5.1 included, it prints a warning and changes nothing.

PowerShell 7.2 itself ships PSReadLine 2.1.0, which does not know the two colours of the prediction list. Everything else still applies. To get those two as well, check `(Get-Module PSReadLine).Version` and upgrade:

```powershell
Install-Module -Name PSReadLine -MinimumVersion 2.2.0 -Force -SkipPublisherCheck
```

## Install

Both ways end in your profile, the script PowerShell runs at the start of every session. If you have none yet, this creates it:

```powershell
if (-not (Test-Path $PROFILE)) { New-Item -ItemType File -Path $PROFILE -Force }
```

### From the PowerShell Gallery

```powershell
Install-Module -Name SeppsWorkshopPowerShell -Scope CurrentUser
```

Then add two lines to your `$PROFILE`:

```powershell
Import-Module SeppsWorkshopPowerShell
Set-SeppsWorkshopTheme
```

`Set-SeppsWorkshopTheme` takes no arguments. To update, run `Update-Module SeppsWorkshopPowerShell`.

### As a script, without a module

Clone the repository:

```powershell
git clone https://github.com/sepps-workshop/sepps-workshop-powershell.git
```

Then dot-source the script from your `$PROFILE`, with the path of your clone:

```powershell
. C:\path\to\sepps-workshop-powershell\themes\sepps-workshop.ps1
```

You do not need Node.js: the script is already built. To update, run `git pull` in the clone.

### Uninstall

Remove the lines from your `$PROFILE` and start a new session. Then run `Uninstall-Module SeppsWorkshopPowerShell`, or delete the clone.

## Recommended companions

- **Terminal colours**: PowerShell colours the command line and its own output, not the terminal. The theme expects the dark blue terminal background of the design system (`#14284c`, a shade darker than Darkblue) and looks best with the sixteen Sepp’s Workshop ANSI colours. [Sepp’s Workshop for Windows Terminal](https://github.com/sepps-workshop/sepps-workshop-windows-terminal) sets both, and the embedded terminal of [Sepp’s Workshop for VS Code](https://github.com/sepps-workshop/sepps-workshop-vs-code) has them too. Every colour is chosen and checked for that background. On another dark background the selection and the selected prediction will look off, and on a light one the text is hard to read.
- **Font**: themes cannot ship fonts. The design system recommends [JetBrains Mono](https://www.jetbrains.com/lp/mono/), or [JetBrainsMono Nerd Font](https://www.nerdfonts.com/font-downloads) if your prompt shows icons.
- **Prompt**: the theme does not touch your prompt. For a [Starship](https://starship.rs) prompt in the same colours there is [Sepp’s Workshop for Starship](https://github.com/sepps-workshop/sepps-workshop-starship).
- **Another shell**: [Sepp’s Workshop for fish](https://github.com/sepps-workshop/sepps-workshop-fish) colours a fish command line from the same roles.

## How it is built

The script and the module are generated. The design system says what colour a command, a parameter or a warning is, and lists the PSReadLine keys and `$PSStyle` properties each of those roles feeds. This repository turns that list into PowerShell. It contains no colour value of its own, and a test fails if one appears. Both install paths run the same statements.

A few things follow from the palette and are deliberate:

- Commands are cyan-blue, not the accent: the cursor is already yellow, and a typed command is a call.
- Comments and inline predictions share a colour. Comments are italic, which tells them apart.
- A selection darkens the background and draws its text in one colour. PSReadLine does not keep syntax colours inside a selection, so the theme does not pretend it does.
- The selected row of the prediction list gets a background only; its text keeps its own colours.
- Red is a signal only: errors, on the command line and in the output.
- PowerShell cannot blend colours, so the backgrounds of the selection and of the selected prediction are computed for that terminal background.

### Not set by the theme

The design system has no role for these, so the theme leaves them at PowerShell's defaults on purpose:

- PSReadLine: `ListPredictionTooltip`
- `$PSStyle.Formatting`: `FeedbackName`, `FeedbackText`, `FeedbackAction`
- `$PSStyle.FileInfo`: `Extension`

If you want one of them styled, set it yourself after the theme's line in your `$PROFILE`.

## Contributing

You need Node.js 20 or later, and PowerShell 7 for the tests (`pwsh`, or `pwsh.exe` from WSL).

```bash
npm install
npm run build   # regenerates themes/, SeppsWorkshopPowerShell/ and images/ from @sepps-workshop/design-system
npm test
```

The files under `themes/` and `SeppsWorkshopPowerShell/` are generated; edit `src/templates.mjs` and rebuild. The tests apply the theme in a PowerShell started without your profile, so they do not touch your own session. To try a local build for real, dot-source `themes/sepps-workshop.ps1`.

If a colour looks wrong, or two things are hard to tell apart, the cause is almost always in the design system and not in this port. Please open the issue [there](https://github.com/sepps-workshop/sepps-workshop-design-system/issues). A mapping mistake (the right colour on the wrong key) belongs here.

## License

MIT. See [LICENSE](./LICENSE).

## Want to join Sepp’s Workshop?

<img align="right" width="150" src="./images/sepp-recruiting.png" alt="Sepp, the blue robot, holding a sign that reads Be you – with us!" />

sepp.med builds and tests software for places where a bug is more than an inconvenience: medical devices, cars, aircraft. We have been doing it since 1980, as a family-run company in the Nuremberg metropolitan region. If you would rather get the contrast ratio right than argue about it, you might like it here.

Browse the [open positions](https://www.seppmed.com/career/open-positions/), or send a [speculative application](https://www.seppmed.com/career/speculative-application/) if none of them fits yet. Be you – with us.
````

The background value in "Recommended companions" must equal `tokens.surface.bg_terminal`; check it with `node -e 'import("@sepps-workshop/design-system").then(m=>console.log(m.default.surface.bg_terminal))'` and correct the README if the foundation has moved.

- [ ] **Step 7: Verify.**

Run: `cd PORT && npx prettier --write . && bash scripts/sync-config-table.sh && npm run build && npm test && npm run format:check && grep -c "TODO: add description" CLAUDE.md`
Expected: tests pass, formatting clean, the grep prints `0`.

- [ ] **Step 8: Commit.**

```bash
cd PORT && git status --short
git add README.md CLAUDE.md CHANGELOG.md LICENSE .claude .githooks scripts .github
git commit -m "📝 docs: add the README, project instructions, release skill and workflows

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

The pre-commit hook runs the sync script and, if installed, gitleaks.

---

## Task 6: Port: switch to the released foundation (blocked on the user)

Blocked until the user has released `@sepps-workshop/design-system` 0.10.0. Check with `npm view @sepps-workshop/design-system version`.

**Files:**

- Modify: `PORT/package.json`, `PORT/package-lock.json`

- [ ] **Step 1: Install from npm.**

Run: `cd PORT && npm install --save-dev @sepps-workshop/design-system@^0.10.0`
Expected: `package.json` names `"^0.10.0"`, and `package-lock.json` holds a registry URL for the package, no `file:` link.

- [ ] **Step 2: Rebuild and test.**

Run: `cd PORT && npm run build && git status --short && npm test`
Expected: the build changes no generated file (`git status` lists only `package.json` and `package-lock.json`); all tests pass.

- [ ] **Step 3: Commit.**

```bash
cd PORT && git add package.json package-lock.json
git commit -m "⬆️ chore(deps): use design-system ^0.10.0 from npm

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Close the loop.** Ask the user whether the theme used the foundation correctly and log corrections to `.claude/learnings.md`. Remind them of the follow-ups the spec lists (sibling READMEs, the foundation's ports table status, the organisation profile) and of the Gallery prerequisites: an account that owns the name `SeppsWorkshopPowerShell` and the repository secret `PSGALLERY_API_KEY`.
