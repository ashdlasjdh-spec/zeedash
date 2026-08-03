import { Pool } from "pg";

let pool;
export function db() {
  if (!pool) {
    const url = process.env.DATABASE_URL || "";
    // Railway (and most hosted Postgres) require SSL. Only skip it for local dev.
    const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    pool = new Pool({
      connectionString: url,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function query(text, params) {
  const res = await db().query(text, params);
  return res.rows;
}
