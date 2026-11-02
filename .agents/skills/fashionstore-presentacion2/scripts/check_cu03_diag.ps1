if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$eapPath")
$conn.Open()
$cmd = $conn.CreateCommand()
$cmd.CommandText = "SELECT Diagram_ID, Name, Diagram_Type, Package_ID FROM t_diagram WHERE Name LIKE '%CU03%' OR Name LIKE '%Suscrip%' ORDER BY Diagram_ID"
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Host ("ID: " + $reader["Diagram_ID"] + " | Name: " + $reader["Name"] + " | Type: " + $reader["Diagram_Type"] + " | Pkg: " + $reader["Package_ID"])
}
$reader.Close()
$conn.Close()
