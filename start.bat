@echo off
echo ========================================
echo   Запуск проекта
echo   База данных учащихся колледжа
echo ========================================
echo.
echo [1/2] Запуск бэкенда (порт 5000)...
start cmd /k "cd backend && npm install && npm run dev"
echo.
echo [2/2] Запуск фронтенда (порт 3000)...
timeout /t 5 /nobreak > nul
start cmd /k "cd frontend && npm install && npm run dev"
echo.
echo ========================================
echo   Оба сервера запущены!
echo   Открой в браузере: http://localhost:3000
echo ========================================
echo.
echo   Чтобы остановить серверы - закрой окна cmd
pause
