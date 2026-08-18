"use client";

import { use, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import GoodsDepositForm from "@/components/goods-deposits/GoodsDepositForm";
import { apiFetch } from "@/lib/api";
import type { GoodsDepositSlip } from "@/lib/types";

export default function EditGoodsDepositPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [slip, setSlip] = useState<GoodsDepositSlip | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ data: GoodsDepositSlip }>(`/goods-deposits/${id}`)
      .then((r) => setSlip(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : "โหลดไม่สำเร็จ"));
  }, [id]);

  if (error) {
    return <div className="p-6 text-sm text-red-600">{error}</div>;
  }

  if (!slip) {
    return (
      <div className="p-10 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return <GoodsDepositForm initial={slip} />;
}
