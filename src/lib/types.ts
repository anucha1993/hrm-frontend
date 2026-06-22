// Frontend ↔ Backend type contracts
export type Permission = {
  id: number;
  name: string;
  display_name: string;
  group: string;
};

export type Role = {
  id: number;
  name: string;
  display_name: string;
  description?: string | null;
  is_system?: boolean;
  permissions?: Permission[];
  users_count?: number;
};

export type User = {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  role: Pick<Role, "id" | "name" | "display_name"> | null;
  permissions: string[];
  employee_id?: number | null;
};

export type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type Department = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  work_profile_id?: number | null;
  work_profile?: WorkProfile | null;
  is_active: boolean;
};

export type Country = {
  id: number;
  code: string;
  name: string;
  nationality?: string | null;
  is_active: boolean;
};

export type EmploymentType = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
};

export type EmployeeDocument = {
  id: number;
  name: string;
  file_path: string;
  url: string | null;
  original_name?: string | null;
  mime_type?: string | null;
  size?: number | null;
};

export type EmployeeStatus = "active" | "resigned" | "terminated" | "suspended";

export type Employee = {
  id: number;
  employee_code: string;
  title: "นาย" | "นางสาว" | "นาง";
  first_name: string;
  last_name: string;
  nickname?: string | null;
  full_name: string;
  birth_date: string;
  age: number | null;
  gender: "M" | "F" | "Other";
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  national_id: string;
  labour_id?: number | null;
  marital_status?: string | null;
  religion?: string | null;
  education_level?: string | null;
  country_id: number | null;
  department_id: number | null;
  work_profile_id?: number | null;
  employment_type_id: number | null;
  position?: string | null;
  hire_date?: string | null;
  resign_date?: string | null;
  base_salary?: string | null;
  bank_name?: string | null;
  bank_account_no?: string | null;
  bank_account_name?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_relation?: string | null;
  emergency_contact_phone?: string | null;
  status: EmployeeStatus;
  note?: string | null;
  user_id?: number | null;
  user?: { id: number; name: string; email: string } | null;
  department?: Department | null;
  work_profile?: WorkProfile | null;
  country?: Country | null;
  employment_type?: EmploymentType | null;
  documents?: EmployeeDocument[];
};

// ---- Labour API (proxy ผ่าน backend) ----
export type LabourPassport = {
  number: string | null;
  date_start: string | null;
  date_end: string | null;
};

export type LabourVisa = {
  number: string | null;
  date_in: string | null;
  date_start: string | null;
  date_end: string | null;
};

export type LabourWorkPermit = {
  number: string | null;
  labour_no: string | null;
  date_start: string | null;
  date_end: string | null;
};

export type LabourDay90 = {
  date_start: string | null;
  date_end: string | null;
};

export type LabourCompany = {
  company_id: number;
  company_name: string | null;
  company_tax: string | null;
};

export type LabourAgency = {
  agency_id: number;
  agency_name: string | null;
};

export type Labour = {
  labour_id: number;
  labour_prefix: string | null;
  labour_number: string | null;
  labour_fullname: string;
  labour_fullname_th: string | null;
  labour_sex: string;
  labour_nationality: string | null;
  labour_birthday: string | null;
  labour_status: string | null;
  labour_status_job: string | null;
  labour_jobdate_start: string | null;
  labour_resing_date: string | null;
  labour_escape_date: string | null;
  passport: LabourPassport | null;
  visa: LabourVisa | null;
  work_permit: LabourWorkPermit | null;
  day90: LabourDay90 | null;
  tm_number: string | null;
  note: string | null;
  company: LabourCompany | null;
  agency: LabourAgency | null;
  created_at: string | null;
  updated_at: string | null;
};

export type LabourListResponse = {
  data: Labour[];
  status?: string;
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
    paginate?: boolean;
  };
  links?: {
    first?: string | null;
    last?: string | null;
    prev?: string | null;
    next?: string | null;
  };
};

// ---- Attendance ----
export type OfficeLocation = {
  id: number;
  name: string;
  latitude: number | null;
  longitude: number | null;
  radius_m: number;
  enforce_geofence: boolean;
  address: string | null;
  is_active: boolean;
};

export type WorkShift = {
  id: number;
  name: string;
  start_time: string; // HH:mm:ss
  end_time: string;
  break_minutes: number;
  late_grace_minutes: number;
  cross_midnight: boolean;
  is_active: boolean;
};

// โปรไฟล์การทำงาน = กะ + วันทำงาน + ปฏิทินวันหยุด (ผูกกับแผนก/รายคน)
export type WorkProfile = {
  id: number;
  name: string;
  work_shift_id: number | null;
  work_shift?: WorkShift | null;
  work_days: number[] | null; // [1..7] (1=จันทร์); null = ทุกวัน
  description?: string | null;
  is_default: boolean;
  is_active: boolean;
  holidays_count?: number;
  departments_count?: number;
  employees_count?: number;
  holidays?: Holiday[];
  departments?: Department[];
};

// วันหยุด — work_profile_id = null คือวันหยุดกลางทั้งบริษัท
export type Holiday = {
  id: number;
  work_profile_id: number | null;
  work_profile?: { id: number; name: string } | null;
  name: string;
  date: string; // Y-m-d
  is_recurring: boolean; // ซ้ำทุกปี
  is_working: boolean; // true = ยกเว้น (วันนี้ทำงานปกติ)
  is_active: boolean;
};

export type Attendance = {
  id: number;
  employee_id: number;
  type: "check_in" | "check_out";
  checked_at: string;
  latitude: number | null;
  longitude: number | null;
  accuracy_m: number | null;
  office_location_id: number | null;
  office_location?: OfficeLocation | null;
  distance_m: number | null;
  outside_geofence: boolean;
  work_shift_id: number | null;
  work_shift?: WorkShift | null;
  status: "normal" | "late" | "early_leave" | "overtime";
  late_minutes: number | null;
  photo_path: string | null;
  photo_url: string | null;
  note: string | null;
  source?: "device" | "manual";
  is_edited?: boolean;
  edited_by?: number | null;
  edited_at?: string | null;
  edit_reason?: string | null;
  editor?: { id: number; name: string } | null;
  created_at: string;
  employee?: {
    id: number;
    employee_code: string;
    first_name: string;
    last_name: string;
    department_id?: number | null;
    department?: Department | null;
  };
};

export type AttendanceAuditLog = {
  id: number;
  attendance_id: number | null;
  employee_id: number;
  action: "create" | "update" | "delete";
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  reason: string | null;
  user?: { id: number; name: string } | null;
  created_at: string;
};

export type TodayStatus = {
  has_employee: boolean;
  employee?: { id: number; employee_code: string; first_name: string; last_name: string };
  last_check_in: Attendance | null;
  last_check_out: Attendance | null;
  shift: WorkShift | null;
  office_locations?: OfficeLocation[];
};

/* ===================== Goods Deposit (ใบมัดจำของใช้ทั่วไป) ===================== */
export type GoodsDepositStatus = "pending" | "deducted" | "cancelled" | "waived";

export type GoodsDepositItem = {
  id: number;
  deposit_slip_id: number;
  item_name: string;
  qty: string;
  unit_price: string;
  amount: string;
  note?: string | null;
  order: number;
};

export type GoodsDepositSlip = {
  id: number;
  slip_no: string;
  employee_id: number;
  deposit_date: string;
  total_amount: string;
  status: GoodsDepositStatus;
  payroll_period_id: number | null;
  payslip_id: number | null;
  deducted_at: string | null;
  created_by: number | null;
  note?: string | null;
  created_at: string;
  updated_at: string;
  employee?: {
    id: number;
    employee_code: string;
    first_name: string;
    last_name: string;
  };
  items?: GoodsDepositItem[];
  payroll_period?: { id: number; name: string; code: string } | null;
  payslip?: { id: number; slip_no: string } | null;
  creator?: { id: number; name: string } | null;
};

