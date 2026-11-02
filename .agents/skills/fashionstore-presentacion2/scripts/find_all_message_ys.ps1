Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Image]::FromFile('C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial_CU06_secuencia_EA.png')
$bmp = New-Object System.Drawing.Bitmap($img)

# Message arrows have dark grey/black color (e.g. RGB < 120) and are horizontal.
# Let's find every Y where at least 100 consecutive horizontal pixels are dark line!
$messageYs = New-Object System.Collections.Generic.List[int]

for ($y = 250; $y -lt $bmp.Height - 100; $y++) {
    # Check if there is a horizontal segment of dark pixels
    # Test across X from 300 to 2500
    $darkCount = 0
    $maxConsecutive = 0
    for ($x = 300; $x -lt 2500; $x += 5) {
        $c = $bmp.GetPixel($x, $y)
        # Sequence connector line is dark grey/black: R, G, B roughly equal and < 100
        if ($c.R -lt 110 -and $c.G -lt 110 -and $c.B -lt 110) {
            $darkCount++
            if ($darkCount -gt $maxConsecutive) { $maxConsecutive = $darkCount }
        } else {
            $darkCount = 0
        }
    }
    # If we found at least 20 consecutive samples (100px) of dark line:
    if ($maxConsecutive -gt 20) {
        $messageYs.Add($y)
    }
}

# Group neighboring rows
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
