import { desc } from "drizzle-orm";
import { db } from "@/db";
import { syncRuns } from "@/db/schema";
import { SyncButton } from "@/components/SyncButton";

export const dynamic = "force-dynamic";

export default async function SyncPage() {
  const runs = await db.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(20);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Sync with LeafLink</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Pulls products, staff, and received orders (incrementally, since the last successful sync) from LeafLink into the local database.
        </p>
      </div>

      <SyncButton />

      <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-black/60 dark:border-white/10 dark:text-white/60">
              <th className="px-4 py-3 font-medium">Entity</th>
              <th className="px-4 py-3 font-medium">Started</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Records</th>
              <th className="px-4 py-3 font-medium">Error</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-black/50 dark:text-white/50">
                  No syncs yet. Click &ldquo;Sync now&rdquo; to pull data from LeafLink.
                </td>
              </tr>
            )}
            {runs.map((run) => (
              <tr key={run.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                <td className="px-4 py-3">{run.entity}</td>
                <td className="px-4 py-3">{run.startedAt.toLocaleString()}</td>
                <td className={`px-4 py-3 ${run.status === "error" ? "text-red-600" : run.status === "success" ? "text-emerald-600" : ""}`}>
                  {run.status}
                </td>
                <td className="px-4 py-3 text-right">{run.recordsSynced}</td>
                <td className="max-w-md whitespace-pre-wrap break-all px-4 py-3 text-red-600">{run.error ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
