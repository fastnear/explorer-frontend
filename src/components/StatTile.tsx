import type { ReactNode } from "react";

export default function StatTile({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-gray-200 bg-surface px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate text-lg font-semibold text-gray-900">{value}</div>
      {sub && <div className="mt-0.5 truncate text-xs text-gray-500">{sub}</div>}
    </div>
  );
}
