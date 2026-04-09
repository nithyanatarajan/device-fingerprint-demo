# How it works

The design rationale behind the identification flow. For the formal product spec see [`SPEC.md`](../SPEC.md).

---

## Two independent voices

The product runs **two parallel identification mechanisms** on every visit. Each looks at the world through its own lens and renders its own chip in the UI. Neither suppresses itself based on what the other has decided — when they agree it's high confidence; when they disagree the audience learns *why*.

| | **Phase 1 — device verdict** | **Phase 2 — machine verdict** |
|---|---|---|
| **Question** | Is this visit one of this user's existing devices? | Is this visit on the same hardware as any of this user's other sessions, regardless of browser? |
| **Mechanism** | Weighted similarity score over 15 collected signals | Exact-match SHA-256 hash + co-match gates |
| **Scope** | Per-user (never compares across users) | Per-user (never compares across users) |
| **Output** | `SAME_DEVICE` / `DRIFT_DETECTED` / `NEW_DEVICE` chip | `SAME_MACHINE` / `MATCHING_HARDWARE` / `NO_MACHINE_MATCH` chip |

---

## Phase 1 in brief

- Frontend collects 15 signals via `@fingerprintjs/fingerprintjs`
- Backend resolves the user, scores the new fingerprint against each existing device's latest fingerprint with configurable per-signal weights, classifies by threshold (`SAME_DEVICE` ≥ 85, `DRIFT_DETECTED` ≥ 60, else `NEW_DEVICE`)
- Per-signal comparators handle exact match, browser-family extraction (user agent), and Jaccard similarity (codec support)
- Returns the verdict, the score, and the per-signal breakdown

Phase 1 answers *"is this you, drifted, or someone new?"* — but cannot answer *"is this the same physical machine as some other browser session?"*. That's Phase 2's job.

---

## Phase 2 in brief

- Compute a **machine signature**: SHA-256 over `platform | screenResolution | pixelRatio | touchSupport | fontHash`
- Query fingerprints with the same signature
- Apply gates: per-fingerprint self-exclusion, per-user scope, timezone equality (alias-aware), locale primary-language equality
- Group surviving candidates by device, take the latest fingerprint per device
- Tier each by `publicIp`: equal → **strong** ("Same machine"), differs → **possible** ("Matching hardware")
- Hide the panel entirely when both lists are empty

---

## Why these five signals are in the hash, and why the others aren't

Every signal in the hash must be reported identically by every major browser for the same physical hardware. Anything that varies for non-hardware reasons would silently break cross-browser machine recognition.

| Signal | In hash? | Why |
|---|---|---|
| `platform` | ✅ | OS-level identifier, all browsers consistent. |
| `screenResolution` | ✅ | Display property, all browsers consistent absent aggressive privacy mode. |
| `pixelRatio` | ✅ | Display property, deterministic per hardware. |
| `touchSupport` | ✅ | Derived from `navigator.maxTouchPoints`, all browsers consistent. |
| `fontHash` | ✅ | Hash of the user's installed-font set, captured via `document.fonts.check()` against a curated probe list. Cross-browser stable. Adds ~10–15 bits of entropy — distinguishes two physically identical machines whose owners installed different software. |
| `canvas`, `webgl`, `userAgent`, `codec`, `dnt`, `cookie` | ❌ | Browser-specific or user-preference. Differ per browser by definition. |
| `timezone` | ❌ | OS setting; changes when the user travels or on DST transitions. Used as a separate gate (alias-aware via Java's `ZoneRules`, so `Asia/Calcutta` ≡ `Asia/Kolkata`). |
| `locale` | ❌ | Browser language preference splits across browsers for trivial reasons. Used as a separate gate (primary language only, so `en-GB` ≡ `en-US`). |
| `deviceMemory` | ❌ | The Device Memory API is implemented only in Chromium browsers. Firefox and Safari return `null`. |
| `colorDepth` | ❌ | Safari deliberately reports `24` on Display P3 panels even when the hardware supports 30, as anti-fingerprinting. Chrome and Firefox report `30`. |
| `hardwareConcurrency` | ❌ | WebKit caps `navigator.hardwareConcurrency` at 8 regardless of actual core count. A 12-core MacBook reports 12 in Chrome and Firefox but 8 in Safari. |

The exclusion list is the result of real-world testing in Chrome, Firefox, and Safari on the same MacBook. Each excluded signal hit a concrete cross-browser break.

---

## Precision/recall trade-off

Four possible outcomes:

| Outcome | Phase 2 verdict | Reality |
|---|---|---|
| **TP** | match shown | actually same machine |
| **FP** | match shown | different machine |
| **TN** | hidden | actually not same machine |
| **FN** | hidden | actually same machine |

**Precision** = TP / (TP + FP). **Recall** = TP / (TP + FN).

The product is **deliberately precision-first**. False positives destroy credibility in a fingerprinting demo; false negatives are merely missed opportunities. Every gate, every exclusion, and every conservative threshold favours precision over recall.

### Concrete examples per outcome

**TP — what the system catches**

| Case | Result |
|---|---|
| Same machine, same Wi-Fi, different browser | Strong match |
| Same machine, VPN on (or moved to café) | Possible match |

**FP — the residual class**

A user owning two physically distinct devices with **identical hardware specs AND identical installed font sets**. Concrete examples: two brand-new identical MacBooks set up from the same backup with no software installed; a user who scrupulously keeps two work laptops in identical configurations. Estimated rate **<0.1%**.

**TN — what the system correctly hides**

- First-ever visit by a new user
- MacBook + iPad on the same name (different `platform`)
- Cross-user attempts (per-user scoping never crosses boundaries)

**FN — the deliberate misses**

- User flies across timezones with the same laptop (TZ gate)
- User changed display scaling or plugged in an external monitor between visits (`screenResolution` or `pixelRatio` changes)
- User installed a new font between visits (font hash changes; resolves on the next visit)
- User has truly different language preferences across browsers (`en` in Chrome, `de` in Firefox)

Each of these is a defensible miss. The alternative is reintroducing FPs.

### Why per-user scoping matters

A previous design did cross-user matching. Two problems killed it:

1. **False positives.** Two people in the same household with identical hardware, two MacBooks in the same urban area (same OS locale, same timezone) — all would surface as matches.
2. **Privacy.** Showing one user's data to another is a real violation, even if the data is just "your hardware was seen here". Clients would (rightly) balk.

Per-user scoping eliminates both. The "alias detection" use case (alice trying to be bob on the same machine) is gone — that's a deliberate trade-off.

---

## Scenario reference

**Setup:** alice has previously visited from Chrome on a MacBook Pro 14" / `Asia/Kolkata` / `en-GB` / IP `10.0.0.1`. The "new visit" describes what happens next.

| # | Scenario | New visit name | Device verdict | Machine verdict |
|---|---|---|---|---|
| 1 | Same laptop, different browser, same room | same | DRIFT_DETECTED ~64% | Same machine ✓ |
| 2 | Same laptop, same browser, VPN on | same | SAME_DEVICE ~100% | Matching hardware ✓ |
| 3 | Same laptop, same browser, café in same city | same | SAME_DEVICE ~100% | Matching hardware ✓ |
| 4 | Same laptop, same browser, café in different city | same | SAME_DEVICE ~100% | Matching hardware ✓ |
| 5 | Same laptop, same browser, BLR → BER | same | SAME_DEVICE ~93% | Hidden (TZ gate) |
| 6 | Same laptop, different browser, VPN on | same | DRIFT_DETECTED ~64% | Matching hardware ✓ |
| 7 | Same laptop, different browser, café in same city | same | DRIFT_DETECTED ~64% | Matching hardware ✓ |
| 8 | Same laptop, different browser, café in different city | same | DRIFT_DETECTED ~64% | Matching hardware ✓ |
| 9 | Same laptop, different browser, BLR → BER | same | DRIFT_DETECTED ~57% (borderline) | Hidden (TZ gate) |
| 10 | 2 identical Macs in same city | new | NEW_DEVICE | Hidden (per-user) |
| 11 | 2 identical Macs around the world | new | NEW_DEVICE | Hidden (per-user) |
| 12 | 2 identical Macs in same household | new | NEW_DEVICE | Hidden (per-user) |

**Patterns:**
- Rows 1, 6, 7, 8 are equivalent at the system level. Phase 1 sees DRIFT, Phase 2 sees a hardware match. The only physical difference is the network, which Phase 2 expresses as the strong/possible tier.
- Rows 2, 3, 4 are equivalent. Same browser keeps Phase 1 happy; network change demotes Phase 2 to possible.
- Rows 5 and 9 are conservative misses on Phase 2. The TZ gate suppresses; Phase 1 is more lenient and still recognises the device.
- Rows 10–12 are eliminated by per-user scoping.

---

## Real-world cross-browser walkthrough

Verified end-to-end on a MacBook Pro M3 Pro. Same user `nithya` visits from Chrome → Firefox → Safari, all reporting `fontHash: "foxefv"`:

| Visit | Phase 1 | Phase 2 |
|---|---|---|
| Chrome (first) | `NEW_DEVICE` | `NO_MACHINE_MATCH` (no prior data) |
| Firefox | `NEW_DEVICE` (score below drift threshold at default weights) | `SAME_MACHINE` — Chrome, just now |
| Safari | `NEW_DEVICE` | `SAME_MACHINE` — Firefox + Chrome |

Phase 1 says "I don't recognise this as one of your existing devices" — technically correct under its weighted-signal scoring at default thresholds. Phase 2 says "but the hardware says you've been here in two other browsers." Both voices are true, both useful, neither overclaims.

---

## Phase 3 design: exploration over persistence

The Tuning Console's scoring configuration (signal weights + thresholds) is deliberately **in-memory** — not persisted to the database. Every backend restart resets to canonical defaults. This is intentional:

- The console is an **exploration tool**, not a configuration store. An admin drags sliders, watches the ripple effect, then either saves (writes to in-memory state for the session) or resets. There is no "deploy this config to production" workflow because there is no production.
- Persistence would add schema, migration, and a "which config is active?" question that adds complexity with zero demo value. If this became a real product, config persistence would be a Phase 6+ concern alongside auth and multi-tenancy.
- Reset-to-defaults is a one-click escape hatch. No "undo 47 incremental saves" problem.

The ripple-effect preview re-scores every stored fingerprint per user against the proposed config and diffs the classifications. It never persists — only Save commits, and even then only to in-memory state.

---

## Signal distinctiveness: honest measurement

The Collect-page distinctiveness panel measures how common each signal value is **against the live fingerprint table** — not against a reference population, not against industry benchmarks, not against fabricated entropy estimates.

Why this design:

- **No fabrication.** A Shannon entropy estimate requires a reference distribution. For 15 browser signals, no canonical reference exists. Publishing "your canvas hash has 18.2 bits of entropy" when that number comes from a curated dataset the user can't inspect is misleading. Collision counts against the local database are honest: *"1 of 12 stored fingerprints share your value"* is a verifiable statement.
- **Small-N is acknowledged, not hidden.** With N = 1, every signal is trivially 100% distinctive. The panel says so and captions the data with *"Numbers become more meaningful as the sample grows."* This is not a defect — it is the truth about what the database knows.
- **Two views, same data.** The counts/ratio toggle offers two framings of the same measurement — *"3 of 12"* vs *"25%"*. Neither adds information the other doesn't have; the toggle exists because some audiences scan tables of fractions more easily, others scan percentages.
