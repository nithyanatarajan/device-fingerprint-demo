# Phase 2 manual test scenarios

Captured end-to-end verification of Phase 2 (cross-browser, per-user machine identification) on a **MacBook Pro M3 Pro** running macOS. 10 scenarios covering browser × privacy mode × network state. Request bodies captured via browser dev tools (Network → `/api/collect`).

For the design rationale see [`../how-it-works.md`](../how-it-works.md). For the analysis of these captures see [`findings.md`](findings.md).

## Contents of this directory

- `N_payload.json` — the `/api/collect` request body for scenario N
- `N.png` — screenshot of the result panel showing both chips and the panel state
- `scenarios.md` — this file (the matrix)
- `findings.md` — observed behavior and insights

## Setup

- `npm run demo` running (frontend + ngrok tunnel). Backend started separately so its in-memory database survives ngrok restarts.
- VPN off at start; toggled on/off for scenarios 5 and 6.
- Fresh H2 database.
- `nithya` used as the primary identity. `alice` used once for the privacy check.

## Scenario matrix

| # | Scenario | Phase 1 chip | Phase 2 chip | Panel content |
|---|---|---|---|---|
| 1 | Chrome first visit | `NEW_DEVICE` | `NO_MACHINE_MATCH` | hidden |
| 2 | Chrome revisit, same IP | `SAME_DEVICE` | `SAME_MACHINE` | Chrome |
| 3 | Firefox, same user, same IP | `NEW_DEVICE` / `DRIFT_DETECTED` | `SAME_MACHINE` | Chrome |
| 3b | Firefox, same user, VPN on | `NEW_DEVICE` / `DRIFT_DETECTED` | `MATCHING_HARDWARE` | Chrome + Firefox (demoted because IP differs) |
| 4 | Safari, same user, same IP | `NEW_DEVICE` / `DRIFT_DETECTED` | `SAME_MACHINE` | Chrome + Firefox |
| 5 | Chrome, VPN on | `SAME_DEVICE` | `MATCHING_HARDWARE` | Chrome (panel header flipped to "Matching hardware") |
| 6 | Chrome, VPN off again | `SAME_DEVICE` | `SAME_MACHINE` | back to "Same machine" |
| 7 | Different user (`alice`) on the same machine | `NEW_DEVICE` | `NO_MACHINE_MATCH` | hidden (bidirectional isolation) |
| 8 | Chrome Incognito, same user | `SAME_DEVICE` | `SAME_MACHINE` | Chrome |
| 9 | Firefox Private, same user | `DRIFT_DETECTED` | `SAME_MACHINE` | Chrome + Firefox |
| 10 | Safari Private, same user | `NEW_DEVICE` | `NO_MACHINE_MATCH` | hidden |

Every row's payload and screenshot live next to this file with matching numeric prefixes.

## What's *not* captured

- **Network-switch scenarios** (mobile hotspot, different Wi-Fi) — deliberately omitted because the ngrok tunnel dies when the demo host's network changes. The VPN-on / VPN-off pair in scenarios 5 and 6 demonstrates the same IP-tier transition without breaking the tunnel.
- **Manual timezone change** (to trigger the TZ gate suppression) — not captured but documented in `../how-it-works.md` as a known conservative miss.
- **Two physically identical MacBooks** (the residual within-user FP class) — requires hardware we don't have.
