$conn = New-Object -ComObject ADODB.Connection
$conn.Open("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap")
$rs = $conn.Execute("SELECT Object_ID, Object_Type, Name, Stereotype FROM t_object WHERE Object_Type IN ('Class', 'Actor') ORDER BY Name")
while (-not $rs.EOF) {
    Write-Host ("{0} | {1} | {2} | {3}" -f $rs.Fields.Item("Object_ID").Value, $rs.Fields.Item("Object_Type").Value, $rs.Fields.Item("Name").Value, $rs.Fields.Item("Stereotype").Value)
    $rs.MoveNext()
}
$conn.Close()
