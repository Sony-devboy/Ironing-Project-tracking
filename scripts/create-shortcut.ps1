# Create Desktop Shortcut with Custom Icon for IRON frontend
Add-Type -AssemblyName System.Drawing

$width = 256
$height = 256
$bmp = New-Object System.Drawing.Bitmap $width, $height
$g = [System.Drawing.Graphics]::FromImage($bmp)

# Set high quality rendering configurations
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::White)

# Design settings: Text "IRON" in bold Arial Black
$font = [System.Drawing.Font]::new("Arial Black", 55, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$brush = [System.Drawing.Brushes]::Black

# Center and draw the text
$rect = New-Object System.Drawing.RectangleF 0, 0, $width, $height
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("IRON", $font, $brush, $rect, $sf)

# Clean up GDI+ resources immediately
$sf.Dispose()
$font.Dispose()
$g.Dispose()

# Save bitmap contents as raw PNG bytes
$ms = New-Object System.IO.MemoryStream
$bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBytes = $ms.ToArray()
$ms.Dispose()
$bmp.Dispose()

# Generate the .ico file with the PNG bytes and custom 22-byte header
$icoPath = Join-Path $PSScriptRoot "iron.ico"
$fs = New-Object System.IO.FileStream($icoPath, [System.IO.FileMode]::Create)

# 6-byte header
$fs.WriteByte(0); $fs.WriteByte(0) # Reserved
$fs.WriteByte(1); $fs.WriteByte(0) # Type = 1 (Icon)
$fs.WriteByte(1); $fs.WriteByte(0) # Count = 1

# 16-byte directory entry
$fs.WriteByte(0) # Width = 256 (0 means 256)
$fs.WriteByte(0) # Height = 256 (0 means 256)
$fs.WriteByte(0) # Colors = 0 (No color palette)
$fs.WriteByte(0) # Reserved
$fs.WriteByte(1); $fs.WriteByte(0) # Planes = 1
$fs.WriteByte(32); $fs.WriteByte(0) # Bits Per Pixel = 32

# PNG size (4 bytes, little endian)
$size = $pngBytes.Length
$fs.WriteByte($size -band 0xff)
$fs.WriteByte(($size -shr 8) -band 0xff)
$fs.WriteByte(($size -shr 16) -band 0xff)
$fs.WriteByte(($size -shr 24) -band 0xff)

# Offset = 22 (4 bytes, little-endian: header + entry sizes)
$fs.WriteByte(22); $fs.WriteByte(0); $fs.WriteByte(0); $fs.WriteByte(0)

# Write raw PNG bytes
$fs.Write($pngBytes, 0, $size)
$fs.Close()

Write-Host "Success: Custom icon generated at: $icoPath"

# Create Desktop Shortcut
$desktopPath = [System.Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath "IRON.lnk"
$targetPath = Join-Path $PSScriptRoot "run.bat"
$projectRoot = Split-Path $PSScriptRoot -Parent

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.WorkingDirectory = $projectRoot
$shortcut.IconLocation = $icoPath
$shortcut.Description = "Open the IRON Frontend"
$shortcut.Save()

Write-Host "Success: Desktop shortcut created at: $shortcutPath"

# Create Startup Shortcut for auto-launch on boot
$startupPath = [System.Environment]::GetFolderPath('Startup')
$startupShortcutPath = Join-Path $startupPath "IRON-Startup.lnk"
$startupShortcut = $shell.CreateShortcut($startupShortcutPath)
$startupShortcut.TargetPath = $targetPath
$startupShortcut.WorkingDirectory = $projectRoot
$startupShortcut.IconLocation = $icoPath
$startupShortcut.Description = "Auto-launch IRON Frontend on Startup"
$startupShortcut.Save()

Write-Host "Success: Startup auto-launch shortcut created at: $startupShortcutPath"
Write-Host "Note: Windows Explorer caches icons aggressively. If the icon shows as blank or generic initially, rebuild the cache or restart Windows Explorer."
