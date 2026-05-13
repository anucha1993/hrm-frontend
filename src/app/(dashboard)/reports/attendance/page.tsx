import ComingSoon from "@/components/ComingSoon";

export default function ReportAttendancePage() {
  return (
    <ComingSoon
      title="รายงานเวลางาน"
      description="ยังไม่ได้เชื่อมต่อ API จริง — ตอนนี้สามารถดูสรุปจากเมนู ‘สรุปเวลาทำงานรายเดือน’ ได้แทน"
      todo={[
        "API /reports/attendance/weekly",
        "API /reports/attendance/top-late",
        "กราฟแนวโน้มการเข้างานรายสัปดาห์",
      ]}
    />
  );
}
