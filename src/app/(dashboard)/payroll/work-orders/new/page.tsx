"use client";

import WorkOrderForm, { blankForm } from "../WorkOrderForm";

export default function NewWorkOrderPage() {
  return <WorkOrderForm initial={blankForm} />;
}
