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
