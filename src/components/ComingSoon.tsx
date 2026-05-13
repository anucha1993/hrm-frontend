"use client";

import { Construction } from "lucide-react";
import Topbar from "@/components/Topbar";

type Props = {
  title: string;
  description?: string;
  /** รายการ feature ที่ยังต้องทำ (เพื่อความชัดเจน) */
  todo?: string[];
};

export default function ComingSoon({ title, description, todo }: Props) {
  return (
    <>
      <Topbar title={title} />
      <div className="p-6">
        <div className="bg-white rounded-2xl border border-border p-10 max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 flex items-center justify-center">
            <Construction className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
          <p className="text-sm text-muted mb-6">
            {description ?? "ฟีเจอร์นี้ยังไม่ได้พัฒนา — รอเชื่อมต่อกับ Backend Model จริง"}
          </p>
          {todo && todo.length > 0 && (
            <div className="text-left bg-gray-50 border border-border rounded-xl p-4">
              <p className="text-xs font-semibold text-muted uppercase mb-2">สิ่งที่ยังต้องพัฒนา</p>
              <ul className="space-y-1.5 text-sm text-foreground">
                {todo.map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <span className="text-amber-600 mt-0.5">•</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
