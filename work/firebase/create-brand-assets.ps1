param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path)
Add-Type -AssemblyName System.Drawing
$sourcePath = Join-Path $Root 'work\design\logo-original.png'
$dist = Join-Path $Root 'work\design\dist'
$source = [System.Drawing.Bitmap]::FromFile($sourcePath)
try {
  $scaled = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($scaled)
  try {
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($source, 0, 0, 1024, 1024)
  } finally { $graphics.Dispose() }
  $mark = New-Object System.Drawing.Bitmap(1024, 1024, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try {
    for ($y=0; $y -lt 1024; $y++) {
      for ($x=0; $x -lt 1024; $x++) {
        $red = $scaled.GetPixel($x, $y).R
        $alpha = [Math]::Max(0, [Math]::Min(255, [int][Math]::Round((211-$red)*255/211)))
        $mark.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, 0, 77, 51))
      }
    }
    $mark.Save((Join-Path $dist 'brand-logo.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    foreach ($size in @(192, 512)) {
      $icon = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      $g = [System.Drawing.Graphics]::FromImage($icon)
      try {
        $g.Clear([System.Drawing.Color]::FromArgb(211,211,211))
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $pad = [int][Math]::Round($size*0.10)
        $g.DrawImage($mark, $pad, $pad, $size-2*$pad, $size-2*$pad)
      } finally { $g.Dispose() }
      try { $icon.Save((Join-Path $dist "icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png) } finally { $icon.Dispose() }
    }
    $favicon = New-Object System.Drawing.Bitmap(48,48,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($favicon)
    try {
      $g.Clear([System.Drawing.Color]::Transparent)
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.DrawImage($mark,0,0,48,48)
    } finally { $g.Dispose() }
    try { $favicon.Save((Join-Path $dist 'favicon-48.png'), [System.Drawing.Imaging.ImageFormat]::Png) } finally { $favicon.Dispose() }
  } finally { $mark.Dispose(); $scaled.Dispose() }
} finally { $source.Dispose() }
