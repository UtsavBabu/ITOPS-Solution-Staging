import { useQuery } from "@tanstack/react-query";
import { MarketingNav } from "../components/MarketingNav";
import { MarketingFooter } from "../components/MarketingFooter";
import { ContactForm } from "../components/ContactForm";
import { fetchContentItems } from "../api/endpoints";
import { HeartbeatLineBackground } from "../components/PageBackgrounds";
import { Reveal, SpotlightCard } from "../components/Animated";
import { FaqAccordion } from "../components/FaqAccordion";

const CARD_TINTS = ["emerald", "cyan", "violet"] as const;

export default function Support() {
  const { data: channels } = useQuery({ queryKey: ["content", "support", "channels"], queryFn: () => fetchContentItems("support", "channels") });
  const { data: faqs } = useQuery({ queryKey: ["content", "support", "faqs"], queryFn: () => fetchContentItems("support", "faqs") });

  return (
    <div className="min-h-screen bg-black text-white antialiased" style={{ fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif" }}>
      <MarketingNav />

      <main className="px-6 pb-24 pt-40 md:px-10">
        <div className="relative isolate mx-auto -mt-16 max-w-4xl overflow-hidden rounded-3xl pb-16 pt-16 text-center">
          <HeartbeatLineBackground tint="emerald" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-black" />
          <div className="relative z-10">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">Support</p>
            <h1 className="mt-4 text-4xl font-medium leading-[1.05] tracking-[-0.03em] md:text-6xl">
              We'll Answer Directly — No Bots
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/60">
              Live chat and a full knowledge base aren't built yet. Right now, the fastest way to reach us is the form
              below — a real person reads every message.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
          {channels?.map((channel, i) => (
            <SpotlightCard key={channel.id} tint={CARD_TINTS[i % CARD_TINTS.length]} delay={i * 0.08}>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-white">{channel.title}</h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      channel.status === "Available" ? "bg-emerald-400/10 text-emerald-300" : "bg-white/10 text-white/60"
                    }`}
                  >
                    {channel.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-white/55">{channel.body}</p>
              </div>
            </SpotlightCard>
          ))}
        </div>

        <div id="faq" className="mx-auto mt-20 max-w-3xl">
          <Reveal>
            <p className="text-center text-xs font-medium uppercase tracking-[0.15em] text-white/45">Frequently Asked</p>
          </Reveal>
          <div className="mt-8">
            <FaqAccordion faqs={faqs ?? []} />
          </div>
        </div>

        <div className="mx-auto mt-20 max-w-xl">
          <p className="text-center text-xs font-medium uppercase tracking-[0.15em] text-white/45">Contact Support</p>
          <div className="mt-6">
            <ContactForm defaultTopic="support" />
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
