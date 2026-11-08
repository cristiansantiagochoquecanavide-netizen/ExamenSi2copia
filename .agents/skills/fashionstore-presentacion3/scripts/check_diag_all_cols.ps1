if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$eapPath")
$conn.Open()
$cmd = $conn.CreateCommand()

$cmd.CommandText = "SELECT * FROM t_diagram WHERE Diagram_ID = 63"
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    Write-Host "=== COLUMNS OF DIAGRAM 63 ==="
    for ($i = 0; $i -lt $reader.FieldCount; $i++) {
        $name = $reader.GetName($i)
        $val = $reader.GetValue($i)
        if ($val -ne $null -and $val.ToString() -ne "") {
            Write-Host ($name + " = " + $val)
        }
    }
}
$reader.Close()

Write-Host "`n=== COLUMNS OF DIAGRAM 73 ==="
$cmd.CommandText = "SELECT * FROM t_diagram WHERE Diagram_ID = 73"
$reader = $cmd.ExecuteReader()
while ($reader.Read()) {
    for ($i = 0; $i -lt $reader.FieldCount; $i++) {
        $name = $reader.GetName($i)
        $val = $reader.GetValue($i)
        if ($val -ne $null -and $val.ToString() -ne "") {
            Write-Host ($name + " = " + $val)
        }
    }
}
$reader.Close()

$conn.Close()
