import { useState } from "react";
import useTokenPrices, { getFtPrice, computeUsdValue, formatUsd } from "../hooks/useTokenPrices";
import { formatUnits, NEAR_DECIMALS } from "../utils/format";

/**
 * A NEAR amount. Click to switch between NEAR and raw yoctoNEAR.
 * `showPrice` adds the value in USD at the current price.
 */
export default function NearAmount({
  yoctoNear,
  showPrice = false,
  raw = false,
}: {
  yoctoNear?: string;
  showPrice?: boolean;
  /** Start in yoctoNEAR (for protocol-level values such as gas price) */
  raw?: boolean;
}) {
  const value = yoctoNear || "0";
  const [showYocto, setShowYocto] = useState(raw);
  const { prices } = useTokenPrices();
  const priceInfo = showPrice ? getFtPrice(prices, "wrap.near") : undefined;
  const usdValue = priceInfo
    ? computeUsdValue(value, priceInfo.decimals, priceInfo.price)
    : 0;

  return (
    <span
      className="cursor-pointer whitespace-nowrap hover:underline decoration-dotted"
      onClick={(e) => {
        e.stopPropagation();
        setShowYocto(!showYocto);
      }}
      title={showYocto ? "Click to show in NEAR" : "Click to show in yoctoNEAR"}
    >
      {showYocto ? (
        <span className="break-all whitespace-normal">{value} yoctoNEAR</span>
      ) : (
        <>{formatUnits(value, NEAR_DECIMALS)} NEAR</>
      )}
      {showPrice && !showYocto && usdValue > 0 && (
        <span className="ml-1 text-xs font-normal text-gray-400">{formatUsd(usdValue)}</span>
      )}
    </span>
  );
}
