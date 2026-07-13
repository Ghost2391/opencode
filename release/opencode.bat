@echo off
setlocal
set "DIR=%~dp0"
set "DIR=%DIR:~0,-1%"
set NODE_SKIP_PLATFORM_CHECK=1
set "OPENCODE_CONFIG_DIR=%DIR%\config"
set "OPENCODE_DISABLE_MODELS_FETCH=true"
set "OPENCODE_MODELS_PATH=%DIR%\web-ui\models.json"
"%DIR%\bin\node.exe" "%DIR%\index.mjs" %*
endlocal
