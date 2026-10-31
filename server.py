"""
ARGON OPTICS - Night Vision Local Web Server
추가 패키지 설치 없이 Python 표준 라이브러리만으로 동작합니다.
모바일 스마트폰 및 PC 브라우저에서 즉시 실행 가능합니다.
"""

import http.server
import socket
import socketserver
import os
import sys
import webbrowser
import threading

# Windows 콘솔 인코딩 오류 방지
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

PORT = 8080

def get_local_ip():
    """로컬 네트워크의 IPv4 주소를 자동으로 감지합니다."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    """캐시 방지 및 올바른 MIME 타입을 보장하는 핸들러"""
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def main():
    app_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(app_dir)

    local_ip = get_local_ip()

    print("=" * 66)
    print(" [ARGON OPTICS] Ar-18 Tactical Night Vision Web Server Started")
    print("=" * 66)
    print()
    print(" [1] PC 브라우저 접속 주소:")
    print(f"     -> http://localhost:{PORT}")
    print()
    print(" [2] 스마트폰(모바일) 카메라 접속 주소:")
    print(f"     -> http://{local_ip}:{PORT}")
    print()
    print(" [스마트폰 카메라 권한 팁]:")
    print("    - 스마트폰과 PC가 동일한 Wi-Fi 공유기에 연결되어 있어야 합니다.")
    print("    - 스마트폰 크롬에서 카메라 권한이 필요할 경우:")
    print("      1) chrome://flags 접속")
    print("      2) unsafely-treat-insecure-origin-as-secure 검색")
    print(f"      3) Enabled 설정 후 http://{local_ip}:{PORT} 입력하고 재실행(Relaunch)")
    print("=" * 66)
    print(" 서버를 종료하려면 터미널에서 Ctrl + C 를 누르세요.")
    print("=" * 66)
    print()

    # 웹 브라우저 자동 실행
    def open_browser():
        try:
            webbrowser.open(f"http://localhost:{PORT}")
        except Exception:
            pass
    threading.Timer(0.8, open_browser).start()

    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
            httpd.serve_forever()
    except OSError:
        fallback_port = 8081
        print(f"포트 {PORT} 사용 중으로 인해 포트 {fallback_port}로 전환합니다.")
        with socketserver.TCPServer(("", fallback_port), CustomHandler) as httpd:
            httpd.serve_forever()

if __name__ == '__main__':
    main()
