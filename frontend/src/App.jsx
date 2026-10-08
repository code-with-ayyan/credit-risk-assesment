import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Check,
  ChevronDown,
  History,
  Landmark,
  Loader2,
  RotateCcw,
  ScanSearch,
  TriangleAlert,
  UserRound,
  WifiOff,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/* UI label -> value the backend expects */
const DEFAULT_FLAG_MAP = { Yes: "Y", No: "N" };

/* ---------- Form schema ---------- */
const SECTIONS = [
  {
    id: "personal",
    title: "Personal information",
    hint: "Details about the applicant",
    icon: UserRound,
    fields: [
      { name: "person_age", label: "Age", type: "number", int: true, min: 18, placeholder: "e.g. 28", suffix: "yrs" },
      { name: "person_income", label: "Annual income", type: "number", min: 0, placeholder: "  e.g. 60000", prefix: "Rs. " },
      {
        name: "person_home_ownership",
        label: "Home ownership",
        type: "select",
        options: [["RENT", "Rent"], ["MORTGAGE", "Mortgage"], ["OWN", "Own"], ["OTHER", "Other"]],
      },
      { name: "person_emp_length", label: "Employment length", type: "number", min: 0, step: "0.5", placeholder: "e.g. 4", suffix: "yrs" },
    ],
  },
  {
    id: "loan",
    title: "Loan information",
    hint: "What the applicant is asking for",
    icon: Banknote,
    fields: [
      {
        name: "loan_intent",
        label: "Loan purpose",
        type: "select",
        options: [
          ["EDUCATION", "Education"],
          ["MEDICAL", "Medical"],
          ["VENTURE", "Venture"],
          ["PERSONAL", "Personal"],
          ["DEBTCONSOLIDATION", "Debt consolidation"],
          ["HOMEIMPROVEMENT", "Home improvement"],
        ],
      },
      {
        name: "loan_grade",
        label: "Loan grade",
        type: "select",
        options: ["A", "B", "C", "D", "E", "F", "G"].map((g) => [g, `Grade ${g}`]),
      },
      { name: "loan_amnt", label: "Loan amount", type: "number", int: true, min: 0, placeholder: "  e.g. 10000", prefix: "Rs. " },
      { name: "loan_int_rate", label: "Interest rate", type: "number", min: 0, step: "0.01", placeholder: "e.g. 11.5", suffix: "%" },
      { name: "loan_percent_income", label: "Loan as share of income", type: "computed" },
    ],
  },
  {
    id: "credit",
    title: "Credit history",
    hint: "Past borrowing behaviour",
    icon: History,
    fields: [
      {
        name: "cb_person_default_on_file",
        label: "Previous default on file",
        type: "select",
        options: [["Yes", "Yes"], ["No", "No"]],
        toApi: (v) => DEFAULT_FLAG_MAP[v], // "Yes" -> "Y", "No" -> "N"
      },
      { name: "cb_person_cred_hist_length", label: "Credit history length", type: "number", int: true, min: 0, placeholder: "e.g. 6", suffix: "yrs" },
    ],
  },
];

const INPUT_FIELDS = SECTIONS.flatMap((s) => s.fields).filter((f) => f.type !== "computed");
const EMPTY_FORM = Object.fromEntries(INPUT_FIELDS.map((f) => [f.name, ""]));

function validate(field, value) {
  if (value === "") return field.type === "select" ? "Choose an option" : "This field is required";
  if (field.type === "select") return "";
  const n = Number(value);
  if (Number.isNaN(n)) return "Enter a valid number";
  if (field.int && !Number.isInteger(n)) return "Use a whole number";
  if (field.min !== undefined && n < field.min) return `Must be ${field.min} or more`;
  return "";
}

function describeApiError(body) {
  if (Array.isArray(body?.detail) && body.detail.length) {
    const first = body.detail[0];
    const where = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : "input";
    return `The server rejected "${where}": ${first.msg}`;
  }
  return "The server could not process this application.";
}

/* ---------- Form controls ---------- */
const inputBase =
  "w-full rounded-lg border bg-white py-2.5 text-sm text-ink placeholder:text-slate-400 outline-none transition focus:ring-4";

function Field({ field, value, error, onChange, onBlur }) {
  const tone = error
    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
    : "border-slate-200 hover:border-slate-300 focus:border-brand focus:ring-brand/15";

  return (
    <div>
      <label htmlFor={field.name} className="mb-1.5 block text-sm font-medium text-slate-700">
        {field.label}
      </label>

      {field.type === "select" ? (
        <div className="relative">
          <select
            id={field.name}
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            onBlur={() => onBlur(field.name)}
            aria-invalid={!!error}
            className={`${inputBase} ${tone} appearance-none px-3.5 pr-10 ${value === "" ? "text-slate-400" : ""}`}
          >
            <option value="" disabled>
              Select…
            </option>
            {field.options.map(([val, label]) => (
              <option key={val} value={val} className="text-ink">
                {label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        </div>
      ) : (
        <div className="relative">
          {field.prefix && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              {field.prefix}
            </span>
          )}
          <input
            id={field.name}
            type="number"
            inputMode="decimal"
            min={field.min}
            step={field.step || (field.int ? "1" : "any")}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => onChange(field.name, e.target.value)}
            onBlur={() => onBlur(field.name)}
            aria-invalid={!!error}
            className={`${inputBase} ${tone} ${field.prefix ? "pl-8" : "pl-3.5"} ${field.suffix ? "pr-12" : "pr-3.5"}`}
          />
          {field.suffix && (
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
              {field.suffix}
            </span>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

function ComputedField({ field, ratio }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{field.label}</span>
      <div className="flex min-h-[42px] items-center justify-between rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3.5 text-sm">
        <span className={ratio === null ? "text-slate-400" : "font-medium text-ink"}>
          {ratio === null ? "Calculated automatically" : `${(ratio * 100).toFixed(1)}%`}
        </span>
        {ratio !== null && <span className="text-xs text-slate-400">ratio {ratio.toFixed(2)}</span>}
      </div>
    </div>
  );
}

/* ---------- Result display ---------- */
const TONES = {
  high: {
    panel: "border-rose-200 bg-rose-50",
    badge: "bg-rose-100 text-rose-700",
    title: "text-rose-900",
    body: "text-rose-900/70",
    stat: "border-rose-200/80 bg-white/60",
    stroke: "#d9455f",
    track: "#f9d3da",
    Icon: TriangleAlert,
    message: "The estimated default risk is above the model's decision threshold.",
  },
  low: {
    panel: "border-emerald-200 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-700",
    title: "text-emerald-900",
    body: "text-emerald-900/70",
    stat: "border-emerald-200/80 bg-white/60",
    stroke: "#10a674",
    track: "#c8ecdc",
    Icon: Check,
    message: "The estimated default risk is below the model's decision threshold.",
  },
};

function RiskRing({ probability, threshold, tone }) {
  const size = 208;
  const center = size / 2;
  const stroke = 16;
  const r = 82;
  const circumference = 2 * Math.PI * r;

  // animate from empty to the real value after mount
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setFilled(true), 60);
    return () => clearTimeout(id);
  }, []);

  const offset = circumference * (1 - (filled ? Math.min(Math.max(probability, 0), 1) : 0));
  const thresholdAngle = Math.min(Math.max(threshold, 0), 1) * 360;

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="size-full"
        role="img"
        aria-label={`Default probability ${(probability * 100).toFixed(1)} percent`}
      >
        <g transform={`rotate(-90 ${center} ${center})`}>
          <circle cx={center} cy={center} r={r} fill="none" stroke={tone.track} strokeWidth={stroke} />
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke={tone.stroke}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
        </g>
        {/* threshold tick */}
        <g transform={`rotate(${thresholdAngle} ${center} ${center})`}>
          <line
            x1={center}
            x2={center}
            y1={center - r - 14}
            y2={center - r + 14}
            stroke="#0e1b2e"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-extrabold tracking-tight ${tone.title}`}>
          {(probability * 100).toFixed(1)}%
        </span>
        <span className={`mt-0.5 text-xs font-medium ${tone.body}`}>default probability</span>
      </div>
    </div>
  );
}

function ResultCard({ result }) {
  const isHigh = result.default_prediction === 1;
  const tone = isHigh ? TONES.high : TONES.low;
  const { Icon } = tone;

  return (
    <div className={`rounded-2xl border p-6 transition-colors duration-500 ${tone.panel}`}>
      <div className="flex items-center gap-3">
        <span className={`grid size-11 place-items-center rounded-full ${tone.badge}`}>
          <Icon className="size-6" strokeWidth={2.5} />
        </span>
        <div>
          <p className={`text-xs font-medium ${tone.body}`}>Risk assessment</p>
          <h2 className={`text-xl font-bold ${tone.title}`}>{result.result}</h2>
        </div>
      </div>

      <div className="my-6">
        <RiskRing probability={result.default_probability} threshold={result.threshold} tone={tone} />
      </div>

      <p className={`text-center text-sm leading-relaxed ${tone.body}`}>{tone.message}</p>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-center">
        <div className={`rounded-xl border px-3 py-3 ${tone.stat}`}>
          <dt className={`text-xs ${tone.body}`}>Decision threshold</dt>
          <dd className={`mt-0.5 text-lg font-bold ${tone.title}`}>{(result.threshold * 100).toFixed(1)}%</dd>
        </div>
        <div className={`rounded-xl border px-3 py-3 ${tone.stat}`}>
          <dt className={`text-xs ${tone.body}`}>Model prediction</dt>
          <dd className={`mt-0.5 text-lg font-bold ${tone.title}`}>{isHigh ? "Default" : "No default"}</dd>
        </div>
      </dl>
      <p className={`mt-4 text-center text-xs ${tone.body}`}>The dark tick on the ring marks the threshold.</p>
    </div>
  );
}

function EmptyCard() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 p-8 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500">
        <ScanSearch className="size-6" />
      </span>
      <h2 className="mt-4 text-base font-semibold">No assessment yet</h2>
      <p className="mt-1 max-w-xs text-sm text-slate-500">
        Complete the application and select Assess risk to see the default probability.
      </p>
    </div>
  );
}

function ErrorCard({ message }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <span className="grid size-11 place-items-center rounded-full bg-amber-100 text-amber-700">
        <WifiOff className="size-5" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-amber-900">Assessment failed</h2>
      <p className="mt-1 text-sm leading-relaxed text-amber-900/80">{message}</p>
    </div>
  );
}

/* ---------- App ---------- */
export default function App() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const errors = useMemo(
    () => Object.fromEntries(INPUT_FIELDS.map((f) => [f.name, validate(f, form[f.name])])),
    [form]
  );

  // loan_percent_income is derived from loan amount and income
  const ratio = useMemo(() => {
    const amount = Number(form.loan_amnt);
    const income = Number(form.person_income);
    if (form.loan_amnt === "" || form.person_income === "" || !(income > 0)) return null;
    return Math.round((amount / income) * 10000) / 10000;
  }, [form.loan_amnt, form.person_income]);

  const handleChange = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const handleBlur = (name) => setTouched((t) => ({ ...t, [name]: true }));

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setTouched({});
    setSubmitted(false);
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;

    // Build the payload: numbers as numbers, Yes/No mapped back to Y/N
    const payload = {};
    for (const f of INPUT_FIELDS) {
      const raw = form[f.name];
      if (f.type === "number") payload[f.name] = Number(raw);
      else payload[f.name] = f.toApi ? f.toApi(raw) : raw;
    }
    payload.loan_percent_income = ratio ?? 0;

    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(describeApiError(body));
      }
      setResult(await res.json());
      setStatus("success");
    } catch (err) {
      setErrorMsg(
        err instanceof TypeError
          ? `Could not reach the API at ${API_URL}. Make sure the FastAPI server is running.`
          : err.message
      );
      setStatus("error");
    }
  };

  const showError = (name) => (touched[name] || submitted ? errors[name] : "");

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6">
          <span className="grid size-10 place-items-center rounded-xl bg-ink text-white">
            <Landmark className="size-5" />
          </span>
          <div>
            <p className="text-base font-bold leading-tight">Ayyan</p>
            <p className="text-xs text-slate-500">Credit risk assessment</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Loan application review</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
            Enter the applicant's details to estimate the probability that the loan will default.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          {/* Form */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            {SECTIONS.map(({ id, title, hint, icon: SectionIcon, fields }) => (
              <section key={id} className="p-5 sm:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-brand/10 text-brand">
                    <SectionIcon className="size-[18px]" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold leading-tight">{title}</h2>
                    <p className="text-xs text-slate-500">{hint}</p>
                  </div>
                </div>
                <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
                  {fields.map((field) =>
                    field.type === "computed" ? (
                      <ComputedField key={field.name} field={field} ratio={ratio} />
                    ) : (
                      <Field
                        key={field.name}
                        field={field}
                        value={form[field.name]}
                        error={showError(field.name)}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                    )
                  )}
                </div>
              </section>
            ))}

            <div className="flex flex-col-reverse gap-3 p-5 sm:flex-row sm:items-center sm:justify-end sm:p-7">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
              >
                <RotateCcw className="size-4" />
                Clear form
              </button>
              <button
                type="submit"
                disabled={status === "loading"}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Assessing…
                  </>
                ) : (
                  "Assess risk"
                )}
              </button>
            </div>
          </form>

          {/* Result */}
          <aside aria-live="polite" className="lg:sticky lg:top-6">
            {status === "success" && result ? (
              <ResultCard key={`${result.default_probability}-${result.threshold}`} result={result} />
            ) : status === "error" ? (
              <ErrorCard message={errorMsg} />
            ) : status === "loading" ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center">
                <Loader2 className="size-8 animate-spin text-brand" />
                <p className="mt-4 text-sm font-medium text-slate-600">Running the model…</p>
              </div>
            ) : (
              <EmptyCard />
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
