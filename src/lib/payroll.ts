// Payroll types — match backend API responses

export type SlipStatus =
  | "draft"
  | "computed"
  | "pending_l1"
  | "pending_l2"
  | "approved"
  | "paid"
  | "rejected"
  | "cancelled";

export type PeriodStatus =
  | "draft"
  | "computing"
  | "pending_l1"
  | "pending_l2"
  | "approved"
  | "paid"
  | "cancelled";

export interface PayrollPeriod {
  id: number;
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  pay_date: string;
  status: PeriodStatus;
  note?: string | null;
  slips_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CompensationProfile {
  id: number;
  name: string;
  description?: string | null;
  pay_frequency: "monthly" | "biweekly" | "weekly" | "daily";
  working_days_per_period: number;
  working_hours_per_day: number;
  ot_rate_normal: string;
  ot_rate_holiday: string;
  ot_rate_holiday_overtime: string;
  late_deduction_method: "none" | "per_minute" | "per_hour" | "per_incident" | "fixed";
  late_deduction_rate: string;
  late_grace_minutes: number;
  absent_deduction_method: "none" | "daily_wage" | "fixed";
  absent_deduction_amount: string;
  ssf_enabled: boolean;
  ssf_rate: string;
  ssf_min_base: string;
  ssf_max_base: string;
  is_default: boolean;
  is_active: boolean;
  rules?: ProfileRule[];
}

export interface ProfileRule {
  id?: number;
  name: string;
  trigger:
    | "absent_count"
    | "late_count"
    | "late_minutes_total"
    | "present_days"
    | "continuous_present_days"
    | "ot_hours_total";
  operator: "eq" | "lte" | "gte" | "lt" | "gt" | "between";
  threshold: number | string;
  threshold_max?: number | string | null;
  action: "add_bonus" | "add_deduction" | "add_allowance";
  amount_type?: "fixed" | "percent_of_base";
  amount: number | string;
  scope?: "this_period" | "year_to_date";
  taxable?: boolean;
  affects_ssf?: boolean;
  priority?: number;
  is_active?: boolean;
}

export interface CompensationComponent {
  id: number;
  code: string;
  name: string;
  kind: "allowance" | "deduction";
  default_amount: string;
  taxable: boolean;
  affects_ssf: boolean;
  is_active: boolean;
}

export interface TaxBracket {
  id: number;
  min_income: string;
  max_income: string | null;
  rate: string;
  order: number;
  effective_year: number | null;
  is_active: boolean;
}

export interface TaxProfile {
  id: number;
  name: string;
  description?: string | null;
  personal_allowance: string;
  spouse_allowance: string;
  children_count: number;
  child_allowance_each: string;
  parent_allowance: string;
  disabled_allowance: string;
  life_insurance: string;
  health_insurance: string;
  provident_fund: string;
  rmf_amount: string;
  ssf_amount: string;
  home_loan_interest: string;
  donation_amount: string;
  extra_deductions?: { name: string; amount: number }[] | null;
  expense_deduction_rate: string;
  expense_deduction_max: string;
  is_default: boolean;
  is_active: boolean;
}

export interface OtSession {
  id: number;
  ot_date: string;
  start_time?: string | null;
  end_time?: string | null;
  ot_type: "normal" | "holiday" | "holiday_overtime";
  rate_mode: "hourly_amount" | "multiplier";
  hourly_amount: string;
  multiplier: string;
  description?: string | null;
  status: "draft" | "open" | "closed";
  employees?: OtSessionEmployee[];
}

export interface OtSessionEmployee {
  id: number;
  ot_session_id: number;
  employee_id: number;
  hours: string;
  hourly_rate_snapshot: string;
  total_amount: string;
  payroll_slip_id?: number | null;
  note?: string | null;
  employee?: {
    id: number;
    employee_code: string;
    first_name: string;
    last_name: string;
  };
}

export interface PayrollSlipItem {
  id: number;
  payroll_slip_id: number;
  type: "earning" | "deduction" | "tax" | "ssf" | "info";
  source: string;
  code?: string | null;
  name: string;
  amount: string;
  quantity?: string | null;
  rate?: string | null;
  taxable: boolean;
  affects_ssf: boolean;
  formula?: string | null;
  order: number;
}

export interface PayrollSlip {
  id: number;
  slip_no: string;
  payroll_period_id: number;
  employee_id: number;
  base_salary: string;
  hourly_rate: string;
  daily_rate: string;
  working_days: number;
  present_days: number;
  absent_days: number;
  leave_days: number;
  late_count: number;
  late_minutes_total: number;
  ot_hours_total: string;
  base_pay: string;
  ot_pay: string;
  allowances_total: string;
  bonus_total: string;
  gross_pay: string;
  late_deduction: string;
  absent_deduction: string;
  other_deductions_total: string;
  ssf_employee: string;
  ssf_employer: string;
  tax: string;
  deductions_total: string;
  net_pay: string;
  status: SlipStatus;
  approved_l1_at?: string | null;
  approved_l2_at?: string | null;
  paid_at?: string | null;
  payment_reference?: string | null;
  note?: string | null;
  items?: PayrollSlipItem[];
  employee?: {
    id: number;
    employee_code: string;
    first_name: string;
    last_name: string;
  };
  period?: PayrollPeriod;
  approvals?: {
    id: number;
    action: string;
    from_status: string | null;
    to_status: string | null;
    note: string | null;
    created_at: string;
    user?: { id: number; name: string };
  }[];
  calculation_log?: Record<string, unknown> | null;
  tax_snapshot?: Record<string, unknown> | null;
}

export interface EmployeeCompensation {
  id: number;
  employee_id: number;
  compensation_profile_id: number;
  base_salary: string;
  hourly_rate_override?: string | null;
  effective_from: string;
  effective_to?: string | null;
  is_active: boolean;
  profile?: CompensationProfile;
}

export interface EmployeeComponent {
  id: number;
  employee_id: number;
  compensation_component_id: number;
  amount: string;
  start_date: string;
  end_date?: string | null;
  total_installments?: number | null;
  paid_installments: number;
  note?: string | null;
  is_active: boolean;
  component?: CompensationComponent;
}

export interface EmployeeTaxSetting {
  id: number;
  employee_id: number;
  tax_profile_id?: number | null;
  tax_method: "progressive" | "fixed_rate" | "flat_amount" | "none";
  fixed_rate: string;
  flat_amount: string;
  withhold_strategy: "annualize" | "per_period";
  overrides?: Record<string, unknown> | null;
  is_active: boolean;
  tax_profile?: TaxProfile | null;
}

export const SLIP_STATUS_LABEL: Record<SlipStatus, string> = {
  draft: "ร่าง",
  computed: "คำนวณแล้ว",
  pending_l1: "รอผู้จัดการอนุมัติ",
  pending_l2: "รอเจ้าของอนุมัติ",
  approved: "อนุมัติแล้ว",
  paid: "จ่ายเงินแล้ว",
  rejected: "ถูกปฏิเสธ",
  cancelled: "ยกเลิก",
};

export const SLIP_STATUS_COLOR: Record<SlipStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  draft: "default",
  computed: "info",
  pending_l1: "warning",
  pending_l2: "warning",
  approved: "info",
  paid: "success",
  rejected: "danger",
  cancelled: "default",
};

export function fmtMoney(v: string | number | null | undefined): string {
  const n = typeof v === "string" ? parseFloat(v) : (v ?? 0);
  if (Number.isNaN(n)) return "0";
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });
}
