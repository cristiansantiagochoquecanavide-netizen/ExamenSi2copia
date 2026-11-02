Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Image]::FromFile('C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial_CU06_secuencia_EA.png')
$bmp = New-Object System.Drawing.Bitmap($img)

function Get-HorizontalLines([int]$x) {
    $lines = New-Object System.Collections.Generic.List[int]
    $prev = -20
    for ($y = 100; $y -lt $bmp.Height - 100; $y++) {
        $c = $bmp.GetPixel($x, $y)
        # Check if pixel is dark (part of line)
        if ($c.R -lt 100 -and $c.G -lt 100 -and $c.B -lt 100) {
            # Check horizontal neighbor to confirm it's a horizontal line
            $cLeft = $bmp.GetPixel($x - 5, $y)
            $cRight = $bmp.GetPixel($x + 5, $y)
            if ($cLeft.R -lt 150 -and $cRight.R -lt 150) {
                if ($y -gt $prev + 15) {
                    $lines.Add($y)
                    $prev = $y
                }
            }
        }
    }
    return $lines
}

Write-Host "Lines between Actor and UI (X=500):"
Get-HorizontalLines 500 | ForEach-Object { Write-Host ("  Y = " + $_) }

Write-Host "`nLines between UI and Controller (X=1100):"
Get-HorizontalLines 1100 | ForEach-Object { Write-Host ("  Y = " + $_) }

Write-Host "`nLines between Controller and Prenda (X=1750):"
Get-HorizontalLines 1750 | ForEach-Object { Write-Host ("  Y = " + $_) }

$bmp.Dispose()
$img.Dispose()
