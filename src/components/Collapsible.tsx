import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import useDevMode from "../hooks/useDevMode";
import { formatCount } from "../utils/format";

/**
 * A titled section that can be opened and closed.
 * With `dev`, it is open by default only when developer mode is on.
 * `forceOpen` opens it when it becomes true (e.g. a deep link targets its content).
 */
export default function Collapsible({
  title,
  icon,
  count,
  hint,
  defaultOpen,
  dev = false,
  forceOpen = false,
  card = true,
  id,
  children,
}: {
  title: ReactNode;
  icon?: ReactNode;
  count?: number;
  hint?: ReactNode;
  defaultOpen?: boolean;
  dev?: boolean;
  forceOpen?: boolean;
  card?: boolean;
  id?: string;
  children: ReactNode;
}) {
  const devMode = useDevMode();
  const [open, setOpen] = useState(
    forceOpen || (defaultOpen ?? (dev ? devMode : false))
  );

  // Follow the developer-mode switch when it is flipped while the page is open
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (dev) setOpen(devMode);
  }, [dev, devMode]);

  // Open in the same render that `forceOpen` turns on, so whoever asked can
  // find the content in the DOM straight away (e.g. to scroll to it).
  const [wasForced, setWasForced] = useState(forceOpen);
  if (forceOpen !== wasForced) {
    setWasForced(forceOpen);
    if (forceOpen) setOpen(true);
  }

  return (
    <section
      id={id}
      className={card ? "rounded-xl border border-gray-200 bg-surface" : ""}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full cursor-pointer items-center gap-2 text-left text-sm font-semibold text-gray-700 hover:text-gray-900 ${card ? "px-4 py-3" : "py-1"}`}
      >
        <ChevronRight
          className={`size-4 shrink-0 text-gray-400 transition-transform ${open ? "rotate-90" : ""}`}
        />
        {icon}
        <span>{title}</span>
        {count != null && (
          <span className="font-normal text-gray-400">{formatCount(count)}</span>
        )}
        {hint && !open && (
          <span className="ml-auto truncate pl-2 text-xs font-normal text-gray-400">
            {hint}
          </span>
        )}
      </button>
      {open && (
        <div className={card ? "border-t border-gray-100 px-4 py-3" : "mt-2"}>
          {children}
        </div>
      )}
    </section>
  );
}
