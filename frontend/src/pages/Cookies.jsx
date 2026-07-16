import { MarketingNav } from "../components/MarketingNav";
import { MarketingFooter } from "../components/MarketingFooter";
import { Reveal } from "../components/Animated";
const SECTIONS = [{
  title: "The short version",
  body: ["ITOps Solution does not use tracking, advertising, or analytics cookies. There's no ad network, no cross-site tracking pixel, and nothing here sells or shares your browsing data."]
}, {
  title: "What actually keeps you signed in",
  body: ["Your login session is kept in your browser's local storage, not a cookie — set by Supabase Auth, the identity provider this app is built on.", "Local storage is scoped to this site only, isn't sent to any third party, and clears when you log out or clear your browser's site data."]
}, {
  title: "What your hosting/CDN provider may set",
  body: ["The infrastructure that serves this site (Vercel) may set a small number of strictly-necessary technical cookies for routing and DDoS protection — these aren't set by us and don't identify you individually."]
}, {
  title: "Your controls",
  body: ["You can clear local storage and any provider-set cookies at any time from your browser's settings — you'll simply be logged out.", "Blocking third-party cookies in your browser doesn't affect this app's functionality, since we don't rely on any."]
}, {
  title: "Contact",
  body: ["ITOps Solution · Kathmandu, Nepal · Phone: +977 980-335-0658 · Or use the contact form on our Company page."]
}];
export default function Cookies() {
  return <div className="min-h-screen bg-black light:bg-slate-50 text-white light:text-slate-900 antialiased" style={{
    fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif"
  }}>
      <MarketingNav />
      <main className="px-6 pb-24 pt-40 md:px-10">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45 light:text-slate-400">Legal</p>
            <h1 className="mt-4 text-4xl font-medium tracking-[-0.02em] md:text-5xl">Cookie Policy</h1>
            <p className="mt-4 text-sm text-white/50 light:text-slate-500">
              An honest, short explanation — this product doesn't run on tracking cookies. Last updated July 2026.
            </p>
          </Reveal>
          <div className="mt-12 space-y-8">
            {SECTIONS.map((s, i) => <Reveal key={s.title} delay={i * 0.05}>
                <section className="rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-900/50 light:bg-white p-6">
                  <h2 className="text-base font-semibold text-white light:text-slate-900">{s.title}</h2>
                  <ul className="mt-3 space-y-2.5">
                    {s.body.map(p => <li key={p.slice(0, 32)} className="text-sm leading-relaxed text-white/60 light:text-slate-500">
                        {p}
                      </li>)}
                  </ul>
                </section>
              </Reveal>)}
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>;
}