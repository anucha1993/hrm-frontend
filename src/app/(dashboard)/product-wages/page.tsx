import ComingSoon from "@/components/ComingSoon";

export default function ProductWagesPage() {
  return (
    <ComingSoon
      title="ค่าจ้างรายสินค้า"
      description="เมนูนี้ยังไม่ได้พัฒนา — หากต้องการกำหนดเรทค่าจ้างตามผลผลิต ให้ใช้เมนู ‘กำหนดการจ่ายการผลิต’ แทน"
      todo={[
        "ตัดสินใจ: ใช้ระบบนี้ หรือใช้ ‘กำหนดการจ่ายการผลิต’ อย่างใดอย่างหนึ่ง",
        "ถ้าจะทำ: สร้าง Model Product + Migration",
        "สร้าง API CRUD /products",
        "เชื่อม Payroll engine ให้คำนวณค่าจ้างจากจำนวนชิ้นต่อสินค้า",
      ]}
    />
  );
}
