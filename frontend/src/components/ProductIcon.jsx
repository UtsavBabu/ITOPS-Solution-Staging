// Distinct visual identity per product — a glyph + gradient tile, so the
// catalog reads like a product suite instead of a text list.

const PRODUCT_META = {
  "website-api-monitoring": {
    label: "Website & API Monitoring",
    gradient: "linear-gradient(135deg, #0e7490, #22d3ee)",
    glyph: <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 0c2.5 2.4 3.8 5.6 3.8 9s-1.3 6.6-3.8 9m0-18C9.5 5.4 8.2 8.6 8.2 12s1.3 6.6 3.8 9M3.5 9h17M3.5 15h17" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" />
  },
  "security-monitoring": {
    label: "Security Monitoring",
    gradient: "linear-gradient(135deg, #047857, #34d399)",
    glyph: <path d="M12 3l7 3v5c0 4.6-3 8.6-7 10-4-1.4-7-5.4-7-10V6l7-3zm-2.8 9.2l2 2 3.8-4" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  },
  "kada-nigrani": {
    label: "Kada Nigrani",
    gradient: "linear-gradient(135deg, #1d4ed8, #60a5fa)",
    glyph: <path d="M4 5.5h16v5H4zM4 13.5h16v5H4zM7 8h.01M7 16h.01M11 8h4M11 16h2" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" />
  },
  "infrastructure-monitor": {
    label: "Network & Device Monitoring",
    gradient: "linear-gradient(135deg, #6d28d9, #a78bfa)",
    glyph: <path d="M5 20V10m7 10V4m7 16v-7M3 20h18" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" />
  },
  "devops-monitor": {
    label: "DevOps Monitor",
    gradient: "linear-gradient(135deg, #b45309, #fbbf24)",
    glyph: <path d="M8.5 7A4.5 4.5 0 104 11.5M8.5 7H5M8.5 7v3.5m7 6.5a4.5 4.5 0 104.5-4.5m-4.5 4.5H19m-3.5 0v-3.5M9 15l6-6" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  },
  "alerting-incident-response": {
    label: "Alerting & Incident Response",
    gradient: "linear-gradient(135deg, #be123c, #fb7185)",
    glyph: <path d="M12 3v2m0 14v2M5 12H3m18 0h-2M12 8a4 4 0 014 4c0 2.5 1 3.5 2 4H6c1-.5 2-1.5 2-4a4 4 0 014-4zm-1.5 10a1.5 1.5 0 003 0" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  },
  "moonsav-edr": {
    label: "MoonSAV-EDR",
    gradient: "linear-gradient(135deg, #1e1b4b, #dc2626)",
    glyph: <path d="M12 3l7 3v5c0 4.6-3 8.6-7 10-4-1.4-7-5.4-7-10V6l7-3zm-3 9l2 2 4-4.5" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  },
  academy: {
    label: "Moonsav ITOps Academy",
    gradient: "linear-gradient(135deg, #f59e0b, #6366f1)",
    glyph: <path d="M12 4l9 4.5-9 4.5-9-4.5L12 4zm-6.5 6.75v4c0 2 2.9 3.75 6.5 3.75s6.5-1.75 6.5-3.75v-4M20 8.5v6" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  }
};
const FALLBACK = {
  label: "Product",
  gradient: "linear-gradient(135deg, #334155, #94a3b8)",
  glyph: <path d="M4 7l8-4 8 4-8 4-8-4zm0 5l8 4 8-4M4 17l8 4 8-4" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
};
export function ProductIcon({
  itemKey,
  size = 44
}) {
  const meta = itemKey && PRODUCT_META[itemKey] || FALLBACK;
  return <span aria-hidden className="grid shrink-0 place-items-center rounded-xl shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)]" style={{
    width: size,
    height: size,
    background: meta.gradient
  }}>
      <svg viewBox="0 0 24 24" style={{
      width: size * 0.55,
      height: size * 0.55
    }}>
        {meta.glyph}
      </svg>
    </span>;
}