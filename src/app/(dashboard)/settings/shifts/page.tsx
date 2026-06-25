"use client";

import { useState } from "react";
import Topbar from "@/components/Topbar";
import { Clock, Layers, CalendarDays, RotateCw } from "lucide-react";
import ShiftsTab from "./ShiftsTab";
import ProfilesTab from "./ProfilesTab";
import HolidaysTab from "./HolidaysTab";
import RotationsTab from "./RotationsTab";

type TabKey = "shifts" | "profiles" | "holidays" | "rotations";

const TABS: { key: TabKey; label: string; icon: typeof Clock }[] = [
  { key: "shifts", label: "กะการทำงาน", icon: Clock },
  { key: "profiles", label: "โปรไฟล์การทำงาน", icon: Layers },
  { key: "holidays", label: "วันหยุด", icon: CalendarDays },
  { key: "rotations", label: "หมุนเวียนกะ", icon: RotateCw },
];

export default function ShiftsPage() {
  const [tab, setTab] = useState<TabKey>("shifts");

  return (
    <>
      <Topbar title="กะ & วันหยุด" />
      <div className="p-6 space-y-5">
        <div className="flex gap-1 border-b border-border">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
                  active
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-muted hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "shifts" && <ShiftsTab />}
        {tab === "profiles" && <ProfilesTab />}
        {tab === "holidays" && <HolidaysTab />}
        {tab === "rotations" && <RotationsTab />}
      </div>
    </>
  );
}
