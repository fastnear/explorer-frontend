import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import BlockDetail from "./pages/BlockDetail";
import TxDetail from "./pages/TxDetail";
import AccountDetail from "./pages/AccountDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="block/:blockId" element={<BlockDetail />} />
          <Route path="tx/:txHash" element={<TxDetail />} />
          <Route path="account/:accountId" element={<AccountDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
