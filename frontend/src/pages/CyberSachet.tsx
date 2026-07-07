import { useQuery } from "@tanstack/react-query";
import { MarketingNav } from "../components/MarketingNav";
import { MarketingFooter } from "../components/MarketingFooter";
import { WaitlistForm } from "../components/WaitlistForm";
import { fetchContentItems } from "../api/endpoints";
import { GridScanBackground } from "../components/PageBackgrounds";
import { Reveal, SpotlightCard } from "../components/Animated";

const CARD_TINTS = ["cyan", "violet", "blue"] as const;

export default function CyberSachet() {
  const { data: capabilities } = useQuery({
    queryKey: ["content", "cybersachet", "planned_capabilities"],
    queryFn: () => fetchContentItems("cybersachet", "planned_capabilities"),
  });

  return (
    <div className="min-h-screen bg-black text-white antialiased" style={{ fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif" }}>
      <MarketingNav />

      <main className="px-6 pb-24 pt-40 md:px-10">
        <div className="relative isolate mx-auto -mt-16 max-w-4xl overflow-hidden rounded-3xl pb-16 pt-16 text-center">
          <GridScanBackground tint="red" fast />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-black" />
          <div className="relative z-10">
            <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/60">
              A separate product from ITOps Monitor — Coming Soon
            </span>
            <h1 className="mt-6 text-4xl font-medium leading-[1.05] tracking-[-0.03em] md:text-6xl">CyberSachet</h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/60">
              Cybersecurity awareness training for your whole team — phishing simulations, interactive courses, and
              compliance reporting. This product isn't built yet. We're telling you that plainly rather than showing
              you a demo of something that doesn't exist.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-md">
          <WaitlistForm product="cybersachet" ctaLabel="Join the Waitlist" />
        </div>

        <div className="mx-auto mt-20 max-w-4xl">
          <Reveal>
            <p className="text-center text-xs font-medium uppercase tracking-[0.15em] text-white/45">Planned Capabilities</p>
          </Reveal>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities?.map((item, i) => (
              <SpotlightCard key={item.id} tint={CARD_TINTS[i % CARD_TINTS.length]} delay={i * 0.05} className="border-dashed">
                <div className="p-6">
                  <h3 className="text-sm font-medium text-white/80">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/45">{item.body}</p>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
