# ==============================================================================
# SCRIPT DE ACTUALIZACIÓN DEL DIAGRAMA DE CLASES PARA PRESENTACIÓN 2
# Enterprise Architect: C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap
# Sistemas de Información 2 - INF412 (MSc. Ing. Angélica Garzón Cuéllar)
# ==============================================================================

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"

if (-not (Test-Path $eapPath)) {
    Write-Error "No se encontró el archivo EAP en: $eapPath"
    exit 1
}

Write-Host "Conectando a Enterprise Architect: $eapPath" -ForegroundColor Cyan
$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$eapPath")
$conn.Open()

function Get-NextId([string]$table, [string]$col) {
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT MAX($col) FROM $table"
    $val = $cmd.ExecuteScalar()
    if ($null -eq $val -or [DBNull]::Value.Equals($val)) { return 1 }
    return [int]$val + 1
}

function New-GuidStr {
    return "{" + [System.Guid]::NewGuid().ToString().ToUpper() + "}"
}

function Add-Attribute([int]$objId, [string]$name, [string]$type, [int]$pos) {
    $attId = Get-NextId "t_attribute" "ID"
    $guid = New-GuidStr
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = @"
INSERT INTO t_attribute (
    [Object_ID], [Name], [Scope], [Containment], [IsStatic], [IsCollection], [IsOrdered], 
    [AllowDuplicates], [Derived], [ID], [Pos], [Const], [Type], [ea_guid]
) VALUES (
    $objId, '$name', 'Public', 'Not Specified', 0, 0, 0,
    0, 0, $attId, $pos, 0, '$type', '$guid'
)
"@
    $cmd.ExecuteNonQuery() | Out-Null
}

function Add-Connector([int]$srcId, [int]$dstId, [string]$type, [string]$srcCard, [string]$dstCard, [string]$name, [string]$note) {
    # Check if exists
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT COUNT(*) FROM t_connector WHERE Start_Object_ID = $srcId AND End_Object_ID = $dstId AND Connector_Type = '$type'"
    if ($cmd.ExecuteScalar() -gt 0) {
        return 0
    }
    $cId = Get-NextId "t_connector" "Connector_ID"
    $guid = New-GuidStr
    $cmd.CommandText = @"
INSERT INTO t_connector (
    [Connector_ID], [Name], [Direction], [Notes], [Connector_Type], [SourceCard], [DestCard],
    [SourceAccess], [DestAccess], [Start_Object_ID], [End_Object_ID], [RouteStyle], [LineColor],
    [ea_guid], [SourceIsNavigable], [DestIsNavigable], [IsRoot], [IsLeaf], [IsSpec],
    [SourceStyle], [DestStyle]
) VALUES (
    $cId, '$name', 'Unspecified', '$note', '$type', '$srcCard', '$dstCard',
    'Public', 'Public', $srcId, $dstId, 3, -1,
    '$guid', False, True, False, False, False,
    'Navigable=Unspecified;', 'Navigable=Unspecified;'
)
"@
    $cmd.ExecuteNonQuery() | Out-Null
    return $cId
}

function Ensure-DiagramLink([int]$diagId, [int]$connId) {
    if ($connId -le 0) { return }
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT COUNT(*) FROM t_diagramlinks WHERE DiagramID = $diagId AND ConnectorID = $connId"
    if ($cmd.ExecuteScalar() -eq 0) {
        $instId = Get-NextId "t_diagramlinks" "Instance_ID"
        $geo = "EDGE=2;=;LLT=;LMT=;LMB=;LRT=;LRB=;IRHS=;ILHS=;"
        $style = "Mode=3;Color=-1;LWidth=0;"
        $cmd.CommandText = "INSERT INTO t_diagramlinks (DiagramID, ConnectorID, Geometry, Style, Hidden, Instance_ID) VALUES ($diagId, $connId, '$geo', '$style', False, $instId)"
        $cmd.ExecuteNonQuery() | Out-Null
    }
}

try {
    Write-Host "`n1. Limpiando clases duplicadas vacias en Paquete 13..." -ForegroundColor Yellow
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "DELETE FROM t_object WHERE Object_ID IN (137, 138, 139, 140) AND Package_ID = 13"
    $deleted = $cmd.ExecuteNonQuery()
    Write-Host "   Eliminadas $deleted clases sueltas de Paquete 13." -ForegroundColor Green

    Write-Host "`n2. Actualizando Clase 101 -> 'TraspasoInventario' (2 Fases: CU12 y CU13)..." -ForegroundColor Yellow
    $cmd.CommandText = @"
UPDATE t_object 
SET [Name] = 'TraspasoInventario', 
    [Note] = 'Entidad de Traspaso Multi-sucursal en Dos Fases (Fase 1: Despacho en origen / Fase 2: Recepcion conforme en destino). Casos de Uso CU12 y CU13.' 
WHERE Object_ID = 101
"@
    $cmd.ExecuteNonQuery() | Out-Null

    # Reemplazar atributos
    $cmd.CommandText = "DELETE FROM t_attribute WHERE Object_ID = 101"
    $cmd.ExecuteNonQuery() | Out-Null

    $pos = 0
    Add-Attribute 101 "id" "INTEGER [PK]" ($pos++)
    Add-Attribute 101 "codigo_traspaso" "VARCHAR(30)" ($pos++)
    Add-Attribute 101 "empresa_id" "INTEGER [FK]" ($pos++)
    Add-Attribute 101 "sucursal_origen_id" "INTEGER [FK]" ($pos++)
    Add-Attribute 101 "sucursal_destino_id" "INTEGER [FK]" ($pos++)
    Add-Attribute 101 "usuario_despacha_id" "INTEGER [FK]" ($pos++)
    Add-Attribute 101 "usuario_recibe_id" "INTEGER [FK]" ($pos++)
    Add-Attribute 101 "estado" "VARCHAR(30)" ($pos++)
    Add-Attribute 101 "motivo" "TEXT" ($pos++)
    Add-Attribute 101 "fecha_solicitud" "TIMESTAMP" ($pos++)
    Add-Attribute 101 "fecha_despacho" "TIMESTAMP" ($pos++)
    Add-Attribute 101 "fecha_recepcion" "TIMESTAMP" ($pos++)
    Write-Host "   Clase TraspasoInventario actualizada con 12 atributos de 2 fases." -ForegroundColor Green

    Write-Host "`n3. Actualizando Clase 102 -> 'DetalleTraspaso'..." -ForegroundColor Yellow
    $cmd.CommandText = @"
UPDATE t_object 
SET [Name] = 'DetalleTraspaso', 
    [Note] = 'Detalle de items en traspaso multi-sucursal con verificacion fisica de cantidades enviadas vs recibidas.' 
WHERE Object_ID = 102
"@
    $cmd.ExecuteNonQuery() | Out-Null

    $cmd.CommandText = "DELETE FROM t_attribute WHERE Object_ID = 102"
    $cmd.ExecuteNonQuery() | Out-Null

    $pos = 0
    Add-Attribute 102 "id" "INTEGER [PK]" ($pos++)
    Add-Attribute 102 "traspaso_id" "INTEGER [FK]" ($pos++)
    Add-Attribute 102 "producto_variante_id" "INTEGER [FK]" ($pos++)
    Add-Attribute 102 "cantidad_enviada" "INTEGER" ($pos++)
    Add-Attribute 102 "cantidad_recibida" "INTEGER" ($pos++)
    Write-Host "   Clase DetalleTraspaso actualizada con cantidad_enviada y cantidad_recibida." -ForegroundColor Green

    Write-Host "`n4. Actualizando Clase 108 -> 'NotaDevolucion' (Regla RN07: 0 Reembolso)..." -ForegroundColor Yellow
    $cmd.CommandText = @"
UPDATE t_object 
SET [Name] = 'NotaDevolucion', 
    [Note] = 'Nota de Devolucion para cambio exclusivo por talla o medidas anatomicas. Regla RN07: Prohibicion de reintegro de dinero en efectivo. Casos de Uso CU19 y CU20.' 
WHERE Object_ID = 108
"@
    $cmd.ExecuteNonQuery() | Out-Null

    $cmd.CommandText = "DELETE FROM t_attribute WHERE Object_ID = 108"
    $cmd.ExecuteNonQuery() | Out-Null

    $pos = 0
    Add-Attribute 108 "id" "INTEGER [PK]" ($pos++)
    Add-Attribute 108 "codigo_devolucion" "VARCHAR(30)" ($pos++)
    Add-Attribute 108 "empresa_id" "INTEGER [FK]" ($pos++)
    Add-Attribute 108 "politica_id" "INTEGER [FK]" ($pos++)
    Add-Attribute 108 "venta_id" "INTEGER [FK]" ($pos++)
    Add-Attribute 108 "sucursal_id" "INTEGER [FK]" ($pos++)
    Add-Attribute 108 "usuario_id" "INTEGER [FK]" ($pos++)
    Add-Attribute 108 "cliente_id" "INTEGER [FK]" ($pos++)
    Add-Attribute 108 "motivo" "VARCHAR(50)" ($pos++)
    Add-Attribute 108 "estado" "VARCHAR(20)" ($pos++)
    Add-Attribute 108 "observaciones" "TEXT" ($pos++)
    Add-Attribute 108 "fecha_hora" "TIMESTAMP" ($pos++)
    Write-Host "   Clase NotaDevolucion actualizada sin campos de reembolso monetario." -ForegroundColor Green

    Write-Host "`n5. Actualizando Clase 109 -> 'DetalleNotaDevolucion'..." -ForegroundColor Yellow
    $cmd.CommandText = @"
UPDATE t_object 
SET [Name] = 'DetalleNotaDevolucion', 
    [Note] = 'Detalle de cambio de variante: reingreso de variante devuelta y despacho de variante entregada con diferencia monetaria 0.00.' 
WHERE Object_ID = 109
"@
    $cmd.ExecuteNonQuery() | Out-Null

    $cmd.CommandText = "DELETE FROM t_attribute WHERE Object_ID = 109"
    $cmd.ExecuteNonQuery() | Out-Null

    $pos = 0
    Add-Attribute 109 "id" "INTEGER [PK]" ($pos++)
    Add-Attribute 109 "nota_devolucion_id" "INTEGER [FK]" ($pos++)
    Add-Attribute 109 "variante_devuelta_id" "INTEGER [FK]" ($pos++)
    Add-Attribute 109 "cantidad_devuelta" "INTEGER" ($pos++)
    Add-Attribute 109 "variante_entregada_id" "INTEGER [FK]" ($pos++)
    Add-Attribute 109 "cantidad_entregada" "INTEGER" ($pos++)
    Add-Attribute 109 "diferencia_monetaria" "NUMERIC(10,2) [0.00]" ($pos++)
    Write-Host "   Clase DetalleNotaDevolucion actualizada." -ForegroundColor Green

    Write-Host "`n6. Inyectando atributos offline en Venta (105) y Reserva (103)..." -ForegroundColor Yellow
    # Venta: uuid_operacion, es_offline
    $cmd.CommandText = "SELECT COUNT(*) FROM t_attribute WHERE Object_ID = 105 AND Name = 'uuid_operacion'"
    if ($cmd.ExecuteScalar() -eq 0) {
        Add-Attribute 105 "uuid_operacion" "VARCHAR(64)" 20
        Add-Attribute 105 "es_offline" "BOOLEAN" 21
        Write-Host "   Atributos uuid_operacion y es_offline agregados a Venta." -ForegroundColor Green
    }

    # Reserva: empresa_id, tipo_reserva, uuid_operacion, es_offline
    $cmd.CommandText = "SELECT COUNT(*) FROM t_attribute WHERE Object_ID = 103 AND Name = 'tipo_reserva'"
    if ($cmd.ExecuteScalar() -eq 0) {
        Add-Attribute 103 "empresa_id" "INTEGER [FK]" 20
        Add-Attribute 103 "tipo_reserva" "VARCHAR(30)" 21
        Add-Attribute 103 "uuid_operacion" "VARCHAR(64)" 22
        Add-Attribute 103 "es_offline" "BOOLEAN" 23
        Write-Host "   Atributos empresa_id, tipo_reserva, uuid_operacion y es_offline agregados a Reserva." -ForegroundColor Green
    }

    Write-Host "`n7. Creando y actualizando conectores de relaciones del 2do Parcial..." -ForegroundColor Yellow
    # Conectores nuevos:
    # 1. Empresa (121) -> TraspasoInventario (101)
    $cEmpTrasp = Add-Connector 121 101 "Association" "1" "*" "empresa_traspasos" "Multi-tenant: Empresa administra sus traspasos"
    Ensure-DiagramLink 10 $cEmpTrasp

    # 2. Empresa (121) -> NotaDevolucion (108)
    $cEmpDev = Add-Connector 121 108 "Association" "1" "*" "empresa_devoluciones" "Multi-tenant: Empresa rige notas de devolucion"
    Ensure-DiagramLink 10 $cEmpDev

    # 3. GuiaMedida (122) -> NotaDevolucion (108)
    $cGuiaDev = Add-Connector 122 108 "Association" "1" "*" "justifica_cambio_medida" "CU19: Cambio de talla segun tabla de medidas"
    Ensure-DiagramLink 10 $cGuiaDev

    # 4. SincronizacionOffline (124) -> Venta (105)
    $cSyncVenta = Add-Connector 124 105 "Association" "0..1" "1" "origina_venta_offline" "CU15: Venta local offline con UUIDv4"
    Ensure-DiagramLink 10 $cSyncVenta

    # 5. SincronizacionOffline (124) -> Reserva (103)
    $cSyncRes = Add-Connector 124 103 "Association" "0..1" "1" "origina_reserva_offline" "CU14: Reserva probador offline con UUIDv4"
    Ensure-DiagramLink 10 $cSyncRes

    # 6. ConflictoInventario (125) -> InventarioStock (96)
    $cConfStock = Add-Connector 125 96 "Association" "*" "1" "afecta_stock" "CU17: Arbitraje de stock por saldo insuficiente"
    Ensure-DiagramLink 10 $cConfStock

    Write-Host "   Conectores creados y enlazados a Diagrama 10." -ForegroundColor Green

    Write-Host "`n8. Ajustando dimensiones de cajas en Diagrama 10 para evitar recortes..." -ForegroundColor Yellow
    # Ajuste de alturas para que se vean todos los atributos
    $adjustments = @(
        @{ Id = 101; Top = -1131; Bottom = -1420 }, # TraspasoInventario
        @{ Id = 102; Top = -1445; Bottom = -1580 }, # DetalleTraspaso
        @{ Id = 105; Top = -50;   Bottom = -410 },  # Venta
        @{ Id = 106; Top = -435;  Bottom = -585 },  # DetalleVenta
        @{ Id = 107; Top = -610;  Bottom = -870 },  # Pago
        @{ Id = 108; Top = -895;  Bottom = -1185 }, # NotaDevolucion
        @{ Id = 109; Top = -1210; Bottom = -1465 }, # DetalleNotaDevolucion
        @{ Id = 103; Top = -50;   Bottom = -395 }   # Reserva
    )
    foreach ($adj in $adjustments) {
        $oid = $adj.Id
        $top = $adj.Top
        $btm = $adj.Bottom
        $cmd.CommandText = "UPDATE t_diagramobjects SET RectTop = $top, RectBottom = $btm WHERE Diagram_ID = 10 AND Object_ID = $oid"
        $cmd.ExecuteNonQuery() | Out-Null
    }
    Write-Host "   Dimensiones optimizadas en Diagrama 10." -ForegroundColor Green

    Write-Host "`n9. Creando Diagrama de Clases dedicado: Subsistema Offline y Logistica (P2)..." -ForegroundColor Yellow
    $diagP2Name = "Diagrama de clases - Subsistema Offline, Logística y Postventa (P2)"
    $cmd.CommandText = "SELECT Diagram_ID FROM t_diagram WHERE Name = '$diagP2Name'"
    $diagP2Id = $cmd.ExecuteScalar()

    if ($null -eq $diagP2Id -or [DBNull]::Value.Equals($diagP2Id)) {
        $diagP2Id = Get-NextId "t_diagram" "Diagram_ID"
        $guidD = New-GuidStr
        $cmd.CommandText = @"
INSERT INTO t_diagram (
    [Diagram_ID], [Package_ID], [ParentID], [Diagram_Type], [Name], [Version], [Author],
    [ShowDetails], [AttPub], [AttPri], [AttPro], [Orientation], [cx], [cy], [Scale],
    [CreatedDate], [ModifiedDate], [ShowForeign], [ShowBorder], [ShowPackageContents],
    [Locked], [ea_guid]
) VALUES (
    $diagP2Id, 12, 0, 'Logical', '$diagP2Name', '2.0', 'Grupo 6',
    0, True, True, True, 'L', 2600, 1800, 100,
    NOW(), NOW(), True, True, True,
    False, '$guidD'
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
        Write-Host "   Creado nuevo diagrama con ID: $diagP2Id" -ForegroundColor Green
    } else {
        Write-Host "   Diagrama existente con ID: $diagP2Id. Actualizando elementos..." -ForegroundColor Green
        $cmd.CommandText = "DELETE FROM t_diagramobjects WHERE Diagram_ID = $diagP2Id"
        $cmd.ExecuteNonQuery() | Out-Null
        $cmd.CommandText = "DELETE FROM t_diagramlinks WHERE DiagramID = $diagP2Id"
        $cmd.ExecuteNonQuery() | Out-Null
    }

    # Elementos a colocar en el diagrama P2 con un layout limpio y ordenado
    # Columna 1: SaaS / Multi-tenant (L: 50)
    # Columna 2: Offline & Contingencia (L: 380)
    # Columna 3: Sucursal & Inventario (L: 720)
    # Columna 4: Traspasos en 2 Fases (L: 1060)
    # Columna 5: Ventas, Reservas y Devoluciones (L: 1400)
    # Columna 6: Garantias y Calce Anatomico (L: 1740)

    $p2Layout = @(
        @{ Id = 121; L = 50;   T = -50;  R = 320;  B = -260 }, # Empresa
        @{ Id = 120; L = 50;   T = -300; R = 320;  B = -500 }, # Suscripcion
        @{ Id = 119; L = 50;   T = -540; R = 320;  B = -730 }, # PlanSuscripcion

        @{ Id = 124; L = 380;  T = -50;  R = 660;  B = -320 }, # SincronizacionOffline
        @{ Id = 125; L = 380;  T = -360; R = 660;  B = -570 }, # ConflictoInventario

        @{ Id = 83;  L = 720;  T = -50;  R = 1000; B = -280 }, # Sucursal
        @{ Id = 96;  L = 720;  T = -320; R = 1000; B = -500 }, # InventarioStock
        @{ Id = 94;  L = 720;  T = -540; R = 1000; B = -720 }, # PrendaVariante

        @{ Id = 101; L = 1060; T = -50;  R = 1340; B = -350 }, # TraspasoInventario
        @{ Id = 102; L = 1060; T = -390; R = 1340; B = -540 }, # DetalleTraspaso

        @{ Id = 103; L = 1400; T = -50;  R = 1680; B = -390 }, # Reserva (Offline)
        @{ Id = 105; L = 1400; T = -430; R = 1680; B = -790 }, # Venta (Offline)
        @{ Id = 106; L = 1400; T = -830; R = 1680; B = -980 }, # DetalleVenta
        @{ Id = 108; L = 1400; T = -1020;R = 1680; B = -1320}, # NotaDevolucion
        @{ Id = 109; L = 1400; T = -1360;R = 1680; B = -1600}, # DetalleNotaDevolucion

        @{ Id = 123; L = 1740; T = -1020;R = 2020; B = -1200}, # PoliticaGarantia
        @{ Id = 122; L = 1740; T = -1240;R = 2020; B = -1480}  # GuiaMedida
    )

    $seq = 1
    foreach ($elem in $p2Layout) {
        $oid = $elem.Id
        $l = $elem.L; $t = $elem.T; $r = $elem.R; $b = $elem.B
        $instId = Get-NextId "t_diagramobjects" "Instance_ID"
        $cmd.CommandText = @"
INSERT INTO t_diagramobjects (
    [Diagram_ID], [Object_ID], [RectTop], [RectLeft], [RectRight], [RectBottom], [Sequence], [Instance_ID]
) VALUES (
    $diagP2Id, $oid, $t, $l, $r, $b, $seq, $instId
)
"@
        $cmd.ExecuteNonQuery() | Out-Null
        $seq++
    }
    Write-Host "   Colocadas las 17 clases clave en el Diagrama P2." -ForegroundColor Green

    # Enlazar todos los conectores entre estas 17 clases al diagrama P2
    $p2ObjIds = ($p2Layout | ForEach-Object { $_.Id }) -join ","
    $cmd.CommandText = @"
SELECT Connector_ID 
FROM t_connector 
WHERE Start_Object_ID IN ($p2ObjIds) 
  AND End_Object_ID IN ($p2ObjIds)
"@
    $reader = $cmd.ExecuteReader()
    $p2ConnIds = @()
    while ($reader.Read()) {
        $p2ConnIds += [int]$reader["Connector_ID"]
    }
    $reader.Close()

    foreach ($cid in $p2ConnIds) {
        Ensure-DiagramLink $diagP2Id $cid
    }
    Write-Host "   Enlazados $($p2ConnIds.Count) conectores de asociacion al Diagrama P2." -ForegroundColor Green

    Write-Host "`n==================================================================" -ForegroundColor Green
    Write-Host " ACTUALIZACION DEL MODELO EN ENTERPRISE ARCHITECT COMPLETADA CON EXITO" -ForegroundColor Green
    Write-Host "==================================================================" -ForegroundColor Green
}
finally {
    $conn.Close()
}
