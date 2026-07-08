import { MarketingNav } from "../components/MarketingNav";
import { MarketingFooter } from "../components/MarketingFooter";
import { Reveal } from "../components/Animated";

const SECTIONS: Array<{ title: string; body: string[] }> = [
  {
    title: "What we collect",
    body: [
      "Account information you provide: your name, work email, organization name, and password (stored as a salted hash — we never see or store plain-text passwords).",
      "Monitoring configuration you create: monitor names and URLs, host names, alert channel destinations, and status page settings.",
      "Operational data your monitors and agents generate: check results, response times, SSL and security-header findings, server metrics (CPU, memory, disk, load), and incident history.",
      "Images you upload through the admin content manager, and email addresses submitted to our newsletter, waitlists, or contact forms.",
    ],
  },
  {
    title: "How we use it",
    body: [
      "To run the service: executing checks, storing results, sending the alerts you configured, and rendering your dashboards and status pages.",
      "To respond when you contact us, and to send product updates if you subscribed (unsubscribe anytime).",
      "We do not sell your data. We do not share it with third parties except the infrastructure providers that host the service.",
    ],
  },
  {
    title: "Where it lives",
    body: [
      "All application data is stored in our Supabase-hosted PostgreSQL database and object storage, isolated per organization with row-level security. Uploaded images are served from the same infrastructure.",
      "Alert deliveries necessarily transit the channels you configure (your email provider, Slack workspace, or webhook endpoint).",
    ],
  },
  {
    title: "Your controls",
    body: [
      "You can delete monitors, hosts, assets, and alert channels at any time — deletion cascades to their history.",
      "Public status pages are opt-in, and expose only service names and up/down state — never internal URLs.",
      "To request account deletion or export, contact us using the details below.",
    ],
  },
  {
    title: "Contact",
    body: ["ITOps Solution · Kathmandu, Nepal · Phone: +977 980-335-0658 · Or use the contact form on our Company page."],
  },
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-black text-white antialiased" style={{ fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif" }}>
      <MarketingNav />
      <main className="px-6 pb-24 pt-40 md:px-10">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">Legal</p>
            <h1 className="mt-4 text-4xl font-medium tracking-[-0.02em] md:text-5xl">Privacy Policy</h1>
            <p className="mt-4 text-sm text-white/50">
              Plain-language summary of what ITOps Solution collects and why. Last updated July 2026.
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
