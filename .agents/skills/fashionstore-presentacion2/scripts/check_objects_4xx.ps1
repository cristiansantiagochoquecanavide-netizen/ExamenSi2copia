$conn = New-Object -ComObject ADODB.Connection
$conn.Open("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap")
$rs = $conn.Execute("SELECT Object_ID, Package_ID, Name, Stereotype FROM t_object WHERE Object_ID IN (446, 430, 432, 444, 458)")
while (-not $rs.EOF) {
    Write-Host ("{0} | Pkg:{1} | {2} | {3}" -f $rs.Fields.Item("Object_ID").Value, $rs.Fields.Item("Package_ID").Value, $rs.Fields.Item("Name").Value, $rs.Fields.Item("Stereotype").Value)
    $rs.MoveNext()
}
$conn.Close()
