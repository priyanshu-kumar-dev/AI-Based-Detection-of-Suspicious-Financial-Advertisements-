import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Activity,
  Search,
  FileWarning,
  ExternalLink,
} from "lucide-react";

const getRiskStyle = (riskLevel) => {
  const level = String(riskLevel || "MEDIUM").toUpperCase();

  if (level === "CRITICAL") {
    return {
      label: "CRITICAL",
      color: "text-red-300",
      badge: "border-red-500/30 bg-red-500/10",
      border: "border-red-500/30 hover:border-red-400/60",
      icon: "text-red-400",
      bar: "bg-red-500",
      width: "bg-red-500",
    };
  }

  if (level === "HIGH") {
    return {
      label: "HIGH RISK",
      color: "text-orange-300",
      badge: "border-orange-500/30 bg-orange-500/10",
      border: "border-orange-500/30 hover:border-orange-400/60",
      icon: "text-orange-400",
      bar: "bg-orange-500",
      width: "bg-orange-500",
    };
  }

  if (level === "LOW") {
    return {
      label: "LOW RISK",
      color: "text-emerald-300",
      badge: "border-emerald-500/30 bg-emerald-500/10",
      border: "border-emerald-500/20 hover:border-emerald-400/40",
      icon: "text-emerald-400",
      bar: "bg-emerald-500",
      width: "bg-emerald-500",
    };
  }

  return {
    label: "MEDIUM RISK",
    color: "text-amber-300",
    badge: "border-amber-500/30 bg-amber-500/10",
    border: "border-amber-500/20 hover:border-amber-400/40",
    icon: "text-amber-400",
    bar: "bg-amber-500",
    width: "bg-amber-500",
  };
};

const formatDate = (dateValue) => {
  if (!dateValue) return "Date unavailable";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AlertPanel = ({ alerts = [] }) => {
  const safeAlerts = Array.isArray(alerts) ? alerts : [];

  const activeAlerts = safeAlerts.filter((alert) =>
    ["HIGH", "CRITICAL"].includes(
      String(alert?.riskLevel || "").toUpperCase()
    )
  );

  const criticalCount = activeAlerts.filter(
    (alert) => String(alert.riskLevel).toUpperCase() === "CRITICAL"
  ).length;

  const highCount = activeAlerts.filter(
    (alert) => String(alert.riskLevel).toUpperCase() === "HIGH"
  ).length;

  return (
    <section className="mt-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
              <ShieldAlert size={19} className="text-red-400" />
            </div>

            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300">
              Security Operations
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Threat Intelligence Center
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Review suspicious financial advertisements, examine detection
            evidence, and identify threats that require investigation.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 sm:self-auto">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
            <Activity size={20} className="text-red-400" />
          </div>

          <div>
            <p className="text-2xl font-bold tabular-nums text-white">
              {activeAlerts.length}
            </p>
            <p className="text-xs text-slate-400">High/Critical alerts</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Total Alerts</p>
            <FileWarning size={19} className="text-cyan-400" />
          </div>
          <p className="mt-3 text-3xl font-bold text-white">
            {activeAlerts.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            High and critical classifications
          </p>
        </div>

        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Critical Threats</p>
            <ShieldAlert size={19} className="text-red-400" />
          </div>
          <p className="mt-3 text-3xl font-bold text-red-300">
            {criticalCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Highest risk classification
          </p>
        </div>

        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/[0.04] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">High Risk</p>
            <AlertTriangle size={19} className="text-orange-400" />
          </div>
          <p className="mt-3 text-3xl font-bold text-orange-300">
            {highCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Requires further review
          </p>
        </div>
      </div>

      {/* Empty State */}
      {activeAlerts.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-14 text-center sm:px-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
            <ShieldCheck size={32} className="text-emerald-400" />
          </div>

          <h3 className="mt-5 text-xl font-bold text-white">
            No High-Risk Alerts
          </h3>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
            There are currently no high- or critical-risk advertisements in
            this alert list. Continue analyzing suspicious content to identify
            potential threats.
          </p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            No high-risk items in this list
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* List Header */}
          <div className="flex flex-col justify-between gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-semibold text-white">
                Flagged Advertisements
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {activeAlerts.length} item(s) classified as high or critical
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock size={14} />
              <span>Review recommended</span>
            </div>
          </div>

          {/* Alert Cards */}
          {activeAlerts.map((alert, index) => {
            const risk = getRiskStyle(alert?.riskLevel);
            const score = Number(alert?.score);
            const validScore = Number.isFinite(score)
              ? Math.min(100, Math.max(0, score))
              : null;

            const evidence = Array.isArray(alert?.evidence)
              ? alert.evidence
              : [];

            return (
              <article
                key={alert?._id || `alert-${index}`}
                className={`overflow-hidden rounded-2xl border bg-slate-900/80 shadow-lg shadow-black/10 transition duration-300 ${risk.border}`}
              >
                {/* Risk Accent */}
                <div className={`h-1 w-full ${risk.bar}`} />

                <div className="p-5 sm:p-6">
                  {/* Card Header */}
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${risk.badge}`}
                      >
                        <ShieldAlert size={21} className={risk.icon} />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className={`text-lg font-bold ${risk.color}`}>
                            {risk.label}
                          </h3>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${risk.badge} ${risk.color}`}
                          >
                            Investigation Required
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-400">
                          Suspicious Financial Advertisement
                        </p>

                        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                          <Clock size={13} />
                          {formatDate(
                            alert?.createdAt ||
                              alert?.timestamp ||
                              alert?.date
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="min-w-[125px] rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-400">
                          Risk Score
                        </span>
                        <span className={`text-lg font-bold ${risk.color}`}>
                          {validScore === null ? "N/A" : validScore}
                        </span>
                      </div>

                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all ${risk.width}`}
                          style={{
                            width: `${validScore ?? 0}%`,
                          }}
                        />
                      </div>

                      <p className="mt-1.5 text-right text-[10px] text-slate-500">
                        {validScore === null
                          ? "Score unavailable"
                          : "Out of 100"}
                      </p>
                    </div>
                  </div>

                  {/* Advertisement Content */}
                  <div className="mt-6">
                    <div className="mb-3 flex items-center gap-2">
                      <Search size={16} className="text-cyan-400" />
                      <h4 className="text-sm font-semibold text-slate-200">
                        Advertisement Content
                      </h4>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5">
                      <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                        {alert?.text || "No advertisement text available."}
                      </p>
                    </div>
                  </div>

                  {/* Evidence */}
                  <div className="mt-6">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-slate-200">
                        Detection Evidence
                      </h4>

                      <span className="rounded-full border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-xs text-slate-400">
                        {evidence.length} indicator(s)
                      </span>
                    </div>

                    {evidence.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {evidence.map((item, evidenceIndex) => {
                          const evidenceText =
                            typeof item === "string"
                              ? item
                              : item?.message ||
                                item?.description ||
                                item?.type ||
                                JSON.stringify(item);

                          return (
                            <div
                              key={`${alert?._id || index}-evidence-${evidenceIndex}`}
                              className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3.5"
                            >
                              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                                <AlertTriangle
                                  size={15}
                                  className="text-amber-400"
                                />
                              </div>

                              <p className="break-words text-sm leading-6 text-slate-300">
                                {evidenceText}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-500">
                        No detailed evidence is available for this alert.
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mt-6 flex flex-col justify-between gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Activity size={14} />
                      <span>
                        Alert ID:{" "}
                        <span className="font-mono text-slate-400">
                          {alert?._id || "Unavailable"}
                        </span>
                      </span>
                    </div>

                    <div
                      className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${risk.badge} ${risk.color}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${risk.width}`} />
                      Manual review recommended
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <AlertTriangle
          size={17}
          className="mt-0.5 shrink-0 text-amber-400"
        />
        <p className="text-xs leading-5 text-slate-500">
          Risk classifications are automated indicators, not proof of criminal
          activity. Verify the evidence before taking action against an
          advertisement or account.
        </p>
      </div>
    </section>
  );
};

export default AlertPanel;
