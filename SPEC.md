# Device Identification Management Platform

## Context

A short AI-assisted build demo showcasing that a single developer with AI can build a full-stack, production-quality Java application rapidly — something that would normally take a team several days.

**Audience:** Technical leadership evaluating AI-assisted development velocity and quality.

**What we're proving:**
1. AI makes a single dev significantly faster at building production-quality software
2. AI can rapidly prototype complex domain-specific systems

**Tech stack:** Java 25 + Spring Boot 4, React 19.2.4 + Material UI, H2 database

**Meta-demo:** The brainstorming -> spec -> plan -> TDD workflow used to build this is itself part of the pitch.

---

## What We're Building

A device identification management platform that:
1. Collects real browser/device signals from visitors
2. Associates devices with users (by name, case-insensitive)
3. Computes weighted similarity scores to identify returning devices per user
4. Detects fingerprint drift (same device, changed attributes)
5. Lets admins tune signal weights and thresholds with real-time impact preview

---

## Data Model

### User
- `id` (UUID, PK)
- `name` (unique, case-insensitive)
- `created_at`

### Device
- `id` (UUID, PK)
- `user_id` (FK -> User)
- `label` (auto-generated, e.g., "Chrome on MacOS")
- `created_at`
- `last_seen_at`
- `visit_count`

### DeviceFingerprint
- `id` (UUID, PK)
- `device_id` (FK -> Device)
- `collected_at`
- `raw_signals` (JSON — full signal payload)
- `canvas_hash`
- `webgl_renderer`
- `screen_resolution`
- `color_depth`
- `pixel_ratio`
- `timezone`
- `locale`
- `platform`
- `user_agent`
- `hardware_concurrency`
- `device_memory`
- `touch_support`
- `codec_support`
- `dnt_enabled`
- `cookie_enabled`

### SignalWeight
- `signal_name` (PK)
- `weight` (numeric, relative — not required to sum to any value)
- `enabled` (boolean)

### ScoringConfig
- `same_device_threshold` (default 85)
- `drift_threshold` (default 60)

---

## Scoring Engine

### Similarity Computation

Per-signal comparison produces a raw similarity score:
- Exact match -> 1.0
- Partial match -> 0.5 (signal-specific logic)
- No match -> 0.0

### Aggregation (relative weights, normalized)

Weights are relative, not absolute. An admin can set any values — the system normalizes automatically:

```
normalized_weights = each weight / sum(all enabled weights)
composite_score = sum(signal_score x normalized_weight) x 100
```

Example: if canvas=90, webgl=85, touch=70 (sum=245), canvas contributes 90/245 = 36.7% of the composite score.

### Classification

Composite score (0-100) is classified against configurable thresholds:
- score >= same_device_threshold -> SAME_DEVICE
- score >= drift_threshold -> DRIFT_DETECTED
- score < drift_threshold -> NEW_DEVICE

### Matching Scope

Matching is always scoped to a user. When a user submits a fingerprint, the engine compares only against that user's known devices — not the entire database.

### Partial Match Logic

| Signal | Match Type | Logic |
|--------|-----------|-------|
| canvas_hash | Exact only | Strongest single identifier |
| webgl_renderer | Exact only | Hardware-specific |
| screen_resolution | Exact only | — |
| color_depth | Exact only | — |
| pixel_ratio | Exact only | — |
| timezone | Exact only | — |
| locale | Exact only | — |
| platform | Exact only | — |
| hardware_concurrency | Exact only | — |
| device_memory | Exact only | — |
| touch_support | Exact only | — |
| dnt_enabled | Exact only | — |
| cookie_enabled | Exact only | — |
| user_agent | Partial | Extract OS + browser family, compare separately from version. Same family + OS = 0.5 |
| codec_support | Partial | Jaccard similarity on supported codec set (threshold: >= 0.8 = exact, >= 0.5 = partial) |

### Default Signal Weights

| Signal | Default Weight | Rationale |
|--------|---------------|-----------|
| canvas_hash | 90 | Strongest single identifier |
| webgl_renderer | 85 | Hardware-specific, hard to spoof |
| touch_support | 70 | Strong desktop vs mobile signal |
| platform | 60 | Stable, but coarse |
| hardware_concurrency | 50 | Useful but limited range |
| device_memory | 50 | Useful but limited range |
| pixel_ratio | 45 | Moderately distinctive |
| screen_resolution | 40 | Common across same model devices |
| codec_support | 35 | Varies by browser/OS combination |
| user_agent | 30 | Changes with browser updates |
| timezone | 20 | Easy to change |
| locale | 15 | Somewhat distinctive |
| color_depth | 15 | Almost always 24 |
| dnt_enabled | 10 | Binary, low info |
| cookie_enabled | 5 | Almost always true |

### Private Browsing & VPN Behavior

**Incognito/Private Browsing:**
- Cookies and localStorage are wiped per session — cookie_enabled signal may differ
- Canvas fingerprint, WebGL, hardware concurrency, screen resolution, device memory, touch support, codec support all survive (hardware/browser-engine level)
- Expected behavior: a device in incognito scores high against its normal-mode fingerprint (canvas and WebGL carry the weight)

**VPN:**
- We do not collect IP address (it's a network-level signal, not a device signal)
- VPN has no effect on our device fingerprinting
- Device-level identification is independent of network-level signals

**Signal Availability:**
- When a signal is unavailable or restricted (e.g., device_memory not exposed by the browser), it is stored as null and excluded from that comparison's weight calculation

---

## Phased Build

Each phase is demo-able on its own. If time runs out at any phase boundary, we still have a working product to show.

### Phase 1: Device Signal Collection

**Frontend: Collection Page**
- Text field: "Enter your name" (case-insensitive)
- On submit: silently collect browser fingerprint
- POST name + signals to backend
- Backend: find or create user by name -> compare fingerprint against this user's known devices -> return result
- Display: "Welcome back Nithya, we recognized your laptop" OR "New device registered for Nithya"
- Expandable breakdown of all collected signals
- If matched: show confidence score and what changed since last visit

**Signal collection:** Uses [@fingerprintjs/fingerprintjs](https://github.com/nicknisi/fingerprintjs) (MIT, open-source) for reliable cross-browser signal collection. Individual signal components are extracted for our scoring engine.

**Signals collected:**
- Canvas fingerprint (via FingerprintJS)
- WebGL renderer + vendor (via FingerprintJS)
- Screen resolution, color depth, pixel ratio
- Timezone + locale
- Platform + user agent
- Touch support (max touch points)
- Hardware concurrency (CPU cores)
- Device memory (if available)
- Media codec support (via MediaRecorder.isTypeSupported)
- Do-not-track setting
- Cookie/localStorage support
- Visitor ID (FingerprintJS composite hash)

**APIs:**
- `POST /api/collect` — name + signals -> match result (new device / matched device with score / drift detected)
- `GET /api/users/{userId}/devices` — list user's known devices

### Phase 2: Cross-Browser Machine Identification

A second identity axis on top of Phase 1. Phase 1 matches per-browser fingerprints; this phase recognizes the same **hardware** across different browsers on the same machine, purely additive and without touching the per-browser scoring pipeline.

**Demo moment this enables:** "Enter your name in Chrome, then switch to Firefox and enter a different name. The system registers a new user — but also tells you: *this machine was also used by your previous name*. Hardware doesn't lie."

**Hardware signature (6 signals, browser-independent, OS-update-independent):**
- `platform`
- `screenResolution`
- `colorDepth`
- `hardwareConcurrency`
- `deviceMemory`
- `touchSupport`

Browser-specific signals (canvas, webgl, userAgent, codecs) are deliberately **excluded** — they change per browser. `timezone` is also **excluded** from the hash because it is an OS setting that changes when the user travels or on DST transitions; including it would break machine recognition when someone flies across timezones on the same laptop.

**Context signals (used as match gates and UI tags, not in the hash):**
- `timezone` — hard co-match gate (see matching rules below)
- `locale` — hard co-match gate
- `publicIp` — soft, surfaced as a tag

**Design:**
- **Exact-match SHA-256 hash** over the 6 hardware signals in canonical order. Stored as a column on `DeviceFingerprint`. Swappable to fuzzy matching later as an internal refactor of `MachineSignatureService`.
- **Tiered matching** — the product never makes a claim it cannot defend:
  - **Strong match** ("Same machine"): hardware signature **AND** `timezone` **AND** `locale` **AND** `publicIp` all match. Near-zero false positives outside the household-collision edge case.
  - **Possible match** ("Matching hardware"): hardware signature **AND** `timezone` **AND** `locale` match, but `publicIp` differs. Captures the "same machine on a different network" scenarios (VPN, café, mobile hotspot, roamed to a new Wi-Fi) without dropping them silently. Clearly caveated in the UI — the system does not claim these *are* the same machine, only that the hardware profile matches.
  - **Hidden**: anything else. Hardware match without timezone match, or without locale match, is suppressed. Different hardware is suppressed regardless.
- **No VPN detection, no IP geolocation, no ASN lookup.** The product only claims what it can prove.
- **Cross-user matching is intentional.** Same-user matches are also included for consistency.
- **Self-matches excluded** (the current device's own prior fingerprints don't appear in its own panel).
- **Stored columns, not computed on-the-fly.** `machineSignature` and `publicIp` are persisted on `DeviceFingerprint` for fast indexed lookup; `timezone` and `locale` are already persisted from Phase 1.

**Why two tiers, not a single confidence score:** A score would blur the line between "I can prove this" and "I can only suggest this". The tiers make the distinction visible and non-negotiable — the audience can read either heading and know exactly what's being claimed.

**APIs:**
- `POST /api/collect` response extended with a `machineMatch` field:
  ```
  {
    "strongMatches":   [{ userId, userName, deviceId, deviceLabel, lastSeenAt }],
    "possibleMatches": [{ userId, userName, deviceId, deviceLabel, lastSeenAt }]
  }
  ```
  Both lists are always present; either may be empty.

**Frontend:**
- A **Same Machine** panel below the per-device match result. Two sections rendered conditionally:
  - **Strong section** ("Same machine") — rendered when `strongMatches` is non-empty. Primary styling (filled Paper, normal emphasis).
  - **Possible section** ("Matching hardware") — rendered when `possibleMatches` is non-empty. Secondary styling (outlined Paper, warning-muted accent), with an inline caveat: *"Same device profile from a different network. Could be the same machine on a different Wi-Fi or VPN, or an unrelated machine with identical hardware."*
- The panel is entirely hidden when both lists are empty.
- Each row: `<deviceLabel> · <userName>` with relative last-seen time.
- A small footer caveat documents the household-collision limitation.

**Known limitations (documented in the UI):**
1. **Household hardware collision:** two identical machines on the same Wi-Fi produce both a strong and a possible match false positive. This is the fundamental limit of device-level fingerprinting with browser-accessible signals and cannot be resolved without higher-entropy inputs (mouse dynamics, keystroke timing) which belong to a later phase.
2. **Urban hardware collision:** in homogeneous populations (e.g., many MacBook Pro users in the same city with the same OS locale), the "Matching hardware" section can surface unrelated machines. The explicit caveat on that section makes the uncertainty clear — the product acknowledges this rather than hides it.
3. **Traveling across timezones:** a user flying with the same laptop from one timezone to another will not be recognized until they re-register under the new timezone. This is conservative by design — preferring a missed match over a false positive.

### Phase 3: Scoring Engine + Tuning Console

**Scoring Engine (backend):**
- Weighted similarity scoring as described in the Scoring Engine section
- Per-signal comparison with partial match logic
- User-scoped matching
- Configurable weights and thresholds

**Tuning Console (frontend — admin page):**
- Signal weight sliders (0-100 per signal) with clear indication these are relative
- Enable/disable toggle per signal
- Same-device threshold slider
- Drift threshold slider
- Per-user device list: select a user, see their devices with match history
- Or: all users with device counts, click into a user to see their devices
- Save configuration -> persists and affects all future scoring

**APIs:**
- `GET /api/users` — list all users with device counts
- `GET /api/users/{id}` — user detail with devices
- `GET /api/scoring/weights` — current signal weights
- `PUT /api/scoring/weights` — update weights
- `GET /api/scoring/config` — thresholds
- `PUT /api/scoring/config` — update thresholds

### Phase 4: Ripple Effect

When an admin adjusts weights or thresholds in the tuning console, the UI shows how the change impacts device recognition across all users **before saving**.

**How it works:**
- Admin moves a slider -> frontend sends proposed config to preview endpoint (debounced)
- Backend re-runs matching for every fingerprint ever collected, scoped per user, using proposed weights/thresholds
- Returns a diff: for each affected fingerprint, old classification vs. new classification
- UI highlights changes with summary

**UI treatment:**
- As you drag a slider, the results update (debounced, not on every pixel)
- Affected entries highlighted: green = promoted to same device, red = demoted, amber = shifted to drift
- Summary bar: "This change affects N users, M fingerprints. X devices would be split, Y would be merged."

**API:**
- `POST /api/scoring/preview` — accepts proposed weights + thresholds, returns re-scored results with before/after classifications per user

### Phase 5: Device Investigation (stretch)

Drill into a specific user's device for full explainability.

**What it shows:**
- Full signal breakdown for the device's latest fingerprint
- Visit history timeline — every time this device was seen, with timestamps
- Drift history — what signals changed between visits (e.g., "user_agent changed on visit 3, likely browser update")
- Match explanation — "this device was identified because canvas_hash (weight 90) and webgl_renderer (weight 85) matched, despite user_agent (weight 30) changing"

**UI:**
- Select user -> see their devices -> click a device -> investigation view
- Signal-by-signal comparison across visits (table with green/red/amber cells)
- "Why was this matched?" summary — shows which signals carried the score

**APIs:**
- `GET /api/users/{userId}/devices/{deviceId}` — full device detail with fingerprint history
- `GET /api/users/{userId}/devices/{deviceId}/drift` — signal changes across visits

---

## Demo Script

1. **"Nithya" logs in on laptop** -> "New user, new device registered for Nithya" — show fingerprint breakdown
2. **"Nithya" refreshes** -> "Welcome back Nithya, recognized your laptop (98%)"
3. **"Nithya" in incognito** -> "Recognized your laptop (91%)" — canvas/WebGL still match, cookie differs
4. **"Nithya" on phone** -> "New device for Nithya" — clearly different signals
5. **Open tuning console** -> See Nithya's device profile (2 devices, multiple visits)
6. **Drag canvas_hash weight to 0** -> Ripple: "Nithya's incognito visit drops from 91% to 68% — now DRIFT instead of SAME_DEVICE"
7. **Restore weights** -> "This is the kind of tuning a device profiling team does — and we built it rapidly with AI"

---

## Implementation Notes

- Spring Boot 4 with Java 25 (records, pattern matching, virtual threads)
- H2 database (zero setup, embedded)
- React 19.2.4 with Material UI
- No auth (it's a demo)
- Synthetic data seeder: generates additional users and devices AFTER Phase 1 is working, to simulate a populated system for the admin portal demo. Based on real signal patterns from actual collection.
- No SSE/websockets — simple request/response. Dashboard refreshes on navigation.
