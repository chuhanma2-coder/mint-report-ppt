param([string]$Source = (Split-Path -Parent $PSScriptRoot))

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$codexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE ".codex" }
$skillsRoot = Join-Path $codexRoot "skills"
$target = Join-Path $skillsRoot "mint-report-ppt"
$Source = (Resolve-Path -LiteralPath $Source).Path
if (-not (Test-Path -LiteralPath (Join-Path $Source "SKILL.md"))) { throw "Invalid Mint skill source" }
$version = (Get-Content -LiteralPath (Join-Path $Source "VERSION") -Raw).Trim()
if ($Source.TrimEnd('\') -eq $target.TrimEnd('\')) { throw "Install from a separate extracted release directory" }
if ($null -eq [System.Type]::GetTypeFromProgID("PowerPoint.Application")) { throw "Microsoft PowerPoint desktop is required for automatic PPT merge." }
$browserCandidates = @($env:MINT_CHROMIUM_EXECUTABLE, $env:CHROME_PATH, $env:EDGE_PATH)
foreach ($base in @($env:ProgramFiles, ${env:ProgramFiles(x86)}, $env:LOCALAPPDATA) | Where-Object { $_ }) {
  $browserCandidates += Join-Path $base "Google\Chrome\Application\chrome.exe"
  $browserCandidates += Join-Path $base "Microsoft\Edge\Application\msedge.exe"
}
$browser = $browserCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
if (-not $browser) { throw "Google Chrome or Microsoft Edge is required for the internal 1920x1080 Design Canvas." }
$font = New-Object System.Drawing.Font("Microsoft YaHei", 12)
if ($font.Name -ne "Microsoft YaHei") { throw "Microsoft YaHei font is required." }
$font.Dispose()

[System.IO.Directory]::CreateDirectory($skillsRoot) | Out-Null
if (Test-Path $target) {
  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  Move-Item -LiteralPath $target -Destination "$target.backup-$stamp"
}
[System.IO.Directory]::CreateDirectory($target) | Out-Null
foreach ($entry in @('SKILL.md','VERSION','RELEASE-FINGERPRINT','package.json','agents','assets','schemas','scripts')) {
  Copy-Item -LiteralPath (Join-Path $Source $entry) -Destination $target -Recurse
}
[System.IO.Directory]::CreateDirectory((Join-Path $target 'references')) | Out-Null
foreach ($reference in @('workflow.md','expression-routing.md','design-layout.md','quality-gates.md','design-intent.md','readability-repair.md','rc5-planning.md','presentation-copy.md')) {
  Copy-Item -LiteralPath (Join-Path $Source "references\$reference") -Destination (Join-Path $target 'references')
}
Write-Host "Installed mint-report-ppt $version at $target (previous installation backed up)"
Write-Host "Browser for Design Canvas: $browser"
Write-Host "mint-report-deck was not modified. Restart Codex before first use."
