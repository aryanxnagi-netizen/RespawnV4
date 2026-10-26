"""
RESPAWN end-to-end smoke test in headless Chromium at a Samsung-phone viewport.
Run:  python3 tests/e2e.py        (starts its own local server)
Writes screenshots to tests/shots/.
"""
import http.server, socketserver, threading, os, sys, json, shutil
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, "tests", "shots")
os.makedirs(SHOTS, exist_ok=True)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(self, *a): pass

srv = socketserver.TCPServer(("127.0.0.1", 0), Quiet)
PORT = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORT}/index.html"

results, errors = [], []
def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{detail}]" if detail and not cond else ""))

with sync_playwright() as p:
    system_chromium = shutil.which("chromium") or shutil.which("chromium-browser") or shutil.which("google-chrome")
    b = p.chromium.launch(executable_path=system_chromium, args=["--no-sandbox"]) if system_chromium else p.chromium.launch()
    ctx = b.new_context(viewport={"width": 412, "height": 915}, device_scale_factor=2, is_mobile=True, has_touch=True,
                        user_agent="Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 Chrome/141 Mobile Safari/537.36")
    page = ctx.new_page()
    page.on("console", lambda m: errors.append(("console", m.text)) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(("pageerror", str(e))))
    page.on("requestfailed", lambda r: errors.append(("requestfailed", r.url)))

    def text(): return page.inner_text("body")
    def shot(n): page.screenshot(path=os.path.join(SHOTS, n + ".png"))
    def go(h):
        page.evaluate(f"location.hash='{h}'"); page.wait_for_timeout(150)

    # ---- welcome / onboarding ----
    page.goto(BASE); page.wait_for_timeout(300)
    check("redirects new user to welcome", "#/welcome" in page.url)
    check("welcome shows RESPAWN + tagline + demo notice", "RESPAWN" in text() and "Find Your Squad" in text() and "demo mode" in text().lower())
    shot("01-welcome")
    page.click("[data-act=onb-next]")
    page.click("[data-act=onb-next]")  # no game chosen
    check("game step blocks with no selection", "at least one game" in text())
    page.click("[data-v=bgmi]"); page.click("[data-v=valorant]")
    shot("02-games")
    page.click("[data-act=onb-next]")
    page.fill("[data-bind='onb.username']", "ab")
    page.click("[data-act=onb-next]")
    check("rejects too-short username", "3–20 characters" in text())
    page.fill("[data-bind='onb.username']", "NovaStrike")
    page.click("[data-act=onb-next]")
    check("rejects username taken by a demo gamer", "taken" in text())
    page.fill("[data-bind='onb.username']", "Tester_01")
    page.fill("[data-bind='onb.bio']", "Test bio")
    page.click("[data-v=Hindi]")
    page.click("[data-act=onb-next]")
    check("reaches game setup step", "Set up your games" in text())
    shot("03-game-setup")
    page.click("[data-act=onb-next]")
    page.wait_for_timeout(300)
    check("finishing onboarding lands on Home", "#/home" in page.url)
    check("welcome notification created", "Welcome to RESPAWN" in (go("#/notifications") or text()))

    # ---- shell ----
    go("#/home")
    check("top bar has logo, search, bell, coins, avatar, menu",
          all(page.locator(s).count() >= 1 for s in [".logo", "[aria-label=Search]", "[aria-label=Messages]", "[aria-label^=Notifications]", ".coin-chip", "[aria-label='My Gamer ID']", "[data-act=menu]"]))
    check("bottom nav has exactly 5 destinations", page.locator(".bottomnav .navbtn").count() == 5)
    nav_ok = True
    for label, frag in [("Home", "home"), ("FRAGZ", "fragz"), ("Squad", "squad"), ("ARENA", "arena"), ("Gamer ID", "me")]:
        page.click(f".bottomnav >> text={label}"); page.wait_for_timeout(120)
        if "#/" + frag not in page.url: nav_ok = False
    check("every bottom-nav item opens its screen", nav_ok)
    # no horizontal overflow on any main route
    overflow = []
    for r in ["home", "fragz", "squad", "arena", "me", "search", "notifications", "wallet", "messages", "settings", "studio", "rules", "status", "invites"]:
        go("#/" + r); page.wait_for_timeout(100)
        if page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1"): overflow.append(r)
    check("no horizontal scroll on any screen at 412px", not overflow, ",".join(overflow))
    # menu
    go("#/home"); page.click("[data-act=menu]")
    check("menu drawer opens with links", page.locator(".drawer a").count() >= 8)
    page.keyboard.press("Escape")
    check("Escape closes the drawer", page.locator(".drawer").count() == 0)

    # ---- home feed ----
    go("#/home"); shot("04-home")
    check("home shows demo notice and sample posts", "Demo content" in text() and page.locator("article").count() >= 2)
    check("sample posts start with 0 likes", page.locator(".act.like").first.inner_text().strip() == "0")
    page.locator(".act.like").first.click()
    check("like increments to 1 and is pressed", page.locator(".act.like").first.get_attribute("aria-pressed") == "true" and page.locator(".act.like").first.inner_text().strip() == "1")
    page.locator(".act.like").first.click()
    check("unlike returns to 0", page.locator(".act.like").first.inner_text().strip() == "0")
    page.locator("[data-act=comments]").first.click()
    page.locator("input[id^=cmt-]").first.fill("GG well played")
    page.locator("[data-act=comment]").first.click()
    check("comment is added and counted", "GG well played" in text())
    page.locator(".act.save").first.click()
    check("bookmark toggles", page.locator(".act.save").first.get_attribute("aria-pressed") == "true")
    page.locator("[data-act=follow]").first.click()
    check("follow button flips to Following", "Following" in text())
    page.click("[data-v=following]"); page.wait_for_timeout(100)
    check("Following tab shows followed gamer's post", page.locator("article").count() >= 1)
    page.click("[data-v=foryou]")
    # compose + delete
    page.click("button[data-act=compose]")
    page.click("[data-act=post-submit]")
    check("empty post is rejected", "Write something" in text())
    page.fill("#cmp-text", "My first post #clutch #bgmi")
    page.click("[data-act=post-submit]"); page.wait_for_timeout(200)
    check("new post appears in feed with hashtags", "My first post" in text())
    page.locator("[data-act=del-post]").first.click(); page.click("[data-act=del-post-yes]")
    check("own post can be deleted", "My first post" not in text())
    # report hides content
    victim = page.locator("[data-act=report]").first.get_attribute("data-id")
    page.locator("[data-act=report]").first.click()
    check("report sheet is honestly labelled demo", "No moderator receives it" in text())
    page.click("[data-act=report-submit]"); page.wait_for_timeout(150)
    check("reporting hides that post for the user", page.locator(f"#post-{victim}").count() == 0)
    # hashtag -> search
    page.locator("[data-act=tag]").first.click(); page.wait_for_timeout(200)
    check("hashtag opens search with results", "#/search" in page.url and page.locator("#results .card").count() >= 1, page.url)
    shot("05-search")

    # ---- FRAGZ ----
    go("#/fragz"); page.wait_for_timeout(200); shot("06-fragz")
    check("FRAGZ clips labelled as demo, no fake video", "DEMO CLIP" in text() and page.locator("video").count() == 0)
    check("FRAGZ is a scroll-snap vertical feed", page.evaluate("getComputedStyle(document.getElementById('fragz')).scrollSnapType").startswith("y"))
    page.click("[data-act=clip-upload]")
    page.set_input_files("#clip-file", {"name": "notes.txt", "mimeType": "text/plain", "buffer": b"hello"})
    check("upload rejects wrong file type", "Unsupported file type" in text())
    page.set_input_files("#clip-file", {"name": "ok.mp4", "mimeType": "video/mp4", "buffer": b"\x00" * 2048})
    check("valid file is NOT claimed as uploaded", "was not uploaded" in text())
    page.keyboard.press("Escape")

    # ---- Squad Finder ----
    go("#/squad"); page.wait_for_timeout(200); shot("07-squad")
    check("squad finder lists scored matches", page.locator(".score").count() >= 1 and "compatibility" in text())
    scores = [int(x.replace("%", "")) for x in page.locator(".score b").all_inner_texts()]
    check("results sorted by score descending", scores == sorted(scores, reverse=True) and len(scores) >= 3, str(scores))
    check("explanation text shown", "% compatibility —" in text())
    check("squad finder says scores are heuristic, not AI", "heuristic" in text().lower())
    first = page.locator("article h3, article b").first.inner_text()
    page.locator("[data-act=why]").first.click()
    check("'Why?' shows 7-factor breakdown totalling weights", page.locator(".sheet table tr").count() == 8)
    page.keyboard.press("Escape")
    page.locator("[data-act=invite]").first.click()
    check("invite flips to Invited · Cancel", "Invited" in text())
    go("#/invites")
    check("pending invitation listed with demo disclaimer", page.locator(".card.tight .btn").count() >= 1 and "Demo mode" in text())
    page.locator("[data-act=invite-cancel]").first.click()
    go("#/squad")
    # filters
    page.click("summary"); page.wait_for_timeout(100)
    before = page.locator(".score").count()
    page.select_option("[data-bind='f.language']", "Bengali"); page.wait_for_timeout(150)
    check("language filter narrows results", page.locator(".score").count() < before or page.locator(".score").count() == 1)
    page.click("[data-act=squad-reset]")
    check("clear filters keeps the panel open and restores results", page.locator(".score").count() == before)
    # weights
    page.click("[data-act=weights]")
    page.fill("[data-weight=game]", "50"); page.wait_for_timeout(100)
    check("weights UI blocks apply when total != 100", page.locator("#wapply").is_disabled())
    page.fill("[data-weight=game]", "25"); page.wait_for_timeout(100)
    check("weights UI enables apply at exactly 100", not page.locator("#wapply").is_disabled())
    page.keyboard.press("Escape")
    # switch game
    page.click("[data-act=squad-game][data-v=valorant]"); page.wait_for_timeout(200)
    check("switching game re-ranks within that game", "VAL" in text())
    # player profile + block
    page.locator("a:has-text('Profile')").first.click(); page.wait_for_timeout(200); shot("08-player")
    check("player profile shows self-reported rank disclaimer", "self-reported" in text().lower() and "Demo gamer" in text())
    page.click("[data-act=block]"); page.click("[data-act=block-yes]"); page.wait_for_timeout(250)
    check("blocking returns to Home", "#/home" in page.url)

    # ---- ARENA ----
    go("#/arena"); page.wait_for_timeout(150); shot("09-arena")
    check("ARENA lists demo events with state badges", page.locator("a.arena-event").count() >= 8 and "Registration open" in text())
    page.click("[data-v=competitive]")
    check("Competitive tab filters events", 0 < page.locator("a.arena-event").count() < 8)
    page.click("[data-v=all]") if page.locator("[data-v=all]").count() else None
    page.click("[data-act=arena-tab][data-v=all]")
    page.locator("a.arena-event:has-text('Registration open')").first.click(); page.wait_for_timeout(150)
    check("event detail shows rules, free entry, virtual rewards", "Rules" in text() and "no cash value" in text())
    page.click("[data-act=register]")
    check("registration is recorded (demo)", "Cancel registration" in text())
    page.click("[data-act=unregister]")
    check("unregister works", "Register — free" in text())
    for tid, must in [("t5", "no winners are shown"), ("t8", "No winner is shown"), ("t7", "cancelled")]:
        go("#/tournament/" + tid)
        check(f"state copy for {tid} never fabricates results", must in text() and "Register — free" not in text())

    # ---- Gamer ID + studio ----
    go("#/me"); page.wait_for_timeout(200); shot("10-gamerid")
    t = text()
    check("Gamer ID shows username, self-reported labels, 4 stat categories",
          "Tester_01" in t and "Self-reported" in t and "Platform-calculated" in t and "Organizer-verified" in t and "Game-confirmed" in t)
    check("rank never labelled verified", "self-reported" in t.lower() and "official" not in t.lower().replace("official game", "").replace("official publisher", ""))
    page.click("[data-act=preview-public]")
    check("public preview hides age and in-game IDs", "Never shown" in text())
    page.keyboard.press("Escape")
    go("#/studio"); page.wait_for_timeout(150); shot("11-studio")
    check("studio: Save disabled until a change", page.locator("[data-act=studio-save]").is_disabled())
    page.click("[data-act=studio-pick][data-k=theme][data-v=ember]")
    check("studio: live preview changes theme colour", "251, 113, 133" in page.evaluate("getComputedStyle(document.querySelector('.theme-a .avatar')).getPropertyValue('--a')") or "#FB7185" in page.inner_html(".theme-a").upper())
    check("studio: locked items are shown as locked", page.locator("text=Locked").count() >= 4)
    page.click("[data-act=studio-save]"); page.wait_for_timeout(200)
    check("studio: save persists and returns to Gamer ID", "#/me" in page.url)
    page.reload(); page.wait_for_timeout(300)
    check("customization persists after reload", "ember" in page.evaluate("localStorage.getItem('respawn.demo.v1')"))
    # edit game
    page.click("[data-act=edit-game][data-id=bgmi]")
    page.select_option("#eg-rank", "Diamond")
    page.click("[data-act=edit-game-save]"); page.wait_for_timeout(150)
    check("editing a linked game updates rank", "Diamond" in text())

    # ---- notifications, wallet, messages, settings ----
    go("#/notifications")
    check("notifications show real local events (blocked, invites…) not fake ones", "Invite to" in text() or "Welcome" in text())
    badge_before = page.locator(".topbar .count").count()
    page.click("[data-act=read-all]"); page.wait_for_timeout(100)
    check("mark all as read clears the unread badge", page.locator(".topbar .count").count() == 0 and badge_before >= 1)
    go("#/wallet")
    check("wallet is honest: 0 coins, not live, no fake history", "not live" in text() and "No transactions" in text())
    go("#/messages")
    check("messages screen has a local-demo inbox and suggested gamers", "Your inbox starts here" in text() and page.locator(".chat-open").count() >= 1 and "not delivered" in text())
    page.locator(".chat-open").first.click(); page.wait_for_timeout(120)
    check("opening a suggested gamer shows a chat thread", page.locator("#chat-input").count() == 1 and "not delivered" in text())
    page.fill("#chat-input", "GG, want to squad up?"); page.keyboard.press("Enter"); page.wait_for_timeout(180)
    check("chat sends and persists a local demo message", "GG, want to squad up?" in text() and page.locator(".chat-bubble.mine").count() == 1)
    go("#/messages")
    check("sent demo chat appears in Recent chats", "Recent chats" in text() and "GG, want to squad up?" in text())
    go("#/settings")
    check("settings defaults to private profile", page.locator("[data-bind='profile.visibility']").input_value() == "private")
    check("blocked player listed and unblock works", page.locator("[data-act=unblock]").count() == 1)
    page.click("[data-act=unblock]")
    check("unblock empties list", page.locator("[data-act=unblock]").count() == 0)
    go("#/status")
    check("feature status page has all five categories", all(f"{c}." in text() for c in "ABCDE"))

    # ---- search ----
    go("#/search")
    page.fill("#q", "zzzzqq"); page.wait_for_timeout(150)
    check("search no-results state", "No results" in text())
    page.fill("#q", "valorant"); page.wait_for_timeout(150)
    check("search finds games/gamers/events", page.locator("#results h3").count() >= 2)

    # ---- accessibility / robustness ----
    check("html lang set and viewport-fit=cover", page.evaluate("document.documentElement.lang") == "en" and "viewport-fit=cover" in page.inner_html("head"))
    unlabeled = page.evaluate("""[...document.querySelectorAll('button,a')].filter(e=>!(e.textContent||'').trim() && !e.getAttribute('aria-label')).length""")
    for r in ["home", "squad", "arena", "me"]:
        go("#/" + r)
        unlabeled += page.evaluate("""[...document.querySelectorAll('button,a')].filter(e=>!(e.textContent||'').trim() && !e.getAttribute('aria-label')).length""")
    check("no unlabeled icon-only buttons/links", unlabeled == 0, str(unlabeled))
    small = page.evaluate("""[...document.querySelectorAll('.bottomnav a, .topbar a, .topbar button')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.width<36||r.height<36)}).length""")
    check("top/bottom bar tap targets >= 36px", small == 0, str(small))
    go("#/doesnotexist")
    check("unknown route shows not-found state", "Page not found" in text())
    ctx.set_offline(True); page.evaluate("window.dispatchEvent(new Event('offline'))"); page.wait_for_timeout(150)
    check("offline banner appears", page.evaluate("document.body.classList.contains('is-offline')"))
    ctx.set_offline(False); page.evaluate("window.dispatchEvent(new Event('online'))")
    # reduced motion
    rm = b.new_context(viewport={"width": 412, "height": 915}, reduced_motion="reduce").new_page()
    rm.goto(BASE); rm.wait_for_timeout(200)
    check("reduced-motion preference is honoured", rm.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches") and "0.001ms" in rm.evaluate("[...document.styleSheets[0].cssRules].map(r=>r.cssText).join('')"))
    # small phone
    sm = b.new_context(viewport={"width": 320, "height": 640}).new_page()
    sm.goto(BASE); sm.wait_for_timeout(200)
    check("320px phone: welcome has no horizontal overflow", not sm.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1"))
    b.close()

# real runtime errors only (the service worker registration may log nothing)
real = [e for e in errors if "favicon" not in e[1]]
check("no console errors / page errors / failed requests during the run", not real, json.dumps(real[:5]))

fails = [r for r in results if not r[1]]
print(f"\n{len(results) - len(fails)}/{len(results)} checks passed")
sys.exit(1 if fails else 0)
