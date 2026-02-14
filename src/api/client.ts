const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://tx.main.fastnear.com";

export async function fetchApi<T>(
  endpoint: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}/v0/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}
