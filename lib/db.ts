import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // set true ONLY if your server requires SSL
});

export default pool;
