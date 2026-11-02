# ==============================================================================
# SCRIPT DE CONSTRUCCIÓN DEL DIAGRAMA DE ROBUSTEZ / COMUNICACIÓN CU08 EN EA
# ==============================================================================

if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$outImg = "C:\Users\HP\Documents\SI2\2doParcial\diagrama_robustez_CU08.png"

$ea = New-Object -ComObject "EA.App"
$repo = $ea.Repository
$repo.OpenFile($eapPath)

try {
    # 1. Obtener o crear paquete para Diagramas de Robustez (Package 13)
    $pkg = $repo.GetPackageByID(13)
    Write-Host "Paquete: $($pkg.Name)" -ForegroundColor Cyan

    # 2. Buscar o crear el diagrama de Robustez CU08
    $diagName = "Diagrama de robustez CU08"
    $diag = $null
    for ($i = 0; $i -lt $pkg.Diagrams.Count; $i++) {
        if ($pkg.Diagrams.GetAt($i).Name -eq $diagName) {
            $diag = $pkg.Diagrams.GetAt($i)
            break
        }
    }

    if ($null -eq $diag) {
        $diag = $pkg.Diagrams.AddNew($diagName, "Analysis")
        $diag.Update()
        Write-Host "Creado diagrama: $diagName (Type: Analysis)" -ForegroundColor Green
    } else {
        Write-Host "Diagrama existente encontrado: $diagName" -ForegroundColor Yellow
        # Limpiar objetos existentes del diagrama
        while ($diag.DiagramObjects.Count -gt 0) {
            $diag.DiagramObjects.Delete(0)
        }
        $diag.Update()
    }

    # Función auxiliar para buscar o crear elemento
    function GetOrCreateElement($name, $type, $stereo) {
        for ($i = 0; $i -lt $pkg.Elements.Count; $i++) {
            $el = $pkg.Elements.GetAt($i)
            if ($el.Name -eq $name) {
                if ($stereo) {
                    $el.Stereotype = $stereo
                    $el.Update() | Out-Null
                }
                return $el
            }
        }
        $newEl = $pkg.Elements.AddNew($name, $type)
        if ($stereo) {
            $newEl.Stereotype = $stereo
        }
        $newEl.Update() | Out-Null
        $pkg.Elements.Refresh() | Out-Null
        return $newEl
    }

    # 3. Crear elementos BCE
    # Actor: Vendedor / Sistema
    $actor = GetOrCreateElement "Vendedor" "Actor" ""
    
    # Boundary: UI_SincronizacionCatalogo
    $boundary = GetOrCreateElement "UI_SincronizacionCatalogo" "Class" "boundary"
    
    # Control: CatalogoSyncController
    $control = GetOrCreateElement "CatalogoSyncController" "Class" "control"
    
    # Entities:
    $entPrenda = GetOrCreateElement "Prenda" "Class" "entity"
    $entInventario = GetOrCreateElement "InventarioStock" "Class" "entity"
    $entGuia = GetOrCreateElement "GuiaMedida" "Class" "entity"
    $entStoreLocal = GetOrCreateElement "CatalogoLocalStore" "Class" "entity"

    # 4. Posicionar elementos en el diagrama (Estilo de la imagen de referencia)
    # Actor a la izquierda, Boundary después, Control al centro, Entidades a la derecha en abanico
    function AddToDiag($el, $l, $t, $r, $b) {
        $do = $diag.DiagramObjects.AddNew("", "")
        $do.ElementID = $el.ElementID
        $do.left = $l
        $do.top = $t
        $do.right = $r
        $do.bottom = $b
        $do.Update() | Out-Null
    }

    AddToDiag $actor 60 -260 140 -370
    AddToDiag $boundary 340 -275 420 -355
    AddToDiag $control 680 -275 760 -355

    # Entidades distribuidas a la derecha
    AddToDiag $entPrenda 1040 -100 1120 -180
    AddToDiag $entInventario 1040 -220 1120 -300
    AddToDiag $entGuia 1040 -340 1120 -420
    AddToDiag $entStoreLocal 1040 -460 1120 -540

    $diag.Update() | Out-Null
    Write-Host "Elementos agregados y posicionados en el diagrama." -ForegroundColor Green

    # 5. Crear conectores con mensajes numerados
    function AddMsgConnector($srcEl, $dstEl, $msgText) {
        $found = $null
        for ($i = 0; $i -lt $srcEl.Connectors.Count; $i++) {
            $c = $srcEl.Connectors.GetAt($i)
            if (($c.ClientID -eq $srcEl.ElementID -and $c.SupplierID -eq $dstEl.ElementID) -or
                ($c.ClientID -eq $dstEl.ElementID -and $c.SupplierID -eq $srcEl.ElementID)) {
                $found = $c
                break
            }
        }
        if ($null -eq $found) {
            $found = $srcEl.Connectors.AddNew($msgText, "Dependency")
            $found.SupplierID = $dstEl.ElementID
            $found.Direction = "Source -> Destination"
            $found.RouteStyle = 3 # Direct
            $found.Update() | Out-Null
            $srcEl.Connectors.Refresh() | Out-Null
        } else {
            $found.Name = $msgText
            $found.Update() | Out-Null
        }
        return $found
    }

    $c1 = AddMsgConnector $actor $boundary "1: solicitarSincronizacion()`n2: consultarCatalogoLocal()"
    $c2 = AddMsgConnector $boundary $control "1.1: descargarYSincronizarCatalogo(empresa_id)`n2.1: obtenerCatalogoLocal()"
    $c3 = AddMsgConnector $control $entPrenda "1.2: obtenerPrendasActivas(empresa_id)"
    $c4 = AddMsgConnector $control $entInventario "1.3: consultarStockDisponible(variante_id)"
    $c5 = AddMsgConnector $control $entGuia "1.4: obtenerMedidasPorTalla(prenda_id, talla_id)"
    $c6 = AddMsgConnector $control $entStoreLocal "1.5: guardarCatalogoLocal(prendas)`n2.2: leerPrendasStore()"

    # Enlazar conectores al diagrama
    $diag.DiagramLinks.Refresh()
    $diag.Update()
    $repo.SaveDiagram($diag.DiagramID)

    # 6. Exportar imagen PNG
    $proj = $repo.GetProjectInterface()
    $proj.PutDiagramImageToFile($diag.DiagramGUID, $outImg, 1)
    Write-Host "Exportado Diagrama a: $outImg" -ForegroundColor Green

} finally {
    $repo.CloseFile()
    $repo.Exit()
}
