import { useRef, useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-7 py-3.5 text-base",
};

function variantClass(variant: Variant): string {
  switch (variant) {
    case "primary":
      // Signature gradient, dark text, glow on hover.
      return "text-[#04050a] font-medium shadow-[0_8px_30px_-8px_rgba(59,130,246,0.5)] hover:shadow-[0_12px_44px_-8px_rgba(59,130,246,0.75)] [background:var(--grad-brand)]";
    case "secondary":
      return "glass text-white hover:border-white/25";
    case "ghost":
      return "text-white/70 hover:text-white hover:bg-white/5";
  }
}

function baseClass(variant: Variant, size: Size, full?: boolean): string {
  return [
    "group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full",
    "transition-all duration-200 will-change-transform hover:-translate-y-0.5 active:translate-y-0",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
    "disabled:opacity-60 disabled:pointer-events-none",
    SIZES[size],
    variantClass(variant),
    full ? "w-full" : "",
  ].join(" ");
}

/** A light "sheen" that sweeps across the button on hover. */
function Sheen() {
  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
      <span className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/25 opacity-0 transition-opacity duration-300 group-hover/btn:opacity-100 group-hover/btn:[animation:sheen_0.9s_ease]" />
    </span>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function Check() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Subtle magnetic pull toward the cursor for primary CTAs.
function useMagnetic(strength = 0.25) {
  const ref = useRef<HTMLElement>(null);
  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * strength;
    const y = (e.clientY - (r.top + r.height / 2)) * strength;
    el.style.transform = `translate(${x}px, ${y}px)`;
  }
  function onLeave() {
    const el = ref.current;
    if (el) el.style.transform = "";
  }
  return { ref, onMove, onLeave };
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  loading?: boolean;
  success?: boolean;
  magnetic?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  full,
  loading,
  success,
  magnetic,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const mag = useMagnetic();
  return (
    <button
      ref={magnetic ? (mag.ref as React.RefObject<HTMLButtonElement>) : undefined}
      onMouseMove={magnetic ? mag.onMove : undefined}
      onMouseLeave={magnetic ? mag.onLeave : undefined}
      disabled={disabled || loading}
      className={`${baseClass(variant, size, full)} ${className}`}
      {...props}
    >
      <Sheen />
      <span className="relative inline-flex items-center gap-2">
        {loading ? <Spinner /> : success ? <Check /> : null}
        {children}
      </span>
    </button>
  );
}

interface CTALinkProps {
  to: string;
  variant?: Variant;
  size?: Size;
  magnetic?: boolean;
  className?: string;
  children: ReactNode;
}

export function CTALink({ to, variant = "primary", size = "md", magnetic, className = "", children }: CTALinkProps) {
  const mag = useMagnetic();
  const [external] = useState(() => /^https?:/.test(to));
  const content = (
    <>
      <Sheen />
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </>
  );
  const cls = `${baseClass(variant, size)} ${className}`;
  if (external) {
    return (
      <a href={to} target="_blank" rel="noreferrer" className={cls}>
        {content}
      </a>
    );
  }
  return (
    <Link
      to={to}
      ref={magnetic ? (mag.ref as React.RefObject<HTMLAnchorElement>) : undefined}
      onMouseMove={magnetic ? mag.onMove : undefined}
      onMouseLeave={magnetic ? mag.onLeave : undefined}
      className={cls}
    >
      {content}
    </Link>
  );
}
