import { Link, Outlet } from "react-router-dom";
import SearchBar from "./SearchBar";

const networkId = import.meta.env.VITE_NETWORK_ID || "mainnet";

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg whitespace-nowrap">
            NEAR Explorer
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 uppercase">
              {networkId}
            </span>
          </Link>
          <div className="flex-1">
            <SearchBar />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200 py-4 text-center text-sm text-gray-500">
        NEAR Explorer &middot; Powered by FastNEAR
      </footer>
    </div>
  );
}
