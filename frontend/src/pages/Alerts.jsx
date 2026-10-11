import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import AlertPanel from "../components/AlertPanel";

const FILTERS = [
  { label: "All Threats", value: "ALL" },
  { label: "Critical", value: "CRITICAL" },
  { label: "High Risk", value: "HIGH" },
];

const StatCard = ({ title, value, description, icon, color }) => (
  <div className="group rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition duration-300 hover:-translate-y-1 hover:border-slate-600 sm:p-6">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <p className={`mt-3 text-4xl font-bold tracking-tight ${color}`}>
          {value}
        </p>
      </div>

      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-2xl">
        {icon}
      </div>
    </div>

    <p className="mt-4 text-xs text-slate-500">{description}</p>
  </div>
);

const LoadingSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {[1, 2, 3].map((item) => (
      <div
        key={item}
        className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900 p-6"
      >
        <div className="h-4 w-1/3 rounded bg-slate-800" />
        <div className="mt-5 h-6 w-2/3 rounded bg-slate-800" />
        <div className="mt-4 h-4 w-full rounded bg-slate-800" />
        <div className="mt-2 h-4 w-4/5 rounded bg-slate-800" />
        <div className="mt-6 h-10 rounded-lg bg-slate-800" />
      </div>
    ))}
  </div>
);

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadAlerts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const res = await api.get("/ads");
      const ads = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.ads)
          ? res.data.ads
          : [];

      const highRiskAds = ads.filter(
        (ad) =>
          ad.riskLevel === "HIGH" ||
          ad.riskLevel === "CRITICAL"
      );

      setAlerts(highRiskAds);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load threat alerts:", err);
      setError(
        err.response?.data?.message ||
          "Unable to load threat alerts. Check your server connection and try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const criticalCount = useMemo(
    () => alerts.filter((ad) => ad.riskLevel === "CRITICAL").length,
    [alerts]
  );

  const highCount = useMemo(
    () => alerts.filter((ad) => ad.riskLevel === "HIGH").length,
    [alerts]
  );

  const filteredAlerts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return alerts.filter((ad) => {
      const matchesRisk =
        activeFilter === "ALL" || ad.riskLevel === activeFilter;

      const searchableText = [
        ad.title,
        ad.description,
        ad.platform,
        ad.source,
        ad.url,
        ad.phoneNumber,
        ad.riskLevel,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesRisk && searchableText.includes(query);
    });
  }, [alerts, search, activeFilter]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-red-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              Threat Monitoring
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Threat Intelligence
              <span className="text-cyan-400"> Center</span>
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Monitor suspicious financial advertisements, detect high-risk
              campaigns, and investigate potential fraud indicators.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadAlerts(true)}
            disabled={loading || refreshing}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-500/50 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 lg:self-center"
          >
            <span className={refreshing ? "animate-spin" : ""}>↻</span>
            {refreshing ? "Refreshing..." : "Refresh Alerts"}
          </button>
        </header>

        {/* Status Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span
              className={`h-2 w-2 rounded-full ${
                error ? "bg-red-500" : loading ? "bg-amber-400" : "bg-emerald-400"
              }`}
            />
            {error
              ? "Connection issue"
              : loading
                ? "Fetching threat data..."
                : "Threat data loaded"}
          </div>

          <p className="text-xs text-slate-500">
            {lastUpdated
              ? `Last updated: ${lastUpdated.toLocaleTimeString()}`
              : "Waiting for first update"}
          </p>
        </div>

        {/* Statistics */}
        <section
          aria-label="Threat statistics"
          className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          <StatCard
            title="Active High-Risk Alerts"
            value={loading ? "—" : alerts.length}
            description="Total HIGH and CRITICAL cases"
            icon="◈"
            color="text-cyan-400"
          />

          <StatCard
            title="Critical Threats"
            value={loading ? "—" : criticalCount}
            description="Cases requiring priority investigation"
            icon="⚠"
            color="text-red-400"
          />

          <StatCard
            title="High-Risk Cases"
            value={loading ? "—" : highCount}
            description="Suspicious activity requiring review"
            icon="⌕"
            color="text-orange-400"
          />
        </section>

        {/* Search and Filters */}
        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold">Alert Investigation</h2>
              <p className="mt-1 text-sm text-slate-400">
                Search suspicious advertisements and filter by risk level.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 sm:min-w-64">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                  ⌕
                </span>

                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search alerts..."
                  aria-label="Search alerts"
                  className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {FILTERS.map((filter) => {
                  const selected = activeFilter === filter.value;

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setActiveFilter(filter.value)}
                      aria-pressed={selected}
                      className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        selected
                          ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
                          : "border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-500 hover:text-white"
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-500">
            Showing {loading ? "—" : filteredAlerts.length} of{" "}
            {loading ? "—" : alerts.length} high-risk alerts
          </div>
        </section>

        {/* Error State */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/5 p-5"
          >
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-semibold text-red-400">
                  Failed to load alerts
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() => loadAlerts()}
                className="rounded-lg bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Alerts Content */}
        <section aria-label="High-risk advertisement alerts">
          {loading ? (
            <LoadingSkeleton />
          ) : error && alerts.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-10 text-center">
              <div className="mb-3 text-4xl">⌁</div>
              <h2 className="text-xl font-bold">Threat data unavailable</h2>
              <p className="mt-2 text-sm text-slate-400">
                Resolve the connection issue to view the latest alerts.
              </p>
            </div>
          ) : filteredAlerts.length > 0 ? (
            <AlertPanel alerts={filteredAlerts} />
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-5 py-14 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-3xl text-emerald-400">
                ✓
              </div>

              <h2 className="text-xl font-bold">
                {search || activeFilter !== "ALL"
                  ? "No matching alerts"
                  : "No high-risk alerts found"}
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                {search || activeFilter !== "ALL"
                  ? "Try a different search term or select another risk filter."
                  : "There are currently no HIGH or CRITICAL advertisements in the loaded dataset. This does not guarantee that the platform is free of suspicious activity."}
              </p>

              {(search || activeFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setActiveFilter("ALL");
                  }}
                  className="mt-5 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-cyan-300 transition hover:bg-slate-800"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-10 border-t border-slate-800 py-5 text-center text-xs leading-5 text-slate-500">
          Threat Intelligence Dashboard · Suspicious advertisement monitoring
          <p className="mt-1">
            Risk classifications are indicators for investigation, not proof of
            criminal activity.
          </p>
        </footer>
      </div>
    </main>
  );
};

export default Alerts;
