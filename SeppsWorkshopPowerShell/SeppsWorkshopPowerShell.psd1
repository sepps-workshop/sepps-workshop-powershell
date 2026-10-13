@{
    RootModule        = 'SeppsWorkshopPowerShell.psm1'
    ModuleVersion     = '0.1.0'
    GUID              = '24a11770-ee2f-4732-9eb5-8f6b14a6e157'
    Author            = 'sepp.med gmbh'
    CompanyName       = 'sepp.med gmbh'
    Copyright         = '(c) sepp.med gmbh. MIT License.'
    Description       = 'One dark color theme for PowerShell (PSReadLine and $PSStyle) in the sepp.med brand colors. WCAG AA verified.'
    PowerShellVersion = '7.2'
    FunctionsToExport = @('Set-SeppsWorkshopTheme')
    CmdletsToExport   = @()
    VariablesToExport = @()
    AliasesToExport   = @()
    PrivateData       = @{
        PSData = @{
            Tags       = @('theme', 'color-theme', 'dark-theme', 'psreadline', 'pwsh', 'powershell', 'wcag', 'accessibility', 'sepps-workshop')
            LicenseUri = 'https://github.com/sepps-workshop/sepps-workshop-powershell/blob/main/LICENSE'
            ProjectUri = 'https://github.com/sepps-workshop/sepps-workshop-powershell'
        }
    }
}
