import { CyberSachetCertificate, CertificationPath } from "../components/CyberSachetCertificate";
export default function DevCertPreview() {
  return <div className="min-h-screen bg-slate-100 p-10 space-y-10">
      <CyberSachetCertificate userName="Priya Sharma" orgName="Claude Verify Org" certId="CSSA-2026-000001" score={94} averageScore={94} courseCount={5} hoursTrained={1.1} issuedAt={new Date().toISOString()} expiresAt={new Date(Date.now() + 365 * 86400000).toISOString()} verifyPath="https://app.example/verify/CSSA-2026-000001" />
      <div className="rounded-2xl bg-neutral-950 p-6">
        <CertificationPath earnedCode="CSSA" />
      </div>
    </div>;
}
