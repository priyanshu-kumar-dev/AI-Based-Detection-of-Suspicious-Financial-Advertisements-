import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

function normalizeAlert(item = {}) {
  return {
    ...item,
    adText: item.adText ?? item.text ?? item.ocrText ?? "",
    score: item.score ?? item.riskScore ?? null,
    extractedPhones: Array.isArray(item.extractedPhones)
      ? item.extractedPhones
      : Array.isArray(item.phones)
        ? item.phones
        : [],
    extractedLinks: Array.isArray(item.extractedLinks)
      ? item.extractedLinks
      : Array.isArray(item.urls)
        ? item.urls
        : Array.isArray(item.extractedUrls)
          ? item.extractedUrls
          : [],
    extractedUpis: Array.isArray(item.extractedUpis)
      ? item.extractedUpis
      : Array.isArray(item.upis)
        ? item.upis
        : [],
    evidence: Array.isArray(item.evidence) ? item.evidence : [],
  };
}

function unwrapAds(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.ads)) return data.ads;
  if (Array.isArray(data?.alerts)) return data.alerts;
  return [];
}


function getErrorMessage(error, fallback) {
  const status = error?.response?.status;
  const message = error?.response?.data?.message;

  if (status === 403) {
    return `URL rejected by backend (403): ${
      message ||
      "Domain approved nahi hai. backend/.env mein ALLOWED_SOURCE_HOSTS check karo."
    }`;
  }

  if (status && message) {
    return `HTTP ${status}: ${message}`;
  }

  if (status === 400) {
    return "Invalid request (400). URL aur backend validation check karo.";
  }

  if (status === 404) {
    return "API route nahi mila (404). Backend routes check karo.";
  }

  if (status === 413) {
    return "Uploaded file ya request bahut badi hai.";
  }

  if (status === 422) {
    return `Readable content nahi mila: ${
      message || "Page par process karne layak text nahi hai."
    }`;
  }

  if (status >= 500) {
    return `Backend error (${status}): ${
      message || "Backend terminal check karo."
    }`;
  }

  if (error?.code === "ECONNABORTED") {
    return "Request timeout ho gayi. Backend aur target website check karo.";
  }

  if (error?.code === "ERR_NETWORK") {
    return "Backend connection fail hua. API URL, port 5000 aur CORS check karo.";
  }

  return error?.message || fallback;
}


function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeEvidence(items = []) {
  if (!Array.isArray(items)) return [];

  const seen = new Set();

  return items.reduce((result, item) => {
    const isObject = item !== null && typeof item === "object";
    const type = isObject ? String(item.type ?? "") : "";
    const indicator = isObject
      ? String(item.indicator ?? item.label ?? item.type ?? "")
      : String(item ?? "");
    const reason = isObject ? String(item.reason ?? "") : "";

    if (!indicator.trim()) return result;

    const key = `${normalizeText(type)}|${normalizeText(indicator)}`;

    if (seen.has(key)) return result;
    seen.add(key);

    result.push({
      ...(isObject ? item : {}),
      type,
      indicator: indicator.trim(),
      reason: reason.trim(),
    });

    return result;
  }, []);
}

function EvidenceList({ items = [] }) {
  const evidence = normalizeEvidence(items);

  if (!evidence.length) {
    return (
      <span className="text-gray-600">No evidence indicators recorded.</span>
    );
  }

  return (
    <div className="space-y-2">
      {evidence.map((item, index) => {
        const type = String(item.type || "").trim();
        const label = String(
          item.indicator || item.label || "Indicator",
        ).trim();
        const reason = String(item.reason || "").trim();

        return (
          <div
            key={`${type}-${label}-${index}`}
            className="break-words rounded border border-orange-900/70 bg-orange-950/40 px-3 py-2 text-orange-200"
          >
            <p className="font-semibold">
              {type ? `${type}: ` : ""}
              {label}
            </p>
            {reason && normalizeText(reason) !== normalizeText(label) && (
              <p className="mt-1 text-orange-300/80">{reason}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function normalizeUrl(value) {
  const raw = String(value || "").trim();

  if (!raw) throw new Error("Webpage URL enter karo.");

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  let parsed;

  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("Valid URL enter karo, jaise https://example.com");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Sirf HTTP aur HTTPS URLs allowed hain.");
  }

  if (!parsed.hostname || !parsed.hostname.includes(".")) {
    throw new Error("Valid public domain enter karo.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("URL mein username ya password allowed nahi hai.");
  }

  return parsed.href;
}

function getRiskStyle(level = "") {
  const risk = String(level).toUpperCase();

  if (risk === "CRITICAL" || risk === "HIGH") {
    return {
      card: "border-red-800/70 bg-red-950/30",
      badge: "bg-red-600 text-white",
    };
  }

  if (risk === "MEDIUM") {
    return {
      card: "border-yellow-800/70 bg-yellow-950/20",
      badge: "bg-yellow-400 text-gray-950",
    };
  }

  if (risk === "LOW") {
    return {
      card: "border-green-800/70 bg-green-950/20",
      badge: "bg-green-700 text-green-100",
    };
  }

  return {
    card: "border-gray-700 bg-gray-900",
    badge: "bg-gray-700 text-gray-200",
  };
}

function formatTime(date) {
  if (!date) return "Time unavailable";

  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime())
    ? "Time unavailable"
    : parsed.toLocaleString();
}

export default function AdvertisementScanner() {
  const [alerts, setAlerts] = useState([]);
  const [mode, setMode] = useState("TEXT");
  const [inputText, setInputText] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");

  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fetchAds = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);

    try {
      const response = await axios.get(`${API_URL}/ads`, {
        timeout: 15000,
      });

      setAlerts(unwrapAds(response.data).map(normalizeAlert));
      setBackendOnline(true);

      if (manual) setError("");
    } catch (err) {
      setBackendOnline(false);

      if (manual) {
        setError(getErrorMessage(err, "Advertisements fetch nahi hue."));
      }
    } finally {
      if (manual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAds();

    const timer = setInterval(() => fetchAds(), 10000);
    return () => clearInterval(timer);
  }, [fetchAds]);

  const upsertAlerts = useCallback((items) => {
    setAlerts((previous) => {
      const map = new Map();

      previous.forEach((item, index) => {
        map.set(item._id || `existing-${index}`, item);
      });

      items.forEach((raw, index) => {
        const item = normalizeAlert(raw);
        map.set(item._id || `new-${Date.now()}-${index}`, item);
      });

      return Array.from(map.values()).reverse();
    });
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      let response;

      if (mode === "TEXT") {
        const text = inputText.trim();

        if (!text) throw new Error("Advertisement text enter karo.");

        response = await axios.post(
          `${API_URL}/ads/analyze`,
          { text },
          { timeout: 60000 },
        );
      } else if (mode === "URL") {
        const url = normalizeUrl(inputUrl);

        // Backend receives the exact property its controller expects: { url }.
        response = await axios.post(
          `${API_URL}/ads/ingest-url`,
          { url },
          {
            timeout: 60000,
            headers: { "Content-Type": "application/json" },
          },
        );
      } else {
        if (!imageFile) throw new Error("Advertisement image select karo.");

        if (imageFile.size > MAX_IMAGE_SIZE) {
          throw new Error("Image ka size 5 MB se kam hona chahiye.");
        }

        if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
          throw new Error("Sirf PNG, JPEG ya WebP image allowed hai.");
        }

        const formData = new FormData();
        formData.append("image", imageFile);

        response = await axios.post(`${API_URL}/ads/ingest-image`, formData, {
          timeout: 120000,
        });
      }

      const result = response.data;
      const saved = result?.alert ?? result?.ad ?? result?.data;

      if (saved && typeof saved === "object" && !Array.isArray(saved)) {
        upsertAlerts([saved]);
      }

      setNotice(result?.message || "Advertisement process ho gaya.");

      if (mode === "TEXT") setInputText("");
      if (mode === "URL") setInputUrl("");

      if (mode === "IMAGE") {
        setImageFile(null);
        const fileInput = document.getElementById("ad-image");
        if (fileInput) fileInput.value = "";
      }

      await fetchAds();
    } catch (err) {
      setError(getErrorMessage(err, "Advertisement process nahi ho paya."));
    } finally {
      setLoading(false);
    }
  };

  const handleImportSamples = async () => {
    setError("");
    setNotice("");
    setImporting(true);

    try {
      const response = await axios.post(
        `${API_URL}/ads/ingest-samples`,
        {},
        { timeout: 60000 },
      );

      const data = response.data;
      const samples = Array.isArray(data?.alerts)
        ? data.alerts
        : unwrapAds(data);

      if (samples.length) upsertAlerts(samples);

      setNotice(
        data?.message ||
          `${data?.count ?? samples.length} demo samples process hue.`,
      );

      await fetchAds();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Sample import fail hua. Backend route check karo.",
        ),
      );
    } finally {
      setImporting(false);
    }
  };

  const highCount = alerts.filter((item) =>
    ["HIGH", "CRITICAL"].includes(String(item.riskLevel || "").toUpperCase()),
  ).length;

  const riskCounts = ["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((level) => ({
    level,
    count: alerts.filter(
      (item) => String(item.riskLevel || "").toUpperCase() === level,
    ).length,
  }));

  const filteredAlerts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return alerts.filter((alert) => {
      const level = String(alert.riskLevel || "UNCLASSIFIED").toUpperCase();

      if (riskFilter !== "ALL" && level !== riskFilter) return false;

      const content = [
        alert.adText,
        alert.riskLevel,
        alert.sourceType,
        alert.sourceUrl,
        alert._id,
        ...alert.extractedPhones,
        ...alert.extractedLinks,
        ...alert.extractedUpis,
        ...alert.evidence.map((item) =>
          typeof item === "object" ? JSON.stringify(item) : String(item),
        ),
      ]
        .join(" ")
        .toLowerCase();

      return content.includes(term);
    });
  }, [alerts, searchTerm, riskFilter]);

  return (
    <main className="min-h-screen bg-gray-950 p-4 font-sans text-gray-100 sm:p-6">
      <header className="mb-6 flex flex-col gap-4 border-b border-gray-800 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.25em] text-gray-500">
            Financial Threat Intelligence
          </p>
          <h1 className="text-2xl font-bold text-red-400">FinShield AI</h1>
          <p className="mt-1 text-sm text-gray-400">
            SKIT002 · Suspicious Financial Advertisement Detector
          </p>
        </div>

        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${
            backendOnline
              ? "border-green-800 bg-green-950/50 text-green-400"
              : "border-red-800 bg-red-950/50 text-red-400"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              backendOnline ? "bg-green-400" : "bg-red-400"
            }`}
          />
          {backendOnline ? "Backend Connected" : "Backend Disconnected"}
        </span>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300"
        >
          <span className="break-words">{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-green-900 bg-green-950/40 p-3 text-sm text-green-300"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <p className="text-sm text-gray-400">Total Incidents</p>
          <p className="mt-2 text-3xl font-bold">{alerts.length}</p>
        </div>
        <div className="rounded-xl border border-red-900/60 bg-gray-900 p-4">
          <p className="text-sm text-gray-400">High / Critical</p>
          <p className="mt-2 text-3xl font-bold text-red-400">{highCount}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <p className="text-sm text-gray-400">Backend Status</p>
          <p
            className={`mt-3 text-xl font-bold ${backendOnline ? "text-green-400" : "text-red-400"}`}
          >
            {backendOnline ? "Online" : "Offline"}
          </p>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="mb-4 text-lg font-semibold">Risk Distribution</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {riskCounts.map(({ level, count }) => {
            const style = getRiskStyle(level);
            return (
              <div
                key={level}
                className={`rounded-lg border p-3 ${style.card}`}
              >
                <p className="text-xs text-gray-400">{level}</p>
                <p className="mt-1 text-2xl font-bold">{count}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="h-fit rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-2 text-lg font-semibold">
            Advertisement Collection
          </h2>
          <p className="mb-4 text-sm text-gray-400">
            Text, approved webpage URL ya image se advertisement collect karo.
          </p>

          <div className="mb-4 grid grid-cols-3 gap-2">
            {[
              ["TEXT", "Text"],
              ["URL", "Web URL"],
              ["IMAGE", "Image OCR"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setError("");
                  setNotice("");
                }}
                className={`rounded-lg border px-1 py-2 text-sm font-semibold ${
                  mode === value
                    ? "border-red-500 bg-red-600 text-white"
                    : "border-gray-700 bg-gray-950 text-gray-300 hover:border-gray-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {mode === "TEXT" && (
              <>
                <textarea
                  className="min-h-36 w-full resize-y rounded-lg border border-gray-700 bg-gray-950 p-3 text-sm text-white focus:border-red-500 focus:outline-none"
                  placeholder="Advertisement text paste karo..."
                  value={inputText}
                  onChange={(event) => setInputText(event.target.value)}
                  maxLength={10000}
                  required
                />
                <p className="mt-1 text-right text-xs text-gray-500">
                  {inputText.length}/10000
                </p>
              </>
            )}

            {mode === "URL" && (
              <div className="space-y-2">
                <label
                  htmlFor="source-url"
                  className="block text-sm text-gray-300"
                >
                  Approved public webpage URL
                </label>
                <input
                  id="source-url"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 p-3 text-sm text-white focus:border-red-500 focus:outline-none"
                  placeholder="https://example.com/page"
                  value={inputUrl}
                  onChange={(event) => setInputUrl(event.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">
                  Domain ko public aur authorized hona chahiye. Backend security
                  checks bhi apply honge.
                </p>
              </div>
            )}

            {mode === "IMAGE" && (
              <div className="space-y-3">
                <label
                  htmlFor="ad-image"
                  className="block text-sm text-gray-300"
                >
                  Advertisement image (PNG, JPEG, WebP; max 5 MB)
                </label>
                <input
                  id="ad-image"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) =>
                    setImageFile(event.target.files?.[0] || null)
                  }
                  className="block w-full text-sm text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-800 file:px-3 file:py-2 file:text-gray-200"
                  required
                />
                {imageFile && (
                  <p className="break-all text-xs text-gray-400">
                    Selected: {imageFile.name}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !backendOnline}
              className="mt-4 w-full rounded-lg bg-red-600 px-4 py-3 font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
            >
              {loading
                ? "Processing..."
                : mode === "TEXT"
                  ? "Scan Advertisement"
                  : mode === "URL"
                    ? "Fetch & Scan URL"
                    : "Upload & OCR Scan"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleImportSamples}
            disabled={importing || !backendOnline}
            className="mt-3 w-full rounded-lg bg-gray-800 px-4 py-3 font-semibold text-gray-200 transition hover:bg-gray-700 disabled:opacity-50"
          >
            {importing ? "Importing..." : "Import Demo Samples"}
          </button>

          <div className="mt-5 border-t border-gray-800 pt-4">
            <p className="text-xs leading-5 text-gray-500">
              Sirf public ya authorized data process karo. Demo samples
              synthetic hain. Risk score investigation indicator hai, fraud ka
              final proof nahi.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-gray-800 bg-gray-900 p-5 lg:col-span-2">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Suspicious Incidents</h2>
              <p className="mt-1 text-xs text-gray-500">
                Auto-refresh: 10 seconds
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-gray-800 px-3 py-1 text-xs font-bold text-gray-300">
                Showing: {filteredAlerts.length}/{alerts.length}
              </span>
              <button
                type="button"
                onClick={() => fetchAds(true)}
                disabled={refreshing}
                className="rounded-lg bg-gray-800 px-3 py-2 text-xs text-gray-200 hover:bg-gray-700 disabled:opacity-50"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="search"
              placeholder="Search text, phone, UPI, URL..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 p-3 text-sm text-white focus:border-red-500 focus:outline-none"
            />
            <select
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 p-3 text-sm text-white focus:border-red-500 focus:outline-none"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="UNCLASSIFIED">Unclassified</option>
            </select>
          </div>

          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            {filteredAlerts.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-gray-400">
                  {alerts.length === 0
                    ? backendOnline
                      ? "No advertisements found yet. Scan text or import demo samples."
                      : "Waiting for backend connection..."
                    : "No incidents match your search or filter."}
                </p>
                <p className="mt-2 text-xs text-gray-600">
                  Empty logs do not necessarily mean the system is threat-free.
                </p>
              </div>
            ) : (
              filteredAlerts.map((alert, index) => {
                const style = getRiskStyle(alert.riskLevel);

                return (
                  <article
                    key={
                      alert._id || `${alert.createdAt || "incident"}-${index}`
                    }
                    className={`rounded-xl border p-4 ${style.card}`}
                  >
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex w-fit rounded-md px-2.5 py-1 text-xs font-bold ${style.badge}`}
                        >
                          {alert.riskLevel || "UNCLASSIFIED"}
                        </span>
                        {alert.score != null && (
                          <span className="text-xs text-gray-400">
                            Score: {alert.score}%
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTime(
                          alert.createdAt ||
                            alert.collectedAt ||
                            alert.timestamp,
                        )}
                      </span>
                    </div>

                    <p className="mb-4 whitespace-pre-wrap break-words rounded-lg bg-black/30 p-3 text-sm text-gray-300">
                      {alert.adText || "No advertisement text available."}
                    </p>

                    {(alert.sourceType ||
                      alert.sourceUrl ||
                      alert.imagePath) && (
                      <div className="mb-4 space-y-1 text-xs text-gray-400">
                        {alert.sourceType && (
                          <p>Source type: {alert.sourceType}</p>
                        )}
                        {alert.sourceUrl && (
                          <p className="break-all">
                            Source URL:{" "}
                            <a
                              href={alert.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-300 underline"
                            >
                              {alert.sourceUrl}
                            </a>
                          </p>
                        )}
                        {alert.imagePath && (
                          <p className="break-all">Image: {alert.imagePath}</p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 border-t border-gray-800 pt-3 text-xs md:grid-cols-2">
                      <div>
                        <p className="mb-2 font-semibold text-gray-400">
                          Extracted Intelligence
                        </p>
                        {alert.extractedPhones.length === 0 &&
                        alert.extractedLinks.length === 0 &&
                        alert.extractedUpis.length === 0 ? (
                          <span className="text-gray-600">
                            No phone numbers, links, or UPI IDs recorded.
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {alert.extractedPhones.map((phone, i) => (
                              <span
                                key={`phone-${i}`}
                                className="break-all rounded bg-blue-950 px-2 py-1 text-blue-300"
                              >
                                Phone: {phone}
                              </span>
                            ))}
                            {alert.extractedLinks.map((link, i) => (
                              <span
                                key={`link-${i}`}
                                className="break-all rounded bg-purple-950 px-2 py-1 text-purple-300"
                              >
                                URL: {link}
                              </span>
                            ))}
                            {alert.extractedUpis.map((upi, i) => (
                              <span
                                key={`upi-${i}`}
                                className="break-all rounded bg-teal-950 px-2 py-1 text-teal-300"
                              >
                                UPI: {upi}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="mb-2 font-semibold text-gray-400">
                          Evidence Indicators
                        </p>
                        <EvidenceList items={alert.evidence} />
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>

      <footer className="mt-8 text-center text-xs text-gray-600">
        FinShield AI · Suspicious-ad analysis prototype · Verify findings before
        taking action.
      </footer>
    </main>
  );
}
