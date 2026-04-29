"use client";

import MasterDataPage from "@/components/MasterDataPage";

export default function CountriesPage() {
  return (
    <MasterDataPage
      title="จัดการประเทศ"
      endpoint="countries"
      codeMaxLength={3}
      extraFields={[{ key: "nationality", label: "สัญชาติ", maxLength: 100 }]}
    />
  );
}
