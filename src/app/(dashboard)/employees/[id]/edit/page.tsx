"use client";

import Topbar from "@/components/Topbar";
import EmployeeForm from "@/components/EmployeeForm";
import { use } from "react";

export default function EmployeeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <>
      <Topbar title="แก้ไขข้อมูลพนักงาน" />
      <EmployeeForm employeeId={Number(id)} />
    </>
  );
}
