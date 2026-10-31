@echo off
chcp 65001 > nul
title ARGON OPTICS Night Vision Server
echo ===================================================
echo  ARGON OPTICS - 전술 야간 투시경 웹앱 실행 중...
echo ===================================================
python "%~dp0server.py"
pause
