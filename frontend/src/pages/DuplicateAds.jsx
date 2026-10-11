import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const CampaignCard = ({ item, index }) => {
  const identifier = String(item._id ?? "Unknown");
  const ads = Array.isArray(item.ads) ? item.ads : [];
  const count = Number(item.count) || ads.length;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 transition duration-300 hover:border-slate-600">
      {/* Campaign Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-2xl text-red-400">
            ⌕
          </div>

          <div className="min-w-0">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
              Campaign {index + 1}
            </p>

            <h2 className="break-all text-xl font-bold text-white sm:text-2xl">
              {identifier}
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Repeated identifier across advertisements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 sm:self-center">
          <span className="h-2 w-2 rounded-full bg-orange-400" />
          <span className="text-sm font-bold text-orange-300">
            {count} Ads
          </span>
        </div>
      </div>

      {/* Campaign Metrics */}
      <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Identifier
          </p>

          <p className="mt-3 break-all text-sm font-semibold text-cyan-300">
            {identifier}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Occurrences
          </p>

          <p className="mt-3 text-2xl font-bold text-white">
            {count}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Investigation Status
          </p>

          <p className="mt-3 text-sm font-semibold text-orange-300">
            Needs Review
          </p>
        </div>
      </div>

      {/* Linked Advertisements */}
      <div className="px-5 pb-6 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white">
              Linked Advertisements
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              {ads.length} associated record{ads.length === 1 ? "" : "s"}
            </p>
          </div>

          <span className="rounded-lg bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300">
            Evidence
          </span>
        </div>

        {ads.length > 0 ? (
          <div className="space-y-3">
            {ads.map((ad, adIndex) => (
              <div
                key={`${identifier}-${adIndex}`}
                className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-cyan-300">
                  {adIndex + 1}
                </span>

                <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
                  {typeof ad === "string"
                    ? ad
                    : ad?.text || ad?.title || "Advertisement content unavailable"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-500">
            No advertisement details were returned for this campaign.
          </p>
        )}
      </div>
    </article>
  );
};

const DuplicateAds = () => {
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDuplicates = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const res = await api.get("/ads/duplicates");

      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.duplicates)
          ? res.data.duplicates
          : [];

      setDuplicates(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load duplicate campaigns:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load campaign data. Check the backend connection and try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDuplicates();
  }, [loadDuplicates]);

  const totalAds = useMemo(
    () =>
      duplicates.reduce(
        (sum, item) => sum + (Number(item.count) || 0),
        0
      ),
    [duplicates]
  );

  const filteredDuplicates = useMemo(() => {
    const query = search.trim().toLowerCase();

    return duplicates.filter((item) => {
      const identifier = String(item._id ?? "");
      const ads = Array.isArray(item.ads) ? item.ads : [];

      const searchableText = [
        identifier,
        item.count,
        ...ads.map((ad) =>
          typeof ad === "string"
            ? ad
            : `${ad?.text || ""} ${ad?.title || ""}`
        ),
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [duplicates, search]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Hero Header */}
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-cyan-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
              Campaign Intelligence
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Campaign Analysis
              <span className="text-cyan-400"> Center</span>
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              Identify repeated phone numbers and other shared identifiers
              across suspicious financial advertisements to support
              coordinated campaign investigations.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadDuplicates(true)}
            disabled={loading || refreshing}
            className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-500/50 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:self-center"
          >
            <span className={refreshing ? "animate-spin" : ""}>↻</span>
            {refreshing ? "Refreshing..." : "Refresh Campaigns"}
          </button>
        </header>

        {/* Status Bar */}
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
              ? "Connection issue"
              : loading
                ? "Loading campaign data..."
                : "Campaign data loaded"}
          </div>

          <span className="text-xs text-slate-500">
            {lastUpdated
              ? `Last updated: ${lastUpdated.toLocaleTimeString()}`
              : "Waiting for data"}
          </span>
        </div>

        {/* Error State */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/5 p-5"
          >
            <h2 className="font-semibold text-red-300">
              Failed to load campaign data
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              {error}
            </p>

            <button
              type="button"
              onClick={() => loadDuplicates()}
              className="mt-4 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <section
          aria-label="Campaign statistics"
          className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
            <p className="text-sm text-slate-400">
              Repeated Identifiers
            </p>

            <p className="mt-3 text-4xl font-extrabold text-cyan-400">
              {loading ? "—" : duplicates.length}
            </p>

            <p className="mt-3 text-xs text-slate-500">
              Groups returned by the campaign API
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:p-6">
            <p className="text-sm text-slate-400">
              Associated Advertisements
            </p>

            <p className="mt-3 text-4xl font-extrabold text-orange-400">
              {loading ? "—" : totalAds}
            </p>

            <p className="mt-3 text-xs text-slate-500">
              Total occurrences reported across returned groups
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 sm:col-span-2 sm:p-6 xl:col-span-1">
            <p className="text-sm text-slate-400">
              Investigation Status
            </p>

            <p className="mt-3 text-2xl font-extrabold text-violet-300">
              {loading ? "—" : duplicates.length > 0 ? "Review Required" : "No Matches"}
            </p>

            <p className="mt-3 text-xs text-slate-500">
              Repeated identifiers should be verified before drawing conclusions
            </p>
          </div>
        </section>

        {/* Search */}
        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">
                Linked Campaigns
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Search by identifier or advertisement content.
              </p>
            </div>

            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaigns..."
              aria-label="Search campaigns"
              className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-500 sm:w-80"
            />
          </div>

          <p className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-500">
            Showing {loading ? "—" : filteredDuplicates.length} of{" "}
            {loading ? "—" : duplicates.length} campaign groups
          </p>
        </section>

        {/* Campaign Results */}
        <section aria-label="Campaign investigation results">
          {loading ? (
            <div className="space-y-5">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900 p-6"
                >
                  <div className="h-6 w-1/3 rounded bg-slate-800" />
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="h-20 rounded-xl bg-slate-800" />
                    <div className="h-20 rounded-xl bg-slate-800" />
                    <div className="h-20 rounded-xl bg-slate-800" />
                  </div>
                  <div className="mt-5 h-16 rounded-xl bg-slate-800" />
                </div>
              ))}
            </div>
          ) : filteredDuplicates.length > 0 ? (
            <div className="space-y-5">
              {filteredDuplicates.map((item, index) => (
                <CampaignCard
                  key={String(item._id ?? index)}
                  item={item}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-14 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-3xl text-emerald-400">
                ✓
              </div>

              <h2 className="text-xl font-bold text-white">
                {search
                  ? "No Matching Campaigns"
                  : error
                    ? "Campaign Data Unavailable"
                    : "No Repeated Identifiers Found"}
              </h2>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
                {search
                  ? "Try another identifier or search term."
                  : error
                    ? "Retry the request to retrieve campaign data."
                    : "The API returned no duplicate groups. This does not guarantee that all advertisements are legitimate or unrelated."}
              </p>

              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-5 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-cyan-300 transition hover:bg-slate-800"
                >
                  Clear Search
                </button>
              ) : error ? (
                <button
                  type="button"
                  onClick={() => loadDuplicates()}
                  className="mt-5 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-cyan-300 transition hover:bg-slate-800"
                >
                  Retry
                </button>
              ) : null}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-10 border-t border-slate-800 py-6 text-center">
          <p className="text-sm font-semibold text-slate-400">
            FinShield AI · Campaign Intelligence
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-600">
            Shared identifiers are investigative leads, not proof of fraud
            or coordinated criminal activity.
          </p>
        </footer>
      </div>
    </main>
  );
};

export default DuplicateAds;
