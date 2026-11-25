import type { ReactNode } from "react";
import { formatCount } from "../utils/format";

export interface TabDef<T extends string> {
  id: T;
  label: ReactNode;
  count?: number;
}

export default function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: TabDef<T>[];
  active: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-1 overflow-x-auto border-b border-gray-200"
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`-mb-px inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              selected
                ? "border-accent-500 text-gray-900"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.count != null && (
              <span
                className={`rounded-full px-1.5 text-xs ${selected ? "bg-accent-100 text-accent-800" : "bg-gray-100 text-gray-500"}`}
              >
                {formatCount(tab.count)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
