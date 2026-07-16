import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MarketingNav } from "../components/MarketingNav";
import { MarketingFooter } from "../components/MarketingFooter";
import { WaitlistForm } from "../components/WaitlistForm";
import { fetchContentItems } from "../api/endpoints";
import { ProductHero, ProductShell, CapabilitiesSplit } from "../components/ProductLayout";
import { Reveal } from "../components/Animated";
const LIVE_TODAY = [{
  title: "Structured Courses",
  detail: "Security-awareness courses built from real lessons, not a single long video — organized so a team can actually finish them."
}, {
  title: "Quizzes & Progress Tracking",
  detail: "Each course ends in a scored quiz; completion and quiz scores are tracked per employee so admins can see who's actually trained."
}, {
  title: "Per-Organization Licensing",
  detail: "A platform admin licenses CyberSachet for an organization from the admin portal — every licensed user then sees their courses on login."
}];
export default function CyberSachet() {
  const { data: plannedRows } = useQuery({
    queryKey: ["content", "cybersachet", "planned_capabilities"],
    queryFn: () => fetchContentItems("cybersachet", "planned_capabilities")
  });
  const roadmap = (plannedRows ?? []).map(item => ({ title: item.title, detail: item.body }));
  const capabilities = [...LIVE_TODAY.map(c => ({ ...c, status: "live" })), ...roadmap.map(c => ({ ...c, status: "roadmap" }))];
  return <div className="min-h-screen bg-black light:bg-gradient-to-b light:from-slate-50 light:to-white text-white light:text-slate-900 antialiased" style={{
    fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif"
  }}>
      <MarketingNav />

      <main className="pb-24 pt-40">
        <ProductShell>
          <ProductHero itemKey="cybersachet" title="CyberSachet" subtitle="Cybersecurity awareness training for your whole team" body="A security-awareness training platform for your team — structured courses and quizzes that build real awareness of the threats your organization actually faces, like phishing and password reuse. Phishing simulations and org-wide compliance reporting are still on the roadmap; we're telling you that plainly rather than showing you a demo of something that doesn't exist yet." status="live" capabilities={capabilities} backTo="/solutions" backLabel="Solutions" primaryCta={<Link to="/login" className="inline-block rounded-full bg-white px-7 py-3 text-sm font-normal text-black transition-colors hover:bg-neutral-200">
                Log In to Start Training
              </Link>} secondaryCta={<a href="#capabilities" className="text-sm font-medium text-white/70 light:text-slate-500 underline decoration-white/20 light:decoration-slate-900/20 underline-offset-4 hover:text-white light:hover:text-slate-900 hover:decoration-white light:hover:decoration-slate-900">
                See what's included ↓
              </a>} />
        </ProductShell>

        <section id="capabilities" className="mt-20 py-16 light:bg-white light:border-y light:border-slate-900/5 scroll-mt-28">
          <ProductShell>
            <Reveal>
              <p className="mb-10 text-xs font-medium uppercase tracking-[0.15em] text-white/45 light:text-slate-400">Capabilities</p>
            </Reveal>
            <CapabilitiesSplit live={LIVE_TODAY} roadmap={roadmap} />
          </ProductShell>
        </section>

        <section className="py-16">
          <ProductShell>
            <div className="mx-auto max-w-md text-center">
              <p className="text-sm text-white/50 light:text-slate-500">
                Not a customer yet? Get notified when phishing simulations and compliance reporting ship.
              </p>
              <div className="mt-4">
                <WaitlistForm product="cybersachet" ctaLabel="Join the Waitlist" />
              </div>
            </div>
          </ProductShell>
        </section>
      </main>

      <MarketingFooter />
    </div>;
}
