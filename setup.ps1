[CmdletBinding()]
param(
    [ValidateSet('core', 'research', 'adobe', 'design', 'full')]
    [string]$Profile = 'core',
    [string]$Target,
    [string]$SkillsHome,
    [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
$pythonCommand = $null
foreach ($candidate in @('py', 'python', 'python3')) {
    $resolved = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($resolved) {
        & $resolved.Source -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)' 2>$null
        if ($LASTEXITCODE -eq 0) { $pythonCommand = $resolved.Source; break }
    }
}
if (-not $pythonCommand) { throw 'Install Python 3.11 or newer from python.org, then run this script again.' }
$toolkitArgs = @((Join-Path $PSScriptRoot 'toolkit.py'), 'install', '--profile', $Profile)
if ($Target) { $toolkitArgs += @('--target', $Target) }
if ($SkillsHome) { $toolkitArgs += @('--skills-home', $SkillsHome) }
if ($DryRun) { $toolkitArgs += '--dry-run' }
& $pythonCommand @toolkitArgs
if ($LASTEXITCODE -ne 0) { throw 'Installation failed. See the error above.' }
Write-Host 'Next: read docs/QUICKSTART.md for optional tools and Adobe panel setup.'
