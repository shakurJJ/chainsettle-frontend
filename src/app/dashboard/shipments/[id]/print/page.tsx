"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const ShipmentPrintView = dynamic(
  () => import("@/components/shipments/ShipmentPrintView").then((m) => m.ShipmentPrintView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center text-sm text-gray-500">
        Loading print view...
      </div>
    ),
  },
);

export default function ShipmentPrintPage() {
  const { id } = useParams<{ id: string }>();
  return <ShipmentPrintView id={id} />;
}
