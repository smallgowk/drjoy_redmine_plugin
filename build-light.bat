@echo off
chcp 65001 >nul
title Building Extension (Light Obfuscation)

echo 🚀 Building Extension (Light Obfuscation)
echo ==========================================
echo.

:: Check files
if not exist manifest.json (echo ❌ manifest.json missing && pause && exit /b 1)
if not exist background.js (echo ❌ background.js missing && pause && exit /b 1) 
if not exist popup.html (echo ❌ popup.html missing && pause && exit /b 1)
if not exist popup.js (echo ❌ popup.js missing && pause && exit /b 1)
if not exist styles.css (echo ❌ styles.css missing && pause && exit /b 1)

echo ✅ All files found
echo.

:: Clean and create folders
if exist build rmdir /s /q build
mkdir build\extension
mkdir build\package

:: Copy static files
echo 📋 Copying files...
copy manifest.json build\extension\ >nul
copy popup.html build\extension\ >nul  
copy styles.css build\extension\ >nul
copy content-script.js build\extension\ >nul
copy multi-task.html build\extension\ >nul
copy multi-task.js build\extension\ >nul
copy move-to-date.html build\extension\ >nul
copy move-to-date.js build\extension\ >nul
if exist images xcopy images build\extension\images\ /e /i /q >nul

:: Backup originals
copy background.js build\background.original.js >nul
copy popup.js build\popup.original.js >nul
copy content-script.js build\content-script.original.js >nul
copy multi-task.js build\multi-task.original.js >nul
copy move-to-date.js build\move-to-date.original.js >nul

:: Light obfuscation for background.js (preserve functionality)
echo 🔒 Light obfuscation for background.js...
call javascript-obfuscator background.js ^
    --output build\extension\background.js ^
    --compact true ^
    --rename-globals false ^
    --string-array false ^
    --identifiers-prefix ""

if %errorlevel% neq 0 (
    echo ⚠️ Light obfuscation failed, trying minimal...
    call javascript-obfuscator background.js ^
        --output build\extension\background.js ^
        --compact true
    
    if %errorlevel% neq 0 (
        echo ❌ All obfuscation failed, copying original
        copy background.js build\extension\background.js >nul
        echo ⚠️ WARNING: background.js is not obfuscated!
    else (
        echo ✅ Minimal obfuscation successful
    )
else (
    echo ✅ Light obfuscation successful
)

:: Light obfuscation for popup.js
echo 🔒 Light obfuscation for popup.js...
call javascript-obfuscator popup.js ^
    --output build\extension\popup.js ^
    --compact true ^
    --rename-globals false ^
    --string-array false

if %errorlevel% neq 0 (
    echo ⚠️ Popup obfuscation failed, trying minimal...
    call javascript-obfuscator popup.js ^
        --output build\extension\popup.js ^
        --compact true
    
    if %errorlevel% neq 0 (
        echo ❌ Popup obfuscation failed, copying original
        copy popup.js build\extension\popup.js >nul
        echo ⚠️ WARNING: popup.js is not obfuscated!
    else (
        echo ✅ Minimal popup obfuscation successful
    )
else (
    echo ✅ Light popup obfuscation successful
)

:: Light obfuscation for content-script.js
echo 🔒 Light obfuscation for content-script.js...
call javascript-obfuscator content-script.js ^
    --output build\extension\content-script.js ^
    --compact true ^
    --rename-globals false ^
    --string-array false

if %errorlevel% neq 0 (
    echo ⚠️ Content script obfuscation failed, trying minimal...
    call javascript-obfuscator content-script.js ^
        --output build\extension\content-script.js ^
        --compact true
    
    if %errorlevel% neq 0 (
        echo ❌ Content script obfuscation failed, copying original
        copy content-script.js build\extension\content-script.js >nul
        echo ⚠️ WARNING: content-script.js is not obfuscated!
    else (
        echo ✅ Minimal content script obfuscation successful
    )
else (
    echo ✅ Light content script obfuscation successful
)

:: Light obfuscation for multi-task.js
echo 🔒 Light obfuscation for multi-task.js...
call javascript-obfuscator multi-task.js ^
    --output build\extension\multi-task.js ^
    --compact true ^
    --rename-globals false ^
    --string-array false

if %errorlevel% neq 0 (
    echo ⚠️ Multi-task obfuscation failed, trying minimal...
    call javascript-obfuscator multi-task.js ^
        --output build\extension\multi-task.js ^
        --compact true
    
    if %errorlevel% neq 0 (
        echo ❌ Multi-task obfuscation failed, copying original
        copy multi-task.js build\extension\multi-task.js >nul
        echo ⚠️ WARNING: multi-task.js is not obfuscated!
    else (
        echo ✅ Minimal multi-task obfuscation successful
    )
else (
    echo ✅ Light multi-task obfuscation successful
)

:: Light obfuscation for move-to-date.js
echo 🔒 Light obfuscation for move-to-date.js...
call javascript-obfuscator move-to-date.js ^
    --output build\extension\move-to-date.js ^
    --compact true ^
    --rename-globals false ^
    --string-array false

if %errorlevel% neq 0 (
    echo ⚠️ Move-to-date obfuscation failed, trying minimal...
    call javascript-obfuscator move-to-date.js ^
        --output build\extension\move-to-date.js ^
        --compact true
    
    if %errorlevel% neq 0 (
        echo ❌ Move-to-date obfuscation failed, copying original
        copy move-to-date.js build\extension\move-to-date.js >nul
        echo ⚠️ WARNING: move-to-date.js is not obfuscated!
    else (
        echo ✅ Minimal move-to-date obfuscation successful
    )
else (
    echo ✅ Light move-to-date obfuscation successful
)

:: Create README
echo 📝 Creating README...
(
echo # Chrome Extension Installation
echo.
echo ## Steps:
echo 1. Open Chrome: chrome://extensions/
echo 2. Enable "Developer mode" ^(top right toggle^)
echo 3. Click "Load unpacked"
echo 4. Select the "extension" folder
echo.
echo ## Usage:
echo 1. Open Google Sheets with Order IDs
echo 2. Click extension icon  
echo 3. Click Start button
echo 4. Enable Auto-Rerun if needed
echo.
echo Extension uses light obfuscation to preserve functionality.
) > build\package\README.md

:: Create install helper
(
echo @echo off
echo echo Opening Chrome extensions page...
echo start chrome://extensions/
echo echo.
echo echo Follow these steps:
echo echo 1. Enable "Developer mode" ^(top right^)
echo echo 2. Click "Load unpacked"  
echo echo 3. Select the "extension" folder
echo echo.
echo echo Extension will be ready to use!
echo pause
) > build\package\install.bat

:: Create ZIP
echo 📦 Creating ZIP...
powershell -command "Compress-Archive -Path 'build\extension\*' -DestinationPath 'build\package\extension.zip' -Force" >nul 2>&1

:: Show results
echo.
echo 📊 Build Results:
for %%A in (background.js) do echo    Original background.js: %%~zA bytes
for %%A in (build\extension\background.js) do echo    Obfuscated background.js: %%~zA bytes
for %%A in (popup.js) do echo    Original popup.js: %%~zA bytes  
for %%A in (build\extension\popup.js) do echo    Obfuscated popup.js: %%~zA bytes
for %%A in (content-script.js) do echo    Original content-script.js: %%~zA bytes
for %%A in (build\extension\content-script.js) do echo    Obfuscated content-script.js: %%~zA bytes
for %%A in (multi-task.js) do echo    Original multi-task.js: %%~zA bytes
for %%A in (build\extension\multi-task.js) do echo    Obfuscated multi-task.js: %%~zA bytes
for %%A in (move-to-date.js) do echo    Original move-to-date.js: %%~zA bytes
for %%A in (build\extension\move-to-date.js) do echo    Obfuscated move-to-date.js: %%~zA bytes

echo.
echo 🎉 Light obfuscation completed!
echo.
echo 📁 Extension files: build\extension\
echo 📁 Package for client: build\package\
echo.
echo 🧪 TEST THIS VERSION to make sure tracking still works
echo 📦 If OK, send build\package\ to client
echo.
pause