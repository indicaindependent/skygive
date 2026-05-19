# Security Policy

## Reporting a vulnerability

If you find a security issue in SkyGive, please **do not** open a public GitHub issue.

Instead, DM [@indicaindependent on Bluesky](https://bsky.app/profile/indicaindependent.bsky.social) with details.

We aim to respond within 48 hours.

## Scope

In scope:
- The Cloudflare Worker source (`src/worker.js`)
- The D1 schema (`scripts/schema.sql`)
- The deployment process documented in the README

Out of scope:
- Third-party services we depend on (Cloudflare, Bluesky, CoinGecko, Coinbase, mempool.space)
- Self-hosted instances with modified configurations
- Bitcoin protocol-level issues

## Non-custodial guarantee

SkyGive **never holds, routes, or has access to** user donations. All QR codes and BIP21 links point directly to the creator's Bitcoin address.

If you find code that violates this guarantee, that's a critical security bug — please report it immediately.
