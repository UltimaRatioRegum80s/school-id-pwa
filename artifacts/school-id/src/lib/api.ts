import { setAuthTokenGetter } from "@workspace/api-client-react";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

setAuthTokenGetter(() => localStorage.getItem("school-id-token") ?? null);

export function getApiUrl(): string {
  return `${BASE_URL}/api`;
}

export { BASE_URL };
