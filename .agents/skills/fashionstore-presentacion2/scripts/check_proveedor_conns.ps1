$conn = New-Object -ComObject ADODB.Connection
$conn.Open("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap")
$rs = $conn.Execute("SELECT c.Connector_ID, c.Name, c.Connector_Type, o1.Name AS Src, o2.Name AS Dst FROM (t_connector c INNER JOIN t_object o1 ON c.Start_Object_ID = o1.Object_ID) INNER JOIN t_object o2 ON c.End_Object_ID = o2.Object_ID WHERE o1.Name = 'Proveedor' OR o2.Name = 'Proveedor'")
while (-not $rs.EOF) {
    Write-Host ("{0} | {1} | {2} -> {3}" -f $rs.Fields.Item("Connector_ID").Value, $rs.Fields.Item("Connector_Type").Value, $rs.Fields.Item("Src").Value, $rs.Fields.Item("Dst").Value)
    $rs.MoveNext()
}
$conn.Close()
