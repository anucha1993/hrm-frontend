// Leave / time-off types matching backend API responses

export type LeaveStatus = "draft" | "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveType {
  id: number;
  code: string;
  name: string;
  name_en?: string | null;
  color: string;
  is_paid: boolean;
  requires_approval: boolean;
  requires_attachment: boolean;
  counts_as_workday: boolean;
  affects_diligence: boolean;
  default_quota_days: string;
  min_advance_notice_days: number;
  allow_half_day: boolean;
  allow_negative_balance: boolean;
  max_consecutive_days?: number | null;
  description?: string | null;
  order: number;
  is_active: boolean;
}

export interface LeaveRequest {
  id: number;
  request_no: string;
  employee_id: number;
  leave_type_id: number;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  half_day_period?: "morning" | "afternoon" | null;
  total_days: string;
  reason?: string | null;
  attachment_path?: string | null;
  contact_phone?: string | null;
  status: LeaveStatus;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  review_note?: string | null;
  created_at: string;
  employee?: {
    id: number;
    employee_code: string;
    first_name: string;
    last_name: string;
  };
  leave_type?: LeaveType;
  reviewer?: { id: number; name: string } | null;
  logs?: LeaveRequestLog[];
}

export interface LeaveRequestLog {
  id: number;
  leave_request_id: number;
  action: string;
  from_status?: string | null;
  to_status?: string | null;
  note?: string | null;
  user?: { id: number; name: string } | null;
  created_at: string;
}

export interface LeaveBalance {
  leave_type: LeaveType;
  year: number;
  quota_days: number;
  carryover_days: number;
  used_days: number;
  pending_days: number;
  remaining: number;
}

// Attendance summary
export interface SummaryRow {
  employee: {
    id: number;
    employee_code: string;
    first_name: string;
    last_name: string;
    department?: { id: number; name: string } | null;
  };
  total_days: number;
  present_days: number;
  absent_days: number;
  leave_days: number;
  paid_leave_days: number;
  unpaid_leave_days: number;
  leave_breakdown: { code: string; name: string; days: number; color: string }[];
  late_count: number;
  late_minutes: number;
  ot_hours: number;
}

export interface SummaryResponse {
  period: { start: string; end: string; total_days: number };
  rows: SummaryRow[];
  totals: {
    employees: number;
    present_days: number;
    absent_days: number;
    leave_days: number;
    late_count: number;
    ot_hours: number;
  };
}

export interface DailyEntry {
  date: string;
  day_of_week: number;
  status: "present" | "late" | "absent" | "leave" | "weekend";
  check_in?: string | null;
  check_out?: string | null;
  late_minutes: number;
  leave?: { type: string; code: string; color: string; is_half_day: boolean } | null;
}

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  draft: "ร่าง",
  pending: "รอการอนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ปฏิเสธ",
  cancelled: "ยกเลิก",
};

export const LEAVE_STATUS_COLOR: Record<
  LeaveStatus,
  "default" | "success" | "warning" | "danger" | "info"
> = {
  draft: "default",
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "default",
};
