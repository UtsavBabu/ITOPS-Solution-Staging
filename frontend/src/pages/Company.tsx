import { useQuery } from "@tanstack/react-query";
import { MarketingNav } from "../components/MarketingNav";
import { MarketingFooter } from "../components/MarketingFooter";
import { ContactForm } from "../components/ContactForm";
import { fetchContentItems } from "../api/endpoints";
import { AuroraBackground } from "../components/PageBackgrounds";
import { Reveal, SpotlightCard } from "../components/Animated";

function Initials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("");
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-lg font-medium text-white">
      {initials}
    </div>
  );
}

export default function Company() {
  const { data: leadership } = useQuery({
    queryKey: ["content", "company", "leadership"],
    queryFn: () => fetchContentItems("company", "leadership"),
  });
  const { data: missionVision } = useQuery({
    queryKey: ["content", "company", "mission_vision"],
    queryFn: () => fetchContentItems("company", "mission_vision"),
  });

  return (
    <div className="min-h-screen bg-black text-white antialiased" style={{ fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif" }}>
      <MarketingNav />

      <main className="px-6 pb-24 pt-40 md:px-10">
        <div className="relative isolate mx-auto -mt-16 max-w-4xl overflow-hidden rounded-3xl pb-16 pt-16 text-center">
          <AuroraBackground tint="emerald" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-black" />
          <div className="relative z-10">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">Company</p>
            <h1 className="mt-4 text-4xl font-medium leading-[1.05] tracking-[-0.03em] md:text-6xl">
              Built by People Who Got Tired of Finding Out From Customers
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/60">
              ITOps Monitor started as a focused answer to one question: can a small team get enterprise-grade
              infrastructure visibility without buying five different tools. We're building it in the open, one real
              module at a time.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-20 max-w-4xl">
          <Reveal>
            <p className="text-center text-xs font-medium uppercase tracking-[0.15em] text-white/45">Leadership</p>
          </Reveal>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {leadership?.map((person, i) => {
              const imageUrl = typeof person.metadata?.imageUrl === "string" ? (person.metadata.imageUrl as string) : "";
              return (
                <SpotlightCard key={person.id} tint={i % 2 === 0 ? "emerald" : "cyan"} delay={i * 0.08}>
                  <div className="flex items-center gap-4 p-6">
                    {imageUrl ? (
                      <img src={imageUrl} alt={person.title} className="h-16 w-16 shrink-0 rounded-full object-cover" />
                    ) : (
                      <Initials name={person.title} />
                    )}
                    <div>
                      <p className="text-base font-medium text-white">{person.title}</p>
                      <p className="text-sm text-white/55">{person.subtitle}</p>
                    </div>
                  </div>
                </SpotlightCard>
              );
            })}
          </div>
        </div>

        <div className="mx-auto mt-20 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
          {missionVision?.map((item, i) => (
            <SpotlightCard key={item.id} tint={i % 2 === 0 ? "violet" : "amber"} delay={i * 0.1}>
              <div className="p-6">
                <h3 className="text-sm font-medium uppercase tracking-[0.1em] text-white/45">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/70">{item.body}</p>
              </div>
            </SpotlightCard>
          ))}
        </div>

        <div className="mx-auto mt-20 max-w-xl">
          <p className="text-center text-xs font-medium uppercase tracking-[0.15em] text-white/45">Get in Touch</p>
          <div className="mt-6">
            <ContactForm defaultTopic="company" />
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
