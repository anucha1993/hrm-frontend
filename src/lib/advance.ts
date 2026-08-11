// Employee salary advance (เบิกเงินล่วงหน้า) types matching backend API responses

export type AdvanceStatus = "pending" | "approved" | "rejected" | "paid" | "completed" | "cancelled";

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
