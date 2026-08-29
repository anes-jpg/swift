@echo off
call "C:\Program Files\Microsoft Visual Studio\18\Community\VC\Auxiliary\Build\vcvars64.bat"
cd /d "%~dp0"
call npm run tauri:build
powershell Compress-Archive -Path chrome-extension\* -DestinationPath swift-extension.zip -Force
