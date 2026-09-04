param([string]$Source = (Split-Path -Parent $PSScriptRoot))

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$codexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE ".codex" }
$skillsRoot = Join-Path $codexRoot "skills"
$target = Join-Path $skillsRoot "mint-report-ppt"
try { $powerPoint = New-Object -ComObject PowerPoint.Application; $powerPoint.Quit() } catch { throw "Microsoft PowerPoint desktop is required for automatic PPT merge." }
$font = New-Object System.Drawing.Font("Microsoft YaHei", 12)
if ($font.Name -ne "Microsoft YaHei") { throw "Microsoft YaHei font is required." }
$font.Dispose()

[System.IO.Directory]::CreateDirectory($skillsRoot) | Out-Null
if (Test-Path $target) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  Move-Item -LiteralPath $target -Destination "$target.backup-$stamp"
}
Copy-Item -LiteralPath $Source -Destination $target -Recurse
Write-Host "Installed mint-report-ppt at $target"
Write-Host "mint-report-deck was not modified. Restart Codex before first use."
