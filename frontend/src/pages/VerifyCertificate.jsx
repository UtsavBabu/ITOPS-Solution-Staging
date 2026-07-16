import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { verifyCertificate } from "../api/endpoints";
import { BrandMark } from "../components/BrandLogo";
import { Skeleton } from "../components/Skeleton";

export default function VerifyCertificate() {
  const { certificateNo: routeCertNo } = useParams();
  const [input, setInput] = useState(routeCertNo ?? "");
  const [lookup, setLookup] = useState(routeCertNo ?? null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["verify-certificate", lookup],
    queryFn: () => verifyCertificate(lookup),
    enabled: !!lookup
  });

  return <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-16" style={{ fontFamily: "'Readex Pro', system-ui, sans-serif" }}>
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <BrandMark size={26} />
          <span className="text-sm font-semibold text-slate-900">ITOps Solution — Certificate Verification</span>
        </div>

        <form onSubmit={e => { e.preventDefault(); setLookup(input.trim()); }} className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Certificate ID, e.g. CSSA-2026-000001 or CRS-2026-000001" className="flex-1 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none" />
          <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Verify</button>
        </form>

        <div className="mt-6">
          {!lookup ? <p className="text-center text-sm text-slate-400">Enter a certificate ID or scan the QR code on a certificate to verify it.</p> : isLoading ? <Skeleton className="h-40 rounded-2xl" /> : isError || !data ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
              <p className="text-sm font-medium text-red-700">Couldn't reach the verification service.</p>
            </div> : !data.valid && !data.userName ? <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <p className="text-2xl">✕</p>
              <p className="mt-2 text-sm font-medium text-slate-700">No certificate found for "{lookup}".</p>
            </div> : <div className={`rounded-2xl border p-6 shadow-sm ${data.valid ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              <div className="flex items-center gap-2">
                <span className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold text-white ${data.valid ? "bg-emerald-500" : "bg-amber-500"}`}>{data.valid ? "✓" : "!"}</span>
                <p className={`text-sm font-semibold ${data.valid ? "text-emerald-700" : "text-amber-700"}`}>
                  {data.valid ? "VALID" : data.revoked ? "REVOKED" : "EXPIRED"}
                </p>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Name</dt><dd className="font-medium text-slate-900">{data.userName}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Organization</dt><dd className="font-medium text-slate-900">{data.organizationName}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Course</dt><dd className="font-medium text-slate-900">{data.courseTitle ?? `CyberSachet Security Awareness (${data.levelCode})`}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Score</dt><dd className="font-medium text-slate-900">{data.averageScore}%</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Issued</dt><dd className="font-medium text-slate-900">{new Date(data.issuedAt).toLocaleDateString()}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Expires</dt><dd className="font-medium text-slate-900">{new Date(data.expiresAt).toLocaleDateString()}</dd></div>
              </dl>
              {data.certificateHash && <div className="mt-4 border-t border-slate-900/10 pt-3">
                  <dt className="text-[11px] uppercase tracking-wide text-slate-400">Document hash (SHA-256)</dt>
                  <dd className="mt-1 break-all font-mono text-[11px] text-slate-500">{data.certificateHash}</dd>
                  <p className="mt-1 text-[10px] text-slate-400">Compare this against the hash printed on the certificate to confirm neither has been altered.</p>
                </div>}
            </div>}
        </div>
      </div>
    </div>;
}
