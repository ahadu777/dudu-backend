# 🏦 Loan Management System (LMS)

**System Information & Functional Overview**

## 🌐 System Overview

The **Loan Management System (LMS)** is an enterprise-grade, modular platform designed to manage **Mortgage**, **Personal**, and **Business** loan products across their full lifecycle.

The system unifies a **customer-facing digital portal** with a **secure administrative backend**, enabling lenders to operate efficiently while maintaining transparency, compliance, and scalability.

At its core, the LMS is built to:

- Digitize the lending journey end-to-end
- Support multi-party financial relationships
- Automate repayment reconciliation using **Virtual Accounts (VA)**
- Provide real-time operational and financial visibility

---

## 🚀 1. Executive Summary

The LMS digitizes the complete lending lifecycle—from **loan application** through **credit decisioning**, **fund disbursement**, **repayment tracking**, and **loan closure**.

- 🔢 **Virtual Account–based repayment model** for automated reconciliation
- 🤝 **Multi-party architecture** supporting Borrowers, Guarantors, and Investors
- 📊 **Operational dashboards** for underwriting, finance, and portfolio monitoring

This design minimizes manual operations, reduces reconciliation errors, and enables lenders to scale loan volumes without proportional increases in operational cost.

---

## 👥 2. User Roles & Stakeholders

### 🧑‍💼 Borrower (Individual / Merchant)

**Primary system user and loan applicant**

- Submits loan applications
- Manages personal or business profiles
- Tracks application progress and repayment history
- Views repayment schedules and outstanding balances

> Design Consideration: Borrower UX must be simple, mobile-first, and status-driven.
> 

![image.png](attachment:ac7eb9ca-dd02-4594-abb2-8d83aec5997d:image.png)

![image.png](attachment:70427b50-168f-415e-95a5-16f9560e9eb0:image.png)

---

### 🛡️ Guarantor

**Risk-mitigation participant for unsecured lending**

- Provides secondary security for Personal Loans
- Linked contractually to the borrower
- No physical collateral required

> Design Consideration: Guarantor consent, identity verification, and audit trail are mandatory.
> 

---

### 💰 Investor

**Capital provider**

- Funds loan issuance
- Monitors active loan portfolios
- Tracks returns, delinquencies, and repayments

> Design Consideration: Investors require read-only, high-trust financial visibility.
> 

---

### 🧠 Underwriter

**Credit decision authority**

- Reviews KYC/KYB documentation
- Analyzes bank statements and revenue data
- Approves, rejects, or requests more information

> Design Consideration: Manual decisioning with system-assisted insights (not black-box automation).
> 

---

### ⚙️ Finance & Operations Team

**Execution and monitoring**

- Executes loan disbursements
- Manages bank payment batches
- Oversees repayments, exceptions, and collections

> Design Consideration: Strong internal controls and separation of duties.
> 

---

## 🧩 3. Product Features & Core Workflows

### 📦 3.1 Loan Product Catalog

The LMS supports three structured loan products:

### 🏠 Mortgage Loans

- Secured by real estate
- Collateral registry required
- Long-term repayment schedules

### 👤 Personal Loans

- Unsecured
- Backed by a guarantor
- Short-to-medium loan tenure

### 🏪 Business Loans

- Revenue-based lending
- Designed for merchants and SMEs
- Risk assessed using cash-flow analysis

> Product Thinking: Loan types share a common lifecycle but differ in risk, collateral, and underwriting logic.
> 

---

### 🌍 3.2 Customer Portal (Borrower Experience)

The customer portal acts as the **single source of truth** for borrowers.

### 🔍 Product Selection

- Clear comparison between loan products
- Eligibility hints before application

### 🧾 Account & Profile Management

- Contact and address updates
- Linked bank account management

### ⏱️ Application Tracking

- Real-time status updates:
    - Incomplete
    - Pending Review
    - Accepted
    - Declined

> UX Principle: Reduce uncertainty by making status and next steps explicit.
> 

![image.png](attachment:5d2565e4-8f5a-49b8-9863-44ba9ff4424d:image.png)

![image.png](attachment:d6faf46b-8921-44e1-859c-daa5f60e5ac9:image.png)

---

### 🖥️ 3.3 Administrative Backend (Lender Experience)

### 📊 Operations Dashboard

Provides real-time visibility into:

- Pending and approved applications
- Active loan exposure
- Overdue and delinquent loans
- Monthly cash inflow and outflow

---

### 🗂️ Party Management

Centralized registry of **All Parties**:

- Borrowers
- Guarantors
- Investors

Each party is categorized by:

- Role
- Activity status
- Risk relevance

---

### 🏷️ Collateral Registry

Tracks pledged assets such as:

- Real estate
- Vehicles

Includes valuation, ownership, and linkage to loans.

---

### 💳 Transaction Management

- Bank payment batch processing
- Individual loan transaction history
- Audit-friendly transaction logs

---

## 🔄 4. Repayment & Reconciliation

### (Virtual Account Architecture)

To enable scale and accuracy, the LMS adopts a **Virtual Account (VA) model**.

### 🏦 Master Account

- One physical bank account owned by the lender

### 🔢 Borrower Virtual Accounts

- Each borrower is assigned a unique VA number
- All repayments flow through this identifier

### 🤖 Automated Reconciliation

Payments are matched automatically using:

- Real-time banking APIs (e.g., ZA Bank)
- Daily CSV imports from banking partners

> Strategic Benefit: Eliminates manual bank statement matching and reduces reconciliation errors to near zero.
> 

---

## 🔁 5. Loan Lifecycle Specification

| Phase | 🔍 Description | 📄 Supporting Data |
| --- | --- | --- |
| **1. Application** | Digital submission via portal | KYC/KYB, ABN, ASIC |
| **2. Underwriting** | Manual financial assessment | Bank Statements (PDF/CSV) |
| **3. Setup** | Loan terms configuration | LMS Loan Record |
| **4. Disbursement** | Fund release by finance team | Bank Transfer |
| **5. Monitoring** | Weekly VA repayment tracking | Due / Overdue Lists |
| **6. Collections** | Manual recovery actions | Phone, WhatsApp, Email |

---

## 📈 6. Reporting & Key Metrics

The LMS must generate accurate, exportable reports covering:

### 📌 Loan Status Distribution

- Draft
- Active
- Due
- Overdue
- Ended
- Cancelled

### 💹 Financial Health

- Total issued loan value
- Outstanding principal
- Overdue exposure

### 📊 Application Conversion Analytics

- New vs. returning applicants
- Monthly approval and rejection rates

> Business Value: Enables data-driven credit policy adjustments and investor reporting.
> 

![image.png](attachment:49a3c070-07fe-42b3-a003-de8a8433709d:image.png)

---

---

### Screenshots

![image.png](attachment:641cad70-2a03-4832-9ab8-5cd2c0d4a14c:image.png)

![image.png](attachment:bc5a05b1-9a7a-4d08-ad89-b918a004bd16:image.png)

![image.png](attachment:5408366c-6418-49ca-bf7f-6eac2a4d5146:image.png)

![image.png](attachment:090865ca-bc05-48ac-a4ed-b6dcd056d7b1:image.png)

![image.png](attachment:88a96fcb-62d6-488d-9abe-8abe5d448297:image.png)

![image.png](attachment:dff7ae21-1d42-449c-9db8-503a2309e3b8:image.png)

![image.png](attachment:9bc60a0c-a7b8-44f0-8f8a-08a471f62389:image.png)

![image.png](attachment:0c928f55-e340-4b6e-b5be-c1c45d99ecf5:image.png)

![image.png](attachment:5d0b5c10-ceb9-4303-9fc4-22d3e8ee767d:image.png)

![image.png](attachment:9aa4a12f-16dd-4f30-a2c2-f23ae757d626:image.png)

![image.png](attachment:ff59089e-e9f3-46ff-a6d2-523e0f0dd342:image.png)

![image.png](attachment:38e01cf1-5255-424a-918f-96cb9c8cf88e:image.png)

![image.png](attachment:60b03028-952d-4b88-887d-167ee64e1d58:image.png)

### loan application (personal loan)

![image.png](attachment:b1165e2f-102e-4f91-b695-0136cf233df5:image.png)

![image.png](attachment:203323c9-7d15-400d-bf2b-b79445556848:image.png)

![image.png](attachment:9f9b8051-faf7-428e-b110-035c6f5bc282:image.png)

![image.png](attachment:ae6818fb-8cbf-41fe-bde8-5ac487fb7d17:image.png)

![image.png](attachment:e240ea6d-5e9f-49d7-bd92-a7c22a47a898:image.png)

![image.png](attachment:988f7f04-1efc-4109-8412-f8a80ef1af54:image.png)

### loan application (Mortgage)

![image.png](attachment:f04b7526-03ce-4248-a6ab-52a820164928:image.png)

![image.png](attachment:899c1a31-5668-488a-a176-83bcb37fc0fe:image.png)

![image.png](attachment:952b40e8-1857-48c8-a7c1-43cc4fac6361:image.png)

![image.png](attachment:13d18337-74eb-4ae9-936c-4d9feaa614c5:image.png)