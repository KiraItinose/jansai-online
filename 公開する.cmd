@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.jsが見つかりません。https://nodejs.org/ から導入してください。 & pause & exit /b 1)
call npm install
if errorlevel 1 (echo npm install失敗 & pause & exit /b 1)
call npm run check
if errorlevel 1 (echo 検証失敗のため公開中止 & pause & exit /b 1)
call npx wrangler login
if errorlevel 1 (echo Cloudflareログイン失敗 & pause & exit /b 1)
call npm run deploy
if errorlevel 1 (echo 公開失敗 & pause & exit /b 1)
echo 公開完了: 上に表示された workers.dev のURLを開いてください。
pause
