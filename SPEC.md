# Device Identification Management Platform

## Context

A short AI-assisted build demo showcasing that a single developer with AI can build a full-stack, production-quality Java application rapidly — something that would normally take a team several days.

**Audience:** Technical leadership evaluating AI-assisted development velocity and quality.

**What we're proving:**
1. AI makes a single dev significantly faster at building production-quality software
2. AI can rapidly prototype complex domain-specific systems

**Tech stack:** Java 25 + Spring Boot 4, React 19.2.4 + Material UI, H2 database

**Meta-demo:** The brainstorming -> spec -> plan -> TDD workflow used to build this is itself part of the pitch.

**Demo assets:** The Phase 2 scenario matrix and the curated Phase 3/4 seed table are in [`docs/demo/scenarios.md`](docs/demo/scenarios.md); captured request/response payloads and screenshots per scenario live in [`docs/demo/recordings/`](docs/demo/recordings/).

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

### Phase 2: Cross-Browser, Per-User Machine Identification

Recognizes the same **hardware** across different browsers for the **same user**. Runs alongside Phase 1 as an independent second voice; both verdicts render side by side in the UI.

**Frontend: Same Machine panel**
- Below the Phase 1 result on the collection page
- Two conditional sections:
  - **"Same machine"** — rendered when there are strong matches
  - **"Matching hardware"** — rendered when there are possible matches (different network)
- Hidden entirely when both lists are empty
- Each row: `<deviceLabel>` with relative last-seen time
- Phase 2 chip alongside the Phase 1 chip: `SAME_MACHINE` / `MATCHING_HARDWARE` / `NO_MACHINE_MATCH`

**Hash inputs (machine signature):**
- `platform`
- `screenResolution`
- `pixelRatio`
- `touchSupport`
- `fontHash` (frontend probes ~150 fonts via `document.fonts.check()` and hashes the installed set)

**Match gates** (must all pass for a candidate to surface):
- Hardware signature equality
- `timezone` equality (alias-aware via `ZoneRules`, so `Asia/Calcutta` ≡ `Asia/Kolkata`)
- `locale` primary-language equality (`en-GB` ≡ `en-US`)
- Per-user scoping: candidate must belong to the same user as the current visit

**Tiering** (gate applied after the above):
- **Strong** ("Same machine"): `publicIp` also matches
- **Possible** ("Matching hardware"): `publicIp` differs

**Storage:**
- `machineSignature`, `publicIp`, and `fontHash` are persisted columns on `DeviceFingerprint`
- `timezone` and `locale` reuse the columns from Phase 1
- Self-exclusion is per-fingerprint (only the just-saved row is excluded), not per-device

**APIs:**
- `POST /api/collect` response gains a `machineMatch` field:
  ```
  {
    "strongMatches":   [{ userId, userName, deviceId, deviceLabel, lastSeenAt }],
    "possibleMatches": [{ userId, userName, deviceId, deviceLabel, lastSeenAt }]
  }
  ```
  Both lists always present; either may be empty.

**Known limitations:**
- A user owning two physically distinct devices with identical hardware specs and identical installed font sets will surface as a match (rare).
- A user travelling across timezones on the same laptop will not surface a Phase 2 match until they re-register under the new timezone (Phase 1 still recognises the device).

**Design rationale, signal exclusion reasoning, false-positive analysis, and the full scenario reference are in [`docs/how-it-works.md`](docs/how-it-works.md).**

### Phase 3: Tuning Console + Ripple Effect + Admin Seed

The previous Phase 3 (Tuning Console) and Phase 4 (Ripple Effect) are merged into a single phase because they ship together — sliders without live preview are a flat demo, and the live preview is the headline moment. Admin Seed is folded in alongside because the Tuning Console and Ripple Effect both need populated data to be meaningful.

**Tuning Console (frontend admin page at `/admin`):**
- Two tabs: **Tune** (sliders + users/devices) and **Demo Data** (seed form + curated scenario + clear-all). Both tab panels stay mounted across tab switches so slider state and in-progress forms survive.
- Tune tab, two-column layout:
  - Left: Signal Weights section (0-100 slider + enable/disable toggle per signal) and Thresholds section (same-device slider, drift slider, with the constraint same-device ≥ drift enforced client-side). Each section has its own Reset-to-defaults and Save buttons.
  - Right: Users & Devices list. Users come from `GET /api/users`; devices come from `GET /api/users/{id}/devices`. Each device row is compact by default — it shows the device label, a composite score number (from the live ripple-effect preview), and before→after classification chips when the preview has flipped that device. Full signal evidence (sig, ip, last seen, visit count, the 15-signal comparison table) is one click away via the Investigation modal in Phase 4.
- Save persists weights via `PUT /api/scoring/weights` and thresholds via `PUT /api/scoring/config`. Reset restores canonical defaults via `POST /api/scoring/weights/reset` and `POST /api/scoring/config/reset`.

**Ripple Effect (live preview without persisting):**
- As the admin drags any weight or threshold slider, the frontend sends the proposed config to `POST /api/scoring/preview` (debounced 300ms)
- Backend re-runs Phase 1 scoring for every stored fingerprint per user with the proposed config and returns a diff: per-user/device, old classification vs new classification
- UI highlights affected rows in the user/device list: green for promoted (DRIFT → SAME_DEVICE), red for demoted (SAME_DEVICE → DRIFT or DRIFT → NEW_DEVICE), amber for in-band shifts
- Summary bar: *"This change affects N users, M fingerprints. X devices would be split, Y would be merged."*
- Preview never persists; only Save commits the change

**Admin Seed (frontend form + backend endpoints):**
- Lives in the **Demo Data tab** of the Tuning Console, kept separate from the Tune tab so it never competes for attention during the live walkthrough.
- Top section: **Curated scenario seed** — a single "Seed demo scenario" button that calls `POST /api/admin/seed/scenario`. One click wipes all existing `demo-user-*` data and seeds 7 curated users designed to sit at varied points on the score curve (`demo-user-stable`, `demo-user-canvas-drift`, `demo-user-webgl-only`, `demo-user-touch-only`, `demo-user-os-update`, `demo-user-cross-browser`, `demo-user-major-drift`). Each user has 2 fingerprints on a single device so the preview service can score them. See [`docs/demo/scenarios.md`](docs/demo/scenarios.md) for the full table of expected scores and headline levers.
- Below it: **Per-user seed form** — a 4-input form for fine-grained scenarios: `userName` (server enforces the `demo-user-` prefix; the UI pins the prefix as a non-editable adornment so the user only types the suffix), `browser` (Chrome / Firefox / Safari), `vpn` (toggle), `incognito` (toggle).
- Submit calls `POST /api/admin/seed`. The backend reads a canonical per-(browser × incognito) template from `backend/src/main/resources/seed-templates/` (Spring classpath resource), sets the public IP based on the VPN flag, and calls `CollectionService.collect()` internally. The template files were originally captured as real browser fingerprints and sit in the backend resources so the seed flow is purely classpath-driven at runtime — no filesystem dependency on `docs/demo/`.
- The form's "Last result" shows the live `CollectResponse` with the same chips and panel state the collection page would show, so the audience can watch each seeded visit produce its outcome in real time.
- Re-seeding the same `(userName, browser, incognito)` combination does not duplicate a device: the scoring engine classifies the second fingerprint as SAME_DEVICE and attaches it to the existing device, so the user ends up with one device and multiple fingerprints — the state the preview service needs to produce an explanation.
- `Clear all demo data` button opens an MUI confirmation Dialog (not a browser `confirm()`). Pre-populated with the count from `GET /api/admin/seed/summary`. On confirm, calls `DELETE /api/admin/seed` which cascade-deletes every user whose name starts with `demo-user-` along with their devices and fingerprints.
- The `demo-user-` prefix is enforced server-side on all four endpoints. There is no way for a typo to accidentally affect real users.

**APIs added in Phase 3:**
- `POST /api/scoring/preview` — accepts proposed weights + thresholds, returns re-scored before/after classifications per user. Does not persist.
- `POST /api/scoring/weights/reset` — restores the canonical default weights and returns the new state. Backs the Tuning Console's Reset button.
- `POST /api/scoring/config/reset` — restores the canonical default thresholds and returns the new state.
- `GET /api/users/{id}` — user detail
- `POST /api/admin/seed` — body `{ userName, browser, vpn, incognito }`, creates one synthetic fingerprint via `CollectionService.collect()`, returns the resulting `CollectResponse`
- `POST /api/admin/seed/scenario` — wipes all `demo-user-*` data and seeds the 7-user curated scenario, returns the `CollectResponse` for each seeded visit
- `DELETE /api/admin/seed` — cascades to delete all `demo-user-*` users + their devices + their fingerprints, returns counts
- `GET /api/admin/seed/summary` — returns `{ users, devices, fingerprints }` counts of current `demo-user-*` data, used by the frontend to populate the confirmation dialog

**Already shipped in Phase 1, reused here:**
- `GET /api/users` — list all users with device counts
- `GET /api/users/{userId}/devices` — list devices for a user
- `GET /api/scoring/weights`, `PUT /api/scoring/weights`
- `GET /api/scoring/config`, `PUT /api/scoring/config`

### Phase 4: Device Investigation *(deferred)*

**Real phase, real demo value, deliberately deferred for time.** Drills into a specific user's device for full explainability — answers *"why did the system reach this conclusion?"* using existing data, not new collection.

**What it shows:**
- Full signal breakdown for the device's latest fingerprint
- Visit history timeline — every time this device was seen, with timestamps
- Per-signal drift history across visits (e.g., *"user_agent changed on visit 3: Chrome/145 → Chrome/146"*)
- Match explanation — *"this device was identified because canvas_hash (weight 90, score 1.0) and webgl_renderer (weight 85, score 1.0) matched, despite user_agent (weight 30, score 0.0) changing — composite 78%"*

**UI:**
- From the Tuning Console's user/device list, click a device → opens an investigation view
- Signal-by-signal comparison table across visits (green/red/amber cells)
- "Why was this matched?" summary panel

**APIs:**
- `GET /api/users/{userId}/devices/{deviceId}` — full device detail with fingerprint history
- `GET /api/users/{userId}/devices/{deviceId}/drift` — per-signal changes across visits

### Phase 5: Signal Expansion *(deferred)*

**Real phase, real value, deliberately deferred.** Pushes precision further by adding entropy sources beyond `fontHash`.

**Candidates** (in order of estimated ROI):
- **WebGL parameter dump** — `MAX_TEXTURE_SIZE`, extensions list, ANGLE backend hints. ~8–12 bits of entropy, mostly stable across browsers on the same GPU.
- **Audio context FFT hash** — short FFT, hash the result. ~5–10 bits, slight floating-point variance per CPU.
- **Expanded font probe list** — from ~150 to ~500 entries, including region-specific fonts (CJK, Arabic, etc.).
- **Font detection via canvas metrics** — fallback for browsers that restrict `document.fonts.check()`.

Each addition requires cross-browser verification (Chrome / Firefox / Safari must produce identical values on the same hardware, like we did for `fontHash`). Without that discipline, an added signal silently breaks Phase 2.

**Why deferred:** signal expansion is a "numbers go up" improvement — hard to demo viscerally because you need hardware collisions to make the before/after visible. Phase 4 (Investigation) has higher demo value per hour invested.

### Out of scope for this project

Things a production fingerprinting product would need but this demo deliberately does not include. Listed for completeness so they're not forgotten:

- **Authentication / authorization** — the Tuning Console and admin seed endpoints have zero access control by design. No login flow, no roles.
- **Rate limiting on `/api/collect`** — abuse prevention is not in scope.
- **Data retention / cleanup** — fingerprints accumulate forever. No scheduled aging job.
- **External service integrations** — IP reputation, VPN ASN lists, bot detection, fraud scoring.
- **Multi-tenancy** — single application, single database.
- **Observability** — beyond standard Spring Boot defaults. No Prometheus, no tracing, no structured logs.

If any of these became real requirements, they would each be a sizable phase in their own right and would likely deserve a separate codebase rather than being grafted onto this one.

---

## Demo Script

A polished ~6–8 minute live demo arc covering Phase 1, Phase 2, and Phase 3. The full step-by-step talking-point version lives in [`docs/demo/scenarios.md`](docs/demo/scenarios.md) (with captured payloads + screenshots).

1. **First visit, baseline.** Open the ngrok demo URL in Chrome, identify as `nithya`. Both chips show the new state: `[NEW_DEVICE]` `[NO_MACHINE_MATCH]`. Show the signal breakdown.
2. **Cross-browser recognition.** Open Firefox, identify as `nithya` again. Phase 1 chip shows `NEW_DEVICE` (or `DRIFT_DETECTED`), Phase 2 chip flips to `[SAME_MACHINE]` (green) and the panel lists the Chrome session. Repeat in Safari — panel now lists both Chrome and Firefox.
3. **VPN on — IP-tier transition.** With Chrome already registered, turn the VPN on, refresh, identify again. Phase 1 still says `SAME_DEVICE`. Phase 2 chip flips from `SAME_MACHINE` (green) to `MATCHING_HARDWARE` (amber), panel header changes to *"Matching hardware"* with the *"could be the same machine on a different Wi-Fi or VPN"* caveat. **VPN off** restores the green state.
4. **Privacy: different user name.** Identify as `alice` from the same Chrome window. New user, new device, no Same Machine panel. The system never surfaces another user's data even though the hardware would match. Identify back as `nithya` and confirm alice doesn't appear on her side either — bidirectional isolation.
5. **Two voices disagreeing.** Open Chrome Incognito, identify as `nithya`. Phase 1 likely says `DRIFT_DETECTED` (canvas / cookie state changed). Phase 2 still says `SAME_MACHINE` because hardware is unchanged. The audience sees the two mechanisms reach different conclusions and understands why each is right from its own perspective.
6. **Open the Tuning Console.** Show the user/device list populated by the previous steps (and seed any extra demo data via the Demo Data form if needed — pick a browser, toggle VPN/incognito, click Seed, watch the row appear with its match result inline).
7. **Ripple Effect — drag a slider.** Pick `canvas_hash`, drag the weight from 90 down toward 0. As you drag, the user list updates live with highlighted rows showing flipped classifications. Summary bar updates: *"This change affects N users, M fingerprints."* Stop at a point where the incognito/Firefox visits flip from DRIFT to SAME_DEVICE. The audience watches scoring decisions change in real time.
8. **Restore weights and Save.** Reset to defaults, close the loop with a sentence about how a real device profiling team uses this kind of tool to iterate against historical data — and how the entire system was built rapidly with AI assistance.

---

## Implementation Notes

- Spring Boot 4 with Java 25 (records, pattern matching, virtual threads)
- H2 database (zero setup, embedded). Default in-memory; opt into file-mode persistence via `DATABASE_URL` and `DDL_AUTO` env vars (see README) for demo prep that survives backend restarts.
- React 19.2.4 with Material UI
- No auth (it's a demo)
- Synthetic data seeder lives in Phase 3 under the Tuning Console's Demo Data tab. Calls `CollectionService.collect()` internally with canonical templates shipped as classpath resources in `backend/src/main/resources/seed-templates/` (originally captured from real browser fingerprints), so seeded data flows through the exact same scoring/matching path as real visits and is indistinguishable in the database. Enforces a `demo-user-` prefix server-side so synthetic and real data never collide.
- No SSE/websockets — simple request/response. Dashboard refreshes on navigation.
