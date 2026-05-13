import ComingSoon from "@/components/ComingSoon";

export default function ReportTasksPage() {
  return (
    <ComingSoon
      title="รายงานงาน"
      todo={[
        "ต้องมีระบบ Task ก่อน",
        "API /reports/tasks/completion-rate",
        "API /reports/tasks/overdue",
      ]}
    />
  );
}
