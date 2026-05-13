import ComingSoon from "@/components/ComingSoon";

export default function ReportEmployeesPage() {
  return (
    <ComingSoon
      title="รายงานพนักงาน"
      todo={[
        "API /reports/employees/by-department",
        "API /reports/employees/by-status",
        "กราฟ donut/pie แยกตามแผนก / ประเภทการจ้าง",
      ]}
    />
  );
}
