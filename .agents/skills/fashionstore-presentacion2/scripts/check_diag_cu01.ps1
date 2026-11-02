$conn = New-Object -ComObject ADODB.Connection
$conn.Open("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap")
$rs = $conn.Execute("SELECT Diagram_ID, Name, Diagram_Type, Package_ID FROM t_diagram WHERE Name LIKE '%CU01%' OR Name LIKE '%CU02%' OR Name LIKE '%Tenant%'")
while (-not $rs.EOF) {
    Write-Host ("{0} | Pkg:{1} | {2} | {3}" -f $rs.Fields.Item("Diagram_ID").Value, $rs.Fields.Item("Package_ID").Value, $rs.Fields.Item("Name").Value, $rs.Fields.Item("Diagram_Type").Value)
    $rs.MoveNext()
}
$conn.Close()
