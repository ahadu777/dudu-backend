---
id: US-LMS-003
title: Automated Credit Decision Engine
owner: Product
status: "Draft"
priority: High
created_date: "2025-12-29"
last_updated: "2025-12-29"
business_requirement: "PRD-009"
depends_on:
  - US-LMS-002  # Credit pull must be completed
cards:
  - lms-decision-engine
  - lms-adverse-action
---

## Business goal
Automatically evaluate loan applications based on credit data and rules, producing APPROVE, DECLINE, or REFER decisions with appropriate next steps.

## Actors
- Decision Engine (automated rules)
- Credit Officer (for referred applications)
- Compliance System (adverse action notices)

## Scope (in)
- Automated credit decisioning based on rules
- Auto-approve, auto-decline, or refer to manual review
- Adverse action notice generation (FCRA-compliant)
- Reason code generation

## Out of scope (now)
- ML-based scoring models
- Manual review workflow UI
- Income verification integration

## Acceptance (Given/When/Then)

**Scenario A — Auto Approve**
- Given credit score ≥ 700, DTI ≤ 36%, no derogatories
- When decision engine evaluates application
- Then outcome is APPROVED with decision_type AUTO
- And loan offers are generated automatically

**Scenario B — Auto Decline**
- Given credit score < 550 OR active bankruptcy OR DTI > 50%
- When decision engine evaluates application
- Then outcome is DECLINED with decision_type AUTO
- And adverse action notice is triggered
- And reason codes are populated

**Scenario C — Refer to Manual Review**
- Given credit score 550-699 OR DTI 36-50% OR thin credit file
- When decision engine evaluates application
- Then outcome is REFERRED with decision_type AUTO
- And application is placed in credit officer queue

**Scenario D — Adverse Action Notice**
- Given application is DECLINED
- When adverse action is generated
- Then notice includes top 4 reason codes
- And includes credit score used and score range
- And includes credit bureau contact information
- And includes rights disclosure (FCRA)

**Scenario E — Manual Decision (Credit Officer)**
- Given application is in REFERRED status
- When credit officer reviews and makes decision
- Then officer must provide rationale (min 50 chars)
- And decision is recorded with officer ID and timestamp

## Decision Rules (Mock)

| Credit Score | DTI | Derogatories | Outcome |
|--------------|-----|--------------|---------|
| ≥ 700 | ≤ 36% | 0 | AUTO_APPROVE |
| < 550 | any | any | AUTO_DECLINE |
| any | > 50% | any | AUTO_DECLINE |
| any | any | ≥ 3 | AUTO_DECLINE |
| 550-699 | ≤ 50% | < 3 | REFER_TO_REVIEW |

## Non-functional constraints
- Decision recorded in < 2s after credit pull
- Adverse action notice generated within 5 minutes of decline
- All decisions logged in immutable audit trail
- Reason codes translated to consumer-friendly language

## Data notes
- Decision outcome enum: APPROVED, DECLINED, REFERRED
- Decision type enum: AUTO, MANUAL
- Reason codes: CR001 (low score), CR002 (high DTI), CR003 (derogatories), CR004 (thin file)

## Links
- Related cards: lms-decision-engine, lms-adverse-action
