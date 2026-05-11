$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $root "note-notification-text-strong-color.zip"
$buildRoot = Join-Path $root ".build"
$stage = Join-Path $buildRoot "extension"
$resolvedRoot = [System.IO.Path]::GetFullPath($root)
$resolvedBuildRoot = [System.IO.Path]::GetFullPath($buildRoot)

if (Test-Path -LiteralPath $destination) {
  Remove-Item -LiteralPath $destination -Force
}

if (-not $resolvedBuildRoot.StartsWith($resolvedRoot + [System.IO.Path]::DirectorySeparatorChar)) {
  throw "Build directory is outside the project root: $resolvedBuildRoot"
}

if (Test-Path -LiteralPath $buildRoot) {
  Remove-Item -LiteralPath $buildRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path (Join-Path $stage "src") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $stage "icons") | Out-Null

Copy-Item -LiteralPath (Join-Path $root "manifest.json") -Destination $stage -Force

$srcFiles = @(
  "background.js",
  "content.css",
  "content.js",
  "popup.css",
  "popup.html",
  "popup.js"
)

foreach ($file in $srcFiles) {
  Copy-Item -LiteralPath (Join-Path (Join-Path $root "src") $file) -Destination (Join-Path $stage "src") -Force
}

Get-ChildItem -LiteralPath (Join-Path $root "icons") -Filter "*.png" -File |
  ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $stage "icons") -Force
  }

Compress-Archive -Path (Join-Path $stage "*") -DestinationPath $destination -Force
Remove-Item -LiteralPath $buildRoot -Recurse -Force

Write-Host "Built $destination"
