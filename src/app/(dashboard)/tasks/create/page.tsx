"use client";

import { ClipboardList } from "lucide-react";
import Topbar from "@/components/Topbar";
import TaskForm from "../TaskForm";

export default function CreateTaskPage() {
  return (
    <>
      <Topbar title="สร้างงานใหม่" />
      <div className="p-6 space-y-4">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-800">
          <ClipboardList className="h-7 w-7 text-indigo-600" /> สร้างงานใหม่
        </h1>
        <TaskForm mode="create" />
      </div>
    </>
  );
}
