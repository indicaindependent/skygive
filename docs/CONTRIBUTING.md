# Contributing to SkyGive

Thanks for the interest! A few quick guidelines.

## The non-negotiables

SkyGive's identity is "free, non-custodial, no KYC, no fees, forever." Any PR that compromises those is a hard no:

- ❌ No platform fees
- ❌ No custodial routing of donations
- ❌ No KYC requirements
- ❌ No tracking of donor identities

Fee-based, custodial, or KYC'd forks are welcome — please rename so users don't get confused about which one they're using.

## Setup

See [README.md → Self-host](../README.md#self-host) for full setup.

For local dev:
```bash
wrangler dev
```

## What we'd love help with

- **New themes** (must pass WCAG-AA contrast)
- **New badge layout variants** (must look good at 1200×630)
- **i18n** — landing page + builder in more languages
- **Better donation detection** — current code is on-chain only; clean mempool.space integration welcome
- **Accessibility audits**
- **Documentation improvements**

## What we don't want

- "Premium tier" features
- Analytics that track donors
- Login systems / passwords
- Anything that adds friction for creators or donors

## Code style

- Single-file worker by design (easy to audit + self-host)
- Vanilla JS in browser code — no frameworks
- Inline CSS in worker responses — no build step
- Heavy comments above any non-obvious block

## Reporting bugs

Open an issue with:
1. What you expected
2. What happened
3. Steps to reproduce
4. Browser / device if it's a UI bug

## Security issues

DM [@indicaindependent on Bluesky](https://bsky.app/profile/indicaindependent.bsky.social) — please don't open a public issue for security stuff.
