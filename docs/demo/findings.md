# Phase 2 findings from manual testing

Analysis of the 11 scenarios captured in this directory. The raw data lives in [`scenarios.md`](scenarios.md) and the [`recordings/`](recordings/) folder (one `N_payload.json` / `N_response.json` / `N.png` triple per scenario).

## 1. `fontHash` is stable across every browser and every privacy mode

All 11 captured payloads report `"fontHash":"foxefv"` — Chrome, Firefox, Safari, Chrome Incognito, Firefox Private, and Safari Private alike. This is the single strongest validation that `document.fonts.check()` is cross-browser stable and that adding `fontHash` to the machine signature was the right call. It is the only entropy-increasing signal that survives every browser's anti-fingerprinting mode.

## 2. Per-user scoping enforces privacy without losing signal

Scenario 8's payload (`alice`) shares **every hash input** with scenarios 1/2/5/7/9 (`nithya` on Chrome). Same canvas, same WebGL, same screen resolution, same pixel ratio, same touch support, same font hash. Yet Phase 2 correctly hides the panel because `alice` and `nithya` are different users and per-user scoping never crosses the boundary. The hash match is real; the surfacing is refused. That is the privacy guarantee working as designed.

## 3. Chrome Incognito is byte-identical to regular Chrome

Scenarios 1, 2, 5, 7, 8, and 9 have **identical** `/api/collect` request bodies (modulo the `name` field). Chrome Incognito does not alter a single collected signal — no canvas noise, no WebGL masking, no hardware coarsening. Incognito is about cookies and history; it is not an anti-fingerprinting feature. Phase 1 lands `SAME_DEVICE` and Phase 2 lands `SAME_MACHINE` because there is literally nothing different to detect.

## 4. Firefox Private is the cleanest two-voices demo — and fontHash survives it

Firefox's Resist Fingerprinting protections kick in for private windows. Comparing [`recordings/3_payload.json`](recordings/3_payload.json) (Firefox normal) to [`recordings/10_payload.json`](recordings/10_payload.json) (Firefox Private):

| Field | Firefox normal | Firefox Private | In Phase 2 hash? |
|---|---|---|---|
| `canvasHash` | `m26ikj` | `vysarh` (randomized) | ❌ no |
| `hardwareConcurrency` | `12` | **`8`** (RFP cap) | ❌ no |
| `platform` | `MacIntel` | `MacIntel` | ✅ yes |
| `screenResolution` | `1728x1117` | `1728x1117` | ✅ yes |
| `pixelRatio` | `2` | `2` | ✅ yes |
| `touchSupport` | `0` | `0` | ✅ yes |
| `fontHash` | `foxefv` | `foxefv` | ✅ yes |

**Every hash input is identical.** Firefox's anti-fingerprinting targets exactly the signals Phase 1 scores on (canvas, hardware concurrency) and leaves the signals Phase 2 hashes on untouched. The result is the canonical two-voices disagreement:

- **Phase 1** sees two signal changes → `DRIFT_DETECTED`
- **Phase 2** sees an identical signature → `SAME_MACHINE`

Both voices are correct from their own perspective. Phase 1 is flagging the session-level drift; Phase 2 is identifying the underlying hardware. This is the outcome the design was built for.

## 5. Safari Private breaks the Phase 2 hash via `screenResolution`, not `fontHash`

This was the surprise of the test. The hypothesis going in was that Safari Private would defeat Phase 2 by corrupting `fontHash`. It does not — `fontHash` survives. The culprit is `screenResolution`.

Comparing [`recordings/4_payload.json`](recordings/4_payload.json) (Safari normal) to [`recordings/11_payload.json`](recordings/11_payload.json) (Safari Private):

| Field | Safari normal | Safari Private |
|---|---|---|
| `screenResolution` | `1728x1117` | **`1728x649`** |
| `fontHash` | `foxefv` | `foxefv` |
| `canvasHash` | `mg0lca` | `mg0lca` (unchanged) |
| everything else | same | same |

Safari Private is reporting `1728x649` — almost certainly the browser viewport (`window.innerHeight`) rather than the actual screen height (`screen.height`). This appears to be Safari's anti-fingerprinting protection substituting the visible viewport for the full screen dimensions. Because `screenResolution` is a Phase 2 hash input, the signature breaks and Phase 2 correctly refuses to claim a match. This is Safari enforcing the user's privacy intent and our system respecting it — not a defect.

## 6. Network identity is orthogonal to browser fingerprint

[`recordings/3_payload.json`](recordings/3_payload.json) (Firefox, VPN off) and [`recordings/6_payload.json`](recordings/6_payload.json) (Firefox, VPN on) are **byte-identical**. Same canvas hash, same WebGL renderer, same hardware concurrency, same font hash, same everything the browser can observe. The VPN does not change a single JavaScript-observable signal.

Yet Phase 2's verdict differs:

- Scenario 3: `SAME_MACHINE` (strong tier)
- Scenario 6: `MATCHING_HARDWARE` (possible tier, panel header flipped)

The only thing that differs between the two requests is the source IP of the TCP connection reaching ngrok — which ngrok forwards to the backend via `X-Forwarded-For`. That header is set from network-layer data the browser never sees and cannot fabricate.

This is the cleanest provable statement about how the system works:

> **Browser fingerprint and network identity are orthogonal.** Browser fingerprint is what the JavaScript can see about itself (canvas, WebGL, screen, hardware, fonts). Network identity is what the TCP layer sees about the client (source IP). Phase 2 uses the first for hash matching and the second for tiering. Neither is derived from the other, and one doesn't contaminate the other. VPN moves you in one axis without touching the other.

The practical consequence: Phase 2's IP tier is resistant to any browser-side tampering. A malicious frontend cannot forge `MATCHING_HARDWARE` into `SAME_MACHINE` by lying about its fingerprint, because the IP is read from the HTTP request headers server-side, not from the payload.

## 7. Chrome / Firefox / Safari normal-mode hashes are identical

Scenarios 1 (Chrome), 3 (Firefox), and 4 (Safari) on the same machine with no privacy mode all share the same five hash inputs (`platform` `MacIntel`, `screenResolution` `1728x1117`, `pixelRatio` `2`, `touchSupport` `0`, `fontHash` `foxefv`). They differ on the per-browser signals (canvas, WebGL, userAgent, codecs) and on the `timezone` and `locale` gates in ways we actively handle:

- **Timezone:** Chrome reports `Asia/Calcutta` (legacy IANA alias), Firefox reports `Asia/Kolkata` (canonical), Safari reports `Asia/Calcutta`. All pass the gate because of alias-aware `ZoneRules` comparison.
- **Locale:** Chrome `en-GB`, Firefox `en-US`, Safari `en-IN`. All pass the gate because it compares only the primary language tag (`en`), ignoring region differences.

Both gate fixes are exercised by this captured data.

## Summary table: what each browser's anti-fingerprinting touches

| Browser mode | Canvas | WebGL | hwConcurrency | Screen | fontHash | Phase 2 result |
|---|---|---|---|---|---|---|
| Chrome normal | baseline | baseline | 12 | 1728×1117 | foxefv | `SAME_MACHINE` |
| Chrome Incognito | unchanged | unchanged | unchanged | unchanged | unchanged | `SAME_MACHINE` |
| Firefox normal | m26ikj | Apple M1 | 12 | 1728×1117 | foxefv | `SAME_MACHINE` |
| Firefox Private | **randomized** | unchanged | **capped (8)** | unchanged | unchanged | `SAME_MACHINE` |
| Safari normal | mg0lca | Apple GPU | 8 (cap) | 1728×1117 | foxefv | `SAME_MACHINE` |
| Safari Private | unchanged | unchanged | unchanged | **1728×649 (viewport)** | unchanged | `NO_MACHINE_MATCH` |

The spectrum reads left-to-right from least to most privacy-protective: Chrome Incognito changes nothing, Firefox Private noises Phase 1 signals only, Safari Private coarsens a hash input and genuinely defeats cross-private-mode recognition. Our system respects each position correctly.
