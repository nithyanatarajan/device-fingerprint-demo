# Device Identification Management Platform

## Context

A short AI-assisted build demo showcasing that a single developer with AI can build a full-stack, production-quality Java application rapidly — something that would normally take a team several days.

**Audience:** Technical leadership evaluating AI-assisted development velocity and quality.

**What we're proving:**
1. AI makes a single dev significantly faster at building production-quality software
2. AI can rapidly prototype complex domain-specific systems

**Tech stack:** Java 25 + Spring Boot 4, React 19.2.4 + Material UI, H2 database

**Related docs:**
- [`docs/how-it-works.md`](docs/how-it-works.md) — design rationale, signal exclusion reasoning, false-positive analysis, scenario reference
- [`docs/demo/scenarios.md`](docs/demo/scenarios.md) — Phase 2 scenario matrix + Phase 3/4 curated seed table
- [`docs/demo/recordings/`](docs/demo/recordings/) — captured request/response payloads and screenshots

---

## Data Model

Three JPA entities. Signal weights and scoring thresholds are held in-memory (see [Scoring Configuration](#scoring-configuration)).

### User
- `id` (UUID, PK)
- `name` (unique, case-insensitive)
- `created_at`

### Device
- `id` (UUID, PK)
- `user_id` (FK → User)
- `label` (auto-generated, e.g., "Chrome on MacOS")
- `created_at`
- `last_seen_at`
- `visit_count`

### DeviceFingerprint
- `id` (UUID, PK)
- `device_id` (FK → Device)
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
- `font_hash` (browser-independent hash of installed-font set)
- `machine_signature` (SHA-256 of browser-independent signals)
- `public_ip` (visitor's public IP, used for strong/possible tiering)

### Scoring Configuration

Managed in-memory by `ScoringConfigService` — not persisted. Resets to canonical defaults on every backend restart.

- **Signal weights:** 15 entries, each with `weight` (numeric, relative) and `enabled` (boolean). See [Default Signal Weights](#default-signal-weights).
- **Thresholds:** `same_device_threshold` (default 85), `drift_threshold` (default 60).

---

## Scoring Engine

### Similarity Computation

Per-signal comparison produces a raw similarity score:
- Exact match → 1.0
- Partial match → 0.5 (signal-specific logic)
- No match → 0.0

### Aggregation

Weights are relative, not absolute. The system normalizes automatically:

```
normalized_weights = each weight / sum(all enabled weights)
composite_score = sum(signal_score × normalized_weight) × 100
```

### Classification

Composite score (0–100) classified against configurable thresholds:
- score ≥ same_device_threshold → `SAME_DEVICE`
- score ≥ drift_threshold → `DRIFT_DETECTED`
- score < drift_threshold → `NEW_DEVICE`

### Matching Scope

Always scoped to a user. The engine compares only against that user's known devices — never the entire database.

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
| user_agent | Partial | Same browser family + OS → 0.5 |
| codec_support | Partial | Jaccard similarity: ≥ 0.8 → 1.0, ≥ 0.5 → 0.5 |

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

### Machine Signature (Phase 2)

SHA-256 over 5 browser-independent signals: `platform`, `screenResolution`, `pixelRatio`, `touchSupport`, `fontHash`.

**Match gates** (all must pass):
- Hardware signature equality
- `timezone` equality (alias-aware: `Asia/Calcutta` ≡ `Asia/Kolkata`)
- `locale` primary-language equality (`en-GB` ≡ `en-US`)
- Per-user scoping: candidate must belong to the same user

**Tiering:**
- **Strong** ("Same machine"): `publicIp` also matches
- **Possible** ("Matching hardware"): `publicIp` differs

Self-exclusion is per-fingerprint (only the just-saved row), not per-device.

For signal inclusion/exclusion rationale and false-positive analysis, see [`docs/how-it-works.md`](docs/how-it-works.md).

### Incognito & VPN Behaviour

**Incognito:** Canvas, WebGL, hardware concurrency, screen resolution, device memory, touch support, codec support all survive. Cookie/localStorage state may differ. A device in incognito scores high against its normal-mode fingerprint.

**VPN:** Phase 1 scoring is unaffected (no network signals). Phase 2 uses `publicIp` as a tiering gate — VPN on/off flips the chip between `SAME_MACHINE` (green) and `MATCHING_HARDWARE` (amber).

**Null signals:** When unavailable (e.g., `device_memory` in Firefox/Safari), stored as null and excluded from that comparison's weight calculation.

---

## API Reference

### Collection

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/collect` | Submit name + signals → match result. Response includes `fingerprintId`, `matchResult`, `score`, `signalComparisons`, `changedSignals`, `machineMatch`. |

### Signals

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/signals/distinctiveness?fingerprintId={uuid}` | Per-signal collision counts for a fingerprint against the live table. Returns per-signal `matchCount`, `distinctValues`, plus `totalFingerprints` and `fullFingerprintMatchCount`. |

### Users & Devices

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/users` | List all users with device counts. |
| `GET` | `/api/users/{userId}` | User detail. |
| `GET` | `/api/users/{userId}/devices` | List devices for a user. |
| `GET` | `/api/users/{userId}/devices/{deviceId}/investigation` | Full match explanation: signal contributions, comparison table, visit history. |

### Scoring Configuration

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/scoring/weights` | Current signal weight configs. |
| `PUT` | `/api/scoring/weights` | Update signal weights. |
| `POST` | `/api/scoring/weights/reset` | Restore canonical default weights. |
| `GET` | `/api/scoring/config` | Current thresholds. |
| `PUT` | `/api/scoring/config` | Update thresholds. |
| `POST` | `/api/scoring/config/reset` | Restore canonical default thresholds. |
| `POST` | `/api/scoring/preview` | Re-score all fingerprints with proposed config. Returns before/after classifications per device. Read-only. |

### Admin Seed

All endpoints enforce a `demo-user-` prefix — cannot affect real users.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/admin/seed` | Create one synthetic fingerprint. Body: `{ userName, browser, vpn, incognito }`. Returns `CollectResponse`. |
| `POST` | `/api/admin/seed/scenario` | Wipe all `demo-user-*` data and seed 7 curated users. Returns per-visit `CollectResponse`. |
| `DELETE` | `/api/admin/seed` | Cascade-delete all `demo-user-*` users + devices + fingerprints. |
| `GET` | `/api/admin/seed/summary` | Counts of current `demo-user-*` data. |

---

## Pages

### Collect Page (`/`)

- Name input → silent signal collection → `POST /api/collect` → result display
- **Result area:** Phase 1 chip (`SAME_DEVICE` / `DRIFT_DETECTED` / `NEW_DEVICE`) + Phase 2 chip (`SAME_MACHINE` / `MATCHING_HARDWARE` / `NO_MACHINE_MATCH`) + welcome message with score
- **Same Machine panel:** Two conditional sections — "Same machine" (strong matches) and "Matching hardware" (possible matches). Hidden when both empty. Each row: device label + relative last-seen time.
- **Signal Distinctiveness panel:** Per-signal collision counts for the just-captured fingerprint. Headline: "unique among N" or "matches K of N". Toggle between Counts (`K of N`) and Ratio (`K/N × 100%`) views. Caption: "Measured against this database only — not a reference population."
- **Signal Breakdown:** Expandable accordion showing all 15 collected signal values. Changed signals highlighted.
- **Capture mode** (`?capture=1`): Dev-only panel for downloading payload/response JSON + screenshot per scenario.

### Tuning Console (`/admin`)

Two tabs, both stay mounted across switches.

**Tune tab** — two-column layout:
- Left: Signal Weights (0–100 slider + enable/disable per signal, Reset + Save) and Thresholds (same-device slider, drift slider, constraint same-device ≥ drift enforced client-side, Reset + Save).
- Right: Users & Devices list. Each device row shows label, composite score from live preview, before→after classification chips when flipped. Click any row → Investigation modal.

**Ripple Effect:** Dragging any slider sends proposed config to `POST /api/scoring/preview` (debounced). Backend re-scores every stored fingerprint. UI highlights affected rows: green (promoted), red (demoted), amber (in-band). Summary banner shows affected count.

**Demo Data tab:**
- Curated scenario seed: one-click button seeds 7 users at varied score-curve points.
- Per-user seed form: `userName` (with `demo-user-` prefix pinned), `browser`, `vpn`, `incognito`. Last result shows live `CollectResponse` chips.
- Clear all demo data: confirmation dialog with counts.

### Investigation Modal

Opened from the Tuning Console's device list. Shows:
- Composite score, classification chip, active threshold context
- Per-signal contribution breakdown (what matched, what lost confidence, percentage points each)
- Full 15-signal side-by-side comparison table (green/amber/red cells)
- Visit history timeline

---

## Roadmap

### Shipped

- **Phase 1: Device Signal Collection** — 15-signal collection, weighted scoring, Collect page
- **Phase 2: Cross-Browser Machine Identification** — machine signature hash, tiered match gates, Same Machine panel
- **Phase 3: Tuning Console + Ripple Effect + Admin Seed** — weight/threshold sliders, live preview, curated + per-user seeding
- **Phase 4: Device Investigation** — per-device explainability modal with contribution breakdown
- **Signal Distinctiveness Panel** — per-signal collision counts on Collect page with counts/ratio toggle

### Planned

**Phase 5: Signal Expansion** — Add entropy sources beyond `fontHash` (WebGL parameter dump, audio context FFT, expanded font probe list). Each requires cross-browser verification. Deferred: hard to demo viscerally without hardware collisions.

**Phase 6: Cloud Deployment** — Deploy to Fly.io or DigitalOcean with persistent H2 volume. Single Docker image (multi-stage Gradle + Vite build). Removes ngrok dependency and enables real remote testers. Deferred: real work but zero product features.

**Phase 7: UX Refinements** — Two independent enhancements:
- *Anonymous cross-user hardware signal:* When a strong-tier Phase 2 match exists for a different user, show "This hardware has also been seen ~3 minutes ago." No names, no device labels — only existence and recency. Strong-tier gate only. Small-N deanonymization risk documented.
- *Investigation live-preview toggle:* Show proposed vs current config in the Investigation modal when ripple-effect preview is active.

### Out of Scope

- **Authentication / authorization** — zero access control by design
- **Rate limiting on `/api/collect`** — abuse prevention not in scope
- **Data retention / cleanup** — fingerprints accumulate forever
- **External service integrations** — IP reputation, VPN ASN lists, bot detection
- **Multi-tenancy** — single application, single database
- **Observability** — beyond Spring Boot defaults
