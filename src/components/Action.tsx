import {
  Code2,
  ArrowRightLeft,
  Key,
  UserPlus,
  UserMinus,
  FileCode,
  Coins,
  type LucideIcon,
} from "lucide-react";
import type { ParsedAction } from "../utils/parseTransaction";
import { formatNear } from "../utils/format";

const iconClass = "inline-block size-3.5 text-gray-400";

function Deposit({ deposit }: { deposit?: string }) {
  if (!deposit || deposit === "0") return null;
  return <span className="ml-1 text-gray-500">({formatNear(deposit)})</span>;
}

function ActionFunctionCall({ action }: { action: ParsedAction }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <Code2 className={iconClass} />
      <span>{action.method_name ?? "call"}</span>
      <Deposit deposit={action.deposit} />
    </span>
  );
}

function ActionTransfer({ action }: { action: ParsedAction }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <ArrowRightLeft className={iconClass} />
      <span>Transfer</span>
      <Deposit deposit={action.deposit} />
    </span>
  );
}

const genericIcons: Record<string, LucideIcon> = {
  CreateAccount: UserPlus,
  DeleteAccount: UserMinus,
  AddKey: Key,
  DeleteKey: Key,
  Stake: Coins,
  DeployContract: FileCode,
};

function ActionGeneric({ action }: { action: ParsedAction }) {
  const Icon = genericIcons[action.type];
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      {Icon && <Icon className={iconClass} />}
      <span>{action.type}</span>
    </span>
  );
}

export default function Action({ action }: { action: ParsedAction }) {
  switch (action.type) {
    case "FunctionCall":
      return <ActionFunctionCall action={action} />;
    case "Transfer":
      return <ActionTransfer action={action} />;
    default:
      return <ActionGeneric action={action} />;
  }
}
