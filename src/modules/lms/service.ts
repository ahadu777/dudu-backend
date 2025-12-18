/**
 * LMS Service
 * Handles borrower registration, KYC/AML verification, and loan operations
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import {
  Borrower,
  CreateBorrowerRequest,
  BorrowerStatus,
  KYCStatus,
  AMLStatus,
  KYCRequest,
  KYCResult,
  AMLRequest,
  AMLResult,
  CreditPullRequest,
  CreditReport,
  LoanApplication,
  CreateApplicationRequest,
  ApplicationStatus,
  LoanDecision,
  DecisionOutcome,
  RiskTier,
  DeclineReason,
  LoanOffer,
  OfferStatus,
  AuditEntry
} from './types';
import { MockKYCProvider, MockAMLProvider, MockCreditBureauProvider } from './mock-providers';
import { logger } from '../../utils/logger';

/**
 * LMS In-Memory Store
 */
class LMSStore {
  private borrowers: Map<string, Borrower> = new Map();
  private borrowersByEmail: Map<string, string> = new Map(); // email -> borrower_id
  private kycResults: Map<string, KYCResult[]> = new Map(); // borrower_id -> results
  private amlResults: Map<string, AMLResult[]> = new Map(); // borrower_id -> results
  private creditReports: Map<string, CreditReport[]> = new Map(); // borrower_id -> reports
  private applications: Map<string, LoanApplication> = new Map();
  private applicationsByBorrower: Map<string, string[]> = new Map(); // borrower_id -> app_ids
  private decisions: Map<string, LoanDecision> = new Map(); // application_id -> decision
  private offers: Map<string, LoanOffer[]> = new Map(); // application_id -> offers
  private auditLog: AuditEntry[] = [];
  private idempotencyKeys: Map<string, { result: unknown; timestamp: number }> = new Map();

  // Borrower operations
  createBorrower(borrower: Borrower): Borrower {
    this.borrowers.set(borrower.id, borrower);
    this.borrowersByEmail.set(borrower.email.toLowerCase(), borrower.id);
    return borrower;
  }

  getBorrower(id: string): Borrower | undefined {
    return this.borrowers.get(id);
  }

  getBorrowerByEmail(email: string): Borrower | undefined {
    const id = this.borrowersByEmail.get(email.toLowerCase());
    return id ? this.borrowers.get(id) : undefined;
  }

  updateBorrower(id: string, updates: Partial<Borrower>): Borrower | undefined {
    const borrower = this.borrowers.get(id);
    if (!borrower) return undefined;

    const updated = { ...borrower, ...updates, updated_at: new Date().toISOString() };
    this.borrowers.set(id, updated);
    return updated;
  }

  listBorrowers(): Borrower[] {
    return Array.from(this.borrowers.values());
  }

  // KYC operations
  addKYCResult(borrowerId: string, result: KYCResult): void {
    const results = this.kycResults.get(borrowerId) || [];
    results.push(result);
    this.kycResults.set(borrowerId, results);
  }

  getKYCResults(borrowerId: string): KYCResult[] {
    return this.kycResults.get(borrowerId) || [];
  }

  getLatestKYCResult(borrowerId: string): KYCResult | undefined {
    const results = this.kycResults.get(borrowerId) || [];
    return results[results.length - 1];
  }

  // AML operations
  addAMLResult(borrowerId: string, result: AMLResult): void {
    const results = this.amlResults.get(borrowerId) || [];
    results.push(result);
    this.amlResults.set(borrowerId, results);
  }

  getAMLResults(borrowerId: string): AMLResult[] {
    return this.amlResults.get(borrowerId) || [];
  }

  getLatestAMLResult(borrowerId: string): AMLResult | undefined {
    const results = this.amlResults.get(borrowerId) || [];
    return results[results.length - 1];
  }

  // Credit operations
  addCreditReport(borrowerId: string, report: CreditReport): void {
    const reports = this.creditReports.get(borrowerId) || [];
    reports.push(report);
    this.creditReports.set(borrowerId, reports);
  }

  getCreditReports(borrowerId: string): CreditReport[] {
    return this.creditReports.get(borrowerId) || [];
  }

  getLatestCreditReport(borrowerId: string): CreditReport | undefined {
    const reports = this.creditReports.get(borrowerId) || [];
    return reports[reports.length - 1];
  }

  // Application operations
  createApplication(app: LoanApplication): LoanApplication {
    this.applications.set(app.id, app);
    const apps = this.applicationsByBorrower.get(app.borrower_id) || [];
    apps.push(app.id);
    this.applicationsByBorrower.set(app.borrower_id, apps);
    return app;
  }

  getApplication(id: string): LoanApplication | undefined {
    return this.applications.get(id);
  }

  updateApplication(id: string, updates: Partial<LoanApplication>): LoanApplication | undefined {
    const app = this.applications.get(id);
    if (!app) return undefined;

    const updated = { ...app, ...updates, updated_at: new Date().toISOString() };
    this.applications.set(id, updated);
    return updated;
  }

  getApplicationsByBorrower(borrowerId: string): LoanApplication[] {
    const ids = this.applicationsByBorrower.get(borrowerId) || [];
    return ids.map(id => this.applications.get(id)).filter(Boolean) as LoanApplication[];
  }

  // Decision operations
  setDecision(applicationId: string, decision: LoanDecision): void {
    this.decisions.set(applicationId, decision);
  }

  getDecision(applicationId: string): LoanDecision | undefined {
    return this.decisions.get(applicationId);
  }

  // Offer operations
  addOffer(applicationId: string, offer: LoanOffer): void {
    const offers = this.offers.get(applicationId) || [];
    offers.push(offer);
    this.offers.set(applicationId, offers);
  }

  getOffers(applicationId: string): LoanOffer[] {
    return this.offers.get(applicationId) || [];
  }

  updateOffer(offerId: string, updates: Partial<LoanOffer>): LoanOffer | undefined {
    for (const offers of this.offers.values()) {
      const offer = offers.find(o => o.id === offerId);
      if (offer) {
        Object.assign(offer, updates);
        return offer;
      }
    }
    return undefined;
  }

  // Audit operations
  addAuditEntry(entry: AuditEntry): void {
    this.auditLog.push(entry);
  }

  getAuditLog(filters?: { entity_type?: string; entity_id?: string }): AuditEntry[] {
    let entries = [...this.auditLog];
    if (filters?.entity_type) {
      entries = entries.filter(e => e.entity_type === filters.entity_type);
    }
    if (filters?.entity_id) {
      entries = entries.filter(e => e.entity_id === filters.entity_id);
    }
    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Idempotency
  checkIdempotency<T>(key: string): T | undefined {
    const cached = this.idempotencyKeys.get(key);
    if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour TTL
      return cached.result as T;
    }
    return undefined;
  }

  setIdempotency<T>(key: string, result: T): void {
    this.idempotencyKeys.set(key, { result, timestamp: Date.now() });
  }

  // Reset for testing
  reset(): void {
    this.borrowers.clear();
    this.borrowersByEmail.clear();
    this.kycResults.clear();
    this.amlResults.clear();
    this.creditReports.clear();
    this.applications.clear();
    this.applicationsByBorrower.clear();
    this.decisions.clear();
    this.offers.clear();
    this.auditLog = [];
    this.idempotencyKeys.clear();
  }

  getStats(): object {
    return {
      borrowers: this.borrowers.size,
      applications: this.applications.size,
      kycResults: Array.from(this.kycResults.values()).flat().length,
      amlResults: Array.from(this.amlResults.values()).flat().length,
      creditReports: Array.from(this.creditReports.values()).flat().length,
      auditEntries: this.auditLog.length
    };
  }
}

// Singleton store
const store = new LMSStore();

/**
 * LMS Service
 */
export class LMSService {
  /**
   * Register a new borrower
   */
  async createBorrower(request: CreateBorrowerRequest, idempotencyKey?: string): Promise<Borrower> {
    // Check idempotency
    if (idempotencyKey) {
      const cached = store.checkIdempotency<Borrower>(idempotencyKey);
      if (cached) {
        logger.info('lms.borrower.create.idempotent', { email: request.email, key: idempotencyKey });
        return cached;
      }
    }

    // Check for existing borrower
    const existing = store.getBorrowerByEmail(request.email);
    if (existing) {
      throw new Error('Borrower with this email already exists');
    }

    const borrowerId = uuidv4();
    const now = new Date().toISOString();

    // Hash SSN for secure storage
    const ssnHash = crypto.createHash('sha256').update(request.ssn).digest('hex');

    const borrower: Borrower = {
      id: borrowerId,
      first_name: request.first_name,
      last_name: request.last_name,
      email: request.email,
      phone: request.phone,
      ssn_last_four: request.ssn.slice(-4),
      ssn_hash: ssnHash,
      date_of_birth: request.date_of_birth,
      address: request.address,
      status: 'pending',
      kyc_status: 'pending',
      aml_status: 'pending',
      created_at: now,
      updated_at: now
    };

    store.createBorrower(borrower);

    // Audit log
    this.audit('borrower', borrowerId, 'created', 'system', { email: request.email });

    // Cache for idempotency
    if (idempotencyKey) {
      store.setIdempotency(idempotencyKey, borrower);
    }

    logger.info('lms.borrower.created', { borrower_id: borrowerId, email: request.email });

    return borrower;
  }

  /**
   * Get borrower by ID
   */
  getBorrower(id: string): Borrower | undefined {
    return store.getBorrower(id);
  }

  /**
   * List all borrowers
   */
  listBorrowers(): Borrower[] {
    return store.listBorrowers();
  }

  /**
   * Run KYC verification for a borrower
   */
  async verifyKYC(borrowerId: string, ssn: string): Promise<KYCResult> {
    const borrower = store.getBorrower(borrowerId);
    if (!borrower) {
      throw new Error('Borrower not found');
    }

    const request: KYCRequest = {
      borrower_id: borrowerId,
      ssn,
      first_name: borrower.first_name,
      last_name: borrower.last_name,
      date_of_birth: borrower.date_of_birth,
      address: borrower.address
    };

    const result = await MockKYCProvider.verify(request);

    // Store result
    store.addKYCResult(borrowerId, result);

    // Update borrower status
    store.updateBorrower(borrowerId, { kyc_status: result.status });

    // Audit log
    this.audit('borrower', borrowerId, 'kyc_verified', 'system', {
      request_id: result.request_id,
      status: result.status
    });

    return result;
  }

  /**
   * Get KYC status for a borrower
   */
  getKYCStatus(borrowerId: string): KYCResult | undefined {
    return store.getLatestKYCResult(borrowerId);
  }

  /**
   * Run AML screening for a borrower
   */
  async screenAML(borrowerId: string): Promise<AMLResult> {
    const borrower = store.getBorrower(borrowerId);
    if (!borrower) {
      throw new Error('Borrower not found');
    }

    const request: AMLRequest = {
      borrower_id: borrowerId,
      first_name: borrower.first_name,
      last_name: borrower.last_name,
      date_of_birth: borrower.date_of_birth,
      country: borrower.address.country
    };

    const result = await MockAMLProvider.screen(request);

    // Store result
    store.addAMLResult(borrowerId, result);

    // Update borrower status
    store.updateBorrower(borrowerId, { aml_status: result.status });

    // If borrower is blocked, suspend them
    if (result.status === 'blocked') {
      store.updateBorrower(borrowerId, { status: 'suspended' });
    }

    // Audit log
    this.audit('borrower', borrowerId, 'aml_screened', 'system', {
      request_id: result.request_id,
      status: result.status,
      risk_score: result.risk_score
    });

    return result;
  }

  /**
   * Get AML status for a borrower
   */
  getAMLStatus(borrowerId: string): AMLResult | undefined {
    return store.getLatestAMLResult(borrowerId);
  }

  /**
   * Pull credit report for a borrower
   */
  async pullCredit(borrowerId: string, ssn: string, pullType: 'soft' | 'hard' = 'soft'): Promise<CreditReport> {
    const borrower = store.getBorrower(borrowerId);
    if (!borrower) {
      throw new Error('Borrower not found');
    }

    const request: CreditPullRequest = {
      borrower_id: borrowerId,
      ssn,
      first_name: borrower.first_name,
      last_name: borrower.last_name,
      address: borrower.address,
      pull_type: pullType
    };

    const report = await MockCreditBureauProvider.pullCredit(request);

    // Store report
    store.addCreditReport(borrowerId, report);

    // Audit log
    this.audit('borrower', borrowerId, 'credit_pulled', 'system', {
      request_id: report.request_id,
      pull_type: pullType,
      score: report.credit_score
    });

    return report;
  }

  /**
   * Get latest credit report for a borrower
   */
  getCreditReport(borrowerId: string): CreditReport | undefined {
    return store.getLatestCreditReport(borrowerId);
  }

  /**
   * Create a loan application
   */
  async createApplication(request: CreateApplicationRequest): Promise<LoanApplication> {
    const borrower = store.getBorrower(request.borrower_id);
    if (!borrower) {
      throw new Error('Borrower not found');
    }

    // Check if borrower is eligible
    if (borrower.kyc_status !== 'verified') {
      throw new Error('KYC verification required');
    }
    if (borrower.aml_status !== 'clear') {
      throw new Error('AML screening must be clear');
    }

    const appId = uuidv4();
    const now = new Date().toISOString();

    const application: LoanApplication = {
      id: appId,
      borrower_id: request.borrower_id,
      loan_type: request.loan_type,
      requested_amount: request.requested_amount,
      requested_term_months: request.requested_term_months,
      purpose: request.purpose,
      employment_status: request.employment_status,
      annual_income: request.annual_income,
      monthly_housing_payment: request.monthly_housing_payment,
      status: 'submitted',
      created_at: now,
      updated_at: now
    };

    store.createApplication(application);

    // Audit log
    this.audit('application', appId, 'created', 'system', {
      borrower_id: request.borrower_id,
      amount: request.requested_amount
    });

    logger.info('lms.application.created', { application_id: appId, borrower_id: request.borrower_id });

    return application;
  }

  /**
   * Get a loan application
   */
  getApplication(id: string): LoanApplication | undefined {
    return store.getApplication(id);
  }

  /**
   * Run automated credit decision
   */
  async runDecision(applicationId: string): Promise<LoanDecision> {
    const application = store.getApplication(applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    const borrower = store.getBorrower(application.borrower_id);
    if (!borrower) {
      throw new Error('Borrower not found');
    }

    // Get credit report
    const creditReport = store.getLatestCreditReport(application.borrower_id);
    if (!creditReport) {
      throw new Error('Credit report required');
    }

    // Calculate DTI
    const monthlyIncome = application.annual_income / 12;
    const estimatedPayment = this.estimateMonthlyPayment(
      application.requested_amount,
      0.15, // Assume 15% rate for estimation
      application.requested_term_months
    );
    const dtiRatio = ((application.monthly_housing_payment + estimatedPayment) / monthlyIncome) * 100;

    // Determine risk tier
    const riskTier = this.determineRiskTier(creditReport.credit_score);

    // Make decision
    const { decision, declineReasons, conditions, approvedAmount, approvedRate, approvedTerm } =
      this.calculateDecision(creditReport, dtiRatio, riskTier, application);

    const decisionId = uuidv4();
    const now = new Date().toISOString();

    const loanDecision: LoanDecision = {
      decision_id: decisionId,
      application_id: applicationId,
      decision,
      decided_at: now,
      decided_by: 'system',
      credit_score: creditReport.credit_score,
      dti_ratio: Math.round(dtiRatio * 100) / 100,
      risk_tier: riskTier,
      approved_amount: approvedAmount,
      approved_rate: approvedRate,
      approved_term: approvedTerm,
      decline_reasons: declineReasons,
      conditions,
      adverse_action_required: decision === 'declined'
    };

    // Store decision
    store.setDecision(applicationId, loanDecision);

    // Update application
    const newStatus: ApplicationStatus = decision === 'approved' || decision === 'counter_offer'
      ? 'approved'
      : decision === 'declined'
        ? 'declined'
        : 'under_review';

    store.updateApplication(applicationId, {
      status: newStatus,
      credit_report_id: creditReport.request_id,
      decision: loanDecision
    });

    // Generate offer if approved
    if (decision === 'approved' || decision === 'counter_offer') {
      await this.generateOffer(applicationId, loanDecision);
    }

    // Audit log
    this.audit('application', applicationId, 'decision_made', 'system', {
      decision,
      credit_score: creditReport.credit_score,
      dti: dtiRatio
    });

    logger.info('lms.decision.made', {
      application_id: applicationId,
      decision,
      score: creditReport.credit_score,
      dti: dtiRatio
    });

    return loanDecision;
  }

  /**
   * Generate loan offer
   */
  private async generateOffer(applicationId: string, decision: LoanDecision): Promise<LoanOffer> {
    const application = store.getApplication(applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    const offerId = uuidv4();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    const principal = decision.approved_amount || application.requested_amount;
    const rate = decision.approved_rate || 0.12;
    const term = decision.approved_term || application.requested_term_months;

    const monthlyPayment = this.estimateMonthlyPayment(principal, rate, term);
    const totalPayments = monthlyPayment * term;
    const totalInterest = totalPayments - principal;
    const originationFee = Math.round(principal * 0.02); // 2% origination fee

    const offer: LoanOffer = {
      id: offerId,
      application_id: applicationId,
      borrower_id: application.borrower_id,
      principal_amount: principal,
      interest_rate: rate,
      term_months: term,
      monthly_payment: monthlyPayment,
      apr: rate + 0.005, // Simplified APR calculation
      total_interest: totalInterest,
      total_payments: totalPayments,
      origination_fee: originationFee,
      status: 'pending',
      expires_at: expiresAt,
      created_at: now
    };

    store.addOffer(applicationId, offer);

    this.audit('offer', offerId, 'generated', 'system', {
      application_id: applicationId,
      amount: principal,
      rate,
      term
    });

    return offer;
  }

  /**
   * Get offers for an application
   */
  getOffers(applicationId: string): LoanOffer[] {
    return store.getOffers(applicationId);
  }

  /**
   * Accept an offer
   */
  async acceptOffer(offerId: string): Promise<LoanOffer> {
    const offer = store.updateOffer(offerId, {
      status: 'accepted',
      accepted_at: new Date().toISOString()
    });

    if (!offer) {
      throw new Error('Offer not found');
    }

    // Update application status
    store.updateApplication(offer.application_id, { status: 'funded' });

    this.audit('offer', offerId, 'accepted', 'user', {
      application_id: offer.application_id
    });

    return offer;
  }

  /**
   * Get audit log
   */
  getAuditLog(filters?: { entity_type?: string; entity_id?: string }): AuditEntry[] {
    return store.getAuditLog(filters);
  }

  /**
   * Get store stats (for testing)
   */
  getStats(): object {
    return store.getStats();
  }

  /**
   * Reset store (for testing)
   */
  reset(): void {
    store.reset();
    logger.info('lms.store.reset');
  }

  // Private helpers

  private estimateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
    const monthlyRate = annualRate / 12;
    if (monthlyRate === 0) return principal / termMonths;

    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);

    return Math.round(payment * 100) / 100;
  }

  private determineRiskTier(score: number): RiskTier {
    if (score >= 750) return 'super_prime';
    if (score >= 700) return 'prime';
    if (score >= 650) return 'near_prime';
    if (score >= 580) return 'subprime';
    return 'deep_subprime';
  }

  private calculateDecision(
    creditReport: CreditReport,
    dtiRatio: number,
    riskTier: RiskTier,
    application: LoanApplication
  ): {
    decision: DecisionOutcome;
    declineReasons?: DeclineReason[];
    conditions?: string[];
    approvedAmount?: number;
    approvedRate?: number;
    approvedTerm?: number;
  } {
    const declineReasons: DeclineReason[] = [];

    // Auto-decline rules
    if (creditReport.credit_score < 580) {
      declineReasons.push({
        code: 'SCORE_TOO_LOW',
        description: 'Credit score below minimum threshold',
        fcra_code: 'F01'
      });
    }

    if (dtiRatio > 50) {
      declineReasons.push({
        code: 'DTI_TOO_HIGH',
        description: 'Debt-to-income ratio exceeds maximum',
        fcra_code: 'F02'
      });
    }

    if (creditReport.summary.derogatory_count > 3) {
      declineReasons.push({
        code: 'DEROGATORY_ITEMS',
        description: 'Too many derogatory items on credit report',
        fcra_code: 'F03'
      });
    }

    if (creditReport.summary.public_record_count > 0) {
      declineReasons.push({
        code: 'PUBLIC_RECORDS',
        description: 'Public records present',
        fcra_code: 'F04'
      });
    }

    // If any decline reasons, return declined
    if (declineReasons.length > 0) {
      return { decision: 'declined', declineReasons };
    }

    // Manual review triggers
    if (riskTier === 'subprime' || dtiRatio > 43) {
      return {
        decision: 'manual_review',
        conditions: ['Manual underwriter review required', 'Additional documentation may be requested']
      };
    }

    // Determine approved terms based on risk tier
    const rateTable: Record<RiskTier, number> = {
      'super_prime': 0.0799,
      'prime': 0.1199,
      'near_prime': 0.1599,
      'subprime': 0.2199,
      'deep_subprime': 0.2999
    };

    const rate = rateTable[riskTier];
    let approvedAmount = application.requested_amount;

    // Counter offer if amount too high for risk tier
    if (riskTier === 'near_prime' && application.requested_amount > 25000) {
      approvedAmount = 25000;
      return {
        decision: 'counter_offer',
        approvedAmount,
        approvedRate: rate,
        approvedTerm: application.requested_term_months,
        conditions: ['Maximum loan amount for credit tier reached']
      };
    }

    return {
      decision: 'approved',
      approvedAmount,
      approvedRate: rate,
      approvedTerm: application.requested_term_months
    };
  }

  private audit(
    entityType: string,
    entityId: string,
    action: string,
    actorType: 'system' | 'user' | 'admin',
    details: Record<string, unknown>
  ): void {
    const entry: AuditEntry = {
      id: uuidv4(),
      entity_type: entityType,
      entity_id: entityId,
      action,
      actor_id: actorType === 'system' ? 'SYSTEM' : 'USER',
      actor_type: actorType,
      details,
      timestamp: new Date().toISOString()
    };

    store.addAuditEntry(entry);
  }
}

// Export singleton
export const lmsService = new LMSService();



