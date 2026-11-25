import {
  Code2,
  ArrowRightLeft,
  Key,
  UserPlus,
  UserMinus,
  FileCode,
  Coins,
  Fuel,
  Radio,
  type LucideIcon,
} from "lucide-react";
import type { ParsedAction } from "../utils/parseTransaction";
import AccountId from "./AccountId";
import Base64Data from "./Base64Data";
import GasAmount from "./GasAmount";
import NearAmount from "./NearAmount";
import CopyButton from "./CopyButton";
import useDevMode from "../hooks/useDevMode";
import { shortenMiddle } from "../utils/format";

const iconClass = "inline-block size-3.5 text-gray-400";

function Deposit({ deposit }: { deposit?: string }) {
  if (!deposit || deposit === "0") return null;
  return <span className="ml-1 text-gray-500" onClick={(e) => e.stopPropagation()}><NearAmount yoctoNear={deposit} /></span>;
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
  Delegate: Radio,
};

function ActionGeneric({ action }: { action: ParsedAction }) {
  const Icon = genericIcons[action.type];
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      {Icon && <Icon className={iconClass} />}
      <span>{action.type}</span>
      {action.stake && action.stake !== "0" && (
        <span className="ml-1 text-gray-500"><NearAmount yoctoNear={action.stake} /></span>
      )}
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

function ActionKeyExpanded({ action }: { action: ParsedAction }) {
  return (
    <div className="w-full text-sm space-y-1">
      <span className="flex items-center gap-1 font-medium">
        <Key className={iconClass} />
        <span>{action.type}</span>
        {action.access_key_permission && (
          <span className="font-normal text-gray-500">({action.access_key_permission})</span>
        )}
      </span>
      {action.public_key && (
        <div className="font-mono text-xs text-gray-400 break-all">{action.public_key}</div>
      )}
    </div>
  );
}

function ActionDeployContractExpanded({ action }: { action: ParsedAction }) {
  return (
    <div className="w-full text-sm space-y-1">
      <span className="flex items-center gap-1 font-medium">
        <FileCode className={iconClass} />
        <span>DeployContract</span>
      </span>
      {action.code_hash && (
        <div className="font-mono text-xs text-gray-400 break-all">{action.code_hash}</div>
      )}
    </div>
  );
}

function ActionDeleteAccountExpanded({ action }: { action: ParsedAction }) {
  return (
    <div className="w-full text-sm space-y-1">
      <span className="flex items-center gap-1 font-medium">
        <UserMinus className={iconClass} />
        <span>DeleteAccount</span>
      </span>
      {action.beneficiary_id && (
        <div className="text-xs text-gray-500">
          Beneficiary: <AccountId accountId={action.beneficiary_id} />
        </div>
      )}
    </div>
  );
}

export function ActionExpanded({ action }: { action: ParsedAction }) {
  if (action.type === "AddKey" || action.type === "DeleteKey") {
    return <ActionKeyExpanded action={action} />;
  }
  if (action.type === "DeleteAccount") {
    return <ActionDeleteAccountExpanded action={action} />;
  }
  if (action.type === "DeployContract") {
    return <ActionDeployContractExpanded action={action} />;
  }
  if (action.type !== "FunctionCall") {
    return <div><Action action={action} /></div>;
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
      {action.args && <Base64Data base64={action.args} />}
    </div>
  );
}

function ShortKey({ publicKey }: { publicKey?: string }) {
  if (!publicKey) return null;
  return (
    <span className="inline-flex items-center gap-0.5 font-mono text-xs text-gray-500" title={publicKey}>
      {shortenMiddle(publicKey, 14, 6)}
      <CopyButton text={publicKey} label="Copy public key" />
    </span>
  );
}

/**
 * One action of a transaction in plain words, e.g. "Call `ft_transfer` on
 * usdt.near". `receiverId` is the account the action is applied to.
 */
export function ActionLine({
  action,
  receiverId,
}: {
  action: ParsedAction;
  receiverId: string;
}) {
  const devMode = useDevMode();
  const target = <AccountId accountId={receiverId} />;
  const muted = "text-gray-600";

  switch (action.type) {
    case "FunctionCall":
      return (
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className={muted}>Call</span>
            <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.85em]">
              {action.method_name ?? "call"}
            </code>
            <span className={muted}>on</span>
            {target}
            {action.deposit && action.deposit !== "0" && (
              <>
                <span className={muted}>with</span>
                <span className="font-medium">
                  <NearAmount yoctoNear={action.deposit} raw={action.deposit === "1"} />
                </span>
                <span className={muted}>attached</span>
              </>
            )}
            {devMode && action.gas != null && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Fuel className="size-3 text-gray-400" />
                <GasAmount gas={action.gas} />
              </span>
            )}
          </div>
          {action.args && (devMode || action.args !== "e30=") && (
            <Base64Data base64={action.args} defaultOpen={devMode} label="Arguments" />
          )}
        </div>
      );
    case "Transfer":
      return (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className={muted}>Send</span>
          <span className="font-medium">
            <NearAmount yoctoNear={action.deposit} showPrice />
          </span>
          <span className={muted}>to</span>
          {target}
        </div>
      );
    case "CreateAccount":
      return (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className={muted}>Create account</span>
          {target}
        </div>
      );
    case "DeleteAccount":
      return (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className={muted}>Delete account</span>
          {target}
          {action.beneficiary_id && (
            <>
              <span className={muted}>and send what is left to</span>
              <AccountId accountId={action.beneficiary_id} />
            </>
          )}
        </div>
      );
    case "AddKey":
      return (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          {action.access_key_contract ? (
            <>
              <span className={muted}>Add a limited access key that can only call</span>
              <AccountId accountId={action.access_key_contract} />
            </>
          ) : (
            <span className={muted}>Add a full-access key to {receiverId}</span>
          )}
          <ShortKey publicKey={action.public_key} />
        </div>
      );
    case "DeleteKey":
      return (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className={muted}>Remove an access key from</span>
          {target}
          <ShortKey publicKey={action.public_key} />
        </div>
      );
    case "DeployContract":
      return (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className={muted}>Deploy contract code to</span>
          {target}
          {action.code_hash && (
            <span className="font-mono text-xs text-gray-500" title={action.code_hash}>
              {shortenMiddle(action.code_hash, 8, 6)}
            </span>
          )}
        </div>
      );
    case "Stake":
      return (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className={muted}>
            {action.stake === "0" ? "Stop validating (set stake to zero)" : "Set validator stake to"}
          </span>
          {action.stake && action.stake !== "0" && (
            <span className="font-medium">
              <NearAmount yoctoNear={action.stake} showPrice />
            </span>
          )}
          <ShortKey publicKey={action.public_key} />
        </div>
      );
    default:
      return (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span className={muted}>{action.type} on</span>
          {target}
        </div>
      );
  }
}
