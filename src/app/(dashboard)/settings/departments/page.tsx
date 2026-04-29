"use client";

import MasterDataPage from "@/components/MasterDataPage";

export default function DepartmentsPage() {
  return (
    <MasterDataPage
      title="จัดการแผนก"
      endpoint="departments"
      extraFields={[{ key: "description", label: "คำอธิบาย", type: "textarea" }]}
    />
  );
}
