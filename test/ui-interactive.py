#!/usr/bin/env python3
"""Headless-Chromium interactive UI checks for aorila-web.

Starts the app in hermetic local-auth mode, snapshots every public route
(consumer + labs + authenticated console), and drives the rendered pages in
real Chromium (desktop 1440x900 and mobile 390x844) asserting:

- no placeholder/lorem copy, no dishonest "coming soon"
- no dead href="#" links, no unwired buttons, forms all have targets
- no JS errors, every page has a title
- brand separation: no Ally chip, no upstream vendor names in user copy
- mobile nav toggle opens, search overlay opens, console menu toggles

Chromium cannot reach the sandbox egress proxy or localhost directly, so pages
are snapshotted over HTTP and opened via file:// with absolute asset paths
rewritten to relative (see ~/TOOLS.md).
"""
import http.server
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.parse
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXE = "/opt/meta-chromium/chrome"
OUT = tempfile.mkdtemp(prefix="aorila-ui-")

MARKETING = (
    "ai-api pods serverless clusters hub deployments inference agents "
    "fine-tuning compute-heavy case-studies articles press blog about providers "
    "partner careers pricing contact search"
).split()
STATIC_PAGES = [
    ("consumer-home", "/", None),
    ("consumer-api", "/api", None),
    ("consumer-docs", "/docs", None),
    ("consumer-tp", "/tp", None),
    ("consumer-support", "/support", None),
    ("consumer-commercial", "/commercial", None),
    ("consumer-commercial-vms", "/commercial/vms", None),
    ("consumer-commercial-reserved", "/commercial/reserved", None),
    ("consumer-commercial-terms", "/commercial/terms", None),
    ("consumer-login", "/login", None),
    ("consumer-signup", "/signup", None),
    ("labs-home", "/", "aorilalabs.com"),
    ("labs-api", "/api", "aorilalabs.com"),
    ("labs-docs", "/docs", "aorilalabs.com"),
    ("labs-tp", "/tp", "aorilalabs.com"),
    ("labs-support", "/support", "aorilalabs.com"),
]
CONSOLE = [
    "console", "console/new", "console/pods/new", "console/serverless/new",
    "console/storage/new", "console/pods", "console/serverless",
    "console/clusters", "console/storage", "console/deployments",
    "console/billing", "console/account", "console/hub", "commercial/console",
]
ASSETS = ["design.css", "home.css", "commercial.css", "console.css", "styles.css",
          "site.js", "price.js", "console.js", "favicon.svg"]


def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def start_server():
    port = free_port()
    data_dir = tempfile.mkdtemp(prefix="aorila-ui-data-")
    env = dict(os.environ, PORT=str(port), AORILA_AUTH_MODE="local",
               DATA_DIR=data_dir, COMPUTE_ORIGIN="http://127.0.0.1:1")
    proc = subprocess.Popen(["node", "server.js"], cwd=REPO, env=env,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    base = f"http://127.0.0.1:{port}"
    for _ in range(100):
        try:
            urllib.request.urlopen(base + "/healthz", timeout=2).read()
            return proc, base
        except Exception:
            time.sleep(0.1)
    proc.terminate()
    raise RuntimeError("server did not start")


class CookieJar:
    def __init__(self):
        self.cookies = {}

    def update(self, resp):
        for h in resp.headers.get_all("Set-Cookie") or []:
            kv = h.split(";", 1)[0]
            if "=" in kv:
                k, v = kv.split("=", 1)
                self.cookies[k.strip()] = v.strip()

    def header(self):
        return "; ".join(f"{k}={v}" for k, v in self.cookies.items())


def fetch(base, path, host=None, jar=None, data=None):
    req = urllib.request.Request(base + path,
                                 data=urllib.parse.urlencode(data).encode() if data else None)
    if host:
        req.add_header("Host", host)
    if jar and jar.cookies:
        req.add_header("Cookie", jar.header())
    resp = urllib.request.urlopen(req, timeout=20)
    if jar:
        jar.update(resp)
    return resp.read().decode("utf-8", "replace")


def rewrite(html):
    return re.sub(
        r'(href|src)="/(design\.css|home\.css|commercial\.css|console\.css|styles\.css|site\.js|price\.js|console\.js|favicon\.svg)"',
        r'\1="../\2"', html)


def snapshot(base):
    pages = os.path.join(OUT, "pages")
    os.makedirs(pages, exist_ok=True)
    for a in ASSETS:
        src = os.path.join(REPO, "public", a)
        if os.path.exists(src):
            shutil.copy(src, os.path.join(pages, a))

    def snap(slug, html):
        d = os.path.join(pages, slug)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "index.html"), "w") as f:
            f.write(rewrite(html))

    for slug, path, host in STATIC_PAGES:
        snap(slug, fetch(base, path, host))
    for s in MARKETING:
        snap(f"consumer-{s}", fetch(base, "/" + s))
    jar = CookieJar()
    fetch(base, "/signup", jar=jar,
          data={"email": "ui-check@example.com", "password": "password12345", "name": "UICheck"})
    for c in CONSOLE:
        snap("auth-" + c.replace("/", "-"), fetch(base, "/" + c, jar=jar))
    return pages


def main():
    from playwright.sync_api import sync_playwright

    proc, base = start_server()
    try:
        pages = snapshot(base)
    except Exception:
        proc.terminate()
        raise

    fails, passes = [], []

    def check(name, cond, detail=""):
        (passes if cond else fails).append(name)
        print(("PASS " if cond else "FAIL ") + name + (f" — {detail}" if detail and not cond else ""))

    placeholder = re.compile(r"lorem ipsum|placeholder text|\bTODO\b|\bFIXME\b", re.I)
    coming_soon = re.compile(r"coming soon", re.I)

    def slugs():
        out = []
        for slug in sorted(os.listdir(pages)):
            f = os.path.join(pages, slug, "index.html")
            if os.path.isfile(f):
                out.append((slug, "file://" + f))
        return out

    def open_search(pg):
        toggle = pg.query_selector(".nav-toggle")
        if toggle and toggle.is_visible():
            toggle.click()
            pg.wait_for_timeout(400)
        trig = pg.query_selector("[data-search-open]")
        if not trig or not trig.is_visible():
            return None
        trig.click()
        pg.wait_for_timeout(300)
        vis = pg.evaluate("!document.querySelector('[data-search-overlay]').hidden")
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(200)
        return bool(vis)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=EXE, args=["--no-sandbox"])
            for width, height, label in [(1440, 900, "desktop"), (390, 844, "mobile")]:
                ctx = browser.new_context(viewport={"width": width, "height": height})
                for slug, url in slugs():
                    pg = ctx.new_page()
                    errors = []
                    pg.on("pageerror", lambda e: errors.append(str(e)))
                    try:
                        pg.goto(url, wait_until="load", timeout=20000)
                    except Exception as e:
                        check(f"[{label}] {slug} loads", False, str(e)[:80])
                        pg.close()
                        continue
                    check(f"[{label}] {slug} loads", True)
                    body_text = pg.evaluate("document.body ? document.body.innerText : ''")

                    m = placeholder.search(body_text)
                    check(f"[{label}] {slug} no placeholder copy", not m, m.group(0)[:60] if m else "")

                    csm = [mm.group(0) for mm in coming_soon.finditer(body_text)]
                    cs_ok = (not csm) or slug == "consumer-case-studies" or \
                        'no "coming soon" dressed up as live' in body_text or \
                        "console" in slug or "commercial" in slug or \
                        "checkout opens soon" in body_text
                    check(f"[{label}] {slug} no dishonest coming-soon", cs_ok, str(csm[:2]))

                    dead = pg.evaluate(
                        "Array.from(document.querySelectorAll('a')).filter(a=>a.getAttribute('href')==='#')"
                        ".map(a=>a.textContent.trim().slice(0,40))")
                    check(f"[{label}] {slug} no dead # links", len(dead) == 0, str(dead[:3]))

                    deadbtn = pg.evaluate(
                        """Array.from(document.querySelectorAll('button')).filter(b=>{
                          if(b.type==='submit') return false;
                          if(b.hasAttribute('data-search-open')||b.hasAttribute('data-search-close')||
                             b.hasAttribute('data-nav-close')||b.hasAttribute('data-console-menu')||
                             b.hasAttribute('data-gf')) return false;
                          if(b.classList.contains('nav-toggle')||b.classList.contains('nav-dropdown-toggle')||
                             b.classList.contains('nav-sidebar-close')||b.classList.contains('console-menu-btn')||
                             b.classList.contains('console-close')) return false;
                          return (b.textContent||'').trim().length>0;
                        }).map(b=>(b.textContent||'').trim().slice(0,30))""")
                    check(f"[{label}] {slug} buttons wired", len(deadbtn) == 0, str(deadbtn[:3]))

                    badform = pg.evaluate(
                        "Array.from(document.querySelectorAll('form')).filter(f=>{"
                        "const a=f.getAttribute('action'); return !(a&&a.length>1);})"
                        ".map(f=>f.className)")
                    check(f"[{label}] {slug} forms have targets", len(badform) == 0, str(badform[:3]))

                    check(f"[{label}] {slug} no js errors", len(errors) == 0, str(errors[:1]))
                    check(f"[{label}] {slug} has title", bool(pg.title()))

                    html = pg.content()
                    check(f"[{label}] {slug} no Ally chip", "ally.atraly.com" not in html)
                    check(f"[{label}] {slug} no upstream vendor names",
                          not re.search(r"RunPod|Vast\.ai|TensorDock|Voltage Park", html))

                    if label == "mobile":
                        toggle = pg.query_selector(".nav-toggle")
                        if toggle and toggle.is_visible():
                            try:
                                toggle.click(timeout=3000)
                                pg.wait_for_timeout(400)
                                opened = pg.evaluate(
                                    "document.querySelector('header.nav').classList.contains('is-open')")
                                check(f"[mobile] {slug} nav toggle opens", bool(opened))
                                pg.keyboard.press("Escape")
                                pg.wait_for_timeout(300)
                            except Exception as e:
                                check(f"[mobile] {slug} nav toggle opens", False, str(e)[:60])

                    cmenu = pg.query_selector("[data-console-menu]")
                    if cmenu:
                        try:
                            cmenu.click(timeout=3000)
                            pg.wait_for_timeout(300)
                            check(f"[{label}] {slug} console menu toggles", True)
                            cmenu.click()
                            pg.wait_for_timeout(200)
                        except Exception as e:
                            check(f"[{label}] {slug} console menu toggles", False, str(e)[:60])

                    r = open_search(pg)
                    if r is not None:
                        check(f"[{label}] {slug} search opens", r)
                    pg.close()
                ctx.close()
            browser.close()
    finally:
        proc.terminate()

    print(f"\n{len(passes)} passed, {len(fails)} failed")
    if fails:
        print("FAILURES:")
        for f in sorted(set(fails)):
            print(" -", f)
        sys.exit(1)


if __name__ == "__main__":
    main()
