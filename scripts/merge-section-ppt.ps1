param(
  [Parameter(Mandatory=$true)][string]$TaskCard,
  [Parameter(Mandatory=$true)][string]$Output,
  [Parameter(Mandatory=$true)][string[]]$SectionPptx
)

$ErrorActionPreference = "Stop"
if (-not $IsWindows -and $PSVersionTable.PSEdition -eq "Core") { throw "Automatic native merge requires Windows PowerPoint." }

$task = Get-Content -Raw -LiteralPath $TaskCard | ConvertFrom-Json
if ($task.kind -ne "mint-ppt-task-card" -or $task.requiredSkill -ne "mint-report-ppt") { throw "Invalid mint-report-ppt task card." }

function Read-MintMetadata([string]$PptxPath) {
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $archive = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $PptxPath))
  try {
    $entry = $archive.GetEntry("docProps/custom.xml")
    if ($null -eq $entry) { throw "PPTX has no Mint metadata: $PptxPath" }
    $reader = New-Object System.IO.StreamReader($entry.Open())
    try { [xml]$xml = $reader.ReadToEnd() } finally { $reader.Dispose() }
    $result = @{}
    foreach ($property in $xml.Properties.property) { $result[$property.name] = [string]$property.InnerText }
    return $result
  } finally { $archive.Dispose() }
}

$files = @()
foreach ($pptx in $SectionPptx) {
  if (-not (Test-Path -LiteralPath $pptx)) { throw "Missing section PPTX: $pptx" }
  $meta = Read-MintMetadata $pptx
  if ($meta.MintReportId -ne $task.reportId) { throw "Report ID mismatch: $pptx" }
  if ($meta.MintThemeVersion -ne $task.themeVersion) { throw "Theme mismatch: $pptx" }
  if ($meta.MintSkillVersion -ne $task.skillVersion) { throw "Skill version mismatch: $pptx" }
  if ($meta.MintPptMasterVersion -ne $task.pptMasterVersion) { throw "PPT master mismatch: $pptx" }
  if ($meta.MintTaskCardHash -ne $task.taskCardHash) { throw "Task-card identity mismatch: $pptx" }
  $section = $task.sections | Where-Object { $_.sectionId -eq $meta.MintSectionId }
  if ($null -eq $section) { throw "Unknown section $($meta.MintSectionId): $pptx" }
  if ([int]$meta.MintSectionOrder -ne [int]$section.order) { throw "Section order mismatch: $pptx" }
  $files += [pscustomobject]@{ Path=(Resolve-Path -LiteralPath $pptx).Path; SectionId=$meta.MintSectionId; Order=[int]$section.order }
}

$duplicates = $files | Group-Object SectionId | Where-Object Count -ne 1
if ($duplicates) { throw "Every section must be supplied exactly once; duplicate section IDs were found." }
foreach ($section in $task.sections) { if (-not ($files.SectionId -contains $section.sectionId)) { throw "Missing section: $($section.sectionId)" } }
$files = $files | Sort-Object Order

$powerPoint = $null; $presentation = $null; $started = Get-Date
try {
  $powerPoint = New-Object -ComObject PowerPoint.Application
  $presentation = $powerPoint.Presentations.Add()
  while ($presentation.Slides.Count -gt 0) { $presentation.Slides.Item(1).Delete() }
  foreach ($file in $files) { [void]$presentation.Slides.InsertFromFile($file.Path, $presentation.Slides.Count) }
  $presentation.PageSetup.SlideWidth = 960
  $presentation.PageSetup.SlideHeight = 540
  $properties = $presentation.CustomDocumentProperties
  [void]$properties.Add("MintReportId", $false, 4, [string]$task.reportId)
  [void]$properties.Add("MintThemeVersion", $false, 4, [string]$task.themeVersion)
  [void]$properties.Add("MintPptMasterVersion", $false, 4, [string]$task.pptMasterVersion)
  [void]$properties.Add("MintSkillVersion", $false, 4, [string]$task.skillVersion)
  [void]$properties.Add("MintTaskCardHash", $false, 4, [string]$task.taskCardHash)
  [void]$properties.Add("MintAuthority", $false, 4, "final-pptx")
  [void]$properties.Add("MintMergedSectionIds", $false, 4, [string](($files.SectionId) -join ","))
  $outputPath = [System.IO.Path]::GetFullPath($Output)
  [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($outputPath)) | Out-Null
  $presentation.SaveAs($outputPath, 24)
  $elapsed = ((Get-Date) - $started).TotalMilliseconds
  $result = [pscustomobject]@{ passed=$true; output=$outputPath; sections=$files.Count; sectionIds=@($files.SectionId); slides=$presentation.Slides.Count; elapsedMs=[int]$elapsed; modelCalls=0; browserLaunches=0; sourceReads=0; taskCardHash=$task.taskCardHash; skillVersion=$task.skillVersion; themeVersion=$task.themeVersion }
  $manifestPath = "$outputPath.merge-manifest.json"
  $result | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
  $result | ConvertTo-Json -Depth 4
} finally {
  if ($null -ne $presentation) { $presentation.Close() }
  if ($null -ne $powerPoint) { $powerPoint.Quit() }
  [System.GC]::Collect(); [System.GC]::WaitForPendingFinalizers()
}
