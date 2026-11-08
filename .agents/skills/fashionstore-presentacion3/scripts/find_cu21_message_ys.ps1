Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Image]::FromFile('C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial_CU21_secuencia_EA.png')
$bmp = New-Object System.Drawing.Bitmap($img)
Write-Host ("Image dimensions: " + $bmp.Width + " x " + $bmp.Height)

# Scan horizontal lines across image
$messageYs = New-Object System.Collections.Generic.List[int]

for ($y = 150; $y -lt $bmp.Height - 50; $y++) {
    $darkCount = 0
    $maxConsecutive = 0
    for ($x = 200; $x -lt $bmp.Width - 200; $x += 5) {
        $c = $bmp.GetPixel($x, $y)
        if ($c.R -lt 110 -and $c.G -lt 110 -and $c.B -lt 110) {
            $darkCount++
            if ($darkCount -gt $maxConsecutive) { $maxConsecutive = $darkCount }
        } else {
            $darkCount = 0
        }
    }
    if ($maxConsecutive -gt 25) {
        $messageYs.Add($y)
    }
}

$grouped = New-Object System.Collections.Generic.List[int]
$prev = -50
foreach ($y in $messageYs) {
    if ($y -gt $prev + 25) {
        $grouped.Add($y)
        $prev = $y
    }
}

Write-Host ("Found " + $grouped.Count + " message lines:")
$idx = 1
foreach ($y in $grouped) {
    $eaY = [math]::Round(-($y / 2.98), 1)
    Write-Host ("Msg " + $idx + ": Pixel Y=" + $y + " | Approx EA Y=" + $eaY)
    $idx++
}

$bmp.Dispose()
$img.Dispose()
