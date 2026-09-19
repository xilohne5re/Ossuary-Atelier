# gen-assets.ps1 — generate OG image + favicon set for Ossuary Atelier
# Uses System.Drawing (GDI+) — Windows only, no dependencies
param([string]$OutDir = (Resolve-Path '..').Path)

Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'

$VOID = [System.Drawing.Color]::FromArgb(8, 8, 16)
$VOID_DEEP = [System.Drawing.Color]::FromArgb(4, 4, 10)
$MIDNIGHT = [System.Drawing.Color]::FromArgb(28, 24, 40)
$VIOLET = [System.Drawing.Color]::FromArgb(201, 184, 232)
$BRUISE = [System.Drawing.Color]::FromArgb(75, 45, 122)

function Draw-Almond {
  param($g, $cx, $cy, $su, $fill)
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $p.AddBezier(($cx - 72 * $su), ($cy), ($cx - 52 * $su), ($cy - 48 * $su),
               ($cx + 52 * $su), ($cy - 48 * $su), ($cx + 72 * $su), ($cy))
  $p.AddBezier(($cx + 72 * $su), ($cy), ($cx + 52 * $su), ($cy + 48 * $su),
               ($cx - 52 * $su), ($cy + 48 * $su), ($cx - 72 * $su), ($cy))
  $p.CloseFigure()
  $g.FillPath($fill, $p)
  $p.Dispose()
}

function Draw-Eye {
  param($g, $cx, $cy, $drawWidth)
  $cx = [double]$cx; $cy = [double]$cy; $drawWidth = [double]$drawWidth
  $su = $drawWidth / 144.0

  # Almond
  $brushV = New-Object System.Drawing.SolidBrush($VIOLET)
  Draw-Almond $g $cx $cy $su $brushV
  $brushV.Dispose()

  # Iris
  $brushM = New-Object System.Drawing.SolidBrush($MIDNIGHT)
  $g.FillEllipse($brushM, ($cx - 46 * $su), ($cy - 36 * $su), (92 * $su), (72 * $su))
  $brushM.Dispose()

  # Inner iris circle r36 stroke
  $penA = New-Object System.Drawing.Pen($VIOLET, (2.2 * $su))
  $penA.StartCap = 'Round'; $penA.EndCap = 'Round'
  $g.DrawEllipse($penA, ($cx - 36 * $su), ($cy - 36 * $su), (72 * $su), (72 * $su))
  $penA.Dispose()

  # Pupil fill r18
  $brushV2 = New-Object System.Drawing.SolidBrush($VIOLET)
  $g.FillEllipse($brushV2, ($cx - 18 * $su), ($cy - 18 * $su), (36 * $su), (36 * $su))
  $brushV2.Dispose()

  # Inner r10 fill midnight
  $brushM2 = New-Object System.Drawing.SolidBrush($MIDNIGHT)
  $g.FillEllipse($brushM2, ($cx - 10 * $su), ($cy - 10 * $su), (20 * $su), (20 * $su))
  $brushM2.Dispose()

  # Center ring r5.5 stroke
  $penB = New-Object System.Drawing.Pen($VIOLET, (1.6 * $su))
  $penB.StartCap = 'Round'; $penB.EndCap = 'Round'
  $g.DrawEllipse($penB, ($cx - 5.5 * $su), ($cy - 5.5 * $su), (11 * $su), (11 * $su))
  $penB.Dispose()

  # Lashes
  $penL = New-Object System.Drawing.Pen($VIOLET, (2.8 * $su))
  $penL.StartCap = 'Round'; $penL.EndCap = 'Round'
  $penT = New-Object System.Drawing.Pen($VIOLET, (1.8 * $su))
  $penT.StartCap = 'Round'; $penT.EndCap = 'Round'

  $g.DrawLine($penL, ($cx - 72 * $su), $cy, ($cx - 86 * $su), $cy)
  $g.DrawLine($penT, ($cx - 86 * $su), ($cy - 7 * $su), ($cx - 86 * $su), ($cy + 7 * $su))
  $g.DrawLine($penL, ($cx + 72 * $su), $cy, ($cx + 86 * $su), $cy)
  $g.DrawLine($penT, ($cx + 86 * $su), ($cy - 7 * $su), ($cx + 86 * $su), ($cy + 7 * $su))

  $penL.Dispose(); $penT.Dispose()
}

$assetsDir = Join-Path $OutDir 'assets\images'
if (-not (Test-Path $assetsDir)) { New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null }

# --- OG image 1200x630 ---
$ogW = 1200; $ogH = 630
$bmp = New-Object System.Drawing.Bitmap($ogW, $ogH)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

$rect = New-Object System.Drawing.Rectangle(0, 0, $ogW, $ogH)
$brushBg = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $VOID, $VOID_DEEP, [float]155)
$g.FillRectangle($brushBg, $rect)
$brushBg.Dispose()

$brushGlow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 75, 45, 122))
$g.FillEllipse($brushGlow, 250, 40, 700, 550)
$brushGlow.Dispose()

Draw-Eye $g ($ogW / 2.0) ($ogH / 2.0) 420

$penBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(70, 75, 45, 122), 4)
$g.DrawRectangle($penBorder, 4, 4, ($ogW - 8), ($ogH - 8))
$penBorder.Dispose()

$g.Dispose()
$ogPath = Join-Path $OutDir 'assets\og-image.png'
$bmp.Save($ogPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Created $ogPath"

# --- favicon-32.png ---
$bmp = New-Object System.Drawing.Bitmap(32, 32)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$brushBg = New-Object System.Drawing.SolidBrush($VOID)
$g.FillRectangle($brushBg, 0, 0, 32, 32)
$brushBg.Dispose()
Draw-Eye $g 16 16 24
$g.Dispose()
$f32 = Join-Path $OutDir 'assets\favicon-32.png'
$bmp.Save($f32, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Created $f32"

# --- apple-touch-icon.png (180x180) ---
$bmp = New-Object System.Drawing.Bitmap(180, 180)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$brushBg = New-Object System.Drawing.SolidBrush($VOID)
$g.FillRectangle($brushBg, 0, 0, 180, 180)
$brushBg.Dispose()
$brushGlow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 75, 45, 122))
$g.FillEllipse($brushGlow, 15, 15, 150, 150)
$brushGlow.Dispose()
Draw-Eye $g 90 90 130
$g.Dispose()
$f180 = Join-Path $OutDir 'assets\apple-touch-icon.png'
$bmp.Save($f180, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Created $f180"

# --- favicon-192.png ---
$bmp = New-Object System.Drawing.Bitmap(192, 192)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$brushBg = New-Object System.Drawing.SolidBrush($VOID)
$g.FillRectangle($brushBg, 0, 0, 192, 192)
$brushBg.Dispose()
Draw-Eye $g 96 96 140
$g.Dispose()
$f192 = Join-Path $OutDir 'assets\favicon-192.png'
$bmp.Save($f192, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Created $f192"

# --- favicon-512.png ---
$bmp = New-Object System.Drawing.Bitmap(512, 512)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$brushBg = New-Object System.Drawing.SolidBrush($VOID)
$g.FillRectangle($brushBg, 0, 0, 512, 512)
$brushBg.Dispose()
$brushGlow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(25, 75, 45, 122))
$g.FillEllipse($brushGlow, 56, 56, 400, 400)
$brushGlow.Dispose()
Draw-Eye $g 256 256 360
$g.Dispose()
$f512 = Join-Path $OutDir 'assets\favicon-512.png'
$bmp.Save($f512, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Created $f512"

Write-Host "`nAll assets generated."