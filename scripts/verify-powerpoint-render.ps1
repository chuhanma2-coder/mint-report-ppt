param(
  [Parameter(Mandatory=$true)][string]$Pptx,
  [Parameter(Mandatory=$true)][string]$DesignRenderDir,
  [Parameter(Mandatory=$true)][string]$OutputDir,
  [string]$Node = "node"
)

$ErrorActionPreference = "Stop"
if (-not (Test-Path -LiteralPath $Pptx)) { throw "PPTX not found: $Pptx" }
if (-not (Test-Path -LiteralPath $DesignRenderDir)) { throw "Design render directory not found: $DesignRenderDir" }
$pptxPath = (Resolve-Path -LiteralPath $Pptx).Path
$designPath = (Resolve-Path -LiteralPath $DesignRenderDir).Path
$outputPath = [System.IO.Path]::GetFullPath($OutputDir)
[System.IO.Directory]::CreateDirectory($outputPath) | Out-Null
$exportPath = Join-Path $outputPath "powerpoint-export"
[System.IO.Directory]::CreateDirectory($exportPath) | Out-Null

$powerPoint = $null; $presentation = $null
try {
  $powerPoint = New-Object -ComObject PowerPoint.Application
  $presentation = $powerPoint.Presentations.Open($pptxPath, $true, $false, $false)
  $slideCount = $presentation.Slides.Count
  $presentation.SaveAs($exportPath, 18)
} finally {
  if ($null -ne $presentation) { $presentation.Close() }
  if ($null -ne $powerPoint) { $powerPoint.Quit() }
  [System.GC]::Collect(); [System.GC]::WaitForPendingFinalizers()
}

$images = Get-ChildItem -LiteralPath $exportPath -File | Where-Object { $_.Extension -match '^\.(png|jpg|jpeg)$' } | Sort-Object Name
if ($images.Count -ne $slideCount) { throw "PowerPoint rendered $($images.Count) images; expected $slideCount." }
for ($i = 0; $i -lt $images.Count; $i++) {
  $target = Join-Path $outputPath ("slide-{0:D2}.png" -f ($i + 1))
  Copy-Item -LiteralPath $images[$i].FullName -Destination $target -Force
  if ((Get-Item -LiteralPath $target).Length -lt 10000) { throw "PowerPoint render is unexpectedly small: $target" }
}

$report = Join-Path $outputPath "powerpoint-visual-parity.json"
& $Node (Join-Path $PSScriptRoot "verify-render-parity.mjs") $designPath $outputPath $slideCount $report
if ($LASTEXITCODE -ne 0) { throw "Microsoft PowerPoint render parity failed. See $report" }
Write-Host "Microsoft PowerPoint render gate passed: $report"
