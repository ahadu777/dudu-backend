# PRD-003: 7-Year Audit Compliance Verification Guide

**Document Type**: Long-term Compliance Verification (Non-Automated)
**Related PRD**: PRD-003 Event Venue Operations
**Status**: Reference Document
**Last Updated**: 2025-11

---

## Overview

PRD-003 requires **7-year immutable audit trail retention** for all venue operations including:
- Multi-function package redemptions (Premium Plan, Pet Plan, Deluxe Tea Set)
- Cross-terminal fraud detection events
- Operator validation activities
- Ferry boarding and entitlement usage

This document defines the compliance verification approach for requirements that cannot be covered by automated testing.

---

## Compliance Requirements

### 1. Audit Trail Requirements

| Requirement | PRD Reference | Verification Method |
|-------------|---------------|---------------------|
| 7-year data retention | Section 3.1 | Manual + Infrastructure |
| Immutable audit logs | Section 3.2 | Database constraints |
| Tamper-proof records | Section 3.3 | Cryptographic hashing |
| GDPR compliance | Section 3.4 | Policy + Technical |

### 2. Data Categories Subject to Retention

```yaml
audit_data_categories:
  redemption_events:
    - ticket_code
    - function_code (ferry_boarding, gift_redemption, playground_token)
    - terminal_id (central_pier, cheung_chau)
    - operator_id
    - timestamp
    - result (success, already_redeemed, no_remaining_uses)
    - jti (JWT Token ID)
    retention: 7 years

  fraud_detection_events:
    - duplicate_jti_attempts
    - cross_terminal_fraud_blocks
    - suspicious_patterns
    retention: 7 years

  operator_sessions:
    - login_events
    - session_activities
    - device_fingerprints
    retention: 3 years

  passenger_data:
    - anonymized_after: 2 years
    - full_deletion_after: 7 years (GDPR compliance)
```

---

## Current Implementation Status

### Audit Trail Features (Implemented)

| Feature | Status | Location |
|---------|--------|----------|
| JTI history tracking | ✅ Done | `src/types/domain.ts:88` |
| Validation event logging | ✅ Done | `src/modules/operatorValidation/service.enhanced.ts:421` |
| Raw metadata preservation | ✅ Done | `src/modules/ota/domain/ota.repository.ts:637` |
| Payment reference audit | ✅ Done | `src/modules/ota/service.ts:1284` |

### Pending for Production

| Feature | Status | Notes |
|---------|--------|-------|
| Database retention policy | ⏳ Pending | Requires DB config |
| Log archival system | ⏳ Pending | Infrastructure setup |
| Encryption at rest | ⏳ Pending | Production DB config |
| Backup verification | ⏳ Pending | Ops procedure |

---

## Verification Procedures

### Annual Compliance Audit Checklist

**Data Retention Verification** (Quarterly):
```bash
# 1. Verify oldest audit records exist
SELECT MIN(created_at), MAX(created_at)
FROM redemption_history
WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 YEAR);

# 2. Count records by year
SELECT YEAR(created_at) as year, COUNT(*) as record_count
FROM redemption_history
GROUP BY YEAR(created_at)
ORDER BY year;

# 3. Verify no unauthorized deletions
SELECT COUNT(*) FROM audit_deletion_log
WHERE deletion_reason NOT IN ('gdpr_request', 'system_retention');
```

**Immutability Verification** (Monthly):
```bash
# 1. Check for UPDATE operations on audit tables
SELECT * FROM mysql.general_log
WHERE argument LIKE '%UPDATE redemption_history%'
AND event_time > DATE_SUB(NOW(), INTERVAL 30 DAY);

# 2. Verify hash integrity (if implemented)
SELECT COUNT(*) FROM redemption_history
WHERE SHA256(CONCAT(ticket_code, timestamp, result)) != stored_hash;
```

**GDPR Compliance Verification** (Bi-annually):
```bash
# 1. Verify anonymization of old passenger data
SELECT COUNT(*) FROM orders
WHERE created_at < DATE_SUB(NOW(), INTERVAL 2 YEAR)
AND customer_name IS NOT NULL;  -- Should be 0

# 2. Verify deletion requests processed
SELECT * FROM gdpr_deletion_requests
WHERE status != 'completed';
```

---

## Technical Implementation Guidelines

### Database Retention Policy

```sql
-- Recommended MySQL configuration for audit tables
CREATE TABLE redemption_history (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  ticket_code VARCHAR(64) NOT NULL,
  function_code VARCHAR(32) NOT NULL,
  terminal_id VARCHAR(32) NOT NULL,
  operator_id INT NOT NULL,
  jti VARCHAR(128) NOT NULL,
  result ENUM('success', 'already_redeemed', 'no_remaining_uses', 'fraud_blocked'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Audit immutability
  record_hash VARCHAR(64) GENERATED ALWAYS AS (SHA2(CONCAT(ticket_code, function_code, terminal_id, created_at), 256)) STORED,

  -- Prevent updates
  INDEX idx_jti (jti),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- Disable updates via trigger
DELIMITER //
CREATE TRIGGER prevent_audit_update
BEFORE UPDATE ON redemption_history
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit records cannot be modified';
END//
DELIMITER ;
```

### Log Archival Strategy

```yaml
archival_strategy:
  hot_storage:
    period: "0-6 months"
    location: "Primary MySQL"
    access: "Real-time queries"

  warm_storage:
    period: "6 months - 2 years"
    location: "Read replica / Archive DB"
    access: "Scheduled reports"

  cold_storage:
    period: "2-7 years"
    location: "Cloud archive (S3 Glacier / Azure Archive)"
    access: "Compliance audits only"
    format: "Compressed, encrypted JSON"

  deletion:
    trigger: ">7 years OR GDPR request"
    method: "Secure deletion with certificate"
```

---

## Compliance Reporting Templates

### Monthly Audit Summary Report

```markdown
# Audit Compliance Report - [MONTH YEAR]

## Summary
- Total redemption events: [X]
- Fraud attempts blocked: [X]
- Data integrity status: [PASS/FAIL]

## Retention Status
| Year | Record Count | Status |
|------|-------------|--------|
| 2025 | X,XXX | Active |
| 2024 | X,XXX | Active |
| ... | ... | ... |

## Anomalies Detected
- [List any anomalies]

## Remediation Actions
- [List any actions taken]

## Sign-off
- Reviewed by: [Name]
- Date: [Date]
```

### GDPR Compliance Certificate

```markdown
# GDPR Compliance Certificate - [PERIOD]

## Data Subject Rights
- [ ] Right to access: Implemented via /api/gdpr/my-data
- [ ] Right to rectification: Available via customer service
- [ ] Right to erasure: Implemented with 7-year audit exception
- [ ] Right to data portability: JSON export available

## Data Processing Records
- Processing activities documented: [YES/NO]
- Legal basis established: [YES/NO]
- Data Protection Impact Assessment: [DATE]

## Certification
This system complies with GDPR requirements for the period [START] to [END].

Signed: _____________
Date: _____________
DPO: _____________
```

---

## Incident Response Procedures

### Data Breach Response

1. **Detection** (< 1 hour)
   - Automated alerts for suspicious access patterns
   - Manual review triggers

2. **Containment** (< 4 hours)
   - Isolate affected systems
   - Preserve audit logs
   - Disable compromised credentials

3. **Notification** (< 72 hours for GDPR)
   - Regulatory notification
   - Affected user notification
   - Internal stakeholder communication

4. **Recovery & Review** (< 30 days)
   - System restoration
   - Root cause analysis
   - Control improvements

---

## Production Checklist

### Pre-Production

- [ ] Database retention triggers configured
- [ ] Archival automation scripts deployed
- [ ] Backup verification procedure documented
- [ ] GDPR data subject request workflow tested
- [ ] Audit table immutability triggers active
- [ ] Log shipping to cold storage configured

### Post-Production (Ongoing)

- [ ] Monthly integrity checks scheduled
- [ ] Quarterly retention audits scheduled
- [ ] Annual GDPR compliance review scheduled
- [ ] Incident response drill conducted (annually)

---

## Contact Information

**Compliance Officer**: [TBD]
**Data Protection Officer**: [TBD]
**Technical Lead**: [TBD]

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11 | AI | Initial document |

---

**Note**: This document provides guidelines for long-term compliance verification. Automated testing covers functional requirements; this document addresses non-automatable compliance aspects requiring periodic manual verification and infrastructure configuration.
