# sepps-workshop-powershell

PowerShell port of the [Sepp’s Workshop design system](https://github.com/sepps-workshop/sepps-workshop-design-system). Node.js + ESM. Reads tokens from `@sepps-workshop/design-system`; emits one theme script to `themes/` and one module to `SeppsWorkshopPowerShell/`. One theme, no variants.

## Key Config Files

| File                                                  | Purpose                                                                                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `.claude/learnings.md`                                | One-line corrections from past sessions; appended to, never rewritten                                                    |
| `.claude/settings.json`                               | Permissions, secret-file guard, PostToolUse Prettier hook, env defaults                                                  |
| `.claude/skills/release/SKILL.md`                     | `/release` skill: version bump → manifest rebuild → CHANGELOG → tag → push → GitHub release; CI publishes to the Gallery |
| `.claude/skills/sepps-workshop/SKILL.md`              | Port-side skill: how to read foundation tokens; copied from the foundation's `handoff/`                                  |
| `.claudeignore`                                       | Paths Claude Code should skip when indexing (`node_modules/`, generated output)                                          |
| `.githooks/pre-commit`                                | Runs sync-config-table.sh and gitleaks on every commit                                                                   |
| `.github/workflows/claude-code-review.yml`            | Auto-reviews PRs with Claude on open/synchronize                                                                         |
| `.github/workflows/claude.yml`                        | Responds to `@claude` mentions in issues, PRs, and review comments                                                       |
| `.github/workflows/publish-to-powershell-gallery.yml` | `Publish-Module` on a `v*` tag push (needs the `PSGALLERY_API_KEY` secret)                                               |
| `.gitignore`                                          | Git ignore patterns                                                                                                      |
| `.prettierignore`                                     | Paths Prettier must skip: generated `themes/`, `SeppsWorkshopPowerShell/` and `images/`                                  |
| `build.mjs`                                           | Reads foundation tokens, emits the script, the module and its manifest, and copies the README images                     |
| `package.json`                                        | npm scripts (`build`, `test`, `format`) and the design-system devDependency                                              |
| `scripts/sync-config-table.sh`                        | Keeps this table in sync with the filesystem (called by pre-commit)                                                      |

## Commands

- `npm install` — fetch deps (foundation tokens, prettier)
- `npm run build` — read tokens, emit `themes/sepps-workshop.ps1`, `SeppsWorkshopPowerShell/` and `images/`
- `npm test` — mapping and template tests, then an integration test that applies the theme in a real PowerShell (needs `pwsh`, or `pwsh.exe` and `powershell.exe` through WSL interop; skipped where there is none)
- `npm run format` — run Prettier on the project

After cloning, run `git config core.hooksPath .githooks` to enable the pre-commit hook.

## Structure

- `build.mjs` — top-level build script
- `src/shell-roles.mjs` — walks `tokens.shell_roles` into two entry lists (`psreadlineEntries`, `psstyleEntries`), merges a background role and a text role that share one key, and writes an entry as a PowerShell expression (`psValue`)
- `src/templates.mjs` — `statements(tokens)`, the PowerShell lines both artefacts share, and `buildTheme`, `buildModule`, `buildManifest` around them
- `src/shell-roles.test.mjs`, `src/templates.test.mjs` — unit tests; expected values come from the tokens
- `src/pwsh.test.mjs` — applies the built script and module in PowerShell 7 with `-NoProfile` and reads every colour back; runs the script in Windows PowerShell 5.1
- `themes/` and `SeppsWorkshopPowerShell/` — **generated**, committed (a clone and the Gallery install them as they are)
- `images/` — **generated**: copied by the build from the foundation's `assets/`

## References

`.claude/skills/sepps-workshop/SKILL.md` **Read when:** adding or changing any colour mapping. It maps port needs to foundation tokens.

`node_modules/@sepps-workshop/design-system/README.md` **Read when:** you need to know what a role means or why a value is what it is.

`docs/superpowers/specs/2026-10-13-powershell-port-design.md` **Read when:** you need the reasoning behind a mapping, a version guard or the install story.

## Conventions

- **No colour in this repository.** No hex value and no alpha arithmetic in `src/` or `build.mjs`. A test fails on either.
- **The foundation decides which keys exist.** The templates write the PSReadLine keys and `$PSStyle` paths that `shell_roles` lists and no others. A key with no role is not set; list it in the README.
- **Overlays are backgrounds, flattened for the terminal.** A role whose colour is `overlay.<name>` becomes a background from `overlay.<name>.hex_terminal`.
- **Two roles may share one key** as background and text (`Selection`). Two foregrounds or two backgrounds for one key throw.
- **Foundation gaps go upstream.** A value the port needs and cannot find is fixed in `sepps-workshop-design-system`, not approximated here.
- **Resolve role names with `resolveTarget`.** It throws on an unknown name; do not add a fallback.
- **One set of statements.** The script and the module both render `statements(tokens)`. Change the mapping there, never in one artefact alone.
- **Generated PowerShell is ASCII.** Windows PowerShell 5.1 reads a script without a byte order mark in the ANSI code page, and it is the host that prints the version warning. In generated files the product is "Sepp's Workshop" with a straight apostrophe.
- **Version guards.** PowerShell 7.2 is the floor. `ListPrediction` and `ListPredictionSelected` need PSReadLine 2.2.2 and go in the second, guarded `Set-PSReadLineOption` call. Each `$PSStyle` assignment has its own `try`.
- **The module GUID is permanent.** `MODULE_GUID` in `src/templates.mjs` is the module's identity on the PowerShell Gallery.
- **Releases go through `/release`.** `Publish-Module` runs in CI on the tag push, never locally.
- **Verify in a real PowerShell.** The unit tests check strings; only `src/pwsh.test.mjs` shows that PowerShell accepts them.
- **Scope.** PowerShell colours the command line and its own output. The ANSI palette belongs to the terminal port, the prompt to the Starship port.
- **Determinism.** Same tokens in, byte-identical output. `npm test` fails if `themes/`, `SeppsWorkshopPowerShell/` or `images/` is stale.
- **Writing.** The product name is written "Sepp’s Workshop" with a typographic apostrophe, the company "sepp.med gmbh". Docs are English, exact where technical, no emoji.

## Don't

- Don't hand-edit `themes/`, `SeppsWorkshopPowerShell/` or `images/`; run `npm run build`.
- Don't add a second theme, a variant, or a parameter to `Set-SeppsWorkshopTheme`.
- Don't regenerate the module GUID, and don't run `Publish-Module`.
- Don't commit secrets. Don't use `--force`.

## Learnings

When the user corrects a mistake or points out a recurring issue, append a one-line summary to `.claude/learnings.md`. Don't modify CLAUDE.md directly.

## Compact Instructions

When compacting, preserve: list of modified files, current test status, open TODOs, and key decisions made.
