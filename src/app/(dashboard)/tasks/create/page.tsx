import ComingSoon from "@/components/ComingSoon";

export default function CreateTaskPage() {
  return (
    <ComingSoon
      title="สร้างงานใหม่"
      todo={[
        "ต้องสร้าง Model Task ก่อน",
        "Form: ชื่องาน, รายละเอียด, ผู้รับผิดชอบ, ความสำคัญ, กำหนดส่ง, ไฟล์แนบ",
        "API POST /tasks",
      ]}
    />
  );
}
