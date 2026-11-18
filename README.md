# 🗣️ BridgeVoice — Har notice, simple shabdon mein

**The bank letter your grandmother can't read? Paste it here — BridgeVoice says it back in plain, simple words, out loud, with the dates, money and phone numbers pulled out on cards.**

Built for elderly and low-literacy users in India, who receive the hardest official language — KYC warnings, discharge summaries, disconnection notices — and are expected to act on it alone.

## What it does

Paste or type any complex notice (English or Hindi) and BridgeVoice returns:

1. **Simple words** — a deterministic phrase-mapping engine rewrites officialese into plain language: *"You are hereby informed that…"* → *"We are telling you:"*, *"अंतिम तिथि"* → *"आखिरी तारीख"*.
2. **Big-text mode** — one toggle makes everything large and high-contrast, made for tired eyes and small phones.
3. **Read-aloud** — the browser's own voice (Web Speech API) reads the simple version aloud, in Hindi or English depending on the text. No audio files, no calls.
4. **Action cards** — dates, deadlines, amounts and phone numbers are extracted and shown as simple cards: **Kab tak?** (last date) · **Kitna?** (amount) · **Kisko call karein?** (who to call).

Three built-in samples (bank KYC letter, hospital discharge note, बिजली बिल चेतावनी) make the whole demo work in one click.

## How it works

- **No AI, no API, no server.** The engine is a hand-written dictionary of 100+ complex phrases → simple equivalents (English + Hindi), applied longest-first, plus sentence splitting that respects abbreviations like "Rs.".
- **Extractors are plain regex** — dates in every common format (`15/12/2026`, `3rd January 2027`, `December 5, 2026`), amounts (`₹1,840`, `Rs. 500`, `750 rupees`), Indian mobiles, toll-free 1800 numbers, and helplines (108 counts only when the text calls it a helpline — a room number never becomes a phone number).
- **Deadlines are detected, not just dates** — a date only becomes a "Kab tak?" card when the sentence carries a deadline signal (*before, by, last date, अंतिम तिथि…*) or a "within X days" window.
- The engine is a single dependency-free `engine.js` that runs identically in the browser and in Node, which is how it is tested.

## Honest limits

- BridgeVoice **simplifies wording only — it does not verify that a notice is genuine**, and it says so on the page, next to a plain warning: no real bank ever asks for an OTP, password or PIN.
- It is **not legal or medical advice**.
- The phrase list is written by hand, so a few hard words may survive. Unknown sentences are passed through unchanged rather than guessed at — the meaning is never invented.

## Run it

No build step, no dependencies:

```bash
cd build
python3 -m http.server 8000
# open http://localhost:8000
```

## Tests

```bash
node tests/test.js
```

33 assertions covering the simplification map (English + Hindi), sentence splitting, and the date / amount / phone / deadline extractors and action-card builder — all passing.

## Files

```
index.html   — the page
styles.css   — Swiss minimalism × glassmorphism, warm paper, big friendly type
engine.js    — phrase map + extractors (browser + Node)
app.js       — UI wiring, 3 sample notices, read-aloud
tests/       — Node assertions for the engine
```

---

**Built fresh on 18 Nov 2026 for Bridge The Gap Hacks** — solo, in the 15–20 Nov hackathon window. Static, free, and fully offline after first load.
