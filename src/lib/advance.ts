// Employee salary advance (เบิกเงินล่วงหน้า) types matching backend API responses

export type AdvanceStatus = "pending" | "approved" | "rejected" | "paid" | "completed" | "cancelled";
export type DisbursementMethod = "manual" | "tiger_voucher";

export interface AdvanceRepayment {
  id: number;
  employee_advance_id: number;
  payroll_period_id?: number | null;
  amount: string;
  repaid_at: string;
  note?: string | null;
  recorder?: { id: number; name: string } | null;
  payroll_period?: { id: number; name: string; code: string } | null;
  created_at: string;
}

export interface EmployeeAdvance {
  id: number;
  request_no: string;
  employee_id: number;
  amount: string;
  reason?: string | null;
  request_date: string;
  repaid_amount: string;
  remaining_amount: number;
  status: AdvanceStatus;
  approved_by?: number | null;
  approved_at?: string | null;
  approval_note?: string | null;
  paid_by?: number | null;
  paid_at?: string | null;
  created_at: string;
  disbursement_method?: DisbursementMethod;
  tiger_voucher_code?: string | null;
  tiger_voucher_ref_num?: string | null;
  tiger_voucher_status?: string | null;
  tiger_voucher_issued_at?: string | null;
  eligibility_bypassed?: boolean;
  eligibility_bypass_reason?: string | null;
  eligibility_bypass_at?: string | null;
  bypassed_by?: { id: number; name: string } | null;
  employee?: {
    id: number;
    employee_code: string;
    first_name: string;
    last_name: string;
  };
  approver?: { id: number; name: string } | null;
  payer?: { id: number; name: string } | null;
  creator?: { id: number; name: string } | null;
  repayments?: AdvanceRepayment[];
}

export const ADVANCE_STATUS_LABEL: Record<AdvanceStatus, string> = {
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว (รอจ่าย)",
  rejected: "ปฏิเสธ",
  paid: "จ่ายแล้ว (กำลังหักคืน)",
  completed: "หักคืนครบแล้ว",
  cancelled: "ยกเลิก",
};

export const ADVANCE_STATUS_COLOR: Record<AdvanceStatus, "success" | "warning" | "danger" | "info" | "default"> = {
  pending: "warning",
  approved: "info",
  rejected: "danger",
  paid: "info",
  completed: "success",
  cancelled: "default",
};

/* ===================== เงื่อนไขเป้าหมายผลิตก่อนเบิกผ่านเครื่อง Tiger ===================== */

export type ProductionAdvanceRuleScope = "company" | "department";

export interface ProductionRateItemBrief {
  id: number;
  code: string;
  name: string;
  category: string | null;
  work_type: string;
  unit: string;
}

export type ProductionAdvanceMetricType = "production_qty" | "attendance_days";

export interface ProductionAdvanceRule {
  id: number;
  name: string;
  unit: string;
  target_qty: string;
  scope: ProductionAdvanceRuleScope;
  department_id?: number | null;
  department?: { id: number; code: string; name: string } | null;
  metric_type: ProductionAdvanceMetricType;
  applies_to_department_ids?: number[] | null;
  is_active: boolean;
  note?: string | null;
  production_rate_items?: ProductionRateItemBrief[];
  created_at: string;
}

export interface ProductionRuleEvaluation {
  rule_id: number;
  name: string;
  unit: string;
  scope: ProductionAdvanceRuleScope;
  department_id: number | null;
  target_qty: number;
  achieved_qty: number;
  is_met: boolean;
  date: string;
}

export interface ProductionEligibility {
  eligible: boolean;
  rules: ProductionRuleEvaluation[];
  failed_rules: ProductionRuleEvaluation[];
}

export interface TigerVoucherSettings {
  base_url: string;
  username: string;
  mobile: string;
  has_password: boolean;
}

export interface TigerTestConnectionResult {
  success: boolean;
  message: string | null;
  token: string | null;
  http_status: number | null;
}

