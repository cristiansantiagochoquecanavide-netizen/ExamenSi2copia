Add-Type -AssemblyName System.Drawing

$img21 = [System.Drawing.Image]::FromFile('C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial_CU21_secuencia_EA.png')
$bmp21 = New-Object System.Drawing.Bitmap($img21)
$c21 = $bmp21.GetPixel(850, 200) # inside UI_AsistenteReportesIA header
Write-Host ("CU21 Header pixel at (850, 200): R=" + $c21.R + " G=" + $c21.G + " B=" + $c21.B)
$bmp21.Dispose()
$img21.Dispose()

$img06 = [System.Drawing.Image]::FromFile('C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial_CU06_secuencia_EA.png')
$bmp06 = New-Object System.Drawing.Bitmap($img06)
$c06 = $bmp06.GetPixel(850, 200) # inside UI_GestionCatalogoPrendas header
Write-Host ("CU06 Header pixel at (850, 200): R=" + $c06.R + " G=" + $c06.G + " B=" + $c06.B)
$bmp06.Dispose()
$img06.Dispose()
