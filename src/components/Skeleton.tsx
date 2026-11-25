export default function Skeleton({
  className = "h-4 w-24",
  block = false,
}: {
  className?: string;
  /** Take its own line instead of sitting inline with text */
  block?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`${block ? "block" : "inline-block align-middle"} animate-pulse rounded bg-gray-200 ${className}`}
    />
  );
}
