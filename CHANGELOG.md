# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed

- Updated to `@sepps-workshop/design-system` 0.12.0.
- The PSReadLine selection is a light Sunset tint (`#4e4d39`) instead of a near-black (`#1b1f25`). The dark selection differed from the background mostly in hue and hardly in lightness, so it was easy to miss. The selected text keeps the plain text colour, now at 7.13:1.

## [0.1.1] - 2026-10-13

### Changed

- README rewritten in a friendlier voice: Sepp, the robot the theme is named after, now introduces it. The instructions are unchanged.

## [0.1.0] - 2026-10-13

### Added

- The Sepp’s Workshop theme for PowerShell: the PSReadLine colours of the command line and the `$PSStyle` colours of PowerShell's output and progress bar, built from the shell roles of `@sepps-workshop/design-system`.
- Installed from a clone: the script `themes/sepps-workshop.ps1` to dot-source, or the module `SeppsWorkshopPowerShell` with `Set-SeppsWorkshopTheme`.
- Tests that derive every expected value from the design system and apply the built theme in a real PowerShell.
