<p align="center">
  <img src="./images/sepps-workshop-header.jpg" width="100%" alt="Sepp, the blue robot, assembling code blocks with a wrench in his workshop" />
</p>

# Sepp’s Workshop for PowerShell

<p>
  <img src="https://img.shields.io/badge/WCAG-AA-3aaa35" alt="WCAG AA" />
  <img src="https://img.shields.io/badge/license-MIT-b2b2b2" alt="MIT license" />
</p>

One dark colour theme for [PowerShell](https://learn.microsoft.com/powershell/), in the sepp.med colours, with Sunset yellow as the accent. It colours what you type (PSReadLine: syntax highlighting, predictions, the selection) and what PowerShell prints by itself (`$PSStyle`: errors, warnings, table headers, directory listings, the progress bar). There are no variants and nothing to configure: this is the one theme.

The colours come from the [Sepp’s Workshop design system](https://github.com/sepps-workshop/sepps-workshop-design-system), whose build refuses to ship a text colour that fails WCAG AA on its background. That includes the text on a selection and on the selected row of the prediction list.

## Requirements

PowerShell 7.2 or later. The theme uses `$PSStyle`, which arrived in that release. On an older host, Windows PowerShell 5.1 included, the script prints a warning and changes nothing, and the module refuses to load.

PowerShell 7.2 itself ships PSReadLine 2.1.0, which does not know the two colours of the prediction list. Everything else still applies. To get those two as well, check `(Get-Module PSReadLine).Version` and upgrade:

```powershell
Install-Module -Name PSReadLine -MinimumVersion 2.2.2 -Force -SkipPublisherCheck
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
