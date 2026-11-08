if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$eapPath")
$conn.Open()
$cmd = $conn.CreateCommand()

Write-Host "=== t_object COLORS FOR CU21 ==="
$cmd.CommandText = "SELECT Object_ID, Name, Object_Type, Stereotype, Backcolor, Bordercolor FROM t_object WHERE Name IN ('SuperAdministrador Tenant', 'UI_AsistenteReportesIA', 'ReporteIAController', 'GoogleGeminiAdapter', 'PlanSuscripcion', 'Venta', 'ReporteGenerativoIA', 'BitacoraAuditoria')"
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Host ($reader["Object_ID"].ToString() + " | " + $reader["Name"] + " | Backcolor=" + $reader["Backcolor"] + " | Border=" + $reader["Bordercolor"] + " | Stereo=" + $reader["Stereotype"])
}
$reader.Close()

Write-Host "`n=== t_diagramobjects FOR DIAGRAM 73 ==="
$cmd.CommandText = "SELECT do.Object_ID, o.Name, do.ObjectStyle, do.RectTop, do.RectBottom, do.RectLeft, do.RectRight FROM t_diagramobjects do INNER JOIN t_object o ON do.Object_ID = o.Object_ID WHERE do.Diagram_ID = 73"
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Host ($reader["Object_ID"].ToString() + " | " + $reader["Name"] + " | Style=" + $reader["ObjectStyle"] + " | Top=" + $reader["RectTop"] + " Bottom=" + $reader["RectBottom"])
}
$reader.Close()

$conn.Close()
