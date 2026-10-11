import {
  SearchCheck,
  ShieldCheck,
  AlertTriangle,
  Link2,
  Phone,
  CreditCard,
  Globe,
  FileSearch,
  CheckCircle2,
  Fingerprint,
} from "lucide-react";

const getEvidenceDetails = (item) => {
  const text =
    typeof item === "string"
      ? item
      : item?.message ||
        item?.description ||
        item?.indicator ||
        item?.type ||
        "Suspicious indicator detected";

  const normalized = String(text).toLowerCase();

  if (
    normalized.includes("phone") ||
    normalized.includes("mobile") ||
    normalized.includes("whatsapp") ||
    normalized.includes("contact")
  ) {
    return {
      type: "Phone Number",
      icon: Phone,
      color: "text-orange-400",
      badge: "border-orange-500/20 bg-orange-500/10 text-orange-300",
    };
  }

  if (
    normalized.includes("account") ||
    normalized.includes("bank") ||
    normalized.includes("atm") ||
    normalized.includes("card") ||
    normalized.includes("payment")
  ) {
    return {
      type: "Financial Indicator",
      icon: CreditCard,
      color: "text-red-400",
      badge: "border-red-500/20 bg-red-500/10 text-red-300",
    };
  }

  if (
    normalized.includes("url") ||
    normalized.includes("link") ||
    normalized.includes("website") ||
    normalized.includes("http") ||
    normalized.includes("domain")
  ) {
    return {
      type: "URL / Link",
      icon: Link2,
      color: "text-cyan-400",
      badge: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
    };
  }

  if (
    normalized.includes("keyword") ||
    normalized.includes("sell") ||
    normalized.includes("buy") ||
    normalized.includes("urgent") ||
    normalized.includes("suspicious")
  ) {
    return {
      type: "Suspicious Language",
      icon: AlertTriangle,
      color: "text-amber-400",
      badge: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    };
  }

  if (
    normalized.includes("image") ||
    normalized.includes("ocr") ||
    normalized.includes("visual")
  ) {
    return {
      type: "Image Indicator",
      icon: FileSearch,
      color: "text-violet-400",
      badge: "border-violet-500/20 bg-violet-500/10 text-violet-300",
    };
  }

  return {
    type: "Risk Indicator",
    icon: Fingerprint,
    color: "text-cyan-400",
    badge: "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",
  };
};

const EvidencePanel = ({ evidence = [] }) => {
  const safeEvidence = Array.isArray(evidence) ? evidence : [];

  return (
    <section className="mt-8">
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/10">
        {/* Top Accent */}
        <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500" />

        <div className="p-5 sm:p-7">
          {/* Header */}
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
                <SearchCheck size={25} className="text-cyan-400" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                    Investigation Evidence
                  </h2>

                  <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Analysis Results
                  </span>
                </div>

                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                  Review the indicators identified during suspicious financial
                  advertisement analysis.
                </p>
              </div>
            </div>

            <div className="flex w-fit items-center gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10">
                <Fingerprint size={19} className="text-cyan-400" />
              </div>

              <div>
                <p className="text-xl font-bold tabular-nums text-white">
                  {safeEvidence.length}
                </p>
                <p className="text-xs text-slate-400">Indicators</p>
              </div>
            </div>
          </div>

          {/* Evidence List */}
          {safeEvidence.length === 0 ? (
            <div className="mt-7 rounded-xl border border-dashed border-slate-700 bg-slate-950/50 px-5 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
                <ShieldCheck size={29} className="text-emerald-400" />
              </div>

              <h3 className="mt-4 text-lg font-semibold text-white">
                No Indicators Available
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                No evidence items were returned for this analysis. This does
                not guarantee that the advertisement is safe.
              </p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-400">
                <CheckCircle2 size={14} className="text-emerald-400" />
                Analysis evidence is empty
              </div>
            </div>
          ) : (
            <>
              {/* Results Summary */}
              <div className="mt-7 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-cyan-400" />
                  <p className="text-sm text-slate-300">
                    Evidence returned by analysis
                  </p>
                </div>

                <span className="text-xs text-slate-500">
                  {safeEvidence.length} item(s) found
                </span>
              </div>

              {/* Evidence Cards */}
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {safeEvidence.map((item, index) => {
                  const details = getEvidenceDetails(item);
                  const Icon = details.icon;

                  const description =
                    typeof item === "string"
                      ? item
                      : item?.message ||
                        item?.description ||
                        item?.indicator ||
                        item?.type ||
                        JSON.stringify(item);

                  return (
                    <article
                      key={item?._id || `evidence-${index}`}
                      className="group rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition-all duration-200 hover:border-cyan-500/30 hover:bg-slate-950 sm:p-5"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 transition-colors group-hover:border-slate-600 ${details.color}`}
                        >
                          <Icon size={20} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-white">
                              Evidence #{index + 1}
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${details.badge}`}
                            >
                              {details.type}
                            </span>
                          </div>

                          <p className="mt-3 break-words text-sm leading-6 text-slate-300">
                            {description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2 border-t border-slate-800/80 pt-3">
                        <CheckCircle2
                          size={13}
                          className="shrink-0 text-cyan-500"
                        />
                        <span className="text-[11px] text-slate-500">
                          Flagged for investigator review
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}

          {/* Footer Note */}
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/10 bg-amber-500/[0.03] p-4">
            <AlertTriangle
              size={17}
              className="mt-0.5 shrink-0 text-amber-400"
            />

            <p className="text-xs leading-5 text-slate-400">
              <span className="font-semibold text-amber-300">
                Investigation note:{" "}
              </span>
              These indicators are potential warning signs, not conclusive
              proof of fraud. Verify each finding before making a decision.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EvidencePanel;
