import {
  AlertCircle,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminApi } from "../../hooks/useAuth";
import { useDebounce } from "../../hooks/useDebounce";
import {
  formatDateTime,
  formatNumber,
  maskEmail,
  maskPhone,
} from "../../lib/format";

/**
 * Server-driven table. Searching, sorting and paging all happen in MongoDB against indexes
 * (O(log n + page size) per request), so the browser only ever holds one page (<= 100 rows) and never
 * sorts the full list. Changing a filter aborts the in-flight request so stale responses can't overwrite fresh ones.
 */
const COLUMNS = [
  { key: "ticket", label: "Ticket", sortable: true },
  { key: "name", label: "Name", sortable: true },
  { key: "phone", label: "Phone", sortable: true },
  { key: "email", label: "Email", sortable: true },
  { key: "status", label: "Status", sortable: false },
];

const STATUS_STYLES = {
  eligible: "bg-emerald-100 text-emerald-800",
  won: "bg-gold-100 text-gold-800",
  disqualified: "bg-red-100 text-red-700",
};

export default function ParticipantsTable({ refreshKey }) {
  const adminApi = useAdminApi();
  const [search, setSearch] = useState("");
  const q = useDebounce(search, 350);
  const [sort, setSort] = useState("ticket");
  const [order, setOrder] = useState("asc");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [reveal, setReveal] = useState(false);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [mutatingId, setMutatingId] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [resettingAll, setResettingAll] = useState(false);
  const controllerRef = useRef(null);

  // Back to page 1 whenever the query shape changes.
  useEffect(() => setPage(1), [q, sort, order, status, limit]);

  const load = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError("");
    try {
      const data = await adminApi.participants(
        { q, sort, order, status, page, limit },
        controller.signal,
      );
      setResult(data);
      setLoading(false);
    } catch (err) {
      if (err?.name === "AbortError") return;
      setError(err.message || "Could not load participants.");
      setLoading(false);
    }
  }, [adminApi, q, sort, order, status, page, limit]);

  useEffect(() => {
    load();
    return () => controllerRef.current?.abort();
  }, [load, refreshKey]);

  const toggleSort = (key) => {
    if (sort === key) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setOrder("asc");
    }
  };

  async function exportCsv() {
    setExporting(true);
    try {
      const blob = await adminApi.exportCsv({ q, status, sort, order });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "kingsville-participants.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  async function resetStatus(id) {
    if (!window.confirm("Reset this participant back to eligible status?"))
      return;
    setMutatingId(id);
    try {
      await adminApi.resetParticipantStatus(id);
      await load();
    } catch (err) {
      setError(err.message || "Could not reset status.");
    } finally {
      setMutatingId(null);
    }
  }

  async function deleteParticipant(id) {
    if (!window.confirm("Delete this participant permanently?")) return;
    setMutatingId(id);
    try {
      await adminApi.deleteParticipant(id);
      await load();
    } catch (err) {
      setError(err.message || "Could not delete participant.");
    } finally {
      setMutatingId(null);
    }
  }

  async function deleteAllParticipants() {
    if (
      !window.confirm("Delete every participant record? This cannot be undone.")
    )
      return;
    setDeletingAll(true);
    try {
      await adminApi.deleteAllParticipants();
      setPage(1);
      await load();
    } catch (err) {
      setError(err.message || "Could not delete participants.");
    } finally {
      setDeletingAll(false);
    }
  }

  async function resetAllParticipants() {
    if (
      !window.confirm("Reset all current participants back to eligible status?")
    )
      return;
    setResettingAll(true);
    try {
      await adminApi.resetAllParticipants();
      await load();
    } catch (err) {
      setError(err.message || "Could not reset participants.");
    } finally {
      setResettingAll(false);
    }
  }

  const rows = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <section
      aria-labelledby="participants-title"
      className="rounded-2xl border border-emerald-900/10 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-emerald-900/10 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <h2
          id="participants-title"
          className="font-display text-xl font-bold text-emerald-950"
        >
          Registered participants
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:w-auto">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-800/50"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, email or KV-001"
              aria-label="Search participants"
              className="input w-full py-2.5 pl-9 text-sm sm:w-72"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            className="input w-full py-2.5 text-sm sm:w-36"
          >
            <option value="all">All statuses</option>
            <option value="eligible">Eligible</option>
            <option value="won">Won</option>
          </select>
          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="btn-outline w-full sm:w-auto"
            aria-pressed={reveal}
            title="Show or hide full phone numbers and emails"
          >
            {reveal ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
            {reveal ? "Hide Details" : "Show Details"}
          </button>
          <button
            type="button"
            onClick={resetAllParticipants}
            disabled={resettingAll || total === 0}
            className="btn-outline w-full sm:w-auto"
          >
            {resettingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            )}
            Reset all
          </button>
          <button
            type="button"
            onClick={deleteAllParticipants}
            disabled={deletingAll || total === 0}
            className="btn-outline w-full text-red-700 hover:bg-red-50 sm:w-auto"
          >
            {deletingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            )}
            Delete all
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={exporting || total === 0}
            className="btn-outline w-full sm:w-auto"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="h-4 w-4" aria-hidden="true" />
            )}
            CSV
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="m-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" aria-hidden="true" /> {error}
          </span>
          <button
            type="button"
            onClick={load}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <div
        className={`overflow-x-auto transition-opacity ${loading && result ? "opacity-60" : ""}`}
      >
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-emerald-50/70 text-xs uppercase tracking-wider text-emerald-900/70">
            <tr>
              {COLUMNS.map((col) => {
                const active = sort === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={
                      active
                        ? order === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className="px-4 py-3 font-semibold sm:px-5"
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-emerald-950 ${active ? "text-emerald-950" : ""}`}
                      >
                        {col.label}
                        {active ? (
                          order === "asc" ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-900/5">
            {!result &&
              loading &&
              Array.from({ length: 8 }, (_, i) => (
                <tr key={i}>
                  {COLUMNS.map((c) => (
                    <td key={c.key} className="px-4 py-3.5 sm:px-5">
                      <div className="skeleton h-4 rounded" />
                    </td>
                  ))}
                </tr>
              ))}

            {result && rows.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length}
                  className="px-5 py-14 text-center text-emerald-900/60"
                >
                  {q || status !== "all"
                    ? "No participants match your search."
                    : "No registrations yet."}
                </td>
              </tr>
            )}

            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-emerald-50/40">
                <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-emerald-900 sm:px-5">
                  {p.ticketNumber}
                </td>
                <td className="px-4 py-3 font-medium sm:px-5">{p.name}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono sm:px-5">
                  {reveal ? p.phone : maskPhone(p.phone)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono sm:px-5">
                  {reveal ? p.email : maskEmail(p.email)}
                </td>
                <td className="px-4 py-3 sm:px-5">
                  <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[p.status]}`}
                    >
                      {p.status === "won" && (
                        <Trophy className="h-3 w-3" aria-hidden="true" />
                      )}
                      {p.status === "won" && p.prizeName
                        ? `Won: ${p.prizeName}`
                        : p.status}
                    </span>
                    <div className="flex gap-2">
                      {p.status !== "eligible" && (
                        <button
                          type="button"
                          onClick={() => resetStatus(p.id)}
                          disabled={mutatingId === p.id || loading}
                          className="btn-outline px-2 py-1 text-[11px]"
                        >
                          {mutatingId === p.id ? (
                            <Loader2
                              className="h-3.5 w-3.5 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            "Reset"
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteParticipant(p.id)}
                        disabled={mutatingId === p.id || loading}
                        className="btn-outline px-2 py-1 text-[11px] text-red-700 hover:bg-red-50"
                      >
                        {mutatingId === p.id ? (
                          <Loader2
                            className="h-3.5 w-3.5 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>
                  {p.wonAt && (
                    <span className="mt-1 block text-xs text-emerald-900/50">
                      {formatDateTime(p.wonAt)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-emerald-900/10 p-4 text-sm text-emerald-900/70 sm:flex-row sm:px-5">
        <p aria-live="polite">
          {total === 0
            ? "No results"
            : `Showing ${formatNumber(from)}–${formatNumber(to)} of ${formatNumber(total)}`}
        </p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            Rows
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-lg border border-emerald-900/20 bg-white px-2 py-1.5"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              aria-label="Previous page"
              className="btn-outline px-2.5 py-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[88px] text-center tabular-nums">
              Page {page} / {formatNumber(totalPages)}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              aria-label="Next page"
              className="btn-outline px-2.5 py-2"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
