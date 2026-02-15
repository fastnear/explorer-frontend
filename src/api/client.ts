import { apiBaseUrl } from "../config";

const BASE_URL = apiBaseUrl;

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
