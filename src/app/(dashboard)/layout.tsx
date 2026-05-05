"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import EmployeeShell from "@/components/EmployeeShell";
import { useAuth } from "@/lib/auth-context";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isEmployee = user?.role?.name === "employee";
  const allowedEmployeePaths = ["/attendance"];

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    // Employee role → บังคับให้อยู่ในเส้นทางที่อนุญาตเท่านั้น
    if (
      !loading &&
      user &&
      isEmployee &&
      !allowedEmployeePaths.some((p) => pathname === p || pathname.startsWith(p + "/"))
    ) {
      router.replace("/attendance");
    }
  }, [loading, user, router, pathname, isEmployee]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  // Employee: mobile-first shell (no sidebar)
  if (isEmployee) {
    return <EmployeeShell>{children}</EmployeeShell>;
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="flex-1 ml-64">{children}</main>
    </div>
  );
}
