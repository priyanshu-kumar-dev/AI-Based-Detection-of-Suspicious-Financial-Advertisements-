import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Activity,
  TrendingUp,
  Gauge,
  Info,
} from "lucide-react";

const RISK_CONFIG = {
  LOW: {
    label: "LOW",
    status: "Low Threat",
    description: "Few risk indicators identified.",
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    background: "bg-emerald-500/10",
    glow: "shadow-emerald-950/20",
    bar: "bg-emerald-400",
    icon: ShieldCheck,
  },
  MEDIUM: {
    label: "MEDIUM",
    status: "Moderate Threat",
    description: "Some indicators require further review.",
    color: "text-amber-400",
    border: "border-amber-500/30",
    background: "bg-amber-500/10",
    glow: "shadow-amber-950/20",
    bar: "bg-amber-400",
    icon: AlertTriangle,
  },
  HIGH: {
    label: "HIGH",
    status: "High Threat",
    description: "Multiple indicators warrant investigation.",
    color: "text-orange-400",
    border: "border-orange-500/30",
    background: "bg-orange-500/10",
    glow: "shadow-orange-950/20",
    bar: "bg-orange-400",
    icon: ShieldAlert,
  },
  CRITICAL: {
    label: "CRITICAL",
    status: "Critical Threat",
    description: "Urgent manual review is recommended.",
    color: "text-red-400",
    border: "border-red-500/30",
    background: "bg-red-500/10",
    glow: "shadow-red-950/20",
    bar: "bg-red-500",
    icon: ShieldAlert,
  },
};

const RiskCard = ({ risk, score }) => {
  const normalizedRisk = String(risk || "LOW").toUpperCase();
  const current = RISK_CONFIG[normalizedRisk] || RISK_CONFIG.LOW;
  const RiskIcon = current.icon;

  const numericScore =
    score !== "" && score !== null && score !== undefined
      ? Number(score)
      : NaN;

  const validScore = Number.isFinite(numericScore)
    ? Math.min(100, Math.max(0, numericScore))
    : null;

  const scoreLabel =
    validScore === null ? "N/A" : String(validScore);

  const scoreDescription =
    validScore === null
      ? "Score unavailable"
      : validScore >= 75
        ? "Very elevated score"
        : validScore >= 50
          ? "Elevated score"
          : validScore >= 25
            ? "Moderate score"
            : "Lower score";

  return (
    <section className="mt-8">
      <div
        className={`relative overflow-hidden rounded-2xl border ${current.border} bg-slate-900/90 shadow-xl ${current.glow}`}
      >
        {/* Top Accent */}
        <div className={`h-1 w-full ${current.bar}`} />

        {/* Subtle Background Decoration */}
        <div
          className={`pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full blur-3xl ${current.background}`}
        />

        <div className="relative p-5 sm:p-7">
          {/* Header */}
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${current.border} ${current.background}`}
              >
                <RiskIcon size={26} className={current.color} />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                    AI Risk Assessment
                  </h2>

                  <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Analysis Result
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-400">
                  Advertisement threat classification
                </p>
              </div>
            </div>

            {/* Risk Badge */}
            <div
              className={`flex w-fit items-center gap-2 rounded-xl border px-4 py-3 ${current.border} ${current.background}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${current.bar} ${normalizedRisk === "CRITICAL" ? "animate-pulse" : ""}`}
              />

              <span className={`text-sm font-bold tracking-wide ${current.color}`}>
                {current.label} RISK
              </span>
            </div>
          </div>

          {/* Main Metrics */}
          <div className="mt-7 grid gap-4 md:grid-cols-2">
            {/* Risk Level */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Risk Classification
                </p>

                <ShieldAlert size={18} className={current.color} />
              </div>

              <p className={`mt-4 text-3xl font-bold ${current.color}`}>
                {current.label}
              </p>

              <p className="mt-2 text-sm text-slate-400">
                {current.status}
              </p>
            </div>

            {/* Threat Score */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Threat Score
                </p>

                <Gauge size={19} className="text-cyan-400" />
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-bold tabular-nums text-white">
                  {scoreLabel}
                </span>

                <span className="text-sm text-slate-500">
                  / 100
                </span>
              </div>

              {/* Progress Bar */}
              <div
                className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800"
                role="progressbar"
                aria-label="Threat score"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={validScore ?? undefined}
              >
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${current.bar}`}
                  style={{
                    width: `${validScore ?? 0}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                {scoreDescription}
              </p>
            </div>
          </div>

          {/* Assessment Summary */}
          <div className={`mt-5 rounded-xl border p-4 sm:p-5 ${current.border} ${current.background}`}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <Activity size={19} className={current.color} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Assessment Summary
                </p>

                <h3 className={`mt-2 text-lg font-bold ${current.color}`}>
                  {current.status}
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-300">
                  {current.description}
                </p>
              </div>

              <TrendingUp
                size={20}
                className={`hidden shrink-0 sm:block ${current.color}`}
              />
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-5 flex items-start gap-2.5">
            <Info
              size={16}
              className="mt-0.5 shrink-0 text-slate-500"
            />

            <p className="text-xs leading-5 text-slate-500">
              This assessment is an automated risk indicator, not proof of
              fraudulent activity. Review the supporting evidence before
              taking action. The score represents the value returned by the
              analysis system.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RiskCard;
