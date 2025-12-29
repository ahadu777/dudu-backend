/**
 * LMS (Loan Management System) Types
 * Enterprise-grade loan lifecycle management
 */

// ============ Borrower Types ============

export interface BorrowerAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface Borrower {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  ssn_last_four: string;  // Only store last 4 for display
  ssn_hash: string;       // Hashed SSN for verification
  date_of_birth: string;  // ISO date
  address: BorrowerAddress;
  status: BorrowerStatus;
  kyc_status: KYCStatus;
  aml_status: AMLStatus;
  created_at: string;
  updated_at: string;
}

export type BorrowerStatus = 'pending' | 'active' | 'suspended' | 'closed';
export type KYCStatus = 'pending' | 'verified' | 'failed' | 'manual_review' | 'expired';
export type AMLStatus = 'pending' | 'clear' | 'watchlist_match' | 'blocked' | 'manual_review';

export interface CreateBorrowerRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  ssn: string;  // Full SSN for registration (will be hashed)
  date_of_birth: string;
  address: BorrowerAddress;
}

export interface BorrowerResponse {
  success: boolean;
  data?: Borrower;
  error?: string;
}

// ============ KYC Types ============

export interface KYCRequest {
  borrower_id: string;
  ssn: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  address: BorrowerAddress;
}

export interface KYCResult {
  request_id: string;
  borrower_id: string;
  status: KYCStatus;
  verified_at?: string;
  provider: string;
  identity_match_score: number;  // 0-100
  address_match: boolean;
  ssn_match: boolean;
  dob_match: boolean;
  failure_reasons?: string[];
  manual_review_reasons?: string[];
  expires_at?: string;
}

// ============ AML Types ============

export interface AMLRequest {
  borrower_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  country: string;
}

export interface AMLResult {
  request_id: string;
  borrower_id: string;
  status: AMLStatus;
  screened_at: string;
  provider: string;
  watchlist_hits: WatchlistHit[];
  risk_score: number;  // 0-100, higher = more risk
  pep_check: boolean;  // Politically Exposed Person
  sanctions_check: boolean;
  adverse_media_check: boolean;
}

export interface WatchlistHit {
  list_name: string;
  match_score: number;
  matched_name: string;
  reason: string;
}

// ============ Credit Bureau Types ============

export interface CreditPullRequest {
  borrower_id: string;
  ssn: string;
  first_name: string;
  last_name: string;
  address: BorrowerAddress;
  pull_type: 'soft' | 'hard';
}

export interface CreditReport {
  request_id: string;
  borrower_id: string;
  pulled_at: string;
  provider: string;
  pull_type: 'soft' | 'hard';
  credit_score: number;
  score_model: string;
  score_factors: ScoreFactor[];
  tradelines: Tradeline[];
  inquiries: CreditInquiry[];
  public_records: PublicRecord[];
  summary: CreditSummary;
}

export interface ScoreFactor {
  code: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface Tradeline {
  creditor: string;
  account_type: string;
  balance: number;
  credit_limit?: number;
  payment_status: string;
  opened_date: string;
  months_reviewed: number;
}

export interface CreditInquiry {
  creditor: string;
  date: string;
  type: 'soft' | 'hard';
}

export interface PublicRecord {
  type: string;
  date: string;
  amount?: number;
  status: string;
}

export interface CreditSummary {
  total_accounts: number;
  open_accounts: number;
  total_balance: number;
  total_credit_limit: number;
  utilization_ratio: number;
  derogatory_count: number;
  collections_count: number;
  public_record_count: number;
  oldest_account_months: number;
}

// ============ Loan Application Types ============

export interface LoanApplication {
  id: string;
  borrower_id: string;
  loan_type: LoanType;
  requested_amount: number;
  requested_term_months: number;
  purpose: string;
  employment_status: EmploymentStatus;
  annual_income: number;
  monthly_housing_payment: number;
  status: ApplicationStatus;
  credit_report_id?: string;
  decision?: LoanDecision;
  created_at: string;
  updated_at: string;
}

export type LoanType = 'personal' | 'auto' | 'mortgage' | 'business' | 'student';
export type EmploymentStatus = 'employed' | 'self_employed' | 'retired' | 'unemployed' | 'student';
export type ApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'declined' | 'withdrawn' | 'funded';

export interface CreateApplicationRequest {
  borrower_id: string;
  loan_type: LoanType;
  requested_amount: number;
  requested_term_months: number;
  purpose: string;
  employment_status: EmploymentStatus;
  annual_income: number;
  monthly_housing_payment: number;
}

// ============ Decision Engine Types ============

export interface LoanDecision {
  decision_id: string;
  application_id: string;
  decision: DecisionOutcome;
  decided_at: string;
  decided_by: 'system' | 'manual';
  credit_score: number;
  dti_ratio: number;
  risk_tier: RiskTier;
  approved_amount?: number;
  approved_rate?: number;
  approved_term?: number;
  decline_reasons?: DeclineReason[];
  conditions?: string[];
  adverse_action_required: boolean;
  adverse_action_sent_at?: string;
}

export type DecisionOutcome = 'approved' | 'declined' | 'counter_offer' | 'manual_review';
export type RiskTier = 'super_prime' | 'prime' | 'near_prime' | 'subprime' | 'deep_subprime';

export interface DeclineReason {
  code: string;
  description: string;
  fcra_code?: string;
}

// ============ Loan Offer Types ============

export interface LoanOffer {
  id: string;
  application_id: string;
  borrower_id: string;
  principal_amount: number;
  interest_rate: number;
  term_months: number;
  monthly_payment: number;
  apr: number;
  total_interest: number;
  total_payments: number;
  origination_fee: number;
  status: OfferStatus;
  expires_at: string;
  created_at: string;
  accepted_at?: string;
}

export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'superseded';

// ============ Audit Types ============

export interface AuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string;
  actor_type: 'system' | 'user' | 'admin';
  details: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

// ============ API Response Types ============

export interface LMSApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  request_id: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}



