# ==============================================================================
# SCRIPT DE AUTOMATIZACIÓN DE ENTERPRISE ARCHITECT
# CONSTRUCCIÓN DEL "MODELO DE DOMINIO COMPLETO" PARA FASHIONSTORE (INF412)
# ==============================================================================

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"

if (-not (Test-Path $eapPath)) {
    Write-Error "No se encontró el archivo .eap en $eapPath"
    exit 1
}

Write-Host "Inicializando Enterprise Architect COM Automation..." -ForegroundColor Cyan
$ea = New-Object -ComObject "EA.App"
$repo = $ea.Repository

Write-Host "Abriendo repositorio: $eapPath" -ForegroundColor Cyan
$opened = $repo.OpenFile($eapPath)
if (-not $opened) {
    Write-Error "No se pudo abrir el archivo de EA."
    $repo.Exit()
    exit 1
}

try {
    $model = $repo.Models.GetAt(0)
    Write-Host "Modelo raíz obtenido: $($model.Name)" -ForegroundColor Green

    # 1. Buscar o Crear el paquete 'Modelo de Dominio'
    $targetPkgName = "Modelo de Dominio"
    $domPkg = $null
    for ($i = 0; $i -lt $model.Packages.Count; $i++) {
        $p = $model.Packages.GetAt($i)
        if ($p.Name -eq $targetPkgName) {
            $domPkg = $p
            Write-Host "Paquete existente encontrado: '$targetPkgName' (ID: $($domPkg.PackageID))" -ForegroundColor Yellow
            break
        }
    }

    if ($null -eq $domPkg) {
        $domPkg = $model.Packages.AddNew($targetPkgName, "Package")
        $domPkg.Update()
        $model.Packages.Refresh()
        Write-Host "Creado nuevo paquete: '$targetPkgName' (ID: $($domPkg.PackageID))" -ForegroundColor Green
    }

    # 2. Buscar o Crear el diagrama 'Modelo de Dominio Completo'
    $diagName = "Modelo de Dominio Completo"
    $diag = $null
    for ($i = 0; $i -lt $domPkg.Diagrams.Count; $i++) {
        $d = $domPkg.Diagrams.GetAt($i)
        if ($d.Name -eq $diagName) {
            $diag = $d
            Write-Host "Diagrama existente encontrado: '$diagName' (ID: $($diag.DiagramID))" -ForegroundColor Yellow
            break
        }
    }

    if ($null -eq $diag) {
        $diag = $domPkg.Diagrams.AddNew($diagName, "Logical")
    }

    $diag.Orientation = "L"
    $diag.ShowPublic = $true
    $diag.ShowPrivate = $false
    $diag.ShowProtected = $false
    $diag.ShowPackageContents = $false
    $diag.Update()
    $domPkg.Diagrams.Refresh()

    # Paleta de Colores: Beige/Crema cálido (#FDF5E6), Borde Carbón fino (#333333)
    $bgColor = 15136253  # RGB(253, 245, 230)
    $borderColor = 3355443  # RGB(51, 51, 51)

    # Definición de Entidades de Dominio
    $entitiesDef = @{
        "SubscriptionPlan" = @(
            @("codigo_plan", "string"),
            @("nombre_plan", "string"),
            @("precio_mensual", "decimal"),
            @("limite_sucursales", "int"),
            @("limite_usuarios", "int"),
            @("permite_offline", "bool"),
            @("permite_ia", "bool"),
            @("activo", "bool")
        );
        "Subscription" = @(
            @("fecha_inicio", "date"),
            @("fecha_fin", "date"),
            @("monto_pago", "decimal"),
            @("estado", "string"),
            @("auto_renovar", "bool"),
            @("metodo_pago", "string")
        );
        "Tenant" = @(
            @("codigo_tenant", "string"),
            @("nombre_empresa", "string"),
            @("nit_ruc", "string"),
            @("subdominio", "string"),
            @("email_corporativo", "string"),
            @("telefono", "string"),
            @("direccion_fiscal", "string"),
            @("estado", "string"),
            @("fecha_registro", "datetime")
        );
        "Bitacora" = @(
            @("accion", "string"),
            @("modulo", "string"),
            @("descripcion", "string"),
            @("tipo_entidad", "string"),
            @("ip_origen", "string"),
            @("fecha_hora", "datetime")
        );
        "PoliticaGarantia" = @(
            @("plazo_dias_cambio", "int"),
            @("permite_cambio_talla", "bool"),
            @("admite_reembolso_dinero", "bool"),
            @("requiere_etiqueta_original", "bool"),
            @("activo", "bool")
        );
        "ReporteGenerativoIA" = @(
            @("prompt_consulta", "string"),
            @("tipo_entrada", "string"),
            @("sql_generado", "string"),
            @("respuesta_resumen", "string"),
            @("formato_exportacion", "string"),
            @("fecha_consulta", "datetime")
        );
        "Permiso" = @(
            @("codigo", "string"),
            @("modulo", "string"),
            @("descripcion", "string")
        );
        "Rol" = @(
            @("codigo", "string"),
            @("nombre", "string"),
            @("descripcion", "string"),
            @("activo", "bool")
        );
        "Usuario" = @(
            @("nombre_completo", "string"),
            @("email", "string"),
            @("ci_nit", "string"),
            @("telefono", "string"),
            @("tipo_usuario", "string"),
            @("estado", "string"),
            @("fecha_creacion", "datetime")
        );
        "Sucursal" = @(
            @("nombre", "string"),
            @("direccion", "string"),
            @("telefono", "string"),
            @("horario_atencion", "string"),
            @("capacidad_probadores", "int"),
            @("activo", "bool")
        );
        "Ciudad" = @(
            @("codigo", "string"),
            @("nombre", "string"),
            @("activo", "bool")
        );
        "ModeloAnaliticoML" = @(
            @("nombre_modelo", "string"),
            @("tipo_aprendizaje", "string"),
            @("variable_objetivo", "string"),
            @("precision_metrica", "decimal"),
            @("fecha_entrenamiento", "datetime"),
            @("activo", "bool")
        );
        "Temporada" = @(
            @("codigo", "string"),
            @("nombre", "string"),
            @("fecha_inicio", "date"),
            @("fecha_fin", "date"),
            @("activo", "bool")
        );
        "Categoria" = @(
            @("nombre", "string"),
            @("descripcion", "string"),
            @("sector", "string"),
            @("activo", "bool")
        );
        "Producto" = @(
            @("codigo", "string"),
            @("nombre", "string"),
            @("descripcion", "string"),
            @("precio_base", "decimal"),
            @("activo", "bool")
        );
        "VarianteProducto" = @(
            @("sku", "string"),
            @("codigo_barra", "string"),
            @("talla", "string"),
            @("color", "string"),
            @("precio_adicional", "decimal"),
            @("activo", "bool")
        );
        "GuiaMedida" = @(
            @("pecho_cm", "decimal"),
            @("cintura_cm", "decimal"),
            @("cadera_cm", "decimal"),
            @("largo_cm", "decimal"),
            @("observacion_calce", "string")
        );
        "CalificacionPrenda" = @(
            @("puntuacion", "int"),
            @("ajuste_talla", "string"),
            @("titulo", "string"),
            @("comentario", "string"),
            @("compra_verificada", "bool")
        );
        "Proveedor" = @(
            @("razon_social", "string"),
            @("nit", "string"),
            @("contacto_nombre", "string"),
            @("telefono", "string"),
            @("email", "string"),
            @("direccion", "string"),
            @("activo", "bool")
        );
        "RecepcionMercaderia" = @(
            @("numero_documento", "string"),
            @("fecha_recepcion", "date"),
            @("costo_total", "decimal"),
            @("observaciones", "string")
        );
        "DetalleRecepcion" = @(
            @("cantidad", "int"),
            @("costo_unitario", "decimal"),
            @("subtotal", "decimal")
        );
        "Inventario" = @(
            @("stock_fisico", "int"),
            @("stock_disponible", "int"),
            @("stock_reservado", "int"),
            @("stock_minimo", "int")
        );
        "MovimientoInventario" = @(
            @("tipo_movimiento", "string"),
            @("cantidad", "int"),
            @("cantidad_anterior", "int"),
            @("cantidad_nueva", "int"),
            @("motivo", "string"),
            @("fecha_hora", "datetime")
        );
        "Promocion" = @(
            @("codigo", "string"),
            @("nombre", "string"),
            @("tipo_descuento", "string"),
            @("valor_descuento", "decimal"),
            @("monto_minimo", "decimal"),
            @("fecha_inicio", "datetime"),
            @("fecha_fin", "datetime"),
            @("activo", "bool")
        );
        "TraspasoInventario" = @(
            @("codigo_traspaso", "string"),
            @("estado", "string"),
            @("motivo", "string"),
            @("fecha_solicitud", "datetime"),
            @("fecha_despacho", "datetime"),
            @("fecha_recepcion", "datetime")
        );
        "DetalleTraspaso" = @(
            @("cantidad_enviada", "int"),
            @("cantidad_recibida", "int")
        );
        "Reserva" = @(
            @("codigo_reserva", "string"),
            @("fecha_reserva", "date"),
            @("hora_estimada", "string"),
            @("estado", "string"),
            @("monto_anticipo", "decimal"),
            @("probador_asignado", "string")
        );
        "DetalleReserva" = @(
            @("cantidad", "int"),
            @("precio_unitario", "decimal"),
            @("probada", "bool"),
            @("comprada", "bool")
        );
        "NotaDevolucion" = @(
            @("codigo_devolucion", "string"),
            @("motivo", "string"),
            @("estado", "string"),
            @("observaciones", "string"),
            @("fecha_hora", "datetime")
        );
        "Venta" = @(
            @("codigo_venta", "string"),
            @("canal_venta", "string"),
            @("cliente_nombre", "string"),
            @("cliente_nit", "string"),
            @("subtotal", "decimal"),
            @("descuento", "decimal"),
            @("costo_envio", "decimal"),
            @("total", "decimal"),
            @("estado", "string"),
            @("fecha_hora", "datetime")
        );
        "DetalleVenta" = @(
            @("cantidad", "int"),
            @("precio_unitario", "decimal"),
            @("subtotal", "decimal")
        );
        "Pago" = @(
            @("metodo_pago", "string"),
            @("pasarela", "string"),
            @("monto", "decimal"),
            @("moneda", "string"),
            @("estado_pago", "string"),
            @("fecha_hora", "datetime")
        );
        "EnvioPedido" = @(
            @("codigo_seguimiento", "string"),
            @("tipo_entrega", "string"),
            @("empresa_courier", "string"),
            @("costo_envio", "decimal"),
            @("estado_envio", "string"),
            @("fecha_estimada_entrega", "date")
        );
        "DetalleNotaDevolucion" = @(
            @("cantidad_devuelta", "int"),
            @("cantidad_entregada", "int"),
            @("diferencia_monetaria", "decimal")
        );
        "SyncOperacion" = @(
            @("uuid_operacion", "string"),
            @("dispositivo_id", "string"),
            @("tipo_operacion", "string"),
            @("estado_sync", "string"),
            @("fecha_registro_local", "datetime"),
            @("fecha_sincronizacion", "datetime"),
            @("error_detalle", "string")
        );
        "ConflictoInventario" = @(
            @("cantidad_solicitada", "int"),
            @("stock_disponible_servidor", "int"),
            @("estado_resolucion", "string"),
            @("fecha_deteccion", "datetime"),
            @("fecha_resolucion", "datetime")
        );
        "SesionChatIA" = @(
            @("session_uuid", "string"),
            @("titulo", "string"),
            @("activa", "bool"),
            @("fecha_creacion", "datetime")
        );
        "MensajeChatIA" = @(
            @("remitente", "string"),
            @("texto", "string"),
            @("intencion_detectada", "string"),
            @("fecha_hora", "datetime")
        )
    }

    # Crear o actualizar cada elemento Class en el paquete
    Write-Host "`nCreando / actualizando entidades en paquete '$targetPkgName'..." -ForegroundColor Cyan
    $createdElements = @{}

    foreach ($eName in $entitiesDef.Keys) {
        $elem = $null
        for ($i = 0; $i -lt $domPkg.Elements.Count; $i++) {
            $el = $domPkg.Elements.GetAt($i)
            if ($el.Name -eq $eName -and $el.Type -eq "Class") {
                $elem = $el
                break
            }
        }

        if ($null -eq $elem) {
            $elem = $domPkg.Elements.AddNew($eName, "Class")
        }

        $elem.Update()

        # Agregar atributos
        $attrsList = $entitiesDef[$eName]
        foreach ($aDef in $attrsList) {
            $aName = $aDef[0]
            $aType = $aDef[1]
            $attr = $null
            for ($j = 0; $j -lt $elem.Attributes.Count; $j++) {
                $at = $elem.Attributes.GetAt($j)
                if ($at.Name -eq $aName) {
                    $attr = $at
                    break
                }
            }
            if ($null -eq $attr) {
                $attr = $elem.Attributes.AddNew($aName, $aType)
            }
            $attr.Visibility = "Public"
            $attr.Type = $aType
            $attr.Update()
        }
        $elem.Attributes.Refresh()
        $elem.Update()
        $createdElements[$eName] = $elem
    }
    $domPkg.Elements.Refresh()
    Write-Host "  [OK] Todas las entidades registradas." -ForegroundColor Green

    # Definición de Asociaciones Semánticas Directas
    $associations = @(
        # Fila 0: Plataforma SaaS y Gobernanza
        @("SubscriptionPlan", "Subscription", "define", "1", "0..*"),
        @("Subscription", "Tenant", "contrata", "0..*", "1"),
        @("Tenant", "PoliticaGarantia", "establece", "1", "0..1"),
        @("Tenant", "Bitacora", "audita", "1", "0..*"),
        @("Tenant", "Usuario", "aloja", "1", "0..*"),
        @("Tenant", "Sucursal", "posee", "1", "1..*"),

        # Fila 1: Roles, Seguridad, Sucursal y Existencias
        @("Rol", "Permiso", "concede", "0..*", "0..*"),
        @("Rol", "Usuario", "tiene", "1", "0..*"),
        @("Usuario", "Sucursal", "asignado_a", "0..*", "0..1"),
        @("Ciudad", "Sucursal", "agrupa", "1", "0..*"),
        @("Sucursal", "Inventario", "almacena", "1", "0..*"),
        @("Inventario", "MovimientoInventario", "registra", "1", "0..*"),

        # Fila 2: Contingencia Offline & Analítica
        @("Usuario", "SyncOperacion", "ejecuta", "1", "0..*"),
        @("SyncOperacion", "ConflictoInventario", "detecta", "1", "0..*"),
        @("ConflictoInventario", "Inventario", "afecta", "0..*", "1"),
        @("Tenant", "ReporteGenerativoIA", "genera", "1", "0..*"),
        @("Tenant", "ModeloAnaliticoML", "entrena", "1", "0..*"),

        # Fila 3: Catálogo de Moda y Medidas Anatómicas
        @("Temporada", "Categoria", "enmarca", "0..1", "0..*"),
        @("Categoria", "Producto", "clasifica", "1", "0..*"),
        @("Producto", "VarianteProducto", "compone", "1", "1..*"),
        @("VarianteProducto", "Inventario", "controla", "1", "0..*"),
        @("VarianteProducto", "GuiaMedida", "especifica", "1", "0..1"),
        @("Producto", "CalificacionPrenda", "valora", "1", "0..*"),

        # Fila 4: Ventas, Pagos, Promociones y Despacho
        @("Promocion", "Venta", "aplica_a", "0..*", "0..*"),
        @("Sucursal", "Venta", "emite", "1", "0..*"),
        @("Venta", "DetalleVenta", "incluye", "1", "1..*"),
        @("DetalleVenta", "VarianteProducto", "vende", "0..*", "1"),
        @("Venta", "Pago", "liquida", "1", "1..*"),
        @("Venta", "EnvioPedido", "despacha", "0..1", "0..1"),
        @("Venta", "NotaDevolucion", "origina", "1", "0..*"),
        @("PoliticaGarantia", "NotaDevolucion", "norma", "1", "0..*"),
        @("NotaDevolucion", "DetalleNotaDevolucion", "incluye", "1", "1..*"),
        @("DetalleNotaDevolucion", "Inventario", "reingresa", "0..*", "1"),

        # Fila 5: Abastecimiento, Traspasos Multi-Sucursal y Reservas
        @("Proveedor", "RecepcionMercaderia", "suministra", "1", "0..*"),
        @("RecepcionMercaderia", "DetalleRecepcion", "incluye", "1", "1..*"),
        @("DetalleRecepcion", "Inventario", "ingresa", "0..*", "1"),
        @("Sucursal", "TraspasoInventario", "gestiona", "1", "0..*"),
        @("TraspasoInventario", "DetalleTraspaso", "incluye", "1", "1..*"),
        @("DetalleTraspaso", "Inventario", "transfiere", "0..*", "1"),
        @("Sucursal", "Reserva", "atiende", "1", "0..*"),
        @("Reserva", "DetalleReserva", "incluye", "1", "1..*"),
        @("DetalleReserva", "VarianteProducto", "aparta", "0..*", "1"),

        # IA Conversacional
        @("Usuario", "SesionChatIA", "inicia", "1", "0..*"),
        @("SesionChatIA", "MensajeChatIA", "contiene", "1", "1..*")
    )

    Write-Host "`nCreando / verificando conectores de asociación..." -ForegroundColor Cyan
    foreach ($asc in $associations) {
        $sName = $asc[0]
        $tName = $asc[1]
        $relName = $asc[2]
        $sCard = $asc[3]
        $tCard = $asc[4]

        $sElem = $createdElements[$sName]
        $tElem = $createdElements[$tName]

        if ($null -eq $sElem -or $null -eq $tElem) {
            Write-Warning "No se pudo crear relación entre '$sName' y '$tName': elemento nulo."
            continue
        }

        # Verificar si ya existe el conector
        $conn = $null
        for ($k = 0; $k -lt $sElem.Connectors.Count; $k++) {
            $cn = $sElem.Connectors.GetAt($k)
            if ($cn.SupplierID -eq $tElem.ElementID -and $cn.Name -eq $relName) {
                $conn = $cn
                break
            }
        }

        if ($null -eq $conn) {
            $conn = $sElem.Connectors.AddNew($relName, "Association")
            $conn.SupplierID = $tElem.ElementID
        }

        $conn.Direction = "Source -> Destination"
        $conn.ClientEnd.Cardinality = $sCard
        $conn.SupplierEnd.Cardinality = $tCard
        $conn.Update()
        $sElem.Connectors.Refresh()
    }
    Write-Host "  [OK] Todas las asociaciones registradas con éxito." -ForegroundColor Green

    # Matriz Espacial ICONIX Perfeccionada (7 Columnas x 6 Filas)
    # Col 0: X=80, Col 1: X=440, Col 2: X=800, Col 3: X=1160, Col 4: X=1520, Col 5: X=1880, Col 6: X=2240
    # Fila 0: Y=80, Fila 1: Y=370, Fila 2: Y=660, Fila 3: Y=950, Fila 4: Y=1240, Fila 5: Y=1530
    $colX = @{
        0 = 80;
        1 = 440;
        2 = 800;
        3 = 1160;
        4 = 1520;
        5 = 1880;
        6 = 2240
    }

    $rowY = @{
        0 = 80;
        1 = 370;
        2 = 660;
        3 = 950;
        4 = 1240;
        5 = 1530
    }

    $gridMap = @{
        # FILA 0: Plataforma SaaS, Gobernanza y Políticas
        "SubscriptionPlan"    = @(0, 0, 260, 180);
        "Subscription"        = @(1, 0, 260, 180);
        "Tenant"              = @(2, 0, 260, 195);
        "PoliticaGarantia"    = @(3, 0, 260, 160);
        "Bitacora"            = @(4, 0, 260, 175);
        "ReporteGenerativoIA" = @(5, 0, 260, 175);
        "ModeloAnaliticoML"   = @(6, 0, 260, 175);

        # FILA 1: Seguridad RBAC, Usuarios, Estructura Física y Existencias
        "Permiso"             = @(0, 1, 260, 150);
        "Rol"                 = @(1, 1, 260, 160);
        "Usuario"             = @(2, 1, 260, 185);
        "Sucursal"            = @(3, 1, 260, 180);
        "Ciudad"              = @(4, 1, 260, 150);
        "Inventario"          = @(5, 1, 260, 165);
        "MovimientoInventario"= @(6, 1, 260, 180);

        # FILA 2: Operaciones Offline-First & IA Conversacional
        "SyncOperacion"       = @(1, 2, 260, 185);
        "ConflictoInventario" = @(2, 2, 260, 170);
        "SesionChatIA"        = @(5, 2, 260, 160);
        "MensajeChatIA"       = @(6, 2, 260, 160);

        # FILA 3: Catálogo de Moda y Medidas Anatómicas
        "Temporada"           = @(0, 3, 260, 160);
        "Categoria"           = @(1, 3, 260, 160);
        "Producto"            = @(2, 3, 260, 175);
        "VarianteProducto"    = @(3, 3, 260, 180);
        "GuiaMedida"          = @(4, 3, 260, 165);
        "CalificacionPrenda"  = @(5, 3, 260, 165);

        # FILA 4: Ventas, Pagos, Despacho, Garantías y Devoluciones
        "Promocion"           = @(0, 4, 260, 185);
        "Venta"               = @(1, 4, 260, 205);
        "DetalleVenta"        = @(2, 4, 260, 150);
        "Pago"                = @(3, 4, 260, 175);
        "EnvioPedido"         = @(4, 4, 260, 175);
        "NotaDevolucion"      = @(5, 4, 260, 170);
        "DetalleNotaDevolucion" = @(6, 4, 260, 150);

        # FILA 5: Abastecimiento, Traspasos Multi-Sucursal y Reservas
        "Proveedor"           = @(0, 5, 260, 180);
        "RecepcionMercaderia" = @(1, 5, 260, 170);
        "DetalleRecepcion"    = @(2, 5, 260, 150);
        "TraspasoInventario"  = @(3, 5, 260, 175);
        "DetalleTraspaso"     = @(4, 5, 260, 150);
        "Reserva"             = @(5, 5, 260, 175);
        "DetalleReserva"      = @(6, 5, 260, 165)
    }

    Write-Host "`nPosicionando elementos en el Diagrama '$diagName'..." -ForegroundColor Cyan
    foreach ($eName in $gridMap.Keys) {
        $coords = $gridMap[$eName]
        $cCol = $coords[0]
        $cRow = $coords[1]
        $cW = $coords[2]
        $cH = $coords[3]

        $xLeft = $colX[$cCol]
        $yTop = -($rowY[$cRow])
        $xRight = $xLeft + $cW
        $yBottom = $yTop - $cH

        $elem = $createdElements[$eName]
        if ($null -eq $elem) { continue }

        # Buscar o agregar DiagramObject
        $do = $null
        for ($m = 0; $m -lt $diag.DiagramObjects.Count; $m++) {
            $obj = $diag.DiagramObjects.GetAt($m)
            if ($obj.ElementID -eq $elem.ElementID) {
                $do = $obj
                break
            }
        }

        if ($null -eq $do) {
            $do = $diag.DiagramObjects.AddNew("", "")
            $do.ElementID = $elem.ElementID
        }

        $do.left = $xLeft
        $do.top = $yTop
        $do.right = $xRight
        $do.bottom = $yBottom
        $do.BackgroundColor = $bgColor
        $do.BorderColor = $borderColor
        $do.BorderLineWidth = 1
        $do.ShowPublicAttributes = $true
        $do.ShowPrivateAttributes = $false
        $do.ShowProtectedAttributes = $false
        $do.ShowPublicOperations = $false
        $do.ShowPrivateOperations = $false
        $do.fontName = "Segoe UI"
        $do.fontSize = 9
        $do.Update()
    }
    $diag.DiagramObjects.Refresh()
    $diag.Update()
    Write-Host "  [OK] Todos los elementos diagramados con éxito." -ForegroundColor Green

    # Ajustar estilos de líneas de conexión para visualización ortogonal limpia
    Write-Host "`nAjustando conectores del diagrama..." -ForegroundColor Cyan
    for ($l = 0; $l -lt $diag.DiagramLinks.Count; $l++) {
        $link = $diag.DiagramLinks.GetAt($l)
        $link.LineStyle = 3  # Custom / Orthogonal
        $link.Update()
    }
    $diag.DiagramLinks.Refresh()
    $diag.Update()

    # Guardar imagen en alta resolución
    Write-Host "`nExportando imagen de alta resolución del diagrama..." -ForegroundColor Cyan
    $proj = $repo.GetProjectInterface()
    
    $outPngPath1 = "C:\Users\HP\Documents\SI2\FashionStore\Examen1-Si2\Modelo_de_Dominio_Completo.png"
    $outPngPath2 = "C:\Users\HP\Documents\SI2\2doParcial\Modelo_de_Dominio_Completo.png"

    $proj.PutDiagramImageToFile($diag.DiagramGUID, $outPngPath1, 1)
    $proj.PutDiagramImageToFile($diag.DiagramGUID, $outPngPath2, 1)

    Write-Host "  [OK] Imagen guardada en: $outPngPath1 (Existe: $(Test-Path $outPngPath1))" -ForegroundColor Green
    Write-Host "  [OK] Imagen guardada en: $outPngPath2 (Existe: $(Test-Path $outPngPath2))" -ForegroundColor Green

    # Copiar también el archivo .eap actualizado al espacio de trabajo actual
    $workspaceEap = "C:\Users\HP\Documents\SI2\FashionStore\Examen1-Si2\diagramas_2doparcial.eap"
    Write-Host "Guardando cambios y sincronizando .eap al workspace..." -ForegroundColor Cyan
}
finally {
    $repo.CloseFile()
    $repo.Exit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($repo) | Out-Null
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ea) | Out-Null
}

# Copiar el .eap actualizado
Copy-Item -Path $eapPath -Destination "C:\Users\HP\Documents\SI2\FashionStore\Examen1-Si2\diagramas_2doparcial.eap" -Force
Write-Host "Sincronización completa. Archivo editable disponible en ambas rutas." -ForegroundColor Green
