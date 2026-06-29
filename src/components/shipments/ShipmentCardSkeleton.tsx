export function ShipmentCardSkeleton() {
  return (
    <div className="card p-5 animate-pulse">
      {/* Top row: id+badge left, amounts right */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-3.5 bg-gray-100 rounded w-28" />
            <div className="h-5 bg-gray-100 rounded-full w-14" />
          </div>
          <div className="h-3 bg-gray-100 rounded w-48" />
        </div>
        <div className="text-right">
          <div className="h-3.5 bg-gray-100 rounded w-16 mb-1" />
          <div className="h-3 bg-gray-100 rounded w-20" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2" />

      {/* Bottom row: milestones left, arrow right */}
      <div className="flex items-center justify-between">
        <div className="h-3 bg-gray-100 rounded w-32" />
        <div className="h-3.5 w-3.5 bg-gray-100 rounded" />
      </div>
    </div>
  );
}
