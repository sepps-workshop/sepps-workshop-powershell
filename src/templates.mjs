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
    "    # These keys need PSReadLine 2.2.0, and PSReadLine stops at the first",
    "    # key it does not know. So they are set on their own.",
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
