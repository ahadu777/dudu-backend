---
id: US-LMS-014
title: "Operational Dashboard & Queue Management"
owner: Product
status: "Draft"
priority: High
created_date: "2025-01-16"
last_updated: "2025-01-16"
business_requirement: "PRD-009"
depends_on: []
enhances: ["US-LMS-002", "US-LMS-003"]
cards: []
---

# US-LMS-014: Operational Dashboard & Queue Management

## Change Log
| Date | Change | Reason |
|------|--------|--------|
| 2025-01-16 | Created | Initial version |

---

## User Goal

**As an** Operations Manager
**I want to** have real-time visibility into work queues and team performance
**So that** I can ensure efficient loan processing, meet SLAs, and balance workloads across my team

---

## Scope

### In Scope
- Real-time operational dashboard
- Work queue management and assignment
- SLA monitoring and alerting
- Team performance metrics
- Workload balancing and rebalancing
- Escalation management
- Queue filtering and search

### Out of Scope
- Predictive workload modeling (Phase 2)
- AI-based auto-assignment (Phase 2)
- Cross-team queue visibility (Phase 2)
- Mobile dashboard (Phase 2)

---

## Acceptance Criteria

### A. Operations Dashboard
- **Given** operations manager accesses dashboard
- **When** dashboard loads
- **Then** system displays:
  - Total items in queue by type (applications, documents, cases)
  - SLA status breakdown (green/yellow/red)
  - Aging distribution (0-1 day, 1-3 days, 3-5 days, 5+ days)
  - Team utilization by processor
  - Items requiring escalation
- **And** dashboard refreshes every 30 seconds

### B. Queue Assignment
- **Given** new applications enter the system
- **When** auto-assignment runs
- **Then** system assigns items to processors based on:
  - Skill match (processor certified for item type)
  - Current workload (items assigned to processor)
  - Round-robin within skill group
  - Priority (VIP customers first, then by age)
- **And** processor receives notification of new assignment

### C. SLA Breach Alert
- **Given** an item approaches SLA threshold (80% of time elapsed)
- **When** SLA monitor runs (every 5 minutes)
- **Then** system sends yellow alert to assigned processor
- **And** sends alert to team lead
- **And** if 100% elapsed, escalates to supervisor
- **And** logs SLA event for reporting

### D. Workload Rebalancing
- **Given** one processor is overloaded (>30 items) while another is underutilized (<10 items)
- **When** operations manager initiates rebalance
- **Then** system suggests items to transfer based on:
  - Item aging (oldest first)
  - Complexity score
  - Processor skill match
- **And** allows bulk reassignment with one click
- **And** notifies affected processors

### E. Performance Metrics
- **Given** operations manager views team metrics
- **When** metrics are displayed
- **Then** system shows for each processor:
  - Items completed today/this week
  - Average handle time
  - SLA compliance rate
  - Quality score (if available)
- **And** allows comparison to team average

### F. Escalation Management
- **Given** item is escalated (SLA breach or manual escalation)
- **When** escalation occurs
- **Then** item moves to escalation queue
- **And** supervisor receives notification
- **And** original processor can add notes
- **And** escalation reason is logged

### G. Queue Search and Filter
- **Given** operations manager needs to find specific items
- **When** using search/filter
- **Then** can search by: loan ID, borrower name, processor, status
- **And** can filter by: queue type, SLA status, age, priority
- **And** results displayed with key details
- **And** can take action directly from results

---

## Business Rules

1. **SLA Definitions**
   - New Application Review: 24 hours
   - Document Verification: 4 hours
   - Customer Case: 2 hours (urgent), 24 hours (standard)
   - Escalation Response: 2 hours

2. **SLA Status Colors**
   - Green: <50% of SLA elapsed
   - Yellow: 50-80% of SLA elapsed
   - Red: >80% of SLA elapsed

3. **Assignment Rules**
   - Maximum items per processor: 50
   - VIP customers get priority assignment
   - Complex items (flagged) go to senior processors
   - Items cannot be unassigned without reassignment

4. **Escalation Triggers**
   - SLA breach (automatic)
   - Manual escalation by processor
   - Customer complaint
   - Compliance flag

5. **Workload Thresholds**
   - Overloaded: >30 items
   - Optimal: 15-25 items
   - Underutilized: <10 items
   - Critical: >40 items (requires immediate action)

---

## Related Cards

| Card | Status | Description |
|------|--------|-------------|
| TBD | Draft | Operations dashboard UI |
| TBD | Draft | Queue assignment service |
| TBD | Draft | SLA monitoring service |
| TBD | Draft | Workload balancer |

---

## Enhanced Stories

| Story | Enhancement |
|-------|-------------|
| US-LMS-002 | Applications tracked in operations queue |
| US-LMS-003 | Decision queue managed through dashboard |

---

## Non-Functional Requirements

- Dashboard refresh every 30 seconds
- SLA checks every 5 minutes
- Support for 100+ concurrent processors
- Historical metrics retention for 2 years
- Dashboard load time <3 seconds
- Real-time websocket updates for critical alerts
