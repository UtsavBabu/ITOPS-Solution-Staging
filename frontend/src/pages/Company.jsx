import { useQuery } from "@tanstack/react-query";
import { MarketingNav } from "../components/MarketingNav";
import { MarketingFooter } from "../components/MarketingFooter";
import { ContactForm } from "../components/ContactForm";
import { fetchContentItems } from "../api/endpoints";
import { EnterpriseAuroraBackground } from "../components/PageBackgrounds";
import { Reveal, SpotlightCard } from "../components/Animated";
import { Skeleton } from "../components/Skeleton";
import { ErrorState } from "../components/EmptyState";
function Initials({
  name
}) {
  const initials = name.split(" ").map(part => part[0]).join("");
  return <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 light:bg-slate-900/8 text-lg font-medium text-white light:text-slate-900">
      {initials}
    </div>;
}
export default function Company() {
  const {
    data: leadership,
    isLoading: leadershipLoading,
    isError: leadershipError,
    refetch: refetchLeadership
  } = useQuery({
    queryKey: ["content", "company", "leadership"],
    queryFn: () => fetchContentItems("company", "leadership")
  });
  const {
    data: missionVision,
    isLoading: missionVisionLoading,
    isError: missionVisionError
  } = useQuery({
    queryKey: ["content", "company", "mission_vision"],
    queryFn: () => fetchContentItems("company", "mission_vision")
  });
  return <div className="min-h-screen bg-black light:bg-slate-50 text-white light:text-slate-900 antialiased" style={{
    fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif"
  }}>
      <MarketingNav />
      <div className="enterprise-grid pointer-events-none fixed inset-0 z-0 opacity-70" aria-hidden />

      <main className="relative z-10 px-6 pb-24 pt-40 md:px-10">
        <div className="relative isolate mx-auto -mt-16 max-w-4xl overflow-hidden rounded-3xl light:border light:border-slate-900/10 light:shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_20px_60px_-30px_rgba(15,23,42,0.15)] pb-16 pt-16 text-center text-white light:text-slate-900 2xl:max-w-6xl 3xl:max-w-[1400px]">
          <EnterpriseAuroraBackground intensity="simplified" tint="emerald" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-black light:to-white" />
          <div className="relative z-10">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45 light:text-slate-500">Company</p>
            <h1 className="mt-4 text-4xl font-medium leading-[1.05] tracking-[-0.03em] md:text-6xl">
              Built by People Who Got Tired of Finding Out From Customers
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/60 light:text-slate-600">
              ITOps Monitor started as a focused answer to one question: can a small team get enterprise-grade
              infrastructure visibility without buying five different tools. We're building it in the open, one real
              module at a time.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-20 max-w-4xl 2xl:max-w-6xl 3xl:max-w-[1200px]">
          <Reveal>
            <p className="text-center text-xs font-medium uppercase tracking-[0.15em] text-white/45 light:text-slate-500">Leadership</p>
          </Reveal>
          <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
            {leadershipLoading ? (
              Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
            ) : leadershipError ? (
              <div className="sm:col-span-2">
                <ErrorState message="Couldn't load the leadership team." onRetry={() => refetchLeadership()} />
              </div>
            ) : (
            leadership?.map((person, i) => {
            const imageUrl = typeof person.metadata?.imageUrl === "string" ? person.metadata.imageUrl : "";
            return <SpotlightCard key={person.id} tint={i % 2 === 0 ? "emerald" : "cyan"} delay={i * 0.08}>
                  <div className="flex items-center gap-4 p-6">
                    {imageUrl ? <img src={imageUrl} alt={person.title} className="h-16 w-16 shrink-0 rounded-full object-cover" /> : <Initials name={person.title} />}
                    <div>
                      <p className="text-base font-medium text-white light:text-slate-900">{person.title}</p>
                      <p className="text-sm text-white/55 light:text-slate-500">{person.subtitle}</p>
                    </div>
                  </div>
                </SpotlightCard>;
          })
            )}
          </div>
        </div>

        <div className="mx-auto mt-20 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 2xl:max-w-6xl 3xl:max-w-[1200px]">
          {missionVisionLoading ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
          ) : missionVisionError ? (
            <div className="sm:col-span-2">
              <ErrorState message="Couldn't load this section." />
            </div>
          ) : (
          missionVision?.map((item, i) => <SpotlightCard key={item.id} tint={i % 2 === 0 ? "violet" : "amber"} delay={i * 0.1}>
              <div className="p-6">
                <h3 className="text-sm font-medium uppercase tracking-[0.1em] text-white/45 light:text-slate-500">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70 light:text-slate-600">{item.body}</p>
              </div>
            </SpotlightCard>)
          )}
        </div>

        <div className="mx-auto mt-20 max-w-xl">
          <p className="text-center text-xs font-medium uppercase tracking-[0.15em] text-white/45 light:text-slate-500">Get in Touch</p>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SpotlightCard tint="cyan">
              <a href="tel:+9779803350658" className="flex items-center gap-3.5 p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-400/10 light:bg-cyan-100 text-cyan-300 light:text-cyan-700">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M5 4h4l2 5-2.5 1.5a12 12 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  </svg>
                </span>
                <span>
                  <span className="block text-xs uppercase tracking-wide text-white/40 light:text-slate-400">Call us</span>
                  <span className="mt-0.5 block text-sm font-medium text-white light:text-slate-900">+977 980-335-0658</span>
                </span>
              </a>
            </SpotlightCard>
            <SpotlightCard tint="emerald">
              <div className="flex items-center gap-3.5 p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-400/10 light:bg-emerald-100 text-emerald-300 light:text-emerald-700">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M12 21s-7-5.3-7-11a7 7 0 1114 0c0 5.7-7 11-7 11z" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </span>
                <span>
                  <span className="block text-xs uppercase tracking-wide text-white/40 light:text-slate-400">Based in</span>
                  <span className="mt-0.5 block text-sm font-medium text-white light:text-slate-900">Kathmandu, Nepal</span>
                </span>
              </div>
            </SpotlightCard>
          </div>
          <div className="mt-6">
            <ContactForm defaultTopic="company" />
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>;
}