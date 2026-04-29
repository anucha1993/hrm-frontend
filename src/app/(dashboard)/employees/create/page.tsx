"use client";

import Topbar from "@/components/Topbar";
import EmployeeForm from "@/components/EmployeeForm";

export default function EmployeeCreatePage() {
  return (
    <>
      <Topbar title="เพิ่มพนักงาน" />
      <EmployeeForm />
    </>
  );
}
