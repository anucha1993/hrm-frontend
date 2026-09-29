"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import type { Employee } from "@/lib/types";

// รองรับทั้ง Employee เต็มรูปแบบ และ shape ย่อมๆ (เช่น EmployeeBrief ในฟอร์มอื่น) ที่มีแค่ฟิลด์ที่จำเป็น
export type ComboboxEmployee = Pick<Employee, "id" | "employee_code" | "first_name" | "last_name" | "nickname" | "phone">;

function employeeLabel(e: ComboboxEmployee, showPhone: boolean) {
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
  disabled = false,
}: {
  employees: ComboboxEmployee[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  clearLabel?: string;
  className?: string;
  showPhone?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

  const updatePosition = useCallback(() => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (boxRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
      setQuery("");
    }
    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={open ? query : selected ? employeeLabel(selected, showPhone) : ""}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            setQuery("");
          }}
          placeholder={placeholder}
          className={`${className} disabled:bg-surface disabled:text-muted`}
        />
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
      </div>
      {open && pos && createPortal(
        <div ref={panelRef} style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
          className="z-50 max-h-64 overflow-y-auto bg-white border border-border rounded-xl shadow-lg py-1">
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
        </div>,
        document.body
      )}
    </div>
  );
}
