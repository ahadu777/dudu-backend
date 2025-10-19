# Implementation Playbook (v0.4)

## Inputs
- Notion card with sections: Prerequisites, API Sequence, Contract, Invariants, Validations, Rules & Writes,
  Data Impact, Side-effects, Acceptance, Postman Coverage.

## Required outputs (each card)
1) Update `/openapi/openapi.json` with the card's OAS fragment + examples.
2) Implement the route and logic per **Rules & Writes** (respect TX + locks).
3) Apply migrations listed in the card; add new files under `/migrations/`.
4) Emit events/logs/metrics named in the card.
5) Create/Update `/docs/cards/<slug>.md` frontmatter (status, branch, PR, artifacts).
6) Export Postman → **Newman JSON** and save to `reports/newman/<slug>.json`.
7) Update the **Notion card** "Status & Telemetry" block with:
   - Status, Branch, PR, Repo Doc path, Spec path(s), Migrations, Newman pass count, Last Update.

## Status values
- Ready → In Progress (work started) → PR (opened) → Done (merged + tests green).

## Implementation Steps
1) **Spec first** — copy card's OAS fragment into `/openapi/openapi.json`.
2) **Stub route** — return example JSON so Postman smoke passes.
3) **Validate** — enforce `required`, types, enums exactly as OAS.
4) **Auth & headers** — implement buyer/operator auth, required headers.
5) **Idempotency/locks** — unique keys + `SELECT … FOR UPDATE` per card rules.
6) **Rules & Writes** — follow the card's step list inside one transaction.
7) **Events/logs/metrics** — emit and log as named.
8) **Acceptance** — run the card's Given/When/Then; ensure green, including retry.
9) **PR** — include Mermaid slice, OAS diff, SQL link, Postman screenshot.