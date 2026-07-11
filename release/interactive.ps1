$SessionId = $null
while ($true) {
    $msg = Read-Host "> "
    if ($msg -eq "/exit" -or $msg -eq "/quit") { break }
    if ($msg -eq "/new") { $SessionId = $null; continue }
    if ($msg.Trim() -eq "") { continue }
    $args = @("run")
    if ($SessionId) { $args += "--session"; $args += $SessionId }
    $args += "--print-logs"
    $args += $msg
    $result = & ".\bin\node.exe" "index.mjs" @args 2>$null
    Write-Host $result
}
