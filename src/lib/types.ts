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
  marital_status?: string | null;
  religion?: string | null;
  education_level?: string | null;
  country_id: number | null;
  department_id: number | null;
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
  department?: Department | null;
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
