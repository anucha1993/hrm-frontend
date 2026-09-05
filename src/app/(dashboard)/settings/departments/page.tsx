"use client";

import MasterDataPage from "@/components/MasterDataPage";

export default function DepartmentsPage() {
  return (
    <MasterDataPage
      title="จัดการแผนก"
      endpoint="departments"
      extraFields={[
        { key: "description", label: "คำอธิบาย", type: "textarea" },
        {
          key: "attendance_mode",
          label: "โหมดบันทึกเวลา",
          type: "select",
          defaultValue: "full",
          options: [
            { value: "full", label: "สแกนเข้า+ออก (ปกติ)" },
            { value: "check_in_only", label: "สแกนเข้าอย่างเดียว" },
            { value: "none", label: "งานเหมา / ไม่บันทึกเวลา" },
          ],
        },
        {
          key: "ot_eligible",
          label: "โอที (OT)",
          type: "select",
          defaultValue: "1",
          options: [
            { value: "1", label: "อนุญาตให้มี OT" },
            { value: "0", label: "ไม่มี OT (ทำงานเกินเวลาไม่นับเป็น OT)" },
          ],
        },
      ]}
    />
  );
}
