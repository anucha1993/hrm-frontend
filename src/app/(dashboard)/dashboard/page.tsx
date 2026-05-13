import ComingSoon from "@/components/ComingSoon";

export default function DashboardPage() {
  return (
    <ComingSoon
      title="แดชบอร์ด"
      description="หน้าแดชบอร์ดจะถูกพัฒนาให้แสดงข้อมูลสรุปจริงจาก Backend"
      todo={[
        "API /dashboard/summary — สรุปจำนวนพนักงาน, มาทำงานวันนี้, ขาด/ลา/สาย",
        "API /attendance/recent — รายการ check-in ล่าสุด",
        "API /tasks/recent — งานที่ใกล้ครบกำหนด",
        "Widget กราฟแนวโน้มเงินเดือน / OT รายเดือน",
      ]}
    />
  );
}
