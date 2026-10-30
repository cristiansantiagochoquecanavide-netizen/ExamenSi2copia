# ==============================================================================
# SCRIPT DE SINCRONIZACIÓN ICONIX PARA PRESENTACIÓN 2 EN ENTERPRISE ARCHITECT
# Archivo de destino: C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap
# INF412 - Sistemas de Información 2 (MSc. Ing. Angélica Garzón Cuéllar)
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

function Get-NextId {
    param([string]$tableName, [string]$idColumn)
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT MAX($idColumn) FROM $tableName"
    $val = $cmd.ExecuteScalar()
    if ($null -eq $val -or [DBNull]::Value.Equals($val)) {
        return 1
    }
    return [int]$val + 1
}

function New-EaGuid {
    return "{" + [System.Guid]::NewGuid().ToString().ToUpper() + "}"
}

try {
    Write-Host "`n--- VERIFICACION Y CREACION DE PAQUETES ICONIX (PRESENTACION 2) ---" -ForegroundColor Yellow

    # 1. Verificar / Crear Paquete de Robustez P2
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT Package_ID FROM t_package WHERE Name LIKE '%3.2%Robustez%'"
    $robPkgId = $cmd.ExecuteScalar()

    if ($null -eq $robPkgId -or [DBNull]::Value.Equals($robPkgId)) {
        $robPkgId = Get-NextId "t_package" "Package_ID"
        $guid = New-EaGuid
        $cmd.CommandText = "INSERT INTO t_package (Package_ID, Name, Parent_ID, CreatedDate, ModifiedDate, ea_guid, IsControlled, LogXML, Protected, UseDTD) VALUES ($robPkgId, '3.2. Diagramas de robustez (P2)', 1, NOW(), NOW(), '$guid', False, False, False, False)"
        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host "  [OK] Creado paquete '3.2. Diagramas de robustez (P2)' con ID: $robPkgId" -ForegroundColor Green
    } else {
        Write-Host "  [OK] Paquete de Robustez existente con ID: $robPkgId" -ForegroundColor Green
    }

    # 2. Verificar / Crear Paquete de Secuencia P2
    $cmd.CommandText = "SELECT Package_ID FROM t_package WHERE Name LIKE '%3.3%Secuencia%'"
    $secPkgId = $cmd.ExecuteScalar()

    if ($null -eq $secPkgId -or [DBNull]::Value.Equals($secPkgId)) {
        $secPkgId = Get-NextId "t_package" "Package_ID"
        $guid = New-EaGuid
        $cmd.CommandText = "INSERT INTO t_package (Package_ID, Name, Parent_ID, CreatedDate, ModifiedDate, ea_guid, IsControlled, LogXML, Protected, UseDTD) VALUES ($secPkgId, '3.3. Diagramas de secuencia (P2)', 1, NOW(), NOW(), '$guid', False, False, False, False)"
        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host "  [OK] Creado paquete '3.3. Diagramas de secuencia (P2)' con ID: $secPkgId" -ForegroundColor Green
    } else {
        Write-Host "  [OK] Paquete de Secuencia existente con ID: $secPkgId" -ForegroundColor Green
    }

    # 3. Registrar Elementos Robustez BCE para los Casos de Uso Críticos
    Write-Host "`n--- ASEGURANDO OBJETOS DE ROBUSTEZ BCE EN MODELO EA ---" -ForegroundColor Yellow

    $bceElements = @(
        # Boundary
        @("Boundary", "IU_TerminalVentaOffline"),
        @("Boundary", "IU_ApartadoProbador"),
        @("Boundary", "IU_FormularioTraspaso"),
        @("Boundary", "IU_RecepcionTraspaso"),
        @("Boundary", "IU_ConfiguracionPoliticaGarantia"),
        @("Boundary", "IU_SolicitudCambioPrenda"),
        @("Boundary", "IU_EmisionNotaDevolucion"),
        
        # Control
        @("Control", "VentaOfflineController"),
        @("Control", "SyncDispatcherService"),
        @("Control", "TraspasoWorkflowController"),
        @("Control", "PoliticaGarantiaController"),
        @("Control", "NotaDevolucionController"),
        
        # Entity
        @("Entity", "SincronizacionOffline"),
        @("Entity", "ConflictoInventario"),
        @("Entity", "PoliticaGarantia"),
        @("Entity", "NotaDevolucion"),
        @("Entity", "DetalleNotaDevolucion"),
        @("Entity", "TraspasoInventario"),
        @("Entity", "DetalleTraspaso")
    )

    foreach ($elem in $bceElements) {
        $stereotype = $elem[0]
        $name = $elem[1]

        $cmd.CommandText = "SELECT COUNT(*) FROM t_object WHERE Name = '$name'"
        $cnt = [int]$cmd.ExecuteScalar()

        if ($cnt -eq 0) {
            $objId = Get-NextId "t_object" "Object_ID"
            $guid = New-EaGuid
            $cmd.CommandText = "INSERT INTO t_object (Object_ID, Object_Type, Diagram_ID, Name, Author, Version, Package_ID, Complexity, Backcolor, BorderWidth, Fontcolor, Bordercolor, CreatedDate, ModifiedDate, Status, Abstract, Scope, ea_guid, IsActive, IsLeaf, IsRoot, IsSpec) VALUES ($objId, 'Class', 0, '$name', 'Grupo 6', '1.0', $robPkgId, '1', -1, -1, -1, -1, NOW(), NOW(), 'Proposed', '0', 'Public', '$guid', False, False, False, False)"
            $cmd.ExecuteNonQuery() | Out-Null
            Write-Host "  [+] Registrado objeto BCE: [$stereotype] $name" -ForegroundColor Green
        } else {
            Write-Host "  [OK] Objeto BCE ya existente: [$stereotype] $name" -ForegroundColor DarkGreen
        }
    }

    # Contar total de objetos
    $cmd.CommandText = "SELECT COUNT(*) FROM t_object WHERE Package_ID IN ($robPkgId, $secPkgId)"
    $totalP2 = [int]$cmd.ExecuteScalar()
    Write-Host "`nTotal de elementos registrados en paquetes P2: $totalP2" -ForegroundColor Cyan

    Write-Host "`n==========================================================" -ForegroundColor Green
    Write-Host " SINCRONIZACION ICONIX P2 EN ENTERPRISE ARCHITECT EXITOSA" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
}
finally {
    $conn.Close()
}
