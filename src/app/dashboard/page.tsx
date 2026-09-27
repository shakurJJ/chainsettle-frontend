"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/hooks/use-auth-store";
import { deriveUserRole, stroopsToUsdc } from "@/lib/utils";
import { shipmentsApi } from "@/lib/api/services";
import type { Shipment, Milestone } from "@/types";

interface StatCardProps {
  label: string;
  value: string;
  loading: boolean;
  error: boolean;
}

function StatCard({ label, value, loading, error }: StatCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      {loading ? (
        <div className="mt-2 h-7 w-24 animate-pulse rounded bg-gray-200" />
      ) : error ? (
        <p className="mt-2 text-2xl font-semibold text-gray-400">—</p>
      ) : (
        <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      )}
    </div>
  );
}

function isActive(shipment: Shipment): boolean {
  return shipment.status === "Active";
}

function milestoneNeedsAction(
  milestone: Milestone,
  role: string | null,
): boolean {
  if (!role) return false;
  if (role === "supplier") return milestone.status === "Pending";
  if (role === "buyer") return milestone.status === "ProofSubmitted";
  if (role === "arbiter") return milestone.status === "Disputed";
  return false;
}

export default function DashboardOverviewPage() {
  const { address } = useAuthStore();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    shipmentsApi
      .list({ limit: 100 })
      .then((res) => {
        if (!cancelled) setShipments(res.data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const active = shipments.filter(isActive);
    const totalEscrowed = active.reduce(
      (sum, s) => sum + BigInt(s.totalAmount ?? 0),
      0n,
    );
    const totalReleased = shipments.reduce(
      (sum, s) => sum + BigInt(s.releasedAmount ?? 0),
      0n,
    );
    const openDisputes = shipments.filter((s) =>
      s.milestones?.some((m) => m.status === "Disputed"),
    ).length;

    const attention: { shipment: Shipment; milestone: Milestone }[] = [];
    for (const shipment of shipments) {
      const role = deriveUserRole(address, shipment);
      for (const milestone of shipment.milestones ?? []) {
        if (milestoneNeedsAction(milestone, role)) {
          attention.push({ shipment, milestone });
        }
      }
    }

    return {
      totalEscrowed,
      totalReleased,
      activeCount: active.length,
      awaitingCount: attention.length,
      openDisputes,
      attention,
    };
  }, [shipments, address]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Overview</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total escrowed"
          value={`${stroopsToUsdc(stats.totalEscrowed)} USDC`}
          loading={loading}
          error={error}
        />
        <StatCard
          label="Total released"
          value={`${stroopsToUsdc(stats.totalReleased)} USDC`}
          loading={loading}
          error={error}
        />
        <StatCard
          label="Active shipments"
          value={String(stats.activeCount)}
          loading={loading}
          error={error}
        />
        <StatCard
          label="Milestones awaiting my action"
          value={String(stats.awaitingCount)}
          loading={loading}
          error={error}
        />
        <StatCard
          label="Open disputes"
          value={String(stats.openDisputes)}
          loading={loading}
          error={error}
        />
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Needs your attention
        </h2>
        {loading ? (
          <div className="mt-3 space-y-2">
            <div className="h-5 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="h-5 w-1/2 animate-pulse rounded bg-gray-200" />
          </div>
        ) : error ? (
          <p className="mt-3 text-sm text-gray-500">
            Unable to load your escrow activity. Please try again later.
          </p>
        ) : stats.attention.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            Nothing needs your attention right now.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {stats.attention.map(({ shipment, milestone }) => (
              <li key={`${shipment.id}-${milestone.id}`}>
                <Link
                  href={`/dashboard/shipments/${shipment.id}`}
                  className="flex items-center justify-between py-2 text-sm hover:text-blue-600"
                >
                  <span className="font-medium text-gray-900">
                    {shipment.id}
                  </span>
                  <span className="text-gray-500">{milestone.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
