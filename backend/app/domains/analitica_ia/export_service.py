"""
Servicio de Exportación Corporativa Dinámica a PDF (ReportLab Platypus) y Excel (OpenPyXL) - CU22.
INF412 - Sistemas de Información 2 (MSc. Ing. Angélica Garzón Cuéllar)
"""
import io
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List


class ReportExportService:
    """Generación estructurada binaria de reportes de IA en formatos PDF y Excel."""

    @staticmethod
    def _is_numeric(val: Any) -> bool:
        if isinstance(val, bool):
            return False
        if isinstance(val, (int, float, Decimal)):
            return True
        if isinstance(val, str):
            try:
                float(val.replace(",", ""))
                return True
            except ValueError:
                return False
        return False

    @staticmethod
    def _format_cell_pdf(col_name: str, val: Any) -> str:
        if val is None:
            return "-"
        col_low = col_name.lower()
        if isinstance(val, Decimal):
            val = float(val)
        if isinstance(val, float) or (isinstance(val, int) and any(k in col_low for k in ("bs", "monto", "total_ventas", "ingresos", "precio", "gasto", "subtotal"))):
            return f"Bs. {float(val):,.2f}"
        if isinstance(val, int):
            return f"{val:,}"
        return str(val)

    @classmethod
    def generar_pdf(cls, reporte_dict: Dict[str, Any], empresa_info: Dict[str, Any]) -> io.BytesIO:
        """Compila un documento ejecutivo formal PDF con ReportLab Platypus (CU22)."""
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_RIGHT, TA_LEFT, TA_JUSTIFY

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=42,
            title=f"Reporte IA #{reporte_dict.get('reporte_id', 1)}",
        )

        elements = []
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "CompanyTitle",
            parent=styles["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=16,
            textColor=colors.HexColor("#1E3A8A"),
            spaceAfter=3,
        )
        subtitle_style = ParagraphStyle(
            "SubTitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            textColor=colors.HexColor("#4B5563"),
            spaceAfter=8,
        )
        section_label = ParagraphStyle(
            "SectionLabel",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9.5,
            textColor=colors.HexColor("#111827"),
            spaceBefore=6,
            spaceAfter=4,
        )
        summary_style = ParagraphStyle(
            "SummaryText",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=13.5,
            alignment=TA_JUSTIFY,
            textColor=colors.HexColor("#1F2937"),
            backColor=colors.HexColor("#EFF6FF"),
            borderPadding=8,
            spaceAfter=14,
        )
        cell_left = ParagraphStyle(
            "CellLeft",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            alignment=TA_LEFT,
            textColor=colors.HexColor("#1F2937"),
        )
        cell_right = ParagraphStyle(
            "CellRight",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            alignment=TA_RIGHT,
            textColor=colors.HexColor("#111827"),
        )

        # 1. Encabezado Institucional del Tenant
        empresa_nombre = empresa_info.get("razon_social", "FashionStore SaaS")
        nit = empresa_info.get("nit", "1029384756")
        direccion = empresa_info.get("direccion_fiscal") or "Plataforma Corporativa Multitenant Bolivia"
        tenant_id = empresa_info.get("id", 1)
        fecha_emision = datetime.now().strftime("%d/%m/%Y %H:%M")

        elements.append(Paragraph(f"<b>{empresa_nombre}</b>", title_style))
        elements.append(
            Paragraph(
                f"<b>NIT:</b> {nit} &nbsp;|&nbsp; <b>Dirección:</b> {direccion}<br/>"
                f"<b>Emisión:</b> {fecha_emision} &nbsp;|&nbsp; <b>Aislamiento Multitenant:</b> Empresa ID #{tenant_id} "
                f"&nbsp;|&nbsp; <b>Reporte IA:</b> #{reporte_dict.get('reporte_id', 1)}",
                subtitle_style,
            )
        )
        elements.append(HRFlowable(width="100%", thickness=1.2, color=colors.HexColor("#1E3A8A"), spaceAfter=10))

        # 2. Pregunta y Síntesis Ejecutiva de Google Gemini
        prompt_text = str(reporte_dict.get("prompt_consulta", "")).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        tipo_entrada = reporte_dict.get("tipo_entrada", "TEXTO")
        resumen_texto = str(reporte_dict.get("respuesta_resumen", "")).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

        elements.append(
            Paragraph(
                f"<b>Consulta en Lenguaje Natural (Canal: {tipo_entrada}):</b> <i>\"{prompt_text}\"</i>",
                section_label,
            )
        )
        elements.append(Paragraph(f"<b>Síntesis Analítica (Google Gemini):</b><br/>{resumen_texto}", summary_style))

        # 3. Tabla de Datos Estructurada con Efecto Cebra y Alineación Monetaria
        columnas: List[str] = reporte_dict.get("columnas", [])
        datos: List[Dict[str, Any]] = reporte_dict.get("datos_tabulares", [])

        if columnas and datos:
            elements.append(Paragraph("<b>Detalle Tabular de Operaciones Verificadas:</b>", section_label))
            header_row = [c.replace("_", " ").upper() for c in columnas]
            table_data: List[List[Any]] = [header_row]

            for row in datos:
                rendered_row = []
                for c in columnas:
                    raw_v = row.get(c)
                    formatted = cls._format_cell_pdf(c, raw_v)
                    if cls._is_numeric(raw_v) and "id" not in c.lower() and "factura" not in c.lower():
                        rendered_row.append(Paragraph(formatted, cell_right))
                    else:
                        rendered_row.append(Paragraph(formatted, cell_left))
                table_data.append(rendered_row)

            avail_width = 540.0
            col_width = max(65.0, avail_width / max(len(columnas), 1))
            t = Table(table_data, colWidths=[col_width] * len(columnas), hAlign="LEFT", repeatRows=1)
            t.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, 0), 8.5),
                        ("BOTTOMPADDING", (0, 0), (-1, 0), 7),
                        ("TOPPADDING", (0, 0), (-1, 0), 7),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
                        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F3F4F6")]),
                        ("BOTTOMPADDING", (0, 1), (-1, -1), 5),
                        ("TOPPADDING", (0, 1), (-1, -1), 5),
                    ]
                )
            )
            elements.append(t)

        # 4. Traza de Auditoría SQL Read-Only
        sql_gen = str(reporte_dict.get("sql_generado", "")).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        if sql_gen:
            elements.append(Spacer(1, 14))
            elements.append(
                Paragraph(
                    f"<font size=7.5 color='#4B5563'><b>Sentencia SQL Auditada (Read-Only Multitenant):</b><br/>"
                    f"<font name='Courier'>{sql_gen}</font></font>",
                    styles["Normal"],
                )
            )

        # Pie de página dinámico con numeración
        def draw_footer(canvas, doc_obj):
            canvas.saveState()
            canvas.setFont("Helvetica", 7.5)
            canvas.setFillColor(colors.HexColor("#6B7280"))
            canvas.drawString(
                36,
                22,
                f"FashionStore SaaS Multitenant (INF412) | Certificación Aislamiento Tenant #{tenant_id} ({empresa_nombre})",
            )
            canvas.drawRightString(576, 22, f"Página {doc_obj.page}")
            canvas.restoreState()

        doc.build(elements, onFirstPage=draw_footer, onLaterPages=draw_footer)
        buffer.seek(0)
        return buffer

    @classmethod
    def generar_excel(cls, reporte_dict: Dict[str, Any], empresa_info: Dict[str, Any]) -> io.BytesIO:
        """Compila un libro corporativo XLSX con estilos, autofiltro y fórmula SUM (CU22)."""
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        from openpyxl.utils import get_column_letter

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Reporte IA"

        columnas: List[str] = reporte_dict.get("columnas", []) or ["resumen"]
        datos: List[Dict[str, Any]] = reporte_dict.get("datos_tabulares", [])
        max_col = max(len(columnas), 4)
        last_col_letter = get_column_letter(max_col)

        navy_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
        header_fill = PatternFill(start_color="2563EB", end_color="2563EB", fill_type="solid")
        zebra_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        total_fill = PatternFill(start_color="E0E7FF", end_color="E0E7FF", fill_type="solid")

        white_bold = Font(name="Calibri", size=10.5, bold=True, color="FFFFFF")
        title_font = Font(name="Calibri", size=13, bold=True, color="FFFFFF")
        total_font = Font(name="Calibri", size=10.5, bold=True, color="1E3A8A")
        thin_border = Border(
            left=Side(style="thin", color="CBD5E1"),
            right=Side(style="thin", color="CBD5E1"),
            top=Side(style="thin", color="CBD5E1"),
            bottom=Side(style="thin", color="CBD5E1"),
        )

        # Fila 1: Título Corporativo Combinado
        ws.merge_cells(f"A1:{last_col_letter}1")
        cell_a1 = ws["A1"]
        empresa_nombre = empresa_info.get("razon_social", "FashionStore SaaS")
        nit = empresa_info.get("nit", "1029384756")
        cell_a1.value = f"{empresa_nombre} (NIT: {nit}) — REPORTE ANALÍTICO IA"
        cell_a1.font = title_font
        cell_a1.fill = navy_fill
        cell_a1.alignment = Alignment(horizontal="center", vertical="center")
        ws.row_dimensions[1].height = 28

        # Fila 2 & 3: Metadatos de Consulta y Síntesis
        ws.merge_cells(f"A2:{last_col_letter}2")
        ws["A2"] = (
            f"Consulta ({reporte_dict.get('tipo_entrada', 'TEXTO')}): "
            f"\"{reporte_dict.get('prompt_consulta', '')}\" | Emitido: {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        )
        ws["A2"].font = Font(name="Calibri", size=10, italic=True, bold=True, color="1F2937")

        ws.merge_cells(f"A3:{last_col_letter}3")
        ws["A3"] = f"Síntesis Gemini: {reporte_dict.get('respuesta_resumen', '')}"
        ws["A3"].font = Font(name="Calibri", size=10, color="374151")
        ws["A3"].alignment = Alignment(wrap_text=True, vertical="center")
        ws.row_dimensions[3].height = 28

        # Fila 5: Cabeceras de Tabla
        start_row = 5
        for col_idx, col_name in enumerate(columnas, start=1):
            cell = ws.cell(row=start_row, column=col_idx, value=col_name.replace("_", " ").upper())
            cell.font = white_bold
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = thin_border
        ws.row_dimensions[start_row].height = 22

        # Filas de Datos Tipados
        numeric_cols: Dict[int, bool] = {}
        current_row = start_row + 1

        for r_offset, row in enumerate(datos):
            for col_idx, col_name in enumerate(columnas, start=1):
                raw_val = row.get(col_name)
                if isinstance(raw_val, Decimal):
                    raw_val = float(raw_val)

                # Convertir strings numéricos si provienen de JSON/DB
                col_low = col_name.lower()
                is_id_col = col_low in ("id", "nro_factura", "venta_id", "reporte_id") or col_low.endswith("_id")
                if isinstance(raw_val, str) and not is_id_col:
                    try:
                        if "." in raw_val:
                            raw_val = float(raw_val)
                        elif raw_val.isdigit():
                            raw_val = int(raw_val)
                    except ValueError:
                        pass

                cell = ws.cell(row=current_row, column=col_idx, value=raw_val)
                cell.border = thin_border
                if r_offset % 2 == 1:
                    cell.fill = zebra_fill

                if isinstance(raw_val, (int, float)) and not isinstance(raw_val, bool):
                    cell.alignment = Alignment(horizontal="right", vertical="center")
                    if not is_id_col and "talla" not in col_low:
                        numeric_cols[col_idx] = isinstance(raw_val, float) or any(
                            k in col_low for k in ("bs", "monto", "total_ventas", "ingresos", "precio", "subtotal")
                        )
                    if isinstance(raw_val, float) or any(
                        k in col_low for k in ("bs", "monto", "total_ventas", "ingresos", "precio", "subtotal")
                    ):
                        cell.number_format = "#,##0.00"
                    else:
                        cell.number_format = "#,##0"
                else:
                    cell.alignment = Alignment(horizontal="left", vertical="center")
            current_row += 1

        # Autofiltro sobre la tabla
        if datos and len(columnas) >= 1:
            end_data_row = current_row - 1
            ws.auto_filter.ref = f"A{start_row}:{get_column_letter(len(columnas))}{end_data_row}"

            # Fila de Totales Automáticos (=SUM) cuando existen columnas cuantitativas
            if numeric_cols:
                for col_idx in range(1, len(columnas) + 1):
                    col_letter = get_column_letter(col_idx)
                    t_cell = ws.cell(row=current_row, column=col_idx)
                    t_cell.fill = total_fill
                    t_cell.font = total_font
                    t_cell.border = thin_border
                    if col_idx == 1 and 1 not in numeric_cols:
                        t_cell.value = "TOTALES"
                        t_cell.alignment = Alignment(horizontal="left", vertical="center")
                    elif col_idx in numeric_cols:
                        t_cell.value = f"=SUM({col_letter}{start_row + 1}:{col_letter}{end_data_row})"
                        t_cell.alignment = Alignment(horizontal="right", vertical="center")
                        t_cell.number_format = "#,##0.00" if numeric_cols[col_idx] else "#,##0"

        # Autoajuste de ancho de columnas
        for col_idx in range(1, len(columnas) + 1):
            col_letter = get_column_letter(col_idx)
            max_len = len(columnas[col_idx - 1]) + 4
            for r_idx in range(start_row, current_row + 1):
                val = ws.cell(row=r_idx, column=col_idx).value
                if val is not None and not str(val).startswith("="):
                    max_len = max(max_len, len(str(val)))
            ws.column_dimensions[col_letter].width = min(max(max_len + 4, 14), 42)

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer
