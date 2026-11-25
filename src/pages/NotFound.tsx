import { Link } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function NotFound() {
  useDocumentTitle("Page not found");
  return (
    <div className="mx-auto max-w-xl py-12 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-gray-600">
        There is nothing at this address. Try searching for an account, transaction or block, or go
        back to the <Link to="/" className="text-blue-600 hover:underline">home page</Link>.
      </p>
      <div className="mt-6 text-left">
        <SearchBar />
      </div>
    </div>
  );
}
