"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Employee } from "@/lib/types";

function employeeLabel(e: Employee, showPhone: boolean) {
  const nickname = e.nickname ? ` (${e.nickname})` : "";
  const phone = showPhone && e.phone ? ` · ${e.phone}` : "";
  return `${e.employee_code} - ${e.first_name} ${e.last_name}${nickname}${phone}`;
}

export default function EmployeeCombobox({
  employees,
  value,
  onChange,
  placeholder = "-- เลือกพนักงาน --",
  clearLabel = "-- เลือกพนักงาน --",
  className = "w-full pl-3 pr-8 py-2.5 rounded-xl border border-border text-sm bg-white",
  showPhone = false,
}: {
  employees: Employee[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  clearLabel?: string;
  className?: string;
  showPhone?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  const selected = employees.find((e) => String(e.id) === value) ?? null;

  const filtered = useMemo(() => {
    if (!query.trim()) return employees;
    const q = query.toLowerCase();
    return employees.filter(
      (e) =>
        e.employee_code.toLowerCase().includes(q) ||
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
        (e.nickname ?? "").toLowerCase().includes(q)
    );
  }, [employees, query]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <input
          type="text"
          value={open ? query : selected ? employeeLabel(selected, showPhone) : ""}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          placeholder={placeholder}
          className={className}
        />
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-border rounded-xl shadow-lg py-1">
          <button
            type="button"
            onClick={() => pick("")}
            className="w-full text-left px-3 py-2 text-sm text-muted hover:bg-surface"
          >
            {clearLabel}
          </button>
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted">ไม่พบพนักงาน</div>
          ) : (
            filtered.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => pick(String(e.id))}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-primary-50 ${
                  String(e.id) === value ? "bg-primary-50 font-medium text-primary-700" : "text-foreground"
                }`}
              >
                {employeeLabel(e, showPhone)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
