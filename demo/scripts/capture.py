import os, pty, sys, fcntl, termios, struct, json
def cap(args):
    pid, fd = pty.fork()
    if pid == 0:
        os.environ["TERM"] = "xterm-256color"
        os.execvp("sh", ["sh", "-c", "exec node cli.js " + args + " 2>/dev/null"])
    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", 50, 80, 0, 0))
    out = b""
    while True:
        try: c = os.read(fd, 65536)
        except OSError: break
        if not c: break
        out += c
    os.waitpid(pid, 0)
    return out.decode().replace("\r", "")
res = {k: cap(a) for k, a in [("run", "run -n 2"), ("wrap", '"wrap up"'), ("all", "run --all")]}
json.dump(res, open(sys.argv[1], "w"))
for k, v in res.items(): print(k, len(v.splitlines()), "lines")
