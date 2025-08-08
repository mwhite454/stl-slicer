import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  throw new Error("TURSO_DATABASE_URL is not set");
}

if (!authToken) {
  throw new Error("TURSO_AUTH_TOKEN is not set");
}

export const turso = createClient({
  url,
  authToken,
});
