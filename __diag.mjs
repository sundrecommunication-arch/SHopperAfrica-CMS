import fs from "fs";
import postgres from "postgres";

const envText = fs.readFileSync(".env", "utf8");
const match = envText.match(/^DATABASE_URL=(.*)$/m);
if (!match) { console.log("DATABASE_URL not found in .env"); process.exit(1); }
let url = match[1].trim().replace(/^"|"$/g, "");

const sql = postgres(url, { ssl: "require", max: 1, connect_timeout: 10 });

try {
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name IN
    ('meta_title','meta_description','search_console_verification','llms_txt')
  `;
  console.log("stores SEO columns present:", cols.map(c => c.column_name));

  const custCols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'customers' AND column_name = 'password_hash'
  `;
  console.log("customers.password_hash present:", custCols.length > 0);

  const sessTable = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_name = 'customer_sessions'
  `;
  console.log("customer_sessions table present:", sessTable.length > 0);
} catch (err) {
  console.log("QUERY ERROR:", err.message);
} finally {
  await sql.end({ timeout: 1 });
}
