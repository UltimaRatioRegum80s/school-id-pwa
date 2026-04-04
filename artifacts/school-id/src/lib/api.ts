import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

setBaseUrl(`${BASE_URL}/api`);
setAuthTokenGetter(() => localStorage.getItem("school-id-token") ?? null);

export { BASE_URL };
