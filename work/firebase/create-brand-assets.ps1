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
        $mark.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, 40, 91, 148))
      }
    }
    $mark.Save((Join-Path $dist 'brand-logo.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    foreach ($size in @(192, 512)) {
      $icon = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      $g = [System.Drawing.Graphics]::FromImage($icon)
      try {
        $g.Clear([System.Drawing.Color]::FromArgb(233,239,246))
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $pad = [int][Math]::Round($size*0.10)
        $g.DrawImage($mark, $pad, $pad, $size-2*$pad, $size-2*$pad)
      } finally { $g.Dispose() }
      try { $icon.Save((Join-Path $dist "icon-$size.png"), [System.Drawing.Imaging.ImageFormat]::Png) } finally { $icon.Dispose() }
    }
    $favicon = New-Object System.Drawing.Bitmap(48,48,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($favicon)
    try {
      $g.Clear([System.Drawing.Color]::FromArgb(233,239,246))
      $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $g.DrawImage($mark,4,4,40,40)
    } finally { $g.Dispose() }
    try { $favicon.Save((Join-Path $dist 'favicon-48.png'), [System.Drawing.Imaging.ImageFormat]::Png) } finally { $favicon.Dispose() }
  } finally { $mark.Dispose(); $scaled.Dispose() }
} finally { $source.Dispose() }

foreach ($size in @(192,512)) { Copy-Item -LiteralPath (Join-Path $dist "icon-$size.png") -Destination (Join-Path $dist "icon-$size-blue.png") }

# Keep the public download page and Windows launcher on the same brand assets.
$website = Join-Path $Root 'work\website'
if (Test-Path -LiteralPath $website) {
  Copy-Item -LiteralPath (Join-Path $dist 'brand-logo.png') -Destination (Join-Path $website 'logo.png')
  Copy-Item -LiteralPath (Join-Path $dist 'favicon-48.png') -Destination (Join-Path $website 'favicon.png')
}
$desktop = Join-Path $Root 'desktop'
if (Test-Path -LiteralPath $desktop) {
  $png = [System.Drawing.Bitmap]::FromFile((Join-Path $dist 'icon-512.png'))
  $small = New-Object System.Drawing.Bitmap(256,256,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($small)
  $stream = New-Object System.IO.MemoryStream
  try {
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($png,0,0,256,256)
    $small.Save($stream,[System.Drawing.Imaging.ImageFormat]::Png)
    $data = $stream.ToArray()
    $file = [System.IO.File]::Create((Join-Path $desktop 'WorkshopDesk.ico'))
    $writer = New-Object System.IO.BinaryWriter($file)
    try {
      $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]1)
      $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([byte]0)
      $writer.Write([uint16]1); $writer.Write([uint16]32)
      $writer.Write([uint32]$data.Length); $writer.Write([uint32]22); $writer.Write($data)
    } finally { $writer.Dispose(); $file.Dispose() }
  } finally { $g.Dispose(); $small.Dispose(); $png.Dispose(); $stream.Dispose() }
}
