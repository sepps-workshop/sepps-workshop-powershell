# Sepp’s Workshop for PowerShell: design

Date: 2026-10-13. Status: implemented.

**Changed after implementation (2026-10-13):** the module is not published on the PowerShell Gallery. The Gallery needs a personal Microsoft account, and the user decided that this is too much for now. The theme is installed from a clone, as a script or as the module loaded by path. The publish workflow is removed and the release skill ends with a GitHub Release. Where the text below speaks of the Gallery, it describes the original plan.

## Goal

One PowerShell theme, generated from `@sepps-workshop/design-system`, that colours the command line (PSReadLine) and PowerShell's own output (`$PSStyle`). It installs either as a module from the PowerShell Gallery or as one script dot-sourced from a clone. The port decides which token feeds which PowerShell key and nothing about colour.

Blueprints: `vivid-life-powershell` for the PowerShell mechanics (the two install paths, the version guards, the Gallery workflow and release skill), the Sepp’s Workshop ports (`-fish` first, as the other shell port) for everything else: rules, tests, scaffolding, README voice.

## Decisions taken with the user

1. The foundation is extended first: `shell_roles` gains the roles and the key list for `$PSStyle` (see "Foundation change"). The port ships only after that release.
2. Both install paths of the Vivid Life sibling: the module `SeppsWorkshopPowerShell` with one cmdlet, `Set-SeppsWorkshopTheme`, and the standalone script `themes/sepps-workshop.ps1`.
3. The role table below, which follows the Vivid Life mapping.
4. Selected text gets a foreground from the foundation, the new role `selection_text` (see "Selection").

## Foundation change (`sepps-workshop-design-system`, 0.10.0)

### Problem

`shell_roles` lists fish variables and PSReadLine keys. PowerShell has a second colour surface, `$PSStyle.Formatting` and `$PSStyle.FileInfo` (errors, warnings, table headers, directory listings), and the foundation has no role for it. The Vivid Life port picks those colours itself; here that would move a colour decision into a port.

### Change

A shell role may carry a third key list, `psstyle`. Each entry is a property path below `$PSStyle`, written `Formatting.Error` or `FileInfo.Directory`.

| Role             | Colour             | Style | `psstyle`                                                     |
| ---------------- | ------------------ | ----- | ------------------------------------------------------------- |
| `error` (exists) | `semantic.danger`  |       | `Formatting.Error`                                            |
| `error_accent`   | `semantic.danger`  | bold  | `Formatting.ErrorAccent`                                      |
| `warning`        | `semantic.warning` |       | `Formatting.Warning`                                          |
| `verbose`        | `semantic.info`    |       | `Formatting.Verbose`                                          |
| `debug`          | `fg_subtle`        |       | `Formatting.Debug`                                            |
| `format_accent`  | `accent`           |       | `Formatting.FormatAccent`                                     |
| `table_header`   | `accent`           | bold  | `Formatting.TableHeader`, `Formatting.CustomTableHeaderLabel` |
| `directory`      | `accent`           | bold  | `FileInfo.Directory`                                          |
| `symlink`        | `constant`         |       | `FileInfo.SymbolicLink`                                       |
| `executable`     | `semantic.success` |       | `FileInfo.Executable`                                         |

`error` keeps its fish variables and its PSReadLine key and gains the list. The nine other roles are new and list `psstyle` only.

One more role, `selection_text` (`fg`), lists the PSReadLine key `Selection`, which the `selection` role already lists as a background. Gate 2 reads a role named `<overlay role>_*` as text on that overlay, so `selection_text` is checked on `overlay.selection` over `surface.bg_terminal` without a new rule. It lists no fish variable: fish keeps the syntax colours on a selection.

Also in the foundation:

- The role validation accepts `psstyle` as a key and still rejects unknown ones.
- Every colour above is one the gates already check as text on `surface.bg`, which `surface.bg_terminal` equals. If the existing gates do not cover a new role by construction, the role is added to the gate rather than left unchecked.
- `README.md`: a `$PSStyle` column in the generated shell table, a sentence in "Shell and prompt roles", the PowerShell row of the ports table. The handoff skill's shell row names `$PSStyle`. A changelog entry. Unit tests for the new key and roles.
- The shell preview shows the new roles if that takes no new mechanism; otherwise it stays as it is.

Additive, so a minor bump. The release itself (tag, push, npm publish through CI) is the user's step with the foundation's `/release` skill.

## The port

### Output

Two generated, committed artefacts with the same mapping:

- `themes/sepps-workshop.ps1`: a standalone script, dot-sourced from `$PROFILE`.
- `SeppsWorkshopPowerShell/SeppsWorkshopPowerShell.psd1` and `.psm1`: a module that exports one function, `Set-SeppsWorkshopTheme`, without parameters. There is one theme, so there is no data table and nothing to choose.

All three files are ASCII only. The version guard runs on Windows PowerShell 5.1, which reads a script without a byte order mark in the ANSI code page; a typographic apostrophe in the warning would arrive as garbage. In these files the product is written "Sepp's Workshop" with a straight apostrophe. A test enforces ASCII.

The manifest: `ModuleVersion` from `package.json`, `PowerShellVersion = '7.2'`, author and company `sepp.med gmbh`, MIT, a GUID generated once and then permanent (the Gallery identifies the module by it), project and licence URLs of this repository.

### Mapping

`src/shell-roles.mjs` walks `tokens.shell_roles` in order and returns two lists: the PSReadLine entries and the `$PSStyle` entries. For each key a role lists:

- a colour target that starts with `overlay.` is a background, read from `tokens.overlay[name].hex_terminal`, with no foreground;
- any other target is resolved with `resolveTarget` and is a foreground;
- each style (`italic`, `bold`, `underline`) is put in front of the colour.

When two roles list the same key, one as a background and one as text, the entries are merged into one value; two foregrounds or two backgrounds for one key are an error. `resolveTarget` throws on an unknown name, and the port adds no fallback. Roles without a `psreadline` or `psstyle` key are skipped. Both artefacts are rendered by `src/templates.mjs` from one list of statements built on these two lists, so the script and the module cannot drift. Colours are written as `$PSStyle.Foreground.FromRgb(r, g, b)` and `$PSStyle.Background.FromRgb(r, g, b)`.

### Selection

PSReadLine stops emitting token colours inside a selection (`Render.cs`: `UpdateColorsIfNecessary` writes nothing while `inSelectedRegion`). With a background alone, the selected text would take the colour of whichever token the selection starts in. So `Selection` is `selection_text` on `selection`: one foreground on the overlay, as in the Vivid Life sibling.

`ListPredictionSelected` is different: PSReadLine puts it under the row and draws the row's own colours (`ListPrediction`, `Emphasis`) on top. It stays a background alone, which is also PSReadLine's default shape. The foundation already gates `fg`, `fg_muted` and `accent` on that row.

One deliberate difference from the sibling: comments are italic, because the foundation says so.

### Version guards

Kept from the sibling:

- Before PowerShell 7.2 the script prints a warning and changes nothing; the module's manifest refuses to load there. The guard asks for the version, not for `$PSStyle`, so it also works under strict mode in Windows PowerShell 5.1.
- PSReadLine is only touched if it is available.
- `ListPrediction` and `ListPredictionSelected` need PSReadLine 2.2.2, and `Set-PSReadLineOption -Colors` throws at the first key it does not know and leaves the rest of the table unset. Those two go in a second call inside `try`/`catch`, so PSReadLine 2.1.0 (bundled with PowerShell 7.2) still gets every other colour.
- Every `$PSStyle` assignment is wrapped on its own: the property set has grown since 7.2.

The script defines no function and no variable, so nothing stays in the session; a test checks that.

### Not set

Keys with no role in the foundation are not written and are listed in the README: PSReadLine's `ListPredictionTooltip`; `$PSStyle.Formatting.FeedbackName`, `FeedbackText` and `FeedbackAction`; `$PSStyle.FileInfo.Extension`. The progress bar was first listed here; the foundation then gained a `progress` role (`accent`, bold) with the path `Progress.Style`. The ANSI palette belongs to the terminal emulator (the Windows Terminal port), the prompt to the Starship port.

### Build

`build.mjs` writes the script, the module and the manifest, and copies the README images (`sepps-workshop-header.jpg`, `sepp-recruiting.png`) from the foundation's `assets/` into `images/`. Same tokens in, byte-identical output. `.gitattributes` pins `themes/**` and `SeppsWorkshopPowerShell/**` to LF, so a checkout with Git for Windows still equals a fresh build.

### Tests (`node --test`)

1. Every PSReadLine key and every `$PSStyle` path a shell role lists is in the script and in the module, with the value derived from the tokens: colour, style, or background from `hex_terminal`.
2. Nothing else is set: no PSReadLine key and no `$PSStyle` assignment that no role lists.
3. The prediction keys are in the guarded call and nowhere else.
4. The script, the module and the manifest are ASCII only.
5. No hex colour literal in `src/` or `build.mjs` outside comments.
6. The manifest carries the version of `package.json`, the fixed GUID and exports exactly `Set-SeppsWorkshopTheme`.
7. The committed `themes/`, `SeppsWorkshopPowerShell/` and `images/` equal a fresh build.
8. Integration with a real PowerShell 7 (`pwsh`, or `pwsh.exe` through WSL interop, as in the Windows Terminal port; skipped where neither exists): with `-NoProfile`, dot-source the script, then read back every `Get-PSReadLineOption` colour and every `$PSStyle` property and compare with the expected escape sequences. The same after `Import-Module` of the built module and `Set-SeppsWorkshopTheme`. `Test-ModuleManifest` accepts the manifest.
9. Integration with Windows PowerShell 5.1, where available: the script prints the warning and throws nothing.

There is no CI test workflow, as in the other ports.

### Install (README)

From the PowerShell Gallery:

```powershell
Install-Module -Name SeppsWorkshopPowerShell -Scope CurrentUser
```

and in `$PROFILE`:

```powershell
Import-Module SeppsWorkshopPowerShell
Set-SeppsWorkshopTheme
```

Or without a module: clone the repository and dot-source `themes/sepps-workshop.ps1` from `$PROFILE`. The README says how to create a profile that does not exist yet, names the PowerShell 7.2 requirement and the PSReadLine 2.2.2 note with the upgrade command, and has an uninstall section. Until the first release the Gallery path is described as it will work; the release is the user's step.

### README

English, no emoji, exact where technical, relaxed elsewhere. Sections: header image, what it is, requirements, install, recommended companions (the Windows Terminal port for the background and the ANSI colours, JetBrains Mono or JetBrainsMono Nerd Font, the Starship port), how it is built with the deliberate choices, not set, contributing (colour problems go to the foundation, mapping mistakes here), licence, and "Want to join Sepp’s Workshop?" as in the other ports. A screenshot needs a running terminal; the README gets one when the user adds it.

### Scaffolding

From the Sepp’s Workshop ports, adapted in names and paths: `CLAUDE.md`, `.claude/settings.json` (without the fish permissions), `.claude/learnings.md`, `.githooks/pre-commit`, `scripts/sync-config-table.sh`, `.gitignore`, `.prettierignore`, `.claudeignore`, `.gitattributes`, `claude.yml` and `claude-code-review.yml`, `LICENSE` (MIT, sepp.med gmbh), `CHANGELOG.md`. The handoff skill is copied from the foundation to `.claude/skills/sepps-workshop/SKILL.md`.

From the Vivid Life sibling: `.github/workflows/publish-to-powershell-gallery.yml` (`Test-ModuleManifest`, then `Publish-Module` on a `v*` tag, with the `PSGALLERY_API_KEY` secret) and the `/release` skill (pre-flight, version bump, rebuild so the manifest takes the version, changelog, commit, tag, push), extended by the GitHub release step the Sepp’s Workshop ports have. Added later on the user's request, in every Sepp’s Workshop repository: the two Claude workflows pin `claude-code-action` to a commit, and a Dependabot file keeps the pinned actions current.

`package.json` is private, MIT, version `0.1.0`, with `@sepps-workshop/design-system` and Prettier as the only dev dependencies.

## Order of work

1. Foundation: implement and test the `psstyle` roles, commit locally.
2. Port: build everything against the local foundation checkout, commit locally.
3. The user releases foundation 0.10.0.
4. Port: install `^0.10.0` from npm, regenerate the lockfile, rerun build and tests, commit.

## Out of scope

- Pushing, tagging and releasing either repository.
- The PowerShell Gallery account, the `PSGALLERY_API_KEY` secret and the first publication.
- Changing the user's own profile to use the theme.
- A screenshot, a CI test workflow.

## Follow-ups in other repositories

- `sepps-workshop-windows-terminal`, README: "a PowerShell port is planned" becomes a link once this port is public.
- `sepps-workshop-fish` and `sepps-workshop-starship`, READMEs: link this port where they list their siblings.
- The organisation profile README, if it lists the ports.

## After this ships

Ask whether the theme used the foundation correctly and log corrections to `.claude/learnings.md`, as the skill requires.
