@echo off
setlocal
set "DIR=%~dp0"
set "DIR=%DIR:~0,-1%"
set "OPENCODE_CONFIG_DIR=%DIR%\config"
"%DIR%\bin\node.exe" "%DIR%\index.mjs" %*
endlocal
