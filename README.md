<div align="center">

# ⚡ SkyGive

### Bitcoin donation campaigns for Bluesky — beautiful, non-custodial, 0% fee

[![Live at skygive.app](https://img.shields.io/badge/live-skygive.app-22c55e?style=for-the-badge&logo=cloudflare)](https://skygive.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Non-custodial](https://img.shields.io/badge/non--custodial-100%25-22c55e?style=for-the-badge)](#mission)
[![Platform Fee](https://img.shields.io/badge/platform%20fee-0%25-22c55e?style=for-the-badge)](#mission)

*Drop your Bitcoin address. Pick a theme. Share your campaign. That's it.*

[**Live demo →**](https://skygive.app) · [Why we built this](#why) · [Self-host](#self-host) · [Contribute](#contributing)

</div>

---

## Mission

**SkyGive is a 100% free, 100% non-custodial positivity project** to help good causes raise Bitcoin donations on Bluesky.

- **Zero platform fee.** We charge nothing. Every satoshi goes directly to the creator.
- **Zero custody.** Every QR / BIP21 link points straight at the creator's wallet. SkyGive infrastructure never touches a single sat.
- **Zero auth.** No signup, no email, no password. Your campaign's admin URL is the only credential — bookmark it.
- **Zero KYC.** Bluesky handle + Bitcoin address is everything we need.

If you fork SkyGive and want to add fees or custody, please change the name. That's a different project with very different regulatory obligations (MSB, MTL, BitLicense, etc.) and shouldn't carry SkyGive's promise of "free, forever, never touches your sats."

---

## Why

Bluesky is the open social web's most exciting moment in a decade. Creators, journalists, activists, indie devs, and political organizers are flocking to it — and most of them have no way to accept Bitcoin tips on-platform.

Existing options either:
- **Charge fees** (Patreon ~10%, Ko-fi 5%)
- **Custody your funds** (Stripe, PayPal)
- **Require KYC** (most exchanges)
- **Lock you into one wallet** (Lightning-only services)

SkyGive does none of that. Drop your on-chain BTC address, get a beautiful 1200×630 link-card with a QR code, share the URL on Bluesky, done. Card preview auto-rotates across 5 layout variants so every post looks fresh.

---

## Features

| | |
|---|---|
| 🎨 **16 curated themes** | WCAG-AA validated palettes — Forest, Indigo, Slate, Ember, etc. |
| 🔒 **Non-custodial · 0% fee** | Sats go directly to your wallet — every donation, every time |
| ⚡ **Zero auth** | No signup, no email, no password. Admin URL = your only credential |
| ✨ **5 visual variants** | Each Bluesky post auto-rotates the badge layout |
| 🌐 **Fiat-aware goals** | Set goals in USD/EUR/GBP/CAD — auto-converts to sats via CoinGecko/Coinbase |
| 🤖 **AI palette extraction** | Workers AI (Llama 3.2 Vision) pulls accent colors from your avatar |
| 📊 **View analytics** | Per-campaign view counts, no donor tracking |
| 🌍 **Edge-native** | 100% Cloudflare — Workers + D1 + R2 + KV + Workers AI + Browser Rendering |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  skygive.app  (Cloudflare Worker — single file, 3,200 LOC) │
├─────────────────────────────────────────────────────────────┤
│  Routes:                                                    │
│    /                       Landing + campaign builder       │
│    /v/{slug}               Public donation page             │
│    /badge/{slug}.png       Bluesky link-card image          │
│    /badge/{slug}.svg       SVG variant (for previews)       │
│    /admin/{slug}/{token}   Owner-only edit page             │
│    /api/profile/{handle}   Bluesky handle resolver          │
│    /api/register           Create campaign                  │
│    /api/update             Update campaign (admin token)    │
│    /privacy, /terms        Legal pages                      │
├─────────────────────────────────────────────────────────────┤
│  Storage:                                                   │
│    D1     → users, donations, analytics, logs               │
│    KV     → BTC price cache (CoinGecko + Coinbase fallback) │
│    R2     → avatar images + pre-rendered PNG badges         │
│    AI     → Workers AI / Llama 3.2 Vision (palette extract) │
│    Browser→ Cloudflare Browser Rendering (SVG → PNG)        │
└─────────────────────────────────────────────────────────────┘
```

---

## Self-host

Want to run your own SkyGive instance? Five minutes if you have a Cloudflare account.

### 1. Clone + install
```bash
git clone https://github.com/indicaindependent/skygive
cd skygive
npm install -g wrangler
wrangler login
```

### 2. Create resources
```bash
wrangler d1 create skygive-db
wrangler kv:namespace create SKYGIVE_CACHE
wrangler r2 bucket create skygive-assets
```

### 3. Configure
```bash
cp wrangler.toml.example wrangler.toml
# Fill in the D1 database_id and KV namespace id you got above
```

### 4. Initialize the database
```bash
wrangler d1 execute skygive-db --file=./scripts/schema.sql
```

### 5. Set secrets
```bash
wrangler secret put BSKY_HANDLE          # e.g. yourservice.bsky.social
wrangler secret put BSKY_APP_PASSWORD    # https://bsky.app/settings/app-passwords
wrangler secret put CF_BROWSER_TOKEN     # CF API token with Browser Rendering perm
```

### 6. Deploy
```bash
wrangler deploy
```

That's it. Visit your worker's URL and you have a fully working SkyGive instance.

---

## Contributing

Bug reports, ideas, and PRs are all welcome. A few rules:

- **Don't add fees.** SkyGive's whole identity is "0% forever." Fee-based forks are welcome — just rename.
- **Don't add custody.** Same reason. Custodial routing pulls in regulatory burden SkyGive doesn't want.
- **Don't add KYC.** Bluesky handle + BTC address is enough. Always.
- **Keep it accessible.** New themes must pass WCAG-AA. New layouts must work on mobile.

Open issues for discussion before large PRs.

---

## A project of [Indica Independent Media](https://bsky.app/profile/indicaindependent.bsky.social)

SkyGive is part of a family of open-source tools by [@indicaindependent](https://bsky.app/profile/indicaindependent.bsky.social) — independent journalism, OSINT, and protest-tech for the open social web.

Other projects:
- [WarHeatmap](https://github.com/indicaindependent/warheatmap) — live global conflict intelligence
- [Sentinel](https://github.com/indicaindependent/sentinel) — federal surveillance contract tracker
- [HumanDefender](https://github.com/indicaindependent/humandefender) — Reddit mod tool for CIB / bot detection
- [VibesMom](https://github.com/indicaindependent/vibesmom) — AI mental health support bot for Bluesky
- [FaceHeatmap](https://github.com/indicaindependent/faceheatmap) — facial-recognition surveillance heatmap
- [BizHer](https://github.com/indicaindependent/bizher) — free NY LLC wizard for women entrepreneurs

---

<div align="center">

**Built with ☕ on Cloudflare's edge · ⚡ skygive.app · 0% fee, forever**

</div>
