# Demo scenarios

Tabular reference for the two demo-able datasets. Directory layout and
capture convention live in [`README.md`](README.md).

## Phase 2 — Real browser captures

Captured end-to-end on a **MacBook Pro M3 Pro** running macOS. 11 scenarios covering browser × privacy mode × network state, grouped thematically: baseline → cross-browser → IP-tier → privacy → incognito/private. Primary identity `nithya`; `alice` used once for the privacy check.

| # | Scenario | Phase 1 chip | Phase 2 chip | Panel content |
|---|---|---|---|---|
| 1 | Chrome first visit | `NEW_DEVICE` | `NO_MACHINE_MATCH` | hidden |
| 2 | Chrome revisit, same IP | `SAME_DEVICE` | `SAME_MACHINE` | Chrome |
| 3 | Firefox, same user, same IP | `NEW_DEVICE` / `DRIFT_DETECTED` | `SAME_MACHINE` | Chrome |
| 4 | Safari, same user, same IP | `NEW_DEVICE` / `DRIFT_DETECTED` | `SAME_MACHINE` | Chrome + Firefox |
| 5 | Chrome, VPN on | `SAME_DEVICE` | `MATCHING_HARDWARE` | Chrome (panel header flipped to "Matching hardware") |
| 6 | Firefox, same user, VPN on | `NEW_DEVICE` / `DRIFT_DETECTED` | `MATCHING_HARDWARE` | Chrome + Firefox (demoted because IP differs) |
| 7 | Chrome, VPN off again | `SAME_DEVICE` | `SAME_MACHINE` | back to "Same machine" |
| 8 | Different user (`alice`) on the same machine | `NEW_DEVICE` | `NO_MACHINE_MATCH` | hidden (bidirectional isolation) |
| 9 | Chrome Incognito, same user | `SAME_DEVICE` | `SAME_MACHINE` | Chrome |
| 10 | Firefox Private, same user | `DRIFT_DETECTED` | `SAME_MACHINE` | Chrome + Firefox |
| 11 | Safari Private, same user | `NEW_DEVICE` | `NO_MACHINE_MATCH` | hidden |

## Phase 3 + 4 — Curated seed scenario

Seven synthetic users created by `POST /api/admin/seed/scenario` (or the **Seed demo scenario** button on the Tuning Console's **Demo Data** tab). Each user sits at a different point on the score curve so dragging a high-leverage slider or threshold produces a visible classification flip. All scores assume default weights (canvas=90, webgl=85, touch=70, platform=60, … total=620) and thresholds (same-device=85, drift=60).

| User | Score | Classification | What's different on visit 2 | Headline lever |
|---|---|---|---|---|
| `demo-user-stable` | 100.0 | SAME_DEVICE | nothing — identical fingerprints | floor of the curve |
| `demo-user-touch-only` | 88.7 | SAME_DEVICE | `touchSupport` (0 → 5) | `touch_support` weight ↑, or same-device threshold ↑ |
| `demo-user-webgl-only` | 86.3 | SAME_DEVICE (cusp) | `webglRenderer` | `webgl_renderer` weight ↑, or same-device threshold ↑ |
| `demo-user-canvas-drift` | 85.5 | SAME_DEVICE (cusp) | `canvasHash` | `canvas_hash` weight ↑, or same-device threshold ↑ |
| `demo-user-os-update` | 75.0 | DRIFT_DETECTED | `canvas_hash` + `user_agent` + `codec_support` | canvas_hash weight → 0 flips to SAME_DEVICE |
| `demo-user-cross-browser` | 71.8 | DRIFT_DETECTED | `canvas_hash` + `webgl_renderer` | canvas + webgl → 0 flips to SAME_DEVICE |
| `demo-user-major-drift` | 62.1 | DRIFT_DETECTED (cusp) | `canvas_hash` + `webgl_renderer` + `platform` | drift threshold > 62 flips to NEW_DEVICE |
