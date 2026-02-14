import {
  Code2,
  ArrowRightLeft,
  Key,
  UserPlus,
  UserMinus,
  FileCode,
  Coins,
  Fuel,
  type LucideIcon,
} from "lucide-react";
import JsonView from "@uiw/react-json-view";
import type { ParsedAction } from "../utils/parseTransaction";
import GasAmount from "./GasAmount";
import NearAmount from "./NearAmount";

const iconClass = "inline-block size-3.5 text-gray-400";

function Deposit({ deposit }: { deposit?: string }) {
  if (!deposit || deposit === "0") return null;
  return <span className="ml-1 text-gray-500">(<NearAmount yoctoNear={deposit} />)</span>;
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

function decodeArgs(args?: string): { json: unknown } | { raw: string } | null {
  if (!args) return null;
  try {
    const decoded = atob(args);
    try {
      return { json: JSON.parse(decoded) };
    } catch {
      return { raw: decoded };
    }
  } catch {
    return { raw: args };
  }
}

function ArgsView({ args }: { args?: string }) {
  const decoded = decodeArgs(args);
  if (!decoded) return null;

  if ("json" in decoded) {
    return (
      <div className="mt-1 overflow-auto rounded bg-gray-50 p-2 text-xs">
        <JsonView value={decoded.json as object} collapsed={2} shortenTextAfterLength={512} displayDataTypes={false} />
      </div>
    );
  }

  const raw = decoded.raw;
  return (
    <div className="truncate text-xs text-gray-500" title={raw}>
      {raw.length > 120 ? raw.slice(0, 120) + "..." : raw}
    </div>
  );
}

export function ActionExpanded({ action }: { action: ParsedAction }) {
  if (action.type !== "FunctionCall") {
    return <Action action={action} />;
  }

  return (
    <div className="w-full text-sm space-y-1">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 font-medium">
          <Code2 className={iconClass} />
          <span>{action.method_name ?? "call"}</span>
        </span>
        {action.gas != null && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Fuel className="size-3 text-gray-400" />
            <GasAmount gas={action.gas} />
          </span>
        )}
        {action.deposit && action.deposit !== "0" && (
          <span className="text-xs text-gray-500">
            <NearAmount yoctoNear={action.deposit} />
          </span>
        )}
      </div>
      <ArgsView args={action.args} />
    </div>
  );
}
