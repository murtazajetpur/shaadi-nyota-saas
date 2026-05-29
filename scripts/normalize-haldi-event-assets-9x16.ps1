$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$root = Resolve-Path -LiteralPath '.'
$haldiDir = Resolve-Path -LiteralPath 'public\assets\events\haldi'

if (-not $haldiDir.Path.StartsWith($root.Path)) {
  throw 'Resolved Haldi asset directory is outside the workspace.'
}

$targetWidth = 1080
$targetHeight = 1920
$targetRatio = $targetWidth / $targetHeight

$files = Get-ChildItem -LiteralPath $haldiDir -File -Filter 'event-haldi-*.png' |
  Where-Object { $_.BaseName -notmatch '(-9x16|-current-\d+x\d+)$' } |
  Sort-Object Name

foreach ($file in $files) {
  $image = [System.Drawing.Image]::FromFile($file.FullName)
  try {
    $width = $image.Width
    $height = $image.Height
    $sourceRatio = $width / $height

    $archivePath = Join-Path $haldiDir "$($file.BaseName)-current-$($width)x$($height)$($file.Extension)"
    if (-not (Test-Path -LiteralPath $archivePath)) {
      Copy-Item -LiteralPath $file.FullName -Destination $archivePath
    }

    if ($sourceRatio -gt $targetRatio) {
      $cropHeight = $height
      $cropWidth = [int][Math]::Round($height * $targetRatio)
      $cropX = [int][Math]::Floor(($width - $cropWidth) / 2)
      $cropY = 0
    } else {
      $cropWidth = $width
      $cropHeight = [int][Math]::Round($width / $targetRatio)
      $cropX = 0
      $cropY = [int][Math]::Floor(($height - $cropHeight) / 2)
    }

    $destPath = Join-Path $haldiDir "$($file.BaseName)-9x16$($file.Extension)"
    $bitmap = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

        $sourceRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropWidth, $cropHeight)
        $destRect = New-Object System.Drawing.Rectangle(0, 0, $targetWidth, $targetHeight)
        $graphics.DrawImage($image, $destRect, $sourceRect, [System.Drawing.GraphicsUnit]::Pixel)
      } finally {
        $graphics.Dispose()
      }

      $bitmap.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $image.Dispose()
  }
}

Write-Output "Generated $($files.Count) Haldi 9:16 assets and current-ratio archive copies."
