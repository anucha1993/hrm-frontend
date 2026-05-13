import ComingSoon from "@/components/ComingSoon";

export default function TasksPage() {
  return (
    <ComingSoon
      title="มอบหมายงาน"
      todo={[
        "Model Task + Migration (assignee, due_date, priority, status, attachments)",
        "API CRUD /tasks + filter ตามผู้รับผิดชอบ/สถานะ",
        "หน้า list + หน้าสร้าง/แก้ไข",
        "การแจ้งเตือนเมื่อใกล้ครบกำหนด",
      ]}
    />
  );
}
