"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trash2, Upload, FileIcon, Database, X } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import LabourImportModal from "@/components/LabourImportModal";
import { useAuth } from "@/lib/auth-context";
import type {
  Country,
  Department,
  Employee,
  EmployeeDocument,
  EmployeeStatus,
  EmploymentType,
  Labour,
} from "@/lib/types";

export type EmployeeFormProps = {
  employeeId?: number;
};

type FormState = {
  employee_code: string;
  title: "นาย" | "นางสาว" | "นาง";
  first_name: string;
  last_name: string;
  nickname: string;
  birth_date: string;
  gender: "M" | "F" | "Other";
  phone: string;
  email: string;
  address: string;
  national_id: string;
  marital_status: string;
  religion: string;
  education_level: string;
  country_id: string;
  department_id: string;
  employment_type_id: string;
  position: string;
  hire_date: string;
  resign_date: string;
  base_salary: string;
  bank_name: string;
  bank_account_no: string;
  bank_account_name: string;
  emergency_contact_name: string;
  emergency_contact_relation: string;
  emergency_contact_phone: string;
  status: EmployeeStatus;
  note: string;
};

const empty: FormState = {
  employee_code: "",
  title: "นาย",
  first_name: "",
  last_name: "",
  nickname: "",
  birth_date: "",
  gender: "M",
  phone: "",
  email: "",
  address: "",
  national_id: "",
  marital_status: "",
  religion: "",
  education_level: "",
  country_id: "",
  department_id: "",
  employment_type_id: "",
  position: "",
  hire_date: "",
  resign_date: "",
  base_salary: "",
  bank_name: "",
  bank_account_no: "",
  bank_account_name: "",
  emergency_contact_name: "",
  emergency_contact_relation: "",
  emergency_contact_phone: "",
  status: "active",
  note: "",
};

export default function EmployeeForm({ employeeId }: EmployeeFormProps) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const isEdit = !!employeeId;
  const canImportLabour = hasPermission("labours.view");

  const [form, setForm] = useState<FormState>(empty);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [types, setTypes] = useState<EmploymentType[]>([]);
  const [existingDocs, setExistingDocs] = useState<EmployeeDocument[]>([]);
  const [deleteIds, setDeleteIds] = useState<number[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLabourModal, setShowLabourModal] = useState(false);
  const [importedNotice, setImportedNotice] = useState<string | null>(null);

  function applyLabour(l: Labour) {
    setForm((prev) => mergeLabourIntoForm(prev, l, countries));
    setImportedNotice(
      `นำเข้าข้อมูลจาก Labour API เรียบร้อย (${l.labour_fullname_th ?? l.labour_fullname})`
    );
  }

  useEffect(() => {
    Promise.all([
      apiFetch<{ data: Department[] }>("/departments"),
      apiFetch<{ data: Country[] }>("/countries"),
      apiFetch<{ data: EmploymentType[] }>("/employment-types"),
    ])
      .then(([d, c, t]) => {
        setDepartments(d.data);
        setCountries(c.data);
        setTypes(t.data);
      })
      .catch(() => undefined);
  }, []);

  const loadEmployee = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const res = await apiFetch<{ data: Employee }>(`/employees/${employeeId}`);
      const e = res.data;
      setForm({
        employee_code: e.employee_code,
        title: e.title,
        first_name: e.first_name,
        last_name: e.last_name,
        nickname: e.nickname ?? "",
        birth_date: e.birth_date?.slice(0, 10) ?? "",
        gender: e.gender,
        phone: e.phone ?? "",
        email: e.email ?? "",
        address: e.address ?? "",
        national_id: e.national_id,
        marital_status: e.marital_status ?? "",
        religion: e.religion ?? "",
        education_level: e.education_level ?? "",
        country_id: e.country_id ? String(e.country_id) : "",
        department_id: e.department_id ? String(e.department_id) : "",
        employment_type_id: e.employment_type_id ? String(e.employment_type_id) : "",
        position: e.position ?? "",
        hire_date: e.hire_date?.slice(0, 10) ?? "",
        resign_date: e.resign_date?.slice(0, 10) ?? "",
        base_salary: e.base_salary ?? "",
        bank_name: e.bank_name ?? "",
        bank_account_no: e.bank_account_no ?? "",
        bank_account_name: e.bank_account_name ?? "",
        emergency_contact_name: e.emergency_contact_name ?? "",
        emergency_contact_relation: e.emergency_contact_relation ?? "",
        emergency_contact_phone: e.emergency_contact_phone ?? "",
        status: e.status,
        note: e.note ?? "",
      });
      setExistingDocs(e.documents ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadEmployee();
  }, [loadEmployee]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function toggleDeleteDoc(id: number) {
    setDeleteIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v === "" || v === null || v === undefined) return;
        fd.append(k, String(v));
      });
      newFiles.forEach((file) => fd.append("documents[]", file));
      deleteIds.forEach((id) => fd.append("delete_document_ids[]", String(id)));

      if (isEdit) {
        fd.append("_method", "PUT");
        await apiFetch(`/employees/${employeeId}`, { method: "POST", body: fd });
      } else {
        await apiFetch("/employees", { method: "POST", body: fd });
      }
      router.push("/employees");
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { errors?: Record<string, string[]>; message?: string } | undefined;
        const fieldErr = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
        setError(fieldErr || data?.message || err.message);
      } else {
        setError("บันทึกไม่สำเร็จ");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/employees" className="p-2 rounded-lg hover:bg-white border border-border">
            <ArrowLeft className="w-4 h-4 text-muted" />
          </Link>
          <h3 className="text-lg font-semibold text-foreground">
            {isEdit ? "แก้ไขข้อมูลพนักงาน" : "เพิ่มพนักงาน"}
          </h3>
        </div>
        {canImportLabour && (
          <button
            type="button"
            onClick={() => setShowLabourModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary-300 bg-primary-50 text-primary-700 text-sm font-semibold hover:bg-primary-100"
          >
            <Database className="w-4 h-4" /> นำเข้าจาก Labour API
          </button>
        )}
      </div>

      {importedNotice && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
          {importedNotice}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <Section title="ข้อมูลส่วนตัว">
          <Field label="รหัสพนักงาน" required>
            <input
              required
              value={form.employee_code}
              onChange={(e) => set("employee_code", e.target.value)}
              className={input}
            />
          </Field>
          <Field label="คำนำหน้า" required>
            <select value={form.title} onChange={(e) => set("title", e.target.value as FormState["title"])} className={input}>
              <option value="นาย">นาย</option>
              <option value="นางสาว">นางสาว</option>
              <option value="นาง">นาง</option>
            </select>
          </Field>
          <Field label="ชื่อ" required>
            <input required value={form.first_name} onChange={(e) => set("first_name", e.target.value)} className={input} />
          </Field>
          <Field label="นามสกุล" required>
            <input required value={form.last_name} onChange={(e) => set("last_name", e.target.value)} className={input} />
          </Field>
          <Field label="ชื่อเล่น">
            <input value={form.nickname} onChange={(e) => set("nickname", e.target.value)} className={input} />
          </Field>
          <Field label="วันเกิด" required>
            <input
              type="date"
              required
              value={form.birth_date}
              onChange={(e) => set("birth_date", e.target.value)}
              className={input}
            />
          </Field>
          <Field label="เพศ" required>
            <select value={form.gender} onChange={(e) => set("gender", e.target.value as FormState["gender"])} className={input}>
              <option value="M">ชาย</option>
              <option value="F">หญิง</option>
              <option value="Other">อื่นๆ</option>
            </select>
          </Field>
          <Field label="เลข ปปช. / Passport No." required>
            <input
              required
              maxLength={20}
              value={form.national_id}
              onChange={(e) => set("national_id", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              className={input}
              placeholder="เช่น 1234567890123 หรือ AB1234567"
            />
          </Field>
          <Field label="โทรศัพท์">
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={input} />
          </Field>
          <Field label="อีเมล">
            <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={input} />
          </Field>
          <Field label="สถานะสมรส">
            <select value={form.marital_status} onChange={(e) => set("marital_status", e.target.value)} className={input}>
              <option value="">-</option>
              <option value="โสด">โสด</option>
              <option value="สมรส">สมรส</option>
              <option value="หย่าร้าง">หย่าร้าง</option>
              <option value="หม้าย">หม้าย</option>
            </select>
          </Field>
          <Field label="ศาสนา">
            <input value={form.religion} onChange={(e) => set("religion", e.target.value)} className={input} />
          </Field>
          <Field label="ระดับการศึกษา">
            <input
              value={form.education_level}
              onChange={(e) => set("education_level", e.target.value)}
              className={input}
            />
          </Field>
          <Field label="ประเทศ / สัญชาติ">
            <select value={form.country_id} onChange={(e) => set("country_id", e.target.value)} className={input}>
              <option value="">-</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.nationality ? `(${c.nationality})` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ที่อยู่" full>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              className={input}
            />
          </Field>
        </Section>

        <Section title="ข้อมูลการทำงาน">
          <Field label="แผนก">
            <select value={form.department_id} onChange={(e) => set("department_id", e.target.value)} className={input}>
              <option value="">-</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ประเภทการจ้าง">
            <select
              value={form.employment_type_id}
              onChange={(e) => set("employment_type_id", e.target.value)}
              className={input}
            >
              <option value="">-</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ตำแหน่ง">
            <input value={form.position} onChange={(e) => set("position", e.target.value)} className={input} />
          </Field>
          <Field label="วันเริ่มงาน">
            <input
              type="date"
              value={form.hire_date}
              onChange={(e) => set("hire_date", e.target.value)}
              className={input}
            />
          </Field>
          <Field label="วันลาออก/สิ้นสุด">
            <input
              type="date"
              value={form.resign_date}
              onChange={(e) => set("resign_date", e.target.value)}
              className={input}
            />
          </Field>
          <Field label="เงินเดือนพื้นฐาน">
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.base_salary}
              onChange={(e) => set("base_salary", e.target.value)}
              className={input}
            />
          </Field>
          <Field label="สถานะ" required>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as EmployeeStatus)}
              className={input}
            >
              <option value="active">ทำงาน</option>
              <option value="suspended">พักงาน</option>
              <option value="resigned">ลาออก</option>
              <option value="terminated">เลิกจ้าง</option>
            </select>
          </Field>
        </Section>

        <Section title="บัญชีธนาคาร">
          <Field label="ธนาคาร">
            <input value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} className={input} />
          </Field>
          <Field label="เลขบัญชี">
            <input
              value={form.bank_account_no}
              onChange={(e) => set("bank_account_no", e.target.value)}
              className={input}
            />
          </Field>
          <Field label="ชื่อบัญชี">
            <input
              value={form.bank_account_name}
              onChange={(e) => set("bank_account_name", e.target.value)}
              className={input}
            />
          </Field>
        </Section>

        <Section title="ผู้ติดต่อกรณีฉุกเฉิน">
          <Field label="ชื่อ">
            <input
              value={form.emergency_contact_name}
              onChange={(e) => set("emergency_contact_name", e.target.value)}
              className={input}
            />
          </Field>
          <Field label="ความสัมพันธ์">
            <input
              value={form.emergency_contact_relation}
              onChange={(e) => set("emergency_contact_relation", e.target.value)}
              className={input}
            />
          </Field>
          <Field label="โทรศัพท์">
            <input
              value={form.emergency_contact_phone}
              onChange={(e) => set("emergency_contact_phone", e.target.value)}
              className={input}
            />
          </Field>
        </Section>

        <Section title="เอกสารประกอบ">
          <div className="md:col-span-2 space-y-3">
            {existingDocs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted">เอกสารที่มีอยู่</p>
                {existingDocs.map((d) => {
                  const willDelete = deleteIds.includes(d.id);
                  return (
                    <div
                      key={d.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border ${willDelete ? "border-red-300 bg-red-50" : "border-border bg-white"}`}
                    >
                      <FileIcon className="w-4 h-4 text-muted" />
                      {d.url ? (
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 text-sm text-primary-600 hover:underline truncate"
                        >
                          {d.name}
                        </a>
                      ) : (
                        <span className="flex-1 text-sm truncate">{d.name}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleDeleteDoc(d.id)}
                        className={`p-1.5 rounded-lg ${willDelete ? "text-red-700 bg-red-100" : "text-accent-500 hover:bg-accent-50"}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-border text-sm text-muted cursor-pointer hover:bg-surface">
              <Upload className="w-4 h-4" />
              คลิกเพื่อเลือกไฟล์เอกสาร (อัปโหลดได้หลายไฟล์, สูงสุด 10MB ต่อไฟล์)
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []);
                  // ตรวจขนาดฝั่ง client (10MB)
                  const tooBig = picked.find((f) => f.size > 10 * 1024 * 1024);
                  if (tooBig) {
                    setError(`ไฟล์ "${tooBig.name}" ขนาดเกิน 10MB`);
                    e.target.value = "";
                    return;
                  }
                  // เพิ่มเข้า list (ไม่ทับ) และกันชื่อซ้ำ
                  setNewFiles((prev) => {
                    const names = new Set(prev.map((f) => f.name));
                    return [...prev, ...picked.filter((f) => !names.has(f.name))];
                  });
                  e.target.value = ""; // reset เพื่อให้เลือกไฟล์เดิมได้อีก
                }}
              />
            </label>
            {newFiles.length > 0 && (
              <ul className="space-y-1.5">
                {newFiles.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-50 border border-primary-200 text-sm"
                  >
                    <FileIcon className="w-4 h-4 text-primary-600 shrink-0" />
                    <span className="flex-1 truncate text-foreground">{f.name}</span>
                    <span className="text-xs text-muted shrink-0">
                      {f.size < 1024 * 1024
                        ? `${(f.size / 1024).toFixed(0)} KB`
                        : `${(f.size / 1024 / 1024).toFixed(1)} MB`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setNewFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="p-1 rounded hover:bg-red-100 text-red-500 shrink-0"
                      title="ลบไฟล์นี้ออก"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>

        <Section title="หมายเหตุ">
          <Field label="หมายเหตุ" full>
            <textarea
              rows={3}
              value={form.note}
              onChange={(e) => set("note", e.target.value)}
              className={input}
            />
          </Field>
        </Section>

        <div className="flex justify-end gap-2">
          <Link href="/employees" className="px-4 py-2 rounded-lg border border-border text-sm">
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 text-white text-sm font-semibold disabled:opacity-60"
          >
            {submitting ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </form>

      <LabourImportModal
        open={showLabourModal}
        onClose={() => setShowLabourModal(false)}
        onPick={applyLabour}
      />
    </div>
  );
}

// แปลงข้อมูล Labour → ฟอร์มพนักงาน
function mergeLabourIntoForm(prev: FormState, l: Labour, countries: Country[]): FormState {
  // แยกชื่อ-นามสกุล (ใช้ภาษาไทยก่อน, ไม่มีก็ใช้อังกฤษ)
  const fullname = (l.labour_fullname_th ?? l.labour_fullname ?? "").trim();
  const parts = fullname.split(/\s+/);
  const first_name = parts[0] ?? "";
  const last_name = parts.slice(1).join(" ");

  // คำนำหน้า
  let title: FormState["title"] = prev.title;
  const prefix = (l.labour_prefix ?? "").trim();
  if (prefix === "นาย" || prefix === "นางสาว" || prefix === "นาง") {
    title = prefix;
  } else if (l.labour_sex?.toLowerCase() === "female") {
    title = "นางสาว";
  } else if (l.labour_sex?.toLowerCase() === "male") {
    title = "นาย";
  }

  // เพศ
  const sex = (l.labour_sex ?? "").toLowerCase();
  const gender: FormState["gender"] = sex === "male" ? "M" : sex === "female" ? "F" : prev.gender;

  // ค้น country_id จาก nationality code
  const country = l.labour_nationality
    ? countries.find((c) => c.code.toUpperCase() === l.labour_nationality!.toUpperCase())
    : undefined;

  // map สถานะการทำงาน
  const statusMap: Record<string, EmployeeStatus> = {
    working: "active",
    active: "active",
    resigned: "resigned",
    resign: "resigned",
    terminated: "terminated",
    suspended: "suspended",
    escape: "terminated",
  };
  const sj = (l.labour_status_job ?? "").toLowerCase();
  const status: EmployeeStatus = statusMap[sj] ?? prev.status;

  // หมายเหตุ: รวมข้อมูลจาก labour
  const noteParts: string[] = [];
  if (prev.note) noteParts.push(prev.note);
  noteParts.push(`[นำเข้าจาก Labour API]`);
  if (l.labour_id) noteParts.push(`Labour ID: ${l.labour_id}`);
  if (l.labour_number) noteParts.push(`เลขแรงงาน: ${l.labour_number}`);
  if (l.passport?.date_end) noteParts.push(`Passport หมดอายุ: ${l.passport.date_end}`);
  if (l.visa?.number) {
    noteParts.push(
      `Visa: ${l.visa.number}` + (l.visa.date_end ? ` (หมดอายุ ${l.visa.date_end})` : "")
    );
  }
  if (l.work_permit?.number) {
    noteParts.push(
      `Work Permit: ${l.work_permit.number}` +
        (l.work_permit.date_end ? ` (หมดอายุ ${l.work_permit.date_end})` : "")
    );
  }
  if (l.tm_number) noteParts.push(`TM.30: ${l.tm_number}`);
  if (l.company?.company_name) noteParts.push(`บริษัทเดิม: ${l.company.company_name}`);
  if (l.note) noteParts.push(`หมายเหตุ: ${l.note}`);

  // passport → national_id (ใช้ field เดียวกัน, normalize ให้เป็น A-Z0-9)
  const passportNo = (l.passport?.number ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  return {
    ...prev,
    employee_code: prev.employee_code || l.labour_number || `L${l.labour_id}`,
    title,
    first_name: first_name || prev.first_name,
    last_name: last_name || prev.last_name,
    birth_date: l.labour_birthday ?? prev.birth_date,
    gender,
    national_id: passportNo || prev.national_id,
    country_id: country ? String(country.id) : prev.country_id,
    hire_date: l.labour_jobdate_start ?? prev.hire_date,
    resign_date: l.labour_resing_date ?? prev.resign_date,
    status,
    note: noteParts.join("\n"),
  };
}

const input = "w-full px-3 py-1.5 rounded-lg border border-border text-sm bg-white";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <h4 className="text-sm font-semibold text-foreground mb-3">{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  required,
  full,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  full?: boolean;
}) {
  return (
    <div className={`grid grid-cols-12 items-start gap-3 ${full ? "md:col-span-2" : ""}`}>
      <label
        className={`${full ? "col-span-2" : "col-span-4"} text-sm text-muted text-right leading-tight pt-2`}
      >
        {label} {required && <span className="text-accent-500">*</span>}
      </label>
      <div className={full ? "col-span-10" : "col-span-8"}>{children}</div>
    </div>
  );
}
