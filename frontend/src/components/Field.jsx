import { useId, useState } from "react";
function strengthOf(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  score = Math.min(score, 4);
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  return {
    score,
    label: labels[score]
  };
}
const STRENGTH_COLORS = ["bg-white/15", "bg-red-400", "bg-amber-400", "bg-cyan-400", "bg-emerald-400"];

/** World-class input: floating label, focus glow ring, validation states,
 * optional leading icon, show/hide + live strength meter for passwords. */
export function Field({
  label,
  icon,
  error,
  success,
  hint,
  showStrength,
  type = "text",
  value,
  ...props
}) {
  const id = useId();
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && reveal ? "text" : type;
  const validity = error ? "error" : success ? "success" : "idle";
  const pw = typeof value === "string" ? value : "";
  const strength = showStrength && isPassword ? strengthOf(pw) : null;
  const ring = validity === "error" ? "border-red-400/50 focus-within:border-red-400/70 focus-within:shadow-[0_0_0_4px_rgba(248,113,113,0.12)]" : validity === "success" ? "border-emerald-400/50 focus-within:shadow-[0_0_0_4px_rgba(52,211,153,0.12)]" : "border-white/12 focus-within:border-cyan-400/50 focus-within:shadow-[0_0_0_4px_rgba(34,211,238,0.14)]";
  return <div>
      <div className={`group relative rounded-xl border bg-black/40 transition-all duration-200 ${ring}`}>
        {icon && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40 transition-colors group-focus-within:text-cyan-300">
            {icon}
          </span>}
        <input id={id} type={inputType} value={value} placeholder=" " aria-invalid={validity === "error"} className={`peer h-14 w-full rounded-xl bg-transparent pb-2 pt-5 text-sm text-white placeholder-transparent focus:outline-none ${icon ? "pl-11" : "pl-4"} ${isPassword || validity !== "idle" ? "pr-11" : "pr-4"}`} {...props} />
        <label htmlFor={id} className={`pointer-events-none absolute top-2 text-xs font-medium text-cyan-300/90 transition-all duration-200
            peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-placeholder-shown:font-normal peer-placeholder-shown:text-white/40
            peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:font-medium peer-focus:text-cyan-300
            ${icon ? "left-11" : "left-4"}`}>
          {label}
        </label>

        {/* right adornments */}
        {isPassword ? <button type="button" tabIndex={-1} onClick={() => setReveal(r => !r)} aria-label={reveal ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/40 transition-colors hover:text-white">
            {reveal ? <EyeOff /> : <Eye />}
          </button> : validity === "success" ? <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400">
            <CheckIcon />
          </span> : validity === "error" ? <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400">
            <AlertIcon />
          </span> : null}
      </div>

      {/* password strength meter */}
      {strength && pw.length > 0 && <div className="mt-2 flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {[0, 1, 2, 3].map(i => <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < strength.score ? STRENGTH_COLORS[strength.score] : "bg-white/10"}`} />)}
          </div>
          <span className="text-[11px] text-white/45">{strength.label}</span>
        </div>}

      {error ? <p className="mt-1.5 text-xs text-red-300">{error}</p> : hint ? <p className="mt-1.5 text-xs text-white/40">{hint}</p> : null}
    </div>;
}
function Eye() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>;
}
function EyeOff() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 3l18 18M10.6 10.6a3 3 0 004.2 4.2M9.9 4.8A9.8 9.8 0 0112 4.5c6.5 0 10 7 10 7a17 17 0 01-3.3 4M6.6 6.6A17 17 0 002 11.5s3.5 7 10 7a9.6 9.6 0 003.7-.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>;
}
function CheckIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>;
}
function AlertIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    </svg>;
}