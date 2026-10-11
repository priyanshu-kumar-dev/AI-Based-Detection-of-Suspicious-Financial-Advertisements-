import { useState } from "react";
import api from "../services/api";

import UploadForm from "../components/UploadForm";
import RiskCard from "../components/RiskCard";
import EvidencePanel from "../components/EvidencePanel";

const features = [
  {
    icon: "▧",
    title: "OCR Detection",
    description: "Extract text from advertisement images.",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
  },
  {
    icon: "◈",
    title: "AI Risk Analysis",
    description: "Evaluate suspicious financial content.",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    icon: "⚠",
    title: "Threat Alerts",
    description: "Highlight high-risk advertisements.",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  {
    icon: "⌕",
    title: "Evidence Analysis",
    description: "Review keywords and fraud indicators.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
  },
];

const FeatureCard = ({ icon, title, description, color, bg }) => (
  <div className="group rounded-2xl border border-slate-800 bg-slate-900/70 p-5 transition duration-300 hover:-translate-y-1 hover:border-slate-600">
    <div
      className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${bg} ${color}`}
    >
      {icon}
    </div>

    <h3 className="font-semibold text-white">{title}</h3>

    <p className="mt-2 text-sm leading-6 text-slate-400">
      {description}
    </p>
  </div>
);

const Analyze = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async (text) => {
    if (loading) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await api.post("/ads/analyze", { text });

      if (!res.data || typeof res.data !== "object") {
        throw new Error("The server returned an invalid analysis response.");
      }

      setResult(res.data);
    } catch (err) {
      console.error("Advertisement analysis failed:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Analysis failed. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const riskLevel = String(result?.riskLevel || "UNKNOWN").toUpperCase();

  const riskStyles = {
    CRITICAL: "border-red-500/30 bg-red-500/10 text-red-300",
    HIGH: "border-orange-500/30 bg-orange-500/10 text-orange-300",
    MEDIUM: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    LOW: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    UNKNOWN: "border-slate-700 bg-slate-800 text-slate-300",
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        {/* Hero Section */}
        <section className="relative mb-10 overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 p-6 sm:p-10 lg:p-12">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative z-10 max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-cyan-300 sm:text-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
              Financial Threat Intelligence
            </div>

            <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-7xl">
              FinShield
              <span className="text-cyan-400"> AI</span>
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              Identify suspicious financial advertisements promoting the
              sale of bank accounts, ATM cards, debit cards, credit cards,
              current accounts and savings accounts.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <span className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
                AI-Assisted Detection
              </span>
              <span className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
                Evidence Extraction
              </span>
              <span className="rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
                Risk Classification
              </span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mb-12">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
              Platform Capabilities
            </p>

            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
              Intelligent Threat Detection
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Analyze suspicious content and review potential financial fraud
              indicators from a single workspace.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </section>

        {/* Analysis Form */}
        <section className="mb-10">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                Investigation Workspace
              </p>

              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                Analyze Advertisement
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Submit suspicious advertisement text using the form below.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              Analysis API
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-6 lg:p-8">
            <UploadForm onAnalyze={handleAnalyze} />
          </div>
        </section>

        {/* Loading State */}
        {loading && (
          <section
            aria-live="polite"
            className="mb-10 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6 sm:p-8"
          >
            <div className="flex items-start gap-4">
              <div className="mt-1 h-7 w-7 shrink-0 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />

              <div className="flex-1">
                <h3 className="text-lg font-bold text-cyan-300">
                  Analyzing Advertisement...
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Processing the submitted content and waiting for the
                  analysis server to return its risk assessment.
                </p>

                <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full w-1/2 animate-pulse rounded-full bg-cyan-400" />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Error State */}
        {error && !loading && (
          <section
            role="alert"
            className="mb-10 rounded-2xl border border-red-500/30 bg-red-500/5 p-5 sm:p-6"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-xl text-red-400">
                !
              </span>

              <div>
                <h3 className="font-bold text-red-300">
                  Analysis Failed
                </h3>

                <p className="mt-2 break-words text-sm leading-6 text-slate-400">
                  {error}
                </p>

                <p className="mt-3 text-xs text-slate-500">
                  Check that your backend is running and the API endpoint
                  /ads/analyze is available.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Results */}
        {result && !loading && (
          <section className="mb-10">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                  Analysis Report
                </p>

                <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                  Investigation Results
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Review the returned risk classification and supporting
                  evidence.
                </p>
              </div>

              <div
                className={`inline-flex items-center gap-2 self-start rounded-xl border px-4 py-3 text-sm font-bold ${riskStyles[riskLevel] || riskStyles.UNKNOWN}`}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
                Risk: {riskLevel}
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-xl text-orange-400">
                  ⚠
                </div>

                <div>
                  <h3 className="font-bold text-white">
                    Risk Assessment
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Classification returned by the backend
                  </p>
                </div>
              </div>

              <RiskCard
                risk={result.riskLevel}
                score={result.score}
              />
            </div>

            {/* Evidence */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-xl text-cyan-400">
                  ⌕
                </div>

                <div>
                  <h3 className="font-bold text-white">
                    Evidence & Indicators
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Review the evidence returned by the analysis API
                  </p>
                </div>
              </div>

              <EvidencePanel evidence={result.evidence} />
            </div>

            <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm leading-6 text-slate-400">
              <span className="font-semibold text-amber-300">
                Important:
              </span>{" "}
              This assessment is an investigative aid. A high-risk score
              indicates suspicious signals and does not, by itself, prove
              criminal activity.
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-12 border-t border-slate-800 py-6 text-center">
          <p className="text-sm font-semibold text-slate-400">
            FinShield AI
          </p>

          <p className="mt-2 text-xs leading-5 text-slate-600">
            AI-assisted detection of suspicious financial advertisements.
            Always verify evidence before taking action.
          </p>
        </footer>
      </div>
    </main>
  );
};

export default Analyze;
