@echo off
chcp 65001 > nul
echo ======================================================================
echo  ARGON OPTICS // Ar-18 Windows Standalone (.exe) Build Tool
echo ======================================================================
echo.

echo [1/3] 빌드 도구 (PyInstaller 및 Pillow) 확인 및 설치 중...
python -m pip install --upgrade pip
python -m pip install pyinstaller pillow
echo.

echo [2/3] Windows 아이콘(icon.ico) 리소스 검증 및 생성 중...
python -c "from PIL import Image; img = Image.open('icon.png'); img.save('icon.ico', format='ICO', sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])"
echo.

echo [3/3] PyInstaller 단일 실행파일(NightVision_Ar18.exe) 패키징 중...
pyinstaller --noconfirm --clean --onefile ^
  --name "NightVision_Ar18" ^
  --icon "icon.ico" ^
  --add-data "index.html;." ^
  --add-data "app.js;." ^
  --add-data "style.css;." ^
  --add-data "icon.png;." ^
  --add-data "manifest.json;." ^
  --add-data "sw.js;." ^
  server.py
echo.

if exist "dist\NightVision_Ar18.exe" (
    echo ======================================================================
    echo  [성공] dist\NightVision_Ar18.exe 단일 실행 파일 빌드가 완료되었습니다!
    echo  별도의 Python 설치 없이 dist\NightVision_Ar18.exe 만 더블클릭하면 실행됩니다.
    echo ======================================================================
) else (
    echo ======================================================================
    echo  [오류] 빌드에 실패했습니다. 위의 로그를 확인하세요.
    echo ======================================================================
)
echo.
pause
