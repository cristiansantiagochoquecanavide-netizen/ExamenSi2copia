Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Image]::FromFile('C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial_CU06_secuencia_EA.png')
$bmp = New-Object System.Drawing.Bitmap($img)
Write-Host ("Image dimensions: " + $bmp.Width + " x " + $bmp.Height)

# Lifeline X centers in pixels:
# Let's find horizontal lines by scanning column at X=300 (between Actor X=105 and UI X=290 or UI and Ctrl)
# In pixels: total width is around 2500px, let's find the green pixels and black line pixels!
$greenRows = New-Object System.Collections.Generic.List[int]
$blackRows = New-Object System.Collections.Generic.List[int]

# Scan a column between Controller and Prenda (approx 35% across the width)
$scanX = [int]($bmp.Width * 0.35)
Write-Host "Scanning at X = $scanX..."

for ($y = 0; $y -lt $bmp.Height; $y++) {
    $c = $bmp.GetPixel($scanX, $y)
    # Green box border: usually G > 120, R < 100, B < 100
    if ($c.G -gt 120 -and $c.R -lt 100 -and $c.B -lt 100) {
        $greenRows.Add($y)
    }
    # Black/dark line: R < 50, G < 50, B < 50
    if ($c.R -lt 50 -and $c.G -lt 50 -and $c.B -lt 50) {
        $blackRows.Add($y)
    }
}

Write-Host "Green border pixels found at Y:"
$prev = -10
foreach ($y in $greenRows) {
    if ($y -gt $prev + 5) {
        Write-Host "Green line at Y = $y"
        $prev = $y
    }
}

Write-Host "`nSample dark lines at Y:"
$prev = -10
foreach ($y in $blackRows) {
    if ($y -gt $prev + 10) {
        Write-Host "Line at Y = $y"
        $prev = $y
    }
}

$bmp.Dispose()
$img.Dispose()
