"use client";

import MasterDataPage from "@/components/MasterDataPage";

export default function EmploymentTypesPage() {
  return (
    <MasterDataPage
      title="ประเภทการจ้าง"
      endpoint="employment-types"
      extraFields={[{ key: "description", label: "คำอธิบาย", type: "textarea" }]}
    />
  );
}
