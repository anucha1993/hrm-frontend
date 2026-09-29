// กลุ่มรายการผลิต (category) — ใช้ร่วมกันระหว่างหน้าเรทค่าจ้างการผลิตและฟอร์มใบจ่ายงาน
export const CATEGORY_OPTIONS = [
  { value: "pae_front", label: "แพหน้า" },
  { value: "pae_back", label: "แพหลัง" },
  { value: "prestress", label: "อัดแรง" },
  { value: "i15", label: "ไอ 15" },
  { value: "i18", label: "ไอ 18" },
  { value: "fence", label: "เสารั้ว" },
  { value: "pile", label: "เสาเข็ม" },
  { value: "other", label: "อื่นๆ" },
];

export const categoryLabel = (cat: string | null | undefined) =>
  CATEGORY_OPTIONS.find((c) => c.value === cat)?.label ?? cat ?? "ไม่ระบุกลุ่ม";
