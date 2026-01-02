/**
 * LMS Mock Providers
 * Deterministic mock implementations for KYC, AML, and Credit Bureau
 * 
 * Mock Behavior Rules (for testing):
 * 
 * KYC Provider:
 * - SSN ending in "0000" → FAILED (identity not verified)
 * - SSN ending in "1111" → MANUAL_REVIEW (partial match)
 * - SSN ending in "9999" → EXPIRED (verification expired)
 * - All other SSNs → VERIFIED
 * 
 * AML Provider:
 * - Name containing "BLOCKED" → BLOCKED
 * - Name containing "PEP" → WATCHLIST_MATCH (Politically Exposed Person)
 * - Name containing "SANCTIONS" → WATCHLIST_MATCH
 * - All other names → CLEAR
 * 
 * Credit Bureau Provider:
 * - SSN last 4 digits determine score tier:
 *   - 8000-9999 → Super Prime (750-850)
 *   - 6000-7999 → Prime (700-749)
 *   - 4000-5999 → Near Prime (650-699)
 *   - 2000-3999 → Subprime (580-649)
 *   - 0000-1999 → Deep Subprime (300-579)
 */

import { v4 as uuidv4 } from 'uuid';
import {
  KYCRequest,
  KYCResult,
  KYCStatus,
  AMLRequest,
  AMLResult,
  AMLStatus,
  WatchlistHit,
  CreditPullRequest,
  CreditReport,
  ScoreFactor,
  Tradeline,
  CreditInquiry,
  CreditSummary
} from './types';
import { logger } from '../../utils/logger';

/**
 * Mock KYC Provider
 */
export class MockKYCProvider {
  private static readonly PROVIDER_NAME = 'mock-kyc-provider';

  static async verify(request: KYCRequest): Promise<KYCResult> {
    const requestId = uuidv4();
    const ssnLastFour = request.ssn.slice(-4);

    logger.info('lms.kyc.verify.start', {
      request_id: requestId,
      borrower_id: request.borrower_id,
      ssn_last_four: ssnLastFour
    });

    // Simulate processing delay
    await this.simulateDelay(100, 300);

    let status: KYCStatus;
    let identityScore: number;
    let failureReasons: string[] = [];
    let manualReviewReasons: string[] = [];

    // Deterministic behavior based on SSN
    if (ssnLastFour === '0000') {
      status = 'failed';
      identityScore = 15;
      failureReasons = ['SSN does not match identity records', 'Unable to verify identity'];
    } else if (ssnLastFour === '1111') {
      status = 'manual_review';
      identityScore = 65;
      manualReviewReasons = ['Partial SSN match', 'Address discrepancy detected'];
    } else if (ssnLastFour === '9999') {
      status = 'expired';
      identityScore = 0;
      failureReasons = ['Previous verification expired'];
    } else {
      status = 'verified';
      identityScore = 95;
    }

    const result: KYCResult = {
      request_id: requestId,
      borrower_id: request.borrower_id,
      status,
      verified_at: status === 'verified' ? new Date().toISOString() : undefined,
      provider: this.PROVIDER_NAME,
      identity_match_score: identityScore,
      address_match: status === 'verified' || status === 'manual_review',
      ssn_match: status === 'verified',
      dob_match: status === 'verified' || status === 'manual_review',
      failure_reasons: failureReasons.length > 0 ? failureReasons : undefined,
      manual_review_reasons: manualReviewReasons.length > 0 ? manualReviewReasons : undefined,
      expires_at: status === 'verified' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : undefined
    };

    logger.info('lms.kyc.verify.complete', {
      request_id: requestId,
      borrower_id: request.borrower_id,
      status,
      identity_score: identityScore
    });

    return result;
  }

  private static simulateDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

/**
 * Mock AML Provider
 */
export class MockAMLProvider {
  private static readonly PROVIDER_NAME = 'mock-aml-provider';

  static async screen(request: AMLRequest): Promise<AMLResult> {
    const requestId = uuidv4();
    const fullName = `${request.first_name} ${request.last_name}`.toUpperCase();

    logger.info('lms.aml.screen.start', {
      request_id: requestId,
      borrower_id: request.borrower_id,
      name: fullName
    });

    await this.simulateDelay(100, 300);

    let status: AMLStatus;
    let riskScore: number;
    const watchlistHits: WatchlistHit[] = [];
    let pepCheck = false;
    let sanctionsCheck = false;

    // Deterministic behavior based on name
    if (fullName.includes('BLOCKED')) {
      status = 'blocked';
      riskScore = 100;
      watchlistHits.push({
        list_name: 'OFAC SDN List',
        match_score: 99,
        matched_name: fullName,
        reason: 'Direct match on sanctions list'
      });
      sanctionsCheck = true;
    } else if (fullName.includes('PEP')) {
      status = 'watchlist_match';
      riskScore = 75;
      watchlistHits.push({
        list_name: 'PEP Database',
        match_score: 85,
        matched_name: fullName,
        reason: 'Politically Exposed Person identified'
      });
      pepCheck = true;
    } else if (fullName.includes('SANCTIONS')) {
      status = 'watchlist_match';
      riskScore = 90;
      watchlistHits.push({
        list_name: 'UN Sanctions List',
        match_score: 88,
        matched_name: fullName,
        reason: 'Potential sanctions list match'
      });
      sanctionsCheck = true;
    } else if (fullName.includes('REVIEW')) {
      status = 'manual_review';
      riskScore = 50;
      watchlistHits.push({
        list_name: 'Adverse Media',
        match_score: 60,
        matched_name: fullName,
        reason: 'Potential adverse media mention'
      });
    } else {
      status = 'clear';
      riskScore = 5;
    }

    const result: AMLResult = {
      request_id: requestId,
      borrower_id: request.borrower_id,
      status,
      screened_at: new Date().toISOString(),
      provider: this.PROVIDER_NAME,
      watchlist_hits: watchlistHits,
      risk_score: riskScore,
      pep_check: pepCheck,
      sanctions_check: sanctionsCheck,
      adverse_media_check: fullName.includes('REVIEW')
    };

    logger.info('lms.aml.screen.complete', {
      request_id: requestId,
      borrower_id: request.borrower_id,
      status,
      risk_score: riskScore,
      hits_count: watchlistHits.length
    });

    return result;
  }

  private static simulateDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}

/**
 * Mock Credit Bureau Provider
 */
export class MockCreditBureauProvider {
  private static readonly PROVIDER_NAME = 'mock-credit-bureau';

  static async pullCredit(request: CreditPullRequest): Promise<CreditReport> {
    const requestId = uuidv4();
    const ssnLastFour = parseInt(request.ssn.slice(-4), 10);

    logger.info('lms.credit.pull.start', {
      request_id: requestId,
      borrower_id: request.borrower_id,
      pull_type: request.pull_type,
      ssn_last_four: ssnLastFour
    });

    await this.simulateDelay(200, 500);

    // Determine credit score based on SSN last 4 digits
    const { score, tier, factors } = this.calculateScoreFromSSN(ssnLastFour);

    // Generate mock tradelines based on score tier
    const tradelines = this.generateTradelines(tier);
    const inquiries = this.generateInquiries(tier);
    const summary = this.calculateSummary(tradelines, score);

    const report: CreditReport = {
      request_id: requestId,
      borrower_id: request.borrower_id,
      pulled_at: new Date().toISOString(),
      provider: this.PROVIDER_NAME,
      pull_type: request.pull_type,
      credit_score: score,
      score_model: 'FICO Score 8',
      score_factors: factors,
      tradelines,
      inquiries,
      public_records: tier === 'deep_subprime' ? [
        { type: 'Bankruptcy', date: '2022-01-15', status: 'Discharged' }
      ] : [],
      summary
    };

    logger.info('lms.credit.pull.complete', {
      request_id: requestId,
      borrower_id: request.borrower_id,
      score,
      tier,
      tradelines_count: tradelines.length
    });

    return report;
  }

  private static calculateScoreFromSSN(ssnLastFour: number): {
    score: number;
    tier: string;
    factors: ScoreFactor[];
  } {
    let score: number;
    let tier: string;
    let factors: ScoreFactor[];

    if (ssnLastFour >= 8000) {
      // Super Prime: 750-850
      score = 750 + Math.floor((ssnLastFour - 8000) / 20);
      tier = 'super_prime';
      factors = [
        { code: 'PAY01', description: 'Excellent payment history', impact: 'positive' },
        { code: 'UTL01', description: 'Low credit utilization', impact: 'positive' },
        { code: 'AGE01', description: 'Long credit history', impact: 'positive' }
      ];
    } else if (ssnLastFour >= 6000) {
      // Prime: 700-749
      score = 700 + Math.floor((ssnLastFour - 6000) / 40);
      tier = 'prime';
      factors = [
        { code: 'PAY01', description: 'Good payment history', impact: 'positive' },
        { code: 'UTL02', description: 'Moderate credit utilization', impact: 'neutral' },
        { code: 'INQ01', description: 'Recent credit inquiries', impact: 'negative' }
      ];
    } else if (ssnLastFour >= 4000) {
      // Near Prime: 650-699
      score = 650 + Math.floor((ssnLastFour - 4000) / 40);
      tier = 'near_prime';
      factors = [
        { code: 'PAY02', description: 'Some late payments', impact: 'negative' },
        { code: 'UTL03', description: 'High credit utilization', impact: 'negative' },
        { code: 'AGE02', description: 'Limited credit history', impact: 'neutral' }
      ];
    } else if (ssnLastFour >= 2000) {
      // Subprime: 580-649
      score = 580 + Math.floor((ssnLastFour - 2000) / 30);
      tier = 'subprime';
      factors = [
        { code: 'PAY03', description: 'Multiple late payments', impact: 'negative' },
        { code: 'COL01', description: 'Collection accounts present', impact: 'negative' },
        { code: 'UTL04', description: 'Very high utilization', impact: 'negative' }
      ];
    } else {
      // Deep Subprime: 300-579
      score = 300 + Math.floor(ssnLastFour / 7);
      tier = 'deep_subprime';
      factors = [
        { code: 'PAY04', description: 'Serious delinquencies', impact: 'negative' },
        { code: 'COL02', description: 'Multiple collections', impact: 'negative' },
        { code: 'BKR01', description: 'Bankruptcy on file', impact: 'negative' },
        { code: 'UTL05', description: 'Maxed out accounts', impact: 'negative' }
      ];
    }

    return { score: Math.min(850, Math.max(300, score)), tier, factors };
  }

  private static generateTradelines(tier: string): Tradeline[] {
    const baseTradelines: Tradeline[] = [
      {
        creditor: 'Chase Bank',
        account_type: 'Credit Card',
        balance: tier === 'super_prime' ? 500 : tier === 'prime' ? 2500 : 8000,
        credit_limit: 10000,
        payment_status: tier === 'super_prime' || tier === 'prime' ? 'Current' : 'Past Due 30',
        opened_date: '2020-03-15',
        months_reviewed: 48
      },
      {
        creditor: 'Capital One',
        account_type: 'Auto Loan',
        balance: 15000,
        payment_status: tier === 'deep_subprime' ? 'Past Due 90' : 'Current',
        opened_date: '2022-01-10',
        months_reviewed: 24
      }
    ];

    if (tier === 'subprime' || tier === 'deep_subprime') {
      baseTradelines.push({
        creditor: 'Collection Agency',
        account_type: 'Collection',
        balance: 2500,
        payment_status: 'Collection',
        opened_date: '2023-06-01',
        months_reviewed: 12
      });
    }

    return baseTradelines;
  }

  private static generateInquiries(tier: string): CreditInquiry[] {
    const count = tier === 'super_prime' ? 1 : tier === 'prime' ? 2 : 5;
    const inquiries: CreditInquiry[] = [];

    for (let i = 0; i < count; i++) {
      inquiries.push({
        creditor: ['Chase', 'Citi', 'Wells Fargo', 'Discover', 'Amex'][i % 5],
        date: new Date(Date.now() - (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        type: 'hard'
      });
    }

    return inquiries;
  }

  private static calculateSummary(tradelines: Tradeline[], score: number): CreditSummary {
    const totalBalance = tradelines.reduce((sum, t) => sum + t.balance, 0);
    const totalLimit = tradelines.reduce((sum, t) => sum + (t.credit_limit || 0), 0);
    const collections = tradelines.filter(t => t.account_type === 'Collection').length;

    return {
      total_accounts: tradelines.length,
      open_accounts: tradelines.length - collections,
      total_balance: totalBalance,
      total_credit_limit: totalLimit,
      utilization_ratio: totalLimit > 0 ? Math.round((totalBalance / totalLimit) * 100) : 0,
      derogatory_count: score < 650 ? 2 : score < 700 ? 1 : 0,
      collections_count: collections,
      public_record_count: score < 580 ? 1 : 0,
      oldest_account_months: 48
    };
  }

  private static simulateDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
}



