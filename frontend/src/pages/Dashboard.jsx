import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const RISK_LEVELS = ["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"];

const RISK_STYLES = {
  LOW: {
    text: "text-emerald-300",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    dot: "bg-emerald-400",
  },
  MEDIUM: {
    text: "text-yellow-300",
    badge: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    dot: "bg-yellow-400",
  },
  HIGH: {
    text: "text-orange-300",
    badge: "border-orange-500/30 bg-orange-500/10 text-orange-300",
    dot: "bg-orange-400",
  },
  CRITICAL: {
    text: "text-red-300",
    badge: "border-red-500/30 bg-red-500/10 text-red-300",
    dot: "bg-red-400",
  },
};

const normalizeAds = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.ads)) return data.ads;
  return [];
};

const StatCard = ({ title, value, icon, color, description }) => (
  <div className="group rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition duration-300 hover:-translate-y-1 hover:border-slate-600 sm:p-6">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <p className={`mt-3 text-4xl font-extrabold ${color}`}>
          {value}
        </p>
      </div>

      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-2xl">
        {icon}
      </div>
    </div>

    <p className="mt-4 text-xs leading-5 text-slate-500">
      {description}
    </p>
  </div>
);

const RiskBadge = ({ riskLevel }) => {
  const risk = String(riskLevel || "UNKNOWN").toUpperCase();
  const style = RISK_STYLES[risk];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold ${
        style?.badge || "border-slate-700 bg-slate-800 text-slate-300"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          style?.dot || "bg-slate-400"
        }`}
      />
      {risk}
    </span>
  );
};

const LoadingRows = () => (
  <div className="space-y-3 p-5">
    {[1, 2, 3, 4].map((item) => (
      <div
        key={item}
        className="flex animate-pulse items-center gap-4 rounded-xl bg-slate-800/60 p-4"
      >
        <div className="h-7 w-20 rounded-lg bg-slate-700" />
        <div className="h-5 w-12 rounded bg-slate-700" />
        <div className="h-5 flex-1 rounded bg-slate-700" />
      </div>
    ))}
  </div>
);

const Dashboard = () => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAds = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const res = await api.get("/ads");
      setAds(normalizeAds(res.data));
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load dashboard data:", err);

      setError(
        err.response?.data?.message ||
          "Unable to fetch investigations. Check the backend connection and try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  const counts = useMemo(() => {
    const result = {
      total: ads.length,
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    ads.forEach((ad) => {
      const risk = String(ad.riskLevel || "").toUpperCase();

      if (Object.prototype.hasOwnProperty.call(result, risk)) {
        result[risk] += 1;
      }
    });

    return result;
  }, [ads]);

  const filteredAds = useMemo(() => {
    const query = search.trim().toLowerCase();

    return ads
      .filter((ad) => {
        const risk = String(ad.riskLevel || "UNKNOWN").toUpperCase();

        const matchesRisk = riskFilter === "ALL" || risk === riskFilter;

        const searchableText = [
          ad.text,
          ad.title,
          ad.description,
          ad.platform,
          ad.source,
          ad.url,
          ad.riskLevel,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return matchesRisk && searchableText.includes(query);
      })
      .slice()
      .reverse();
  }, [ads, search, riskFilter]);

  const stats = [
    {
      title: "Total Advertisements",
      value: counts.total,
      icon: "▤",
      color: "text-cyan-400",
      description: "All advertisements recorded in the dataset",
    },
    {
      title: "Low Risk",
      value: counts.LOW,
      icon: "✓",
      color: "text-emerald-400",
      description: "Classified as low-risk content",
    },
    {
      title: "Medium Risk",
      value: counts.MEDIUM,
      icon: "◉",
      color: "text-yellow-400",
      description: "Content requiring further review",
    },
    {
      title: "High Risk",
      value: counts.HIGH,
      icon: "⚠",
      color: "text-orange-400",
      description: "Suspicious activity requiring investigation",
    },
    {
      title: "Critical Threats",
      value: counts.CRITICAL,
      icon: "!",
      color: "text-red-400",
      description: "Highest-priority cases for review",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-cyan-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
              Intelligence Overview
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Investigation
              <span className="text-cyan-400"> Dashboard</span>
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
              Monitor financial advertisement risks, suspicious activity
              and investigation records in one place.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchAds(true)}
            disabled={loading || refreshing}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-500/50 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:self-center"
          >
            <span className={refreshing ? "animate-spin" : ""}>↻</span>
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </button>
        </header>

        {/* Connection Status */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span
              className={`h-2 w-2 rounded-full ${
                error
                  ? "bg-red-400"
                  : loading
                    ? "bg-yellow-400"
                    : "bg-emerald-400"
              }`}
            />

            {error
              ? "Data connection issue"
              : loading
                ? "Loading investigation records..."
                : "Dashboard data loaded"}
          </div>

          <span className="text-xs text-slate-500">
            {lastUpdated
              ? `Last updated: ${lastUpdated.toLocaleTimeString()}`
              : "Waiting for data"}
          </span>
        </div>

        {/* Error Message */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/5 p-5"
          >
            <h3 className="font-semibold text-red-300">
              Unable to load dashboard
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              {error}
            </p>

            <button
              type="button"
              onClick={() => fetchAds()}
              className="mt-4 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Statistics */}
        <section
          aria-label="Advertisement risk statistics"
          className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        >
          {stats.map((stat) => (
            <StatCard
              key={stat.title}
              {...stat}
              value={loading ? "—" : stat.value}
            />
          ))}
        </section>

        {/* Critical Threat Banner */}
        {!loading && counts.CRITICAL > 0 && (
          <section className="mb-8 overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-950/80 via-red-900/40 to-slate-900 p-5 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-2xl text-red-400">
                  ⚠
                </div>

                <div>
                  <h2 className="text-xl font-bold text-red-200">
                    Critical Threats Require Review
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-red-100/70">
                    {counts.CRITICAL} advertisement
                    {counts.CRITICAL === 1 ? "" : "s"} classified as critical.
                    Review the available evidence and verify each case.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRiskFilter("CRITICAL")}
                className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
              >
                Review Critical Cases →
              </button>
            </div>
          </section>
        )}

        {/* Investigation Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 p-5 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-xl font-bold sm:text-2xl">
                  Recent Investigations
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Search records and filter them by risk classification.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search advertisements..."
                  aria-label="Search investigations"
                  className="min-h-11 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-500 sm:min-w-64"
                />

                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  aria-label="Filter by risk level"
                  className="min-h-11 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500"
                >
                  {RISK_LEVELS.map((risk) => (
                    <option key={risk} value={risk}>
                      {risk === "ALL" ? "All Risk Levels" : risk}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Showing {loading ? "—" : filteredAds.length} of{" "}
              {loading ? "—" : ads.length} advertisements
            </p>
          </div>

          {loading ? (
            <LoadingRows />
          ) : filteredAds.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left">
                <thead>
                  <tr className="bg-slate-950/70">
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Risk Level
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Score
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Advertisement
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Record ID
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAds.map((ad, index) => (
                    <tr
                      key={ad._id || ad.id || `${ad.text}-${index}`}
                      className="border-t border-slate-800 transition hover:bg-slate-800/50"
                    >
                      <td className="whitespace-nowrap px-5 py-4">
                        <RiskBadge riskLevel={ad.riskLevel} />
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-semibold text-slate-200">
                          {ad.score ?? "—"}
                        </span>
                      </td>

                      <td className="max-w-md px-5 py-4">
                        <p className="break-words text-sm leading-6 text-slate-300">
                          {ad.text
                            ? ad.text.length > 120
                              ? `${ad.text.slice(0, 120)}...`
                              : ad.text
                            : ad.title || ad.description || "No text available"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-mono text-xs text-slate-500">
                          {ad._id
                            ? `${String(ad._id).slice(0, 10)}...`
                            : ad.id
                              ? `${String(ad.id).slice(0, 10)}...`
                              : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-2xl text-slate-400">
                ⌕
              </div>

              <h3 className="text-lg font-bold">
                {search || riskFilter !== "ALL"
                  ? "No matching investigations"
                  : "No investigations found"}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                {search || riskFilter !== "ALL"
                  ? "Try another search term or change the selected risk level."
                  : error
                    ? "The records could not be retrieved. Try refreshing the dashboard."
                    : "No advertisements are currently available in the loaded dataset."}
              </p>

              {(search || riskFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setRiskFilter("ALL");
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
        <footer className="mt-8 border-t border-slate-800 py-6 text-center">
          <p className="text-sm font-semibold text-slate-400">
            FinShield AI · Investigation Dashboard
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-600">
            Risk classifications support investigation and do not independently
            establish criminal activity.
          </p>
        </footer>
      </div>
    </main>
  );
};

export default Dashboard;
