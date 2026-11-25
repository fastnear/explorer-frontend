import {
  ArrowDownLeft,
  ArrowUpRight,
  Code2,
  FileCode,
  Flame,
  Image,
  Key,
  Landmark,
  Repeat,
  Sparkles,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { TxKind } from "../utils/summarizeTx";

const STYLE: Record<TxKind, { icon: LucideIcon; cls: string }> = {
  send: { icon: ArrowUpRight, cls: "bg-blue-100 text-blue-700" },
  receive: { icon: ArrowDownLeft, cls: "bg-green-100 text-green-700" },
  swap: { icon: Repeat, cls: "bg-purple-100 text-purple-700" },
  mint: { icon: Sparkles, cls: "bg-green-100 text-green-700" },
  burn: { icon: Flame, cls: "bg-orange-100 text-orange-700" },
  nft: { icon: Image, cls: "bg-pink-100 text-pink-700" },
  stake: { icon: Landmark, cls: "bg-teal-100 text-teal-700" },
  account: { icon: UserPlus, cls: "bg-accent-100 text-accent-800" },
  key: { icon: Key, cls: "bg-accent-100 text-accent-800" },
  deploy: { icon: FileCode, cls: "bg-gray-100 text-gray-700" },
  call: { icon: Code2, cls: "bg-gray-100 text-gray-700" },
};

export default function KindBadge({
  kind,
  label,
}: {
  kind: TxKind;
  label: string;
}) {
  const { icon: Icon, cls } = STYLE[kind];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}
