# ==============================================================================
# SCRIPT DE REFINAMIENTO DE CU14 (ZERO COLLISIONS)
# ==============================================================================

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$dir = "C:\Users\HP\Documents\SI2\2doParcial"
$eapFiles = Get-ChildItem -Path $dir -Filter "*.eap" | Select-Object -ExpandProperty FullName

foreach ($eapPath in $eapFiles) {
    Write-Host "Ajustando coordenadas exactas en: $eapPath" -ForegroundColor Cyan
    $conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$eapPath")
    $conn.Open()

    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT Diagram_ID FROM t_diagram WHERE [Name] = 'Diagrama de secuencia CU14'"
    $diagId = [int]$cmd.ExecuteScalar()

    if ($diagId -gt 0) {
        $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '[capacidadDisponible == true && variante.activa == true]'"
        $idAlt = [int]$cmd.ExecuteScalar()

        $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '[para cada prenda en itemsApartado]'"
        $idLoop = [int]$cmd.ExecuteScalar()

        $cmd.CommandText = "SELECT Object_ID FROM t_object WHERE [Name] = '[generar_comprobante_probador == true]'"
        $idOpt = [int]$cmd.ExecuteScalar()

        # Ajuste milimétrico para 0 colisiones:
        # Alt: Top=-335, Bottom=-660
        $cmd.CommandText = "UPDATE t_diagramobjects SET RectTop = -335, RectBottom = -660, RectLeft = 220, RectRight = 1640, ObjectStyle = 'BCol=-1;BFmt=0;trans=1;' WHERE Diagram_ID = $diagId AND Object_ID = $idAlt"
        $cmd.ExecuteNonQuery() | Out-Null

        # Loop: Top=-405, Bottom=-480
        $cmd.CommandText = "UPDATE t_diagramobjects SET RectTop = -405, RectBottom = -480, RectLeft = 440, RectRight = 1430, ObjectStyle = 'BCol=-1;BFmt=0;trans=1;' WHERE Diagram_ID = $diagId AND Object_ID = $idLoop"
        $cmd.ExecuteNonQuery() | Out-Null

        # Opt: Top=-690, Bottom=-885
        $cmd.CommandText = "UPDATE t_diagramobjects SET RectTop = -690, RectBottom = -885, RectLeft = 220, RectRight = 1220, ObjectStyle = 'BCol=-1;BFmt=0;trans=1;' WHERE Diagram_ID = $diagId AND Object_ID = $idOpt"
        $cmd.ExecuteNonQuery() | Out-Null

        Write-Host "CU14 ajustado sin colisiones en Diagram_ID = $diagId" -ForegroundColor Green
    }
    $conn.Close()
}

# Exportar imágenes
Write-Host "Exportando imágenes con EA COM..." -ForegroundColor Cyan
$ea = New-Object -ComObject "EA.App"
$repo = $ea.Repository
foreach ($eapPath in $eapFiles) {
    $repo.OpenFile($eapPath)
    $base = [System.IO.Path]::GetFileNameWithoutExtension($eapPath)
    $cmdConn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$eapPath")
    $cmdConn.Open()
    $c = $cmdConn.CreateCommand()
    $c.CommandText = "SELECT Diagram_ID FROM t_diagram WHERE [Name] = 'Diagrama de secuencia CU14'"
    $dId = [int]$c.ExecuteScalar()
    $cmdConn.Close()

    if ($dId -gt 0) {
        $diag = $repo.GetDiagramByID($dId)
        $out = Join-Path $dir "$($base)_CU14_secuencia_EA.png"
        $repo.GetProjectInterface().PutDiagramImageToFile($diag.DiagramGUID, $out, 1)
        Write-Host "Exportado: $out" -ForegroundColor Green
    }
    $repo.CloseFile()
}
$repo.Exit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($ea) | Out-Null
Stop-Process -Name "EA" -Force -ErrorAction SilentlyContinue
Write-Host "Completado." -ForegroundColor Green
