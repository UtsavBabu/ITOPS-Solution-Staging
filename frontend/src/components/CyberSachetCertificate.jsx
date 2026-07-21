import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import QRCode from "qrcode";
import { useToast } from "./Toast";

/**
 * ITOps Solution Certification Framework — Level 1 only (CSSA). Levels 2-5
 * are a real, named roadmap (see CertificationPath below), not built —
 * there's no course content for them yet, so no certificate can honestly
 * be issued for them. Verification is a real in-app route
 * (/verify/:certId), not a marketing domain that was never provisioned.
 */
export const CERT_LEVELS = {
  CSSA: { code: "CSSA", name: "CyberSachet Security Awareness Certified", audience: "All employees", active: true },
  CSUP: { code: "CSUP", name: "CyberSachet Secure User Professional", audience: "All employees, after CSSA", active: false },
  CSSC: { code: "CSSC", name: "CyberSachet Security Champion", audience: "Department champions, managers", active: false },
  CSA: { code: "CSA", name: "CyberSachet Administrator", audience: "Organization admins", active: false },
  CSEM: { code: "CSEM", name: "CyberSachet Enterprise Manager", audience: "Security teams, SOC, compliance", active: false }
};

export function generateCertificateId(existingCount) {
  const year = new Date().getFullYear();
  const seq = String(existingCount + 1).padStart(6, "0");
  return `CSSA-${year}-${seq}`;
}

function QrCode({ value, size = 96 }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { margin: 1, width: size * 2, color: { dark: "#0f172a", light: "#ffffff" } }).then(url => {
      if (!cancelled) setSrc(url);
    });
    return () => { cancelled = true; };
  }, [value, size]);
  if (!src) return <div className="animate-pulse rounded bg-slate-200" style={{ width: size, height: size }} />;
  return <img src={src} width={size} height={size} alt="Certificate verification QR code" className="rounded" />;
}

// courseTitle set -> a single-course certificate (Coursera-style: one per
// finished course); unset -> the overall CSSA certificate for finishing the
// whole catalog. Same physical design either way — only the headline,
// description sentence, and ID prefix (CRS- vs CSSA-, decided server-side
// in issue_course_certificate/issue_cybersachet_certificate) differ.
//
// `preview` renders the exact same real design (real name, org, course,
// score, hours, dates — all computed from real local progress) with a
// diagonal watermark and no QR/verify block, for local preview mode where
// there's no database record and thus nothing a QR code could honestly
// point to. It's a preview of what the certificate looks like, not a
// certificate — the watermark is the difference between showing the design
// and fabricating a credential.
export function CyberSachetCertificate({ userName, orgName, score, issuedAt, expiresAt, certId, averageScore, courseCount, hoursTrained, courseTitle, verifyPath, certificateHash, preview = false, brand = "cybersachet" }) {
  const level = CERT_LEVELS.CSSA;
  const isAcademy = brand === "academy";
  return <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-2xl bg-white p-10 text-slate-900 shadow-[0_40px_100px_-30px_rgba(15,23,42,0.35)] sm:p-14" style={{ fontFamily: "'Readex Pro', system-ui, sans-serif" }}>
      {/* subtle blue geometric security pattern, not a photo */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{
      backgroundImage: "repeating-linear-gradient(45deg, #1e3a8a 0px, #1e3a8a 1px, transparent 1px, transparent 34px), repeating-linear-gradient(-45deg, #0f766e 0px, #0f766e 1px, transparent 1px, transparent 34px)"
    }} />
      <div className="pointer-events-none absolute inset-3 rounded-xl border border-slate-900/10" />
      <div className="pointer-events-none absolute inset-4 rounded-lg border border-teal-700/15" />
      {preview && <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden" aria-hidden>
          <span className="rotate-[-28deg] whitespace-nowrap text-[64px] font-bold uppercase tracking-[0.25em] text-slate-900/[0.06] sm:text-[84px]">Preview · Not Issued</span>
        </div>}

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold tracking-tight text-slate-900">
            IT<span className="text-blue-600">Ops</span> Solution
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Monitor · Secure · Optimize · Simplify</p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-semibold ${isAcademy ? "text-indigo-600" : "text-rose-600"}`}>{isAcademy ? "Moonsav ITOps Academy™" : "CyberSachet™"}</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{isAcademy ? "Cloud · DevOps · Infrastructure Training" : "Security Awareness Training"}</p>
        </div>
      </div>

      <div className="relative mt-8 flex flex-col items-center text-center">
        <motion.div initial={{ scale: 0.7, opacity: 0, rotate: -8 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }} className="grid h-20 w-20 place-items-center rounded-full shadow-[0_10px_30px_-8px_rgba(202,138,4,0.6)]" style={{ background: isAcademy ? "linear-gradient(135deg, #fcd34d, #6366f1 65%, #3730a3)" : "linear-gradient(135deg, #fde68a, #d97706 55%, #92400e)" }}>
          <svg className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="none"><path d="M12 2l7 3v6c0 5-3 9.4-7 11-4-1.6-7-6-7-11V5l7-3z" stroke="currentColor" strokeWidth="1.6" fill="rgba(255,255,255,0.12)" /><path d="M9 12l2 2 4-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </motion.div>

        <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.3em] text-slate-400">Certificate of Completion</p>
        <h1 className="mt-2 max-w-xl text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{courseTitle ?? level.name}</h1>
        {!courseTitle && <p className="mt-1 text-sm font-medium text-blue-700">({level.code})</p>}

        <p className="mt-8 text-xs uppercase tracking-[0.2em] text-slate-400">Awarded to</p>
        <p className="mt-1 text-xl font-semibold text-slate-900">{userName}</p>
        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">Organization</p>
        <p className="mt-1 text-sm font-medium text-slate-700">{orgName}</p>

        <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-slate-500">
          {courseTitle
            ? <>Has successfully completed the <strong>{courseTitle}</strong> course and passed its assessment with a score of {averageScore}%.</>
            : <>Has successfully completed all {courseCount} CyberSachet security-awareness training courses and passed every course
                assessment with an average score of {averageScore}%.</>}
        </p>

        <div className="mt-8 grid w-full grid-cols-2 gap-4 border-t border-slate-900/10 pt-6 text-left sm:grid-cols-4">
          <div><p className="text-[10px] uppercase tracking-wide text-slate-400">Score</p><p className="mt-0.5 text-sm font-medium text-slate-900">{score}%</p></div>
          <div><p className="text-[10px] uppercase tracking-wide text-slate-400">Training hours</p><p className="mt-0.5 text-sm font-medium text-slate-900">{hoursTrained}h</p></div>
          <div><p className="text-[10px] uppercase tracking-wide text-slate-400">Issued</p><p className="mt-0.5 text-sm font-medium text-slate-900">{new Date(issuedAt).toLocaleDateString()}</p></div>
          <div><p className="text-[10px] uppercase tracking-wide text-slate-400">Expires</p><p className="mt-0.5 text-sm font-medium text-slate-900">{new Date(expiresAt).toLocaleDateString()}</p></div>
        </div>
      </div>

      <div className="relative mt-10 flex flex-wrap items-end justify-between gap-6 border-t border-slate-900/10 pt-6">
        <div className="flex gap-8">
          <div>
            <p className="mb-1 h-6 border-b border-slate-400 font-serif text-lg italic text-slate-400">Signed</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Chief Executive Officer</p>
          </div>
          <div>
            <p className="mb-1 h-6 border-b border-slate-400 font-serif text-lg italic text-slate-400">Signed</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Training Program Director</p>
          </div>
        </div>
        {preview ? <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Certificate ID</p>
            <p className="font-mono text-xs font-medium text-slate-400">Assigned once issued</p>
            <p className="mt-0.5 max-w-[220px] text-[10px] leading-relaxed text-slate-400">No QR code yet — a preview isn't a real, verifiable credential.</p>
          </div> : <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Certificate ID</p>
              <p className="font-mono text-xs font-medium text-slate-700">{certId}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">Verify at</p>
              <p className="font-mono text-[10px] text-blue-600">{verifyPath}</p>
              {certificateHash && <p className="mt-0.5 font-mono text-[9px] text-slate-400" title={certificateHash}>SHA-256 {certificateHash.slice(0, 16)}…</p>}
            </div>
            <QrCode value={verifyPath} size={72} />
          </div>}
      </div>
    </div>;
}

export function CertificationPath({ earnedCode }) {
  return <div>
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.15em] text-white/45 light:text-slate-400">ITOps Solution Certification Framework</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Object.values(CERT_LEVELS).map((lvl, i) => {
        const earned = lvl.code === earnedCode;
        return <motion.div key={lvl.code} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.06 }} className={`rounded-2xl border p-4 ${earned ? "border-amber-400/40 bg-amber-400/[0.06]" : lvl.active ? "border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-slate-900/[0.02]" : "border-dashed border-white/10 light:border-slate-900/10 opacity-60"}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-white/40 light:text-slate-400">{lvl.code}</span>
                {earned ? <span className="text-amber-300" aria-hidden>🥇</span> : !lvl.active && <span className="text-[10px] text-white/35 light:text-slate-400">Coming soon</span>}
              </div>
              <p className="mt-1.5 text-xs font-medium leading-snug text-white/85 light:text-slate-800">{lvl.name}</p>
              <p className="mt-1 text-[10px] text-white/40 light:text-slate-400">{lvl.audience}</p>
            </motion.div>;
      })}
      </div>
    </div>;
}

// Real share/copy actions, not decoration: LinkedIn's share-offsite
// endpoint needs no API key or backend (it's the same link LinkedIn's own
// "Share" button generates), and copy-link just puts the real public
// verification URL on the clipboard. Both are hidden without a real
// verifyPath (local preview has none — there's nothing to share yet).
export function CertificateDownloadCard({ children, verifyPath }) {
  const toast = useToast();
  const fullVerifyUrl = verifyPath ? (verifyPath.startsWith("http") ? verifyPath : `${window.location.origin}${verifyPath}`) : null;
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(fullVerifyUrl);
      toast.success("Verification link copied.");
    } catch {
      toast.error("Couldn't copy the link — copy it from the address bar instead.");
    }
  }
  return <div className="space-y-3">
      {children}
      <div className="flex flex-wrap items-center justify-center gap-3 text-center">
        <button onClick={() => window.print()} className="rounded-full bg-gradient-to-r from-blue-700 to-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-[0_8px_24px_-8px_rgba(30,58,138,0.5)] transition-transform hover:scale-[1.03]">
          Print / Save as PDF
        </button>
        {fullVerifyUrl && <>
            <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullVerifyUrl)}`} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/15 light:border-slate-900/15 px-5 py-2.5 text-sm font-medium text-white/80 light:text-slate-700 transition-colors hover:bg-white/5 light:hover:bg-slate-900/5">
              Share to LinkedIn
            </a>
            <button onClick={copyLink} className="rounded-full border border-white/15 light:border-slate-900/15 px-5 py-2.5 text-sm font-medium text-white/80 light:text-slate-700 transition-colors hover:bg-white/5 light:hover:bg-slate-900/5">
              Copy verification link
            </button>
          </>}
        {verifyPath && <Link to={verifyPath} className="text-xs text-white/50 light:text-slate-500 underline hover:text-white light:hover:text-slate-900">
          Open verification page →
        </Link>}
      </div>
    </div>;
}
