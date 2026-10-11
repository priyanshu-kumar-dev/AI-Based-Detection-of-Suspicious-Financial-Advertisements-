import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAdvertisements,
  getCampaigns,
  getDuplicateIndicators,
  getAdvertisementById,
  getInvestigationByAdId,
  updateInvestigation,
} from "../services/api";
import "./InvestigationDashboard.css";

const STATUSES = [
  "NEW",
  "UNDER_REVIEW",
  "ESCALATED",
  "RESOLVED",
  "FALSE_POSITIVE",
];

const RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function unwrapList(data, keys = ["ads", "advertisements", "results", "data"]) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  if (Array.isArray(data?.data?.ads)) return data.data.ads;
  if (Array.isArray(data?.data?.advertisements)) {
    return data.data.advertisements;
  }
  return [];
}

function riskLevel(ad = {}) {
  const supplied = String(ad.riskLevel || ad.risk || "").toUpperCase();
  if (RISK_LEVELS.includes(supplied)) return supplied;

  const score = Number(ad.score ?? ad.riskScore ?? 0);
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}

function getAdId(ad) {
  return ad?._id || ad?.id || "";
}

function getAdText(ad) {
  return ad?.text || ad?.ocrText || ad?.content || "No advertisement text";
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function statusOf(ad, investigation) {
  return (
    investigation?.status ||
    ad?.investigationStatus ||
    ad?.status ||
    "NEW"
  ).toUpperCase();
}

function RiskBadge({ level }) {
  const safeLevel = RISK_LEVELS.includes(level) ? level : "LOW";
  return (
    <span className={`risk-badge risk-${safeLevel.toLowerCase()}`}>
      <span className="risk-dot" />
      {safeLevel}
    </span>
  );
}

function StatusBadge({ status }) {
  const safeStatus = STATUSES.includes(status) ? status : "NEW";
  return (
    <span className={`status-badge status-${safeStatus.toLowerCase()}`}>
      {safeStatus.replaceAll("_", " ")}
    </span>
  );
}

function MetricCard({ label, value, hint, icon }) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span className="metric-label">{label}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-hint">{hint}</div>
    </article>
  );
}

function exportCSV(rows, filename) {
  const columns = [
    ["id", "ID"],
    ["text", "Advertisement"],
    ["score", "Risk Score"],
    ["risk", "Risk Level"],
    ["sourceType", "Source Type"],
    ["sourceUrl", "Source URL"],
    ["investigationStatus", "Investigation Status"],
    ["createdAt", "Created At"],
  ];

  const escapeCSV = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const csv = [
    columns.map(([, label]) => escapeCSV(label)).join(","),
    ...rows.map((ad) =>
      columns
        .map(([key]) => {
          if (key === "id") return escapeCSV(getAdId(ad));
          if (key === "text") return escapeCSV(getAdText(ad));
          if (key === "score") {
            return escapeCSV(ad.score ?? ad.riskScore ?? 0);
          }
          if (key === "risk") return escapeCSV(riskLevel(ad));
          return escapeCSV(ad[key]);
        })
        .join(","),
    ),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function IndicatorChips({ label, values }) {
  const items = safeArray(values);
  return (
    <div className="indicator-chip-group">
      <span className="indicator-chip-label">{label}</span>
      <div className="indicator-chips">
        {items.length ? (
          items.map((value, index) => (
            <span className="indicator-chip" key={`${value}-${index}`}>
              {String(value)}
            </span>
          ))
        ) : (
          <span className="muted-text">None detected</span>
        )}
      </div>
    </div>
  );
}

export default function InvestigationDashboard() {
  const [ads, setAds] = useState([]);
  const [campaignData, setCampaignData] = useState({});
  const [duplicateData, setDuplicateData] = useState({});
  const [activeTab, setActiveTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedAd, setSelectedAd] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [investigation, setInvestigation] = useState(null);
  const [relatedAds, setRelatedAds] = useState([]);
  const [editStatus, setEditStatus] = useState("NEW");
  const [assignedTo, setAssignedTo] = useState("");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const loadDashboard = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");

    const results = await Promise.allSettled([
      getAdvertisements(),
      getCampaigns(),
      getDuplicateIndicators(),
    ]);

    if (results[0].status === "fulfilled") {
      setAds(unwrapList(results[0].value));
    } else {
      setError(
        results[0].reason?.message ||
          "Advertisements load nahi hue. Backend/API check karo.",
      );
    }

    if (results[1].status === "fulfilled") {
      setCampaignData(results[1].value || {});
    }

    if (results[2].status === "fulfilled") {
      setDuplicateData(results[2].value || {});
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const campaigns = useMemo(
    () => unwrapList(campaignData, ["campaigns", "results", "data"]),
    [campaignData],
  );

  const duplicateGroups = useMemo(() => {
    const groups = duplicateData?.groups || duplicateData?.duplicates;
    if (Array.isArray(groups)) return groups;
    return Array.isArray(duplicateData?.data?.groups)
      ? duplicateData.data.groups
      : [];
  }, [duplicateData]);

  const riskCounts = useMemo(() => {
    const counts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    ads.forEach((ad) => {
      counts[riskLevel(ad)] += 1;
    });
    return counts;
  }, [ads]);

  const filteredAds = useMemo(() => {
    const query = search.trim().toLowerCase();

    return ads.filter((ad) => {
      const text = [
        getAdText(ad),
        ad.sourceUrl,
        ad.sourceType,
        ...safeArray(ad.phones),
        ...safeArray(ad.upis),
        ...safeArray(ad.urls),
        ...safeArray(ad.keywords),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || text.includes(query);
      const matchesRisk =
        riskFilter === "ALL" || riskLevel(ad) === riskFilter;
      const matchesSource =
        sourceFilter === "ALL" ||
        String(ad.sourceType || "UNKNOWN").toUpperCase() === sourceFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        String(ad.investigationStatus || ad.status || "NEW").toUpperCase() ===
          statusFilter;

      return matchesSearch && matchesRisk && matchesSource && matchesStatus;
    });
  }, [ads, search, riskFilter, sourceFilter, statusFilter]);

  async function openAdvertisement(ad) {
    setSelectedAd(ad);
    setInvestigation(null);
    setRelatedAds([]);
    setHistory([]);
    setNote("");
    setSaveMessage("");
    setDetailLoading(true);

    const id = getAdId(ad);
    let fullAd = ad;
    let fullInvestigation = null;
    let related = [];

    try {
      if (id) {
        const result = await getAdvertisementById(id);
        fullAd =
          result?.advertisement ||
          result?.ad ||
          result?.data?.advertisement ||
          result?.data?.ad ||
          result?.data ||
          result ||
          ad;
      }
    } catch {
      // Advertisement list data will remain available.
    }

    try {
      if (id) {
        const result = await getInvestigationByAdId(id);
        fullAd =
          result?.advertisement ||
          result?.ad ||
          result?.data?.advertisement ||
          fullAd;

        fullInvestigation =
          result?.investigation || result?.data?.investigation || null;

        related = unwrapList(
          result?.relatedAdvertisements || result?.data?.relatedAdvertisements,
          ["ads", "advertisements", "results", "data"],
        );

        if (!related.length) {
          const maybeRelated =
            result?.relatedAdvertisements ||
            result?.data?.relatedAdvertisements;
          if (Array.isArray(maybeRelated)) related = maybeRelated;
        }
      }
    } catch (err) {
      // The ad can still be inspected if no investigation record exists.
      setSaveMessage(
        `Investigation details unavailable: ${err?.message || "API error"}`,
      );
    }

    setSelectedAd(fullAd);
    setInvestigation(fullInvestigation);
    setRelatedAds(related);

    const currentStatus = statusOf(fullAd, fullInvestigation);
    setEditStatus(STATUSES.includes(currentStatus) ? currentStatus : "NEW");
    setAssignedTo(fullInvestigation?.assignedTo || "");
    setHistory(
      safeArray(
        fullInvestigation?.history ||
          fullInvestigation?.activityHistory ||
          fullInvestigation?.activities,
      ),
    );

    setDetailLoading(false);
  }

  async function saveCase() {
    const id = getAdId(selectedAd);
    if (!id) {
      setSaveMessage("Advertisement ID missing hai.");
      return;
    }

    setSaving(true);
    setSaveMessage("");

    try {
      const payload = {
        status: editStatus,
        assignedTo: assignedTo.trim(),
        author: "Analyst",
      };

      if (note.trim()) payload.note = note.trim();

      const result = await updateInvestigation(id, payload);
      const updatedAd =
        result?.advertisement ||
        result?.data?.advertisement ||
        result?.ad ||
        null;
      const updatedInvestigation =
        result?.investigation ||
        result?.data?.investigation ||
        result?.data ||
        null;

      if (updatedAd) setSelectedAd(updatedAd);

      if (updatedInvestigation && typeof updatedInvestigation === "object") {
        setInvestigation(updatedInvestigation);
        setHistory(
          safeArray(
            updatedInvestigation.history ||
              updatedInvestigation.activityHistory ||
              updatedInvestigation.activities,
          ),
        );
        setAssignedTo(updatedInvestigation.assignedTo || assignedTo);
      } else {
        setInvestigation((old) => ({
          ...(old || {}),
          status: editStatus,
          assignedTo: assignedTo.trim(),
        }));
      }

      setSelectedAd((old) =>
        old ? { ...old, investigationStatus: editStatus } : old,
      );
      setNote("");
      setSaveMessage("Investigation successfully saved.");
      await loadDashboard(true);
    } catch (err) {
      setSaveMessage(
        err?.message ||
          "Save nahi hua. API route aur backend server check karo.",
      );
    } finally {
      setSaving(false);
    }
  }

  const flaggedCount = riskCounts.HIGH + riskCounts.CRITICAL;
  const maxRiskCount = Math.max(1, ...Object.values(riskCounts));
  const campaignAds = Number(
    campaignData?.summary?.advertisementsInCampaigns ??
      campaigns.reduce(
        (sum, item) => sum + Number(item.advertisementCount || 0),
        0,
      ),
  );

  return (
    <div className="fs-dashboard">
      <aside className="fs-sidebar">
        <div className="fs-brand">
          <div className="fs-brand-mark">F</div>
          <div>
            <div className="fs-brand-name">
              FinShield<span> AI</span>
            </div>
            <div className="fs-brand-caption">THREAT INTELLIGENCE</div>
          </div>
        </div>

        <div className="sidebar-section-label">WORKSPACE</div>
        <nav className="fs-nav">
          {[
            ["overview", "▦", "Overview"],
            ["ads", "▤", "Advertisements"],
            ["campaigns", "◎", "Campaigns"],
            ["indicators", "⌁", "Shared indicators"],
            ["reports", "▧", "Reports"],
          ].map(([id, icon, label]) => (
            <button
              key={id}
              className={activeTab === id ? "active" : ""}
              onClick={() => setActiveTab(id)}
            >
              <span>{icon}</span>
              {label}
              {id === "ads" && <span className="nav-count">{ads.length}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status"><span /> API workspace</div>
          <div className="sidebar-version">FINSHIELD AI · TASK 06</div>
        </div>
      </aside>

      <main className="fs-main">
        <header className="fs-topbar">
          <div className="breadcrumb">Workspace <span>/</span> Investigation</div>
          <div className="topbar-right">
            <span className="live-status"><span /> Monitoring</span>
            <button
              className="icon-button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              title="Refresh data"
            >
              {refreshing ? "…" : "↻"}
            </button>
            <div className="analyst-avatar">AN</div>
          </div>
        </header>

        <section className="fs-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span /> INVESTIGATION CENTER</div>
              <h1>Threat overview</h1>
              <p>Suspicious financial advertisements investigate karo aur connected indicators identify karo.</p>
            </div>
            <div className="heading-actions">
              <button className="btn btn-secondary" onClick={() => window.print()}>
                ⎙ <span>Print / PDF</span>
              </button>
              <button
                className="btn btn-primary"
                disabled={!filteredAds.length}
                onClick={() => exportCSV(filteredAds, "finshield-investigation-report.csv")}
              >
                ↓ <span>Export CSV</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="error-banner">
              <strong>API warning</strong>
              <span>{error}</span>
              <button onClick={() => loadDashboard(true)}>Retry</button>
            </div>
          )}

          {loading ? (
            <div className="loading-panel">
              <div className="loading-spinner" />
              <p>Loading investigation data…</p>
            </div>
          ) : (
            <>
              <div className="metric-grid">
                <MetricCard label="Advertisements scanned" value={ads.length} hint="Records returned by API" icon="▤" />
                <MetricCard label="High + critical risk" value={flaggedCount} hint={`${ads.length ? Math.round((flaggedCount / ads.length) * 100) : 0}% of loaded ads`} icon="⚠" />
                <MetricCard label="Campaigns detected" value={campaignData?.summary?.campaignsDetected ?? campaigns.length} hint={`${campaignAds} ads in groups`} icon="◎" />
                <MetricCard label="Shared indicator groups" value={duplicateData?.summary?.duplicateGroups ?? duplicateGroups.length} hint="Phone, UPI or URL matches" icon="⌁" />
              </div>

              <div className="content-tabs">
                {[
                  ["overview", "Overview"],
                  ["ads", "Advertisements"],
                  ["campaigns", "Campaigns"],
                  ["indicators", "Shared indicators"],
                  ["reports", "Reports"],
                ].map(([id, label]) => (
                  <button key={id} className={activeTab === id ? "selected" : ""} onClick={() => setActiveTab(id)}>
                    {label}
                  </button>
                ))}
              </div>

              {activeTab === "overview" && (
                <div className="overview-grid">
                  <section className="panel risk-panel">
                    <div className="panel-heading">
                      <div><h2>Risk distribution</h2><p>Classification of loaded advertisements</p></div>
                    </div>
                    <div className="risk-chart">
                      {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((level) => (
                        <div className="risk-chart-row" key={level}>
                          <div className="risk-chart-label"><RiskBadge level={level} /><span>{riskCounts[level]}</span></div>
                          <div className="bar-track"><div className={`bar-fill bar-${level.toLowerCase()}`} style={{ width: `${(riskCounts[level] / maxRiskCount) * 100}%` }} /></div>
                        </div>
                      ))}
                    </div>
                    <div className="chart-footnote">Automated risk score investigation ka signal hai, proof nahi.</div>
                  </section>

                  <section className="panel">
                    <div className="panel-heading">
                      <div><h2>Priority campaigns</h2><p>Highest observed risk</p></div>
                      <button className="text-button" onClick={() => setActiveTab("campaigns")}>View all →</button>
                    </div>
                    {campaigns.length ? campaigns.slice().sort((a, b) => Number(b.highestRiskScore || 0) - Number(a.highestRiskScore || 0)).slice(0, 4).map((campaign, index) => (
                      <button className="campaign-mini-row" key={campaign.campaignId || index} onClick={() => setSelectedCampaign(campaign)}>
                        <span className="campaign-symbol">◎</span>
                        <span className="campaign-mini-info"><strong>{campaign.campaignId || "Campaign"}</strong><small>{campaign.advertisementCount || 0} related ads</small></span>
                        <strong>{campaign.highestRiskScore ?? "—"}</strong>
                      </button>
                    )) : <div className="empty-state">No campaign data returned.</div>}
                  </section>

                  <section className="panel recent-panel">
                    <div className="panel-heading">
                      <div><h2>Recent advertisements</h2><p>Open a record to investigate</p></div>
                      <button className="text-button" onClick={() => setActiveTab("ads")}>Investigate →</button>
                    </div>
                    <AdvertisementTable ads={ads.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5)} onOpen={openAdvertisement} />
                  </section>
                </div>
              )}

              {activeTab === "ads" && (
                <section className="panel table-panel">
                  <div className="panel-heading">
                    <div><h2>Advertisement investigation</h2><p>Search, filter and manage investigation status.</p></div>
                    <span className="result-count">{filteredAds.length} results</span>
                  </div>
                  <div className="filter-row">
                    <label className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search text, phone, UPI or URL…" /></label>
                    <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} aria-label="Filter by risk">
                      <option value="ALL">All risk levels</option>
                      {RISK_LEVELS.slice().reverse().map((level) => <option key={level} value={level}>{level}</option>)}
                    </select>
                    <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} aria-label="Filter by source">
                      <option value="ALL">All sources</option>
                      {[...new Set(ads.map((ad) => String(ad.sourceType || "UNKNOWN").toUpperCase()))].sort().map((source) => <option key={source} value={source}>{source}</option>)}
                    </select>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
                      <option value="ALL">All statuses</option>
                      {STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                    </select>
                  </div>
                  <AdvertisementTable ads={filteredAds} onOpen={openAdvertisement} />
                </section>
              )}

              {activeTab === "campaigns" && (
                <section className="panel">
                  <div className="panel-heading"><div><h2>Correlated campaigns</h2><p>Ads grouped by shared indicators and text similarity.</p></div><span className="result-count">{campaigns.length} groups</span></div>
                  {campaigns.length ? <div className="campaign-grid">{campaigns.map((campaign, index) => (
                    <button className="campaign-card" key={campaign.campaignId || index} onClick={() => setSelectedCampaign(campaign)}>
                      <div className="campaign-card-top"><span className="campaign-symbol">◎</span><RiskBadge level={RISK_LEVELS.includes(campaign.campaignRiskLevel) ? campaign.campaignRiskLevel : riskLevel({ score: campaign.highestRiskScore })} /></div>
                      <h3>{campaign.campaignId || "Campaign"}</h3>
                      <p>{campaign.advertisementCount || 0} related advertisements</p>
                      <div className="campaign-card-stats"><span>Highest score</span><strong>{campaign.highestRiskScore ?? "—"}/100</strong></div>
                      <div className="campaign-card-stats"><span>Shared indicators</span><strong>{campaign.correlationSummary?.sharedIndicatorCount ?? 0}</strong></div>
                      <div className="campaign-card-footer">Inspect campaign <span>→</span></div>
                    </button>
                  ))}</div> : <div className="empty-state">No campaigns detected.</div>}
                </section>
              )}

              {activeTab === "indicators" && (
                <section className="panel">
                  <div className="panel-heading"><div><h2>Shared indicators</h2><p>Repeated contact details and destinations.</p></div><span className="result-count">{duplicateGroups.length} groups</span></div>
                  {duplicateGroups.length ? <div className="indicator-list">{duplicateGroups.map((group, index) => (
                    <div className="indicator-row" key={`${group.type}-${group.value}-${index}`}>
                      <span className="indicator-icon">⌁</span>
                      <div className="indicator-info"><strong>{group.value || group.indicator || "Unknown indicator"}</strong><small>{group.type || group.indicatorType || "SHARED INDICATOR"}</small></div>
                      <span className="indicator-occurrences">{group.occurrenceCount ?? group.count ?? 0} matches</span>
                      {Number(group.highestRiskScore) > 0 && <span className="indicator-score">Max risk {group.highestRiskScore}</span>}
                    </div>
                  ))}</div> : <div className="empty-state">No indicator groups returned by the API.</div>}
                </section>
              )}

              {activeTab === "reports" && (
                <section className="panel report-panel">
                  <div className="report-hero"><div className="report-hero-icon">▧</div><div><h2>Investigation report</h2><p>Export the loaded records as CSV or print this dashboard and choose Save as PDF.</p></div></div>
                  <div className="report-summary-grid">
                    <div><span>Total advertisements</span><strong>{ads.length}</strong></div>
                    <div><span>Critical risk</span><strong>{riskCounts.CRITICAL}</strong></div>
                    <div><span>High risk</span><strong>{riskCounts.HIGH}</strong></div>
                    <div><span>Campaign groups</span><strong>{campaigns.length}</strong></div>
                  </div>
                  <div className="report-actions">
                    <button className="btn btn-primary" disabled={!filteredAds.length} onClick={() => exportCSV(filteredAds, "finshield-filtered-advertisements.csv")}>↓ Export filtered ads</button>
                    <button className="btn btn-secondary" disabled={!ads.length} onClick={() => exportCSV(ads, "finshield-all-advertisements.csv")}>↓ Export all ads</button>
                    <button className="btn btn-secondary" onClick={() => window.print()}>⎙ Print / Save PDF</button>
                  </div>
                  <p className="report-disclaimer">Risk scores and correlations are automated signals, not a final determination of fraud. Verify source evidence before taking action.</p>
                </section>
              )}
            </>
          )}

          <footer className="fs-footer"><span>FINSHIELD AI · INVESTIGATION WORKSPACE</span><span>Risk scores are decision-support signals, not proof of fraud.</span></footer>
        </section>
      </main>

      {selectedAd && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedAd(null); }}>
          <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="ad-detail-title">
            <div className="modal-header">
              <div><div className="eyebrow">CASE DETAILS</div><h2 id="ad-detail-title">Advertisement investigation</h2></div>
              <button className="icon-button" onClick={() => setSelectedAd(null)} aria-label="Close details">×</button>
            </div>

            {detailLoading && <div className="detail-loading">Loading advertisement and investigation…</div>}

            <div className="detail-risk-row">
              <RiskBadge level={riskLevel(selectedAd)} />
              <strong>{Number(selectedAd.score ?? selectedAd.riskScore ?? 0)}/100 risk score</strong>
              <span className="detail-id">{getAdId(selectedAd)}</span>
            </div>

            <div className="detail-section"><h3>Advertisement text</h3><p className="detail-ad-text">{getAdText(selectedAd)}</p></div>

            <div className="detail-fields">
              <div><span>Source type</span><strong>{selectedAd.sourceType || "—"}</strong></div>
              <div><span>Created at</span><strong>{formatDate(selectedAd.createdAt)}</strong></div>
              <div><span>Source URL</span><strong className="break-word">{selectedAd.sourceUrl || "—"}</strong></div>
              <div><span>Current status</span><strong>{statusOf(selectedAd, investigation).replaceAll("_", " ")}</strong></div>
            </div>

            <div className="detail-section">
              <h3>Extracted indicators</h3>
              <IndicatorChips label="Phone numbers" values={selectedAd.phones} />
              <IndicatorChips label="UPI IDs" values={selectedAd.upis} />
              <IndicatorChips label="URLs" values={selectedAd.urls} />
              <IndicatorChips label="Keywords" values={selectedAd.keywords} />
            </div>

            <div className="detail-section">
              <h3>Evidence / reasons</h3>
              {safeArray(selectedAd.evidence).length ? (
                <ul className="evidence-list">{selectedAd.evidence.map((item, index) => <li key={index}>{typeof item === "string" ? item : item.reason || item.description || item.message || JSON.stringify(item)}</li>)}</ul>
              ) : <p className="muted-text">No evidence details returned for this record.</p>}
            </div>

            <div className="workflow-section">
              <div className="workflow-title"><div><h3>Investigation workflow</h3><p>Update status, assign an analyst and record findings.</p></div><StatusBadge status={statusOf(selectedAd, investigation)} /></div>
              <div className="workflow-layout">
                <label className="field-label">Investigation status
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                    {STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                  </select>
                </label>
                <label className="field-label">Assigned analyst
                  <input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="e.g. Analyst 1" />
                </label>
              </div>
              <label className="field-label note-field">Investigation note
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Write findings, verification steps or escalation reason…" rows={3} />
              </label>
              <div className="workflow-actions">
                <button className="btn btn-primary" onClick={saveCase} disabled={saving || detailLoading}>{saving ? "Saving…" : "Save investigation"}</button>
                <span className="muted-text">Notes are sent to the backend when you save.</span>
              </div>
              {saveMessage && <div className={saveMessage.includes("successfully") ? "success-banner" : "error-banner"}>{saveMessage}</div>}
            </div>

            <div className="detail-section">
              <h3>Activity history</h3>
              {history.length ? <div className="history-list">{history.slice().reverse().map((item, index) => (
                <div className="history-item" key={item._id || item.id || index}>
                  <span className="history-dot" />
                  <div><strong>{item.action || item.status || item.event || "Investigation updated"}</strong><p>{item.note || item.message || item.details || "Status or case details changed."}</p><small>{item.author || item.by || item.assignedTo || "Analyst"} · {formatDate(item.createdAt || item.timestamp || item.date)}</small></div>
                </div>
              ))}</div> : <p className="muted-text">No activity history returned yet. Save an update to create a record.</p>}
            </div>

            <div className="detail-section">
              <h3>Related advertisements</h3>
              {relatedAds.length ? <div className="related-ad-list">{relatedAds.map((ad, index) => (
                <button className="related-ad-card" key={getAdId(ad) || index} onClick={() => openAdvertisement(ad)}>
                  <span><strong>{getAdText(ad)}</strong><small>{getAdId(ad)}</small></span>
                  <RiskBadge level={riskLevel(ad)} />
                </button>
              ))}</div> : <p className="muted-text">No related advertisements returned for this case.</p>}
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => exportCSV([selectedAd], `finshield-case-${getAdId(selectedAd) || "details"}.csv`)}>Export this record</button>
              <button className="btn btn-secondary" onClick={() => setSelectedAd(null)}>Close</button>
            </div>
          </section>
        </div>
      )}

      {selectedCampaign && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedCampaign(null); }}>
          <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="campaign-detail-title">
            <div className="modal-header"><div><div className="eyebrow">CORRELATION ANALYSIS</div><h2 id="campaign-detail-title">{selectedCampaign.campaignId || "Campaign details"}</h2></div><button className="icon-button" onClick={() => setSelectedCampaign(null)}>×</button></div>
            <div className="detail-risk-row"><RiskBadge level={riskLevel({ score: selectedCampaign.highestRiskScore })} /><strong>{selectedCampaign.highestRiskScore ?? 0}/100 highest score</strong><span>{selectedCampaign.advertisementCount || 0} ads</span></div>
            <div className="detail-section"><h3>Shared indicators</h3>
              {safeArray(selectedCampaign.correlationSummary?.sharedIndicators).length ? selectedCampaign.correlationSummary.sharedIndicators.map((indicator, index) => <div className="indicator-row" key={`${indicator.value}-${index}`}><div className="indicator-info"><strong>{indicator.value}</strong><small>{indicator.type}</small></div><span>{indicator.occurrenceCount ?? 0} occurrences</span></div>) : <p className="muted-text">No shared indicators reported.</p>}
            </div>
            <div className="detail-fields">
              <div><span>First seen</span><strong>{formatDate(selectedCampaign.postingPattern?.firstSeen)}</strong></div>
              <div><span>Last seen</span><strong>{formatDate(selectedCampaign.postingPattern?.lastSeen)}</strong></div>
              <div><span>Posts last 24 hours</span><strong>{selectedCampaign.postingPattern?.postsInLast24Hours ?? "—"}</strong></div>
              <div><span>Average gap</span><strong>{selectedCampaign.postingPattern?.averageGapMinutes ?? "—"} min</strong></div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" disabled={!safeArray(selectedCampaign.ads).length} onClick={() => exportCSV(selectedCampaign.ads, `finshield-${selectedCampaign.campaignId || "campaign"}.csv`)}>Export campaign ads</button>
              <button className="btn btn-secondary" onClick={() => setSelectedCampaign(null)}>Close</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function AdvertisementTable({ ads, onOpen }) {
  if (!ads.length) return <div className="empty-state">No advertisements match the current filters.</div>;

  return (
    <div className="table-scroll">
      <table className="ads-table">
        <thead><tr><th>ADVERTISEMENT</th><th>SOURCE</th><th>RISK SCORE</th><th>RISK LEVEL</th><th>STATUS</th><th>DATE DETECTED</th><th /></tr></thead>
        <tbody>{ads.map((ad, index) => {
          const level = riskLevel(ad);
          const score = Number(ad.score ?? ad.riskScore ?? 0);
          const status = String(ad.investigationStatus || ad.status || "NEW").toUpperCase();
          return (
            <tr key={getAdId(ad) || index}>
              <td className="ad-cell"><strong>{getAdText(ad)}</strong><small>ID: {getAdId(ad) || "—"}</small></td>
              <td><span className="source-pill">{ad.sourceType || "UNKNOWN"}</span></td>
              <td><div className="score-cell"><strong>{score}</strong><span className="score-track"><span className={`score-fill score-${level.toLowerCase()}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} /></span></div></td>
              <td><RiskBadge level={level} /></td>
              <td><StatusBadge status={status} /></td>
              <td className="date-cell">{formatDate(ad.createdAt)}</td>
              <td><button className="row-action" onClick={() => onOpen(ad)}>Inspect →</button></td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}