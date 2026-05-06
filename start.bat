@echo off
chcp 65001 >nul 2>nul
echo [1/2] 正在启动后端服务 (端口 3001)...

cd ./backend
npm run dev

echo [2/2] 正在启动前端服务 (端口 5173)...
cd ../frontend
npm run dev


echo.
echo sucessed!
echo ServerAPI:  http://localhost:3001/api
echo Frontend UI: http://localhost:5173
echo.
echo press any key to exit...
pause >nul
