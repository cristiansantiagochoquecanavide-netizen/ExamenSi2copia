$conn = New-Object -ComObject ADODB.Connection
$conn.Open("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap")
$rs = $conn.Execute("SELECT Object_ID, Name, Stereotype, Object_Type, Package_ID FROM t_object WHERE Name LIKE '%RegistroTenant%' OR Name LIKE '%ControladorTenant%' OR Name LIKE '%TenantController%'")
while (-not $rs.EOF) {
    Write-Host ("{0} | Pkg:{1} | {2} | {3} | {4}" -f $rs.Fields.Item("Object_ID").Value, $rs.Fields.Item("Package_ID").Value, $rs.Fields.Item("Name").Value, $rs.Fields.Item("Stereotype").Value, $rs.Fields.Item("Object_Type").Value)
    $rs.MoveNext()
}
$conn.Close()
