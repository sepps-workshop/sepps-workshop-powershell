---
name: release
description: Release skill for sepps-workshop-powershell — bumps version, rebuilds the module manifest, updates CHANGELOG, commits, tags, pushes, and creates a GitHub release; CI runs Publish-Module to the PowerShell Gallery. Use only when intentionally cutting a release.
disable-model-invocation: true
---

# Release Skill — sepps-workshop-powershell

The module `SeppsWorkshopPowerShell` is published on the PowerShell Gallery. The tag push triggers `.github/workflows/publish-to-powershell-gallery.yml`, which runs `Publish-Module` on the committed `SeppsWorkshopPowerShell/` folder with the `PSGALLERY_API_KEY` repository secret. Never run `Publish-Module` locally: the API key stays in CI, and a published version cannot be replaced.

Runs the full release sequence: pre-flight → version bump → manifest rebuild → CHANGELOG update → commit → tag → push → GitHub release.

## Pre-flight

Run all checks before doing anything else. Stop and report clearly if any fail.

- Verify on `main`: `git branch --show-current` must output `main`
- Verify working tree clean: `git status --porcelain` must produce no output
- Verify build passes: `npm run build` must exit without error, and must produce no diff (`git status --porcelain` empty again) — the generated files in `themes/` and `SeppsWorkshopPowerShell/` are committed, so drift here means the build wasn't run before committing
- Verify tests pass: `npm test` must exit without error, and no test may be skipped — the integration tests need a real PowerShell 7
- Verify the dependency: `package.json` must name `@sepps-workshop/design-system` by version, not by a local path
- Verify formatting: `npm run format:check` must exit without error
- Verify the secret: `gh secret list` must name `PSGALLERY_API_KEY`. Without it the tag would be pushed and the publication would fail

## CHANGELOG Check

Read `CHANGELOG.md`. Locate the `## [Unreleased]` section.

If it contains no entries (only the heading and surrounding blank lines), stop:

> The `[Unreleased]` section in CHANGELOG.md is empty. Document what changed before running `/release`.

Otherwise show the user the full contents of the `[Unreleased]` section and continue.

## Version Confirmation

Read `"version"` from `package.json` and show the current value.

Show the `[Unreleased]` contents again as context.

Ask the user to confirm the new version number. Suggest the appropriate bump:

- Patch (X.Y.Z+1): bug fixes, documentation updates
- Minor (X.Y+1.0): a foundation minor bump, newly covered PSReadLine keys or `$PSStyle` properties
- Major (X+1.0.0): breaking changes: a renamed module or function, a renamed script file, a raised PowerShell floor

If this is the first-ever release (no existing `v*` git tags — check with `git tag -l 'v*'`), the current `package.json` version may stand as-is rather than being bumped further.

Wait for the user to confirm before proceeding.

## Bump Version

Run `npm version X.Y.Z --no-git-tag-version --allow-same-version` (the last flag lets the first release keep the version `package.json` already has). This updates `"version"` in both `package.json` and `package-lock.json` (the lockfile's root version must match; the tag is created later in the Tag step).

Run `npm run build` so `ModuleVersion` in the manifest takes the new version. The Gallery reads the version from the manifest, not from `package.json`. Confirm with `grep ModuleVersion SeppsWorkshopPowerShell/SeppsWorkshopPowerShell.psd1`, then run `npm test` once more.

## Update CHANGELOG

Edit `CHANGELOG.md`:

1. Replace the `## [Unreleased]` heading with `## [X.Y.Z] - YYYY-MM-DD` where `YYYY-MM-DD` is today's date in ISO 8601 format
2. Insert a new `## [Unreleased]` section at the top (before the versioned entry), with a blank line after the heading

The result should look like:

```
## [Unreleased]

## [X.Y.Z] - YYYY-MM-DD

### <category>

- <entry>

```

## Commit

```bash
git add package.json package-lock.json CHANGELOG.md SeppsWorkshopPowerShell/SeppsWorkshopPowerShell.psd1
git commit -m "🔖 chore(release): bump to vX.Y.Z

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

## Tag

```bash
git tag -a vX.Y.Z -m "Version X.Y.Z"
```

## Push

```bash
git push && git push --tags
```

The tag push starts the publish workflow.

## Create GitHub Release

Extract the release notes from the CHANGELOG section just written and create the release, in one shell call:

```bash
NOTES="$(mktemp)"
VERSION="X.Y.Z"
awk "/^## \[${VERSION}\]/{p=1; next} p && /^## /{exit} p" CHANGELOG.md > "$NOTES"
gh release create "v${VERSION}" \
  --title "v${VERSION}" \
  --notes-file "$NOTES"
```

The Gallery publication runs in CI, independently of this step.

## Confirm

Report to the user:

> Tag vX.Y.Z pushed and release published: https://github.com/sepps-workshop/sepps-workshop-powershell/releases/tag/vX.Y.Z
>
> Monitor the publish run at: https://github.com/sepps-workshop/sepps-workshop-powershell/actions
>
> The Gallery listing usually updates within a few minutes of the workflow completing: https://www.powershellgallery.com/packages/SeppsWorkshopPowerShell
