# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- The Sepp’s Workshop theme for PowerShell: the PSReadLine colours of the command line and the `$PSStyle` colours of PowerShell's output, built from the shell roles of `@sepps-workshop/design-system`.
- Two ways to install it: the module `SeppsWorkshopPowerShell` with `Set-SeppsWorkshopTheme`, and the standalone script `themes/sepps-workshop.ps1`.
- Tests that derive every expected value from the design system and apply the built theme in a real PowerShell.
