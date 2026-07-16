import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY;
const HCAPTCHA_SCRIPT_ID = "hcaptcha-script";
const MIN_HUMAN_MS = 1200;

/**
 * Renders as an invisible pair of fields — a honeypot text input real users
 * never see or fill, and a mount timestamp — that `useCaptchaGuard` reads to
 * reject obvious bots (empty-honeypot + too-fast-to-be-human is a real,
 * functioning signal on its own, no third-party service required).
 */
export function HoneypotField({ inputRef }) {
  return (
    <input
      ref={inputRef}
      type="text"
      name="company_website"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      className="pointer-events-none absolute left-[-9999px] top-auto h-px w-px overflow-hidden opacity-0"
    />
  );
}

/**
 * Reads the honeypot + elapsed-time signals and returns whether the
 * submission looks human. Not a substitute for server-verified CAPTCHA —
 * it's a same-day, zero-setup deterrent against naive/scripted bots.
 */
export function useCaptchaGuard() {
  const honeypotRef = useRef(null);
  const mountedAtRef = useRef(Date.now());
  function isLikelyBot() {
    const honeypotFilled = !!honeypotRef.current?.value;
    const tooFast = Date.now() - mountedAtRef.current < MIN_HUMAN_MS;
    return honeypotFilled || tooFast;
  }
  return { honeypotRef, isLikelyBot };
}

/**
 * The visible security check. If VITE_HCAPTCHA_SITE_KEY is set, renders the
 * real hCaptcha widget and hands back a server-verifiable token (pass it as
 * `options.captchaToken` to Supabase's signIn/signUp/resetPasswordForEmail —
 * Supabase verifies it with hCaptcha directly). Without a site key, falls
 * back to a self-contained "Verify you're human" challenge that pairs with
 * `useCaptchaGuard`'s honeypot/timing check above — real client-side bot
 * friction, but not independently server-verified the way hCaptcha is.
 */
export function CaptchaChallenge({ onChange }) {
  if (HCAPTCHA_SITE_KEY) {
    return <HCaptchaWidget onChange={onChange} />;
  }
  return <SelfCheckChallenge onChange={onChange} />;
}

function HCaptchaWidget({ onChange }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [ready, setReady] = useState(typeof window !== "undefined" && !!window.hcaptcha);

  useEffect(() => {
    if (window.hcaptcha) {
      setReady(true);
      return;
    }
    if (document.getElementById(HCAPTCHA_SCRIPT_ID)) return;
    const script = document.createElement("script");
    script.id = HCAPTCHA_SCRIPT_ID;
    script.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || widgetIdRef.current !== null) return;
    widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
      sitekey: HCAPTCHA_SITE_KEY,
      theme: "dark",
      callback: (token) => onChange(token),
      "expired-callback": () => onChange(null),
      "error-callback": () => onChange(null),
    });
  }, [ready, onChange]);

  return <div ref={containerRef} className="flex justify-center" />;
}

function SelfCheckChallenge({ onChange }) {
  const [state, setState] = useState("idle"); // idle | checking | verified
  const timeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  function handleClick() {
    if (state !== "idle") return;
    setState("checking");
    timeoutRef.current = setTimeout(() => {
      setState("verified");
      onChange("self-check-verified");
    }, 550);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={state === "verified"}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
        state === "verified" ? "border-emerald-400/40 bg-emerald-400/[0.06]" : "border-white/15 bg-black/30 hover:border-white/25"
      }`}
    >
      <span className="relative grid h-5 w-5 shrink-0 place-items-center rounded border border-white/25">
        {state === "checking" && (
          <motion.span
            className="h-2.5 w-2.5 rounded-full border-2 border-white/30 border-t-cyan-300"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.6, repeat: Infinity, ease: "linear" }}
          />
        )}
        {state === "verified" && (
          <motion.svg
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="h-3.5 w-3.5 text-emerald-400"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        )}
      </span>
      <span className="text-sm text-white/80">
        {state === "verified" ? "Verified — you're human" : state === "checking" ? "Verifying…" : "Verify you're human"}
      </span>
    </button>
  );
}
