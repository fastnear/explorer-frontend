import { useEffect } from "react";

const BASE = "NEAR Rocks";

export default function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} · ${BASE}` : prev;
    return () => {
      document.title = prev;
    };
  }, [title]);
}
