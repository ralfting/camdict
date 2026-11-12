"""Capture camdict's real, styled output in a 60-column pseudo-terminal.

Run from the repository root: python3 demo/scripts/capture.py demo/scripts/captures.json
"""
import fcntl, json, os, pty, struct, sys, termios

COMMANDS = {
    "pizza": "pizza",
    "giveup": '"give up"',
    "wonderful": "wonderful",
    "library1": "library -n 1",
    "libraryall": "library --all",
}


def capture(args, cols=60):
    pid, fd = pty.fork()
    if pid == 0:
        os.environ["TERM"] = "xterm-256color"
        os.execvp("sh", ["sh", "-c", "exec node cli.js " + args + " 2>/dev/null"])
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", 50, cols, 0, 0))
    out = b""
    while True:
        try:
            chunk = os.read(fd, 65536)
        except OSError:
            break
        if not chunk:
            break
        out += chunk
    os.waitpid(pid, 0)
    return out.decode().replace("\r", "")


result = {key: capture(args) for key, args in COMMANDS.items()}
json.dump(result, open(sys.argv[1], "w"), indent=1, ensure_ascii=False)
for key, text in result.items():
    print(key, len(text.rstrip("\n").splitlines()), "lines")
