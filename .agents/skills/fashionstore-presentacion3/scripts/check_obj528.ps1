if ([IntPtr]::Size -eq 8) {
    & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" -ExecutionPolicy Bypass -File $MyInvocation.MyCommand.Path @args
    exit $LASTEXITCODE
}

$eapPath = "C:\Users\HP\Documents\SI2\2doParcial\diagramas_2doparcial.eap"
$conn = New-Object System.Data.OleDb.OleDbConnection("Provider=Microsoft.Jet.OLEDB.4.0;Data Source=$eapPath")
$conn.Open()
$cmd = $conn.CreateCommand()

Write-Host "=== OBJECT 528 (UI_GestionCatalogoPrendas) ==="
$cmd.CommandText = "SELECT * FROM t_object WHERE Object_ID = 528"
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
