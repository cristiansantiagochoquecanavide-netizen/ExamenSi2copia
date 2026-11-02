$conn = New-Object -ComObject ADODB.Connection
$conn.Open("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap")
$rs = $conn.Execute("SELECT MAX(Diagram_ID) AS MaxDiag FROM t_diagram")
Write-Host ("Max Diagram_ID: " + $rs.Fields.Item("MaxDiag").Value)
$rs = $conn.Execute("SELECT MAX(Object_ID) AS MaxObj FROM t_object")
Write-Host ("Max Object_ID: " + $rs.Fields.Item("MaxObj").Value)
$conn.Close()
