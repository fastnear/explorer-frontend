import { Link } from "react-router-dom";
import { formatCount } from "../utils/format";

export default function BlockHeight({ height }: { height: number | null }) {
  if (height == null) return <span className="text-gray-400">—</span>;
  return (
    <Link to={`/block/${height}`} className="text-blue-600 hover:underline">
      {formatCount(height)}
    </Link>
  );
}
