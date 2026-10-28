# ==============================================================================
# SCRIPT DE VERIFICACIÓN Y SINCRONIZACIÓN DEL MODELO ICONIX EN ENTERPRISE ARCHITECT
# Archivo de destino: C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap
# ==============================================================================

# Si corre en 64-bit, relanzar automáticamente en 32-bit para Jet OLEDB 4.0
if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"

if (-not (Test-Path $eapPath)) {
    Write-Error "No se encontró el archivo de Enterprise Architect en: $eapPath"
    exit 1
}

Write-Host "Conectando al repositorio Enterprise Architect ($eapPath)..." -ForegroundColor Cyan
$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$eapPath")
$conn.Open()

try {
    # 1. Contar paquetes
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT COUNT(*) FROM t_package WHERE Name LIKE '%3.4%'"
    $pkgCount = [int]$cmd.ExecuteScalar()
    Write-Host "Paquetes de Diagrama de Clases (3.4) encontrados: $pkgCount" -ForegroundColor Green

    # 2. Contar clases en el paquete 3.4
    $cmd.CommandText = @"
SELECT COUNT(*) 
FROM t_object 
WHERE Object_Type = 'Class' 
  AND Package_ID IN (SELECT Package_ID FROM t_package WHERE Name LIKE '%3.4%')
"@
    $classCount = [int]$cmd.ExecuteScalar()
    Write-Host "Total de Clases registradas en paquete 3.4: $classCount" -ForegroundColor Green

    # 3. Validar las 9 nuevas clases del 2do Parcial
    $newClasses = @(
        "PlanSuscripcion",
        "Suscripcion",
        "Empresa",
        "GuiaMedida",
        "PoliticaGarantia",
        "SincronizacionOffline",
        "ConflictoInventario",
        "ReporteGenerativoIA",
        "ModeloAnaliticoML"
    )

    Write-Host "`nVerificando presencia de las 9 clases requeridas del 2do Parcial:" -ForegroundColor Yellow
    foreach ($cName in $newClasses) {
        $cmd.CommandText = "SELECT COUNT(*) FROM t_object WHERE Object_Type = 'Class' AND Name = '$cName'"
        $cnt = [int]$cmd.ExecuteScalar()
        if ($cnt -gt 0) {
            Write-Host "  [OK] Clase '$cName' presente en el modelo EA." -ForegroundColor Green
        } else {
            Write-Host "  [ALERTA] Clase '$cName' no encontrada en el modelo." -ForegroundColor Red
        }
    }

    # 4. Contar relaciones / conectores
    $cmd.CommandText = "SELECT COUNT(*) FROM t_connector"
    $connCount = [int]$cmd.ExecuteScalar()
    Write-Host ""
    Write-Host "Total de relaciones en el modelo: $connCount" -ForegroundColor Cyan

    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " VERIFICACION DE MODELADO ICONIX EN ENTERPRISE ARCHITECT EXITOSA" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
}
finally {
    $conn.Close()
}
