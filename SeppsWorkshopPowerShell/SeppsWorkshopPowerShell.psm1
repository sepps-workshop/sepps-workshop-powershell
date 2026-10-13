# Sepp's Workshop for PowerShell
# https://github.com/sepps-workshop/sepps-workshop-powershell
# Generated: do not edit. Change src/templates.mjs and run `npm run build`.

function Set-SeppsWorkshopTheme {
    <#
    .SYNOPSIS
        Applies the Sepp's Workshop colors to PSReadLine and $PSStyle.
    .DESCRIPTION
        Sets the PSReadLine colors of the command line and the
        $PSStyle.Formatting and $PSStyle.FileInfo colors of the output.
        Call it from your $PROFILE to apply the theme in every session.
    .EXAMPLE
        Set-SeppsWorkshopTheme
    #>
    [CmdletBinding()]
    param()

    if ($PSVersionTable.PSVersion -lt [version]'7.2') {
        Write-Warning 'Sepp''s Workshop needs PowerShell 7.2 or later. Nothing was changed.'
        return
    }

    if (Get-Module -ListAvailable -Name PSReadLine) {
        Set-PSReadLineOption -Colors @{
            Command            = $PSStyle.Foreground.FromRgb(128, 199, 231)
            Keyword            = $PSStyle.Foreground.FromRgb(251, 186, 0)
            Parameter          = $PSStyle.Foreground.FromRgb(179, 221, 241)
            Default            = $PSStyle.Foreground.FromRgb(231, 234, 241)
            String             = $PSStyle.Foreground.FromRgb(247, 194, 156)
            Number             = $PSStyle.Foreground.FromRgb(242, 148, 82)
            Variable           = $PSStyle.Foreground.FromRgb(253, 227, 153)
            Type               = $PSStyle.Foreground.FromRgb(253, 227, 153)
            Member             = $PSStyle.Foreground.FromRgb(231, 234, 241)
            Operator           = $PSStyle.Foreground.FromRgb(182, 193, 213)
            Comment            = $PSStyle.Italic + $PSStyle.Foreground.FromRgb(158, 173, 199)
            InlinePrediction   = $PSStyle.Foreground.FromRgb(158, 173, 199)
            ContinuationPrompt = $PSStyle.Foreground.FromRgb(158, 173, 199)
            Error              = $PSStyle.Foreground.FromRgb(255, 137, 123)
            Emphasis           = $PSStyle.Foreground.FromRgb(251, 186, 0)
            Selection          = $PSStyle.Foreground.FromRgb(231, 234, 241) + $PSStyle.Background.FromRgb(27, 31, 37)
        }

        # These keys need PSReadLine 2.2.2, and PSReadLine stops at the first
        # key it does not know. So they are set on their own.
        try {
            Set-PSReadLineOption -Colors @{
                ListPredictionSelected = $PSStyle.Background.FromRgb(62, 66, 62)
                ListPrediction         = $PSStyle.Foreground.FromRgb(231, 234, 241)
            }
        } catch { }
    }

    # $PSStyle has gained properties since PowerShell 7.2: one at a time.
    try { $PSStyle.Formatting.Error = $PSStyle.Foreground.FromRgb(255, 137, 123) } catch { }
    try { $PSStyle.Formatting.ErrorAccent = $PSStyle.Bold + $PSStyle.Foreground.FromRgb(255, 137, 123) } catch { }
    try { $PSStyle.Formatting.Warning = $PSStyle.Foreground.FromRgb(245, 156, 0) } catch { }
    try { $PSStyle.Formatting.Verbose = $PSStyle.Foreground.FromRgb(128, 199, 231) } catch { }
    try { $PSStyle.Formatting.Debug = $PSStyle.Foreground.FromRgb(158, 173, 199) } catch { }
    try { $PSStyle.Formatting.FormatAccent = $PSStyle.Foreground.FromRgb(251, 186, 0) } catch { }
    try { $PSStyle.Formatting.TableHeader = $PSStyle.Bold + $PSStyle.Foreground.FromRgb(251, 186, 0) } catch { }
    try { $PSStyle.Formatting.CustomTableHeaderLabel = $PSStyle.Bold + $PSStyle.Foreground.FromRgb(251, 186, 0) } catch { }
    try { $PSStyle.FileInfo.Directory = $PSStyle.Bold + $PSStyle.Foreground.FromRgb(251, 186, 0) } catch { }
    try { $PSStyle.FileInfo.SymbolicLink = $PSStyle.Foreground.FromRgb(242, 148, 82) } catch { }
    try { $PSStyle.FileInfo.Executable = $PSStyle.Foreground.FromRgb(162, 209, 130) } catch { }
}

Export-ModuleMember -Function Set-SeppsWorkshopTheme
