import { useRef, useState } from "react";
import api from "../services/api";
import {
  ScanSearch,
  ShieldCheck,
  ImagePlus,
  Upload,
  FileImage,
  X,
  FileText,
  Bot,
  BellRing,
  Network,
  Sparkles,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Trash2,
} from "lucide-react";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TEXT_LENGTH = 10000;

const features = [
  {
    title: "OCR Extraction",
    description: "Extract text from ad images",
    icon: FileText,
    color: "text-cyan-400",
    background: "bg-cyan-400/10",
  },
  {
    title: "Risk Assessment",
    description: "Evaluate suspicious content",
    icon: Bot,
    color: "text-violet-400",
    background: "bg-violet-400/10",
  },
  {
    title: "Threat Alerts",
    description: "Flag potential warning signs",
    icon: BellRing,
    color: "text-orange-400",
    background: "bg-orange-400/10",
  },
  {
    title: "Campaign Analysis",
    description: "Investigate repeated indicators",
    icon: Network,
    color: "text-emerald-400",
    background: "bg-emerald-400/10",
  },
];

const UploadForm = ({ onAnalyze }) => {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    setError("");
    setSuccess("");

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Image size must be 10 MB or less.");
      return;
    }

    setImage(file);
  };

  const uploadImage = async () => {
    if (!image) {
      setError("Please select an advertisement image first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const formData = new FormData();
      formData.append("image", image);

      const res = await api.post("/ocr/upload", formData);

      const extractedText = res?.data?.text;

      if (typeof extractedText !== "string" || !extractedText.trim()) {
        setError(
          "No text was extracted. Try a clearer image with readable text."
        );
        return;
      }

      setText((previousText) => {
        const combinedText = previousText.trim()
          ? `${previousText.trim()}\n\n${extractedText.trim()}`
          : extractedText.trim();

        return combinedText.slice(0, MAX_TEXT_LENGTH);
      });

      setSuccess("Text extracted successfully and added to the text area.");
    } catch (err) {
      console.error("OCR upload failed:", err);

      setError(
        err?.response?.data?.message ||
          "OCR extraction failed. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const analyzeAdvertisement = async () => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      setError("Paste advertisement text or extract text from an image first.");
      return;
    }

    if (typeof onAnalyze !== "function") {
      setError("Analysis handler is not configured. Please check Analyze.jsx.");
      return;
    }

    try {
      setError("");
      setSuccess("");
      setAnalyzing(true);

      await onAnalyze(trimmedText);
    } catch (err) {
      console.error("Advertisement analysis failed:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Analysis failed. Please try again."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const removeImage = () => {
    setImage(null);
    setError("");
    setSuccess("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearForm = () => {
    setText("");
    setImage(null);
    setError("");
    setSuccess("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <section className="space-y-6">
      {/* Page Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
              <ScanSearch size={19} className="text-cyan-400" />
            </div>

            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Investigation Workspace
            </span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Analyze Advertisement
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Submit suspicious financial advertisements for text extraction,
            risk assessment and investigation.
          </p>
        </div>

        <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
          <ShieldCheck size={15} className="text-emerald-400" />
          <span className="text-xs font-medium text-emerald-300">
            FinShield AI Console
          </span>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {features.map((feature) => {
          const Icon = feature.icon;

          return (
            <div
              key={feature.title}
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 transition-colors hover:border-slate-700"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${feature.background}`}
              >
                <Icon size={20} className={feature.color} />
              </div>

              <h3 className="mt-3 text-sm font-semibold text-slate-100">
                {feature.title}
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main Form */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/10">
        <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500" />

        <div className="p-5 sm:p-7">
          {/* Form Section Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-950">
              <FileText size={19} className="text-cyan-400" />
            </div>

            <div>
              <h3 className="font-semibold text-white">
                Advertisement Input
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Enter text manually or extract it from an image.
              </p>
            </div>
          </div>

          {/* Text Area */}
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <label
                htmlFor="advertisement-text"
                className="text-sm font-medium text-slate-200"
              >
                Advertisement Text
              </label>

              <span
                className={`text-xs tabular-nums ${
                  text.length >= MAX_TEXT_LENGTH
                    ? "text-amber-400"
                    : "text-slate-500"
                }`}
              >
                {text.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()}
              </span>
            </div>

            <textarea
              id="advertisement-text"
              maxLength={MAX_TEXT_LENGTH}
              className="min-h-[230px] w-full resize-y rounded-xl border border-slate-700 bg-slate-950/80 p-4 text-sm leading-7 text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-cyan-500/70 focus:ring-2 focus:ring-cyan-500/10 sm:p-5"
              placeholder={`Paste suspicious advertisement content here...

Example:
Current account available.
ATM card included.
Contact us on WhatsApp.
Payment details available on request.

Tip: Include the original wording, phone numbers, URLs or payment identifiers when available.`}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError("");
                setSuccess("");
              }}
            />

            <div className="mt-2 flex items-start gap-2">
              <Sparkles size={14} className="mt-0.5 shrink-0 text-cyan-500" />
              <p className="text-xs leading-5 text-slate-500">
                Include relevant details exactly as shown in the advertisement
                so the analysis can examine the available content.
              </p>
            </div>
          </div>

          {/* Image Upload */}
          <div className="mt-7">
            <div className="mb-3">
              <h4 className="text-sm font-medium text-slate-200">
                Advertisement Image
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Supported by your OCR endpoint. Maximum size: 10 MB.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            {!image ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  handleFile(e.dataTransfer.files?.[0]);
                }}
                className={`flex min-h-44 w-full flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition-all ${
                  dragging
                    ? "border-cyan-400 bg-cyan-400/10"
                    : "border-slate-700 bg-slate-950/50 hover:border-cyan-500/50 hover:bg-slate-950"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-900">
                  {dragging ? (
                    <ImagePlus size={23} className="text-cyan-400" />
                  ) : (
                    <Upload size={22} className="text-cyan-400" />
                  )}
                </div>

                <p className="mt-4 text-sm font-medium text-slate-200">
                  {dragging
                    ? "Drop image to select"
                    : "Choose an advertisement image"}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Click to browse or drag and drop an image
                </p>

                <span className="mt-3 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  JPG · PNG · WEBP
                </span>
              </button>
            ) : (
              <div className="flex flex-col gap-4 rounded-xl border border-cyan-500/20 bg-slate-950/60 p-4 sm:flex-row sm:items-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10">
                  <FileImage size={24} className="text-cyan-400" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="break-all text-sm font-medium text-slate-200">
                    {image.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {(image.size / (1024 * 1024)).toFixed(2)} MB · Image selected
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-cyan-500/40 hover:text-white"
                  >
                    Change
                  </button>

                  <button
                    type="button"
                    onClick={removeImage}
                    disabled={loading}
                    aria-label="Remove selected image"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/20 text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Error / Success Messages */}
          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-400" />
              <p className="text-sm leading-6 text-red-300">{error}</p>
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"
            >
              <CheckCircle2
                size={18}
                className="mt-0.5 shrink-0 text-emerald-400"
              />
              <p className="text-sm leading-6 text-emerald-300">{success}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-7 flex flex-col gap-3 border-t border-slate-800 pt-6 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={uploadImage}
              disabled={loading || analyzing || !image}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-500/40 hover:bg-slate-800/80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <ScanSearch size={18} />
              )}

              {loading ? "Extracting Text..." : "Extract Text with OCR"}
            </button>

            <button
              type="button"
              onClick={analyzeAdvertisement}
              disabled={loading || analyzing || !text.trim()}
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {analyzing ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <ScanSearch size={18} />
              )}

              {analyzing ? "Analyzing Advertisement..." : "Analyze Advertisement"}

              {!analyzing && (
                <ArrowRight
                  size={17}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              )}
            </button>

            <button
              type="button"
              onClick={clearForm}
              disabled={loading || analyzing || (!text && !image)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 sm:ml-auto"
            >
              <X size={16} />
              Clear Form
            </button>
          </div>

          {/* Privacy / Usage Note */}
          <div className="mt-5 flex items-start gap-2.5">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-slate-500" />
            <p className="text-xs leading-5 text-slate-500">
              Only upload content you are authorized to investigate. Avoid
              including unrelated personal or sensitive information.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UploadForm;
