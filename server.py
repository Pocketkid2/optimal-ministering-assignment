import http.server
import socketserver
import sys

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def log_request(self, code='-', size='-'):
        # Check if it's a 404 and print it distinctly
        if str(code) == '404':
            # ANSI escape codes for Red text
            print(f"\033[91m[404 NOT FOUND] {self.path}\033[0m")
        
        # Call the parent class's standard logging
        super().log_request(code, size)

PORT = 8000
    
# Allow port to be passed as argument
if len(sys.argv) > 1:
    try:
        PORT = int(sys.argv[1])
    except ValueError:
        pass

print(f"Serving on port {PORT} with custom 404 logging...")
print(f"Open http://localhost:{PORT}")

with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.shutdown()
