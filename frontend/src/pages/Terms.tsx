import { MarketingNav } from "../components/MarketingNav";
import { MarketingFooter } from "../components/MarketingFooter";
import { Reveal } from "../components/Animated";

const SECTIONS: Array<{ title: string; body: string[] }> = [
  {
    title: "The service",
    body: [
      "ITOps Solution provides monitoring products — website, API, security, and server monitoring with alerting, incidents, and status pages. Capabilities marked “roadmap” on the site are planned work, not commitments with dates.",
      "The free Starter package and paid packages are limited by the numbers shown on the Pricing page; those limits are enforced by the platform.",
    ],
  },
  {
    title: "Your responsibilities",
    body: [
      "Only monitor endpoints and servers you own or are authorized to monitor. You are responsible for the targets you add and the agents you install.",
      "Keep your account credentials and per-host agent keys confidential. Rotate an agent key immediately if you believe it is exposed.",
      "Do not use the service to send abusive traffic, probe systems you do not control, or violate applicable law.",
    ],
  },
  {
    title: "Fair use and availability",
    body: [
      "Check frequencies, host counts, and history retention follow your package. We may throttle abusive usage to protect the platform.",
      "We work to keep the service continuously available but do not currently offer a contractual SLA. Paid Enterprise arrangements with specific commitments are agreed directly with our team.",
    ],
  },
  {
    title: "Data and termination",
    body: [
      "Your data remains yours. Deleting a resource removes its history; deleting your account removes your organization's data.",
      "We may suspend accounts that breach these terms. You may stop using the service and request deletion at any time.",
    ],
  },
  {
    title: "Contact",
    body: ["Questions about these terms: ITOps Solution · Kathmandu, Nepal · Phone: +977 980-335-0658."],
  },
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-black text-white antialiased" style={{ fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif" }}>
      <MarketingNav />
      <main className="px-6 pb-24 pt-40 md:px-10">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">Legal</p>
            <h1 className="mt-4 text-4xl font-medium tracking-[-0.02em] md:text-5xl">Terms of Service</h1>
            <p className="mt-4 text-sm text-white/50">
              The short, honest version of how ITOps Solution may be used. Last updated July 2026.
            </p>
          </Reveal>
          <div className="mt-12 space-y-8">
            {SECTIONS.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.05}>
                <section className="rounded-2xl border border-white/10 bg-neutral-900/50 p-6">
                  <h2 className="text-base font-semibold text-white">{s.title}</h2>
                  <ul className="mt-3 space-y-2.5">
                    {s.body.map((p) => (
                      <li key={p.slice(0, 32)} className="text-sm leading-relaxed text-white/60">
                        {p}
                      </li>
                    ))}
                  </ul>
                </section>
              </Reveal>
            ))}
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
