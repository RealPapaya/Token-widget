Add-Type -AssemblyName System.Drawing

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$SourcePath = Join-Path $Root 'assets\app-source.png'
$OutPath = Join-Path $Root 'assets\app.ico'

if (-not (Test-Path -LiteralPath $SourcePath)) {
  throw "Missing icon source: $SourcePath"
}

function Save-PngBytes([System.Drawing.Bitmap]$Bitmap) {
  $stream = New-Object System.IO.MemoryStream
  try {
    $Bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
    return $stream.ToArray()
  } finally {
    $stream.Dispose()
  }
}

function ColorDistance($A, $B) {
  return [Math]::Abs($A.R - $B.R) + [Math]::Abs($A.G - $B.G) + [Math]::Abs($A.B - $B.B)
}

function New-IconPng([System.Drawing.Bitmap]$Source, [int]$Size) {
  $bg = $Source.GetPixel(0, 0)
  $threshold = 36
  $minX = $Source.Width
  $minY = $Source.Height
  $maxX = -1
  $maxY = -1

  for ($y = 0; $y -lt $Source.Height; $y++) {
    for ($x = 0; $x -lt $Source.Width; $x++) {
      $p = $Source.GetPixel($x, $y)
      if ($p.A -gt 8 -and (ColorDistance $p $bg) -gt $threshold) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  if ($maxX -lt $minX -or $maxY -lt $minY) {
    $minX = 0; $minY = 0; $maxX = $Source.Width - 1; $maxY = $Source.Height - 1
  }

  $cropW = $maxX - $minX + 1
  $cropH = $maxY - $minY + 1
  $cutout = New-Object System.Drawing.Bitmap $cropW, $cropH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try {
    for ($y = 0; $y -lt $cropH; $y++) {
      for ($x = 0; $x -lt $cropW; $x++) {
        $p = $Source.GetPixel($minX + $x, $minY + $y)
        $dist = ColorDistance $p $bg
        if ($p.A -le 8 -or $dist -le $threshold) {
          $cutout.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
        } else {
          $cutout.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($p.A, $p.R, $p.G, $p.B))
        }
      }
    }

    $pad = [Math]::Max(1, [int][Math]::Round($Size * 0.08))
    $scale = [Math]::Min(($Size - $pad * 2) / $cropW, ($Size - $pad * 2) / $cropH)
    $drawW = [Math]::Max(1, [int][Math]::Round($cropW * $scale))
    $drawH = [Math]::Max(1, [int][Math]::Round($cropH * $scale))
    $drawX = [int][Math]::Round(($Size - $drawW) / 2)
    $drawY = [int][Math]::Round(($Size - $drawH) / 2)

    $dest = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    try {
      $g.Clear([System.Drawing.Color]::Transparent)
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $destRect = New-Object System.Drawing.Rectangle $drawX, $drawY, $drawW, $drawH
      $g.DrawImage($cutout, $destRect, 0, 0, $cropW, $cropH, [System.Drawing.GraphicsUnit]::Pixel)
    } finally {
      $g.Dispose()
    }

    try { return Save-PngBytes $dest } finally { $dest.Dispose() }
  } finally {
    $cutout.Dispose()
  }
}

function Write-UInt16LE([System.IO.Stream]$Stream, [int]$Value) {
  $Stream.WriteByte($Value -band 0xff)
  $Stream.WriteByte(($Value -shr 8) -band 0xff)
}

function Write-UInt32LE([System.IO.Stream]$Stream, [int64]$Value) {
  $Stream.WriteByte($Value -band 0xff)
  $Stream.WriteByte(($Value -shr 8) -band 0xff)
  $Stream.WriteByte(($Value -shr 16) -band 0xff)
  $Stream.WriteByte(($Value -shr 24) -band 0xff)
}

$source = [System.Drawing.Bitmap]::FromFile($SourcePath)
try {
  $sizes = @(16, 32, 48, 256)
  $images = @()
  foreach ($size in $sizes) {
    $images += ,@{ Size = $size; Data = New-IconPng $source $size }
  }

  $stream = New-Object System.IO.MemoryStream
  try {
    Write-UInt16LE $stream 0
    Write-UInt16LE $stream 1
    Write-UInt16LE $stream $images.Count
    $offset = 6 + $images.Count * 16
    foreach ($img in $images) {
      $stream.WriteByte($(if ($img.Size -eq 256) { 0 } else { $img.Size }))
      $stream.WriteByte($(if ($img.Size -eq 256) { 0 } else { $img.Size }))
      $stream.WriteByte(0)
      $stream.WriteByte(0)
      Write-UInt16LE $stream 1
      Write-UInt16LE $stream 32
      Write-UInt32LE $stream $img.Data.Length
      Write-UInt32LE $stream $offset
      $offset += $img.Data.Length
    }
    foreach ($img in $images) {
      $stream.Write($img.Data, 0, $img.Data.Length)
    }
    [System.IO.File]::WriteAllBytes($OutPath, $stream.ToArray())
  } finally {
    $stream.Dispose()
  }
} finally {
  $source.Dispose()
}

Write-Output "wrote transparent assets/app.ico from assets/app-source.png"
