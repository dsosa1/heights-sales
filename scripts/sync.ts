import "dotenv/config";
import { runFullSync } from "../src/lib/leaflink/sync";

async function main() {
  const results = await runFullSync();
  for (const r of results) {
    if (r.status === "success") {
      console.log(`[sync] ${r.entity}: synced ${r.recordsSynced} records`);
    } else {
      console.error(`[sync] ${r.entity}: FAILED - ${r.error}`);
    }
  }
  const hadError = results.some((r) => r.status === "error");
  process.exit(hadError ? 1 : 0);
}

main().catch((err) => {
  console.error("[sync] unexpected failure:", err);
  process.exit(1);
});
