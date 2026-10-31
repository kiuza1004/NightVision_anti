@echo off
chcp 65001 > nul
title ARGON OPTICS - 전술 야간 투시경 서버
cd /d "%~dp0"
echo ========================================================
echo  ARGON OPTICS // Ar-18 전술 야간 투시경 서버를 시작합니다.
echo  잠시 후 기본 웹브라우저가 자동으로 열립니다...
echo ========================================================
start "" "http://localhost:8080"
python server.py
pause
