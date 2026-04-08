# Demo documentation

This directory holds everything a presenter needs to run the demo and
everything a future reader needs to understand what was captured.

## Contents

| File / directory | Purpose |
|---|---|
| `scenarios.md` | Two reference matrices — Phase 2 browser captures + Phase 3/4 curated seed |
| `findings.md` | Observed behavior and insights from the Phase 2 manual test pass |
| `recordings/` | Captured `N_payload.json`, `N_response.json`, and `N.png` for every Phase 2 scenario |

## How these pieces fit together

- **Looking up a specific scenario result** → open [`scenarios.md`](scenarios.md)
  and find the row in the matrix. Then the matching
  [`recordings/N_payload.json`](recordings/),
  `recordings/N_response.json`, and `recordings/N.png` are the evidence.
- **Understanding why Phase 2 behaves the way it does** → start at
  [`findings.md`](findings.md) (observed quirks, false-positive analysis),
  then jump to [`../how-it-works.md`](../how-it-works.md) for the design
  rationale.
- **Understanding the product spec** → [`../../SPEC.md`](../../SPEC.md) at
  the repo root.

## Capture convention (Phase 2 scenarios)

Every scenario `N` in the matrix has three sibling files inside
[`recordings/`](recordings/):

| Suffix | What | Source |
|---|---|---|
| `N_payload.json` | The `/api/collect` request body | Browser DevTools → Network tab, or Capture Mode (see below) |
| `N_response.json` | The `/api/collect` response body | Same request, Response tab, or Capture Mode |
| `N.png` | Screenshot of the result panel after the call | Full panel including both chips and the Same Machine section |

### Capture Mode (the easy way)

Append `?capture=1` to the Collect page URL (e.g.
`http://localhost:5173/?capture=1`) to turn on a small in-page helper
that dumps the three artefacts to your Downloads folder with one click.
The target directory shown in the helper text is configurable via the
`VITE_CAPTURE_DIR` env variable (see `envrc.sample` at the repo root);
default is `docs/demo/recordings/`.
