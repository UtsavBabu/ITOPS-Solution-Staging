import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MarketingNav } from "../components/MarketingNav";
import { MarketingFooter } from "../components/MarketingFooter";
import { WaitlistForm } from "../components/WaitlistForm";
import { fetchContentItems, fetchAcademyPreviewCourses, PLAN_ORDER } from "../api/endpoints";
import { ProductHero, ProductShell, CapabilitiesSplit, WorkflowFlow } from "../components/ProductLayout";
import { Reveal, SpotlightCard } from "../components/Animated";
import { Skeleton } from "../components/Skeleton";
import { EmptyState } from "../components/EmptyState";
import { AcademyMark } from "../components/AcademyBrand";
import { CategoryIcon } from "../components/CyberSachetTheme";
import { CATEGORY_LABELS } from "../data/cybersachetCourses";

const LIVE_TODAY = [{
  title: "Structured Courses",
  detail: "Real courses built from modules and lessons on Linux, cloud computing, and DevOps & CI/CD — organized so a team can actually finish them, not one long video."
}, {
  title: "Quizzes & Real Certificates",
  detail: "Each course ends in a scored quiz. Pass it and a real certificate is issued — with a QR code and a public, verifiable /verify page, not a PDF anyone could fake."
}, {
  title: "Tiered Plan Access",
  detail: "Every course has its own required package tier. Linux Fundamentals is open on every plan; more advanced courses unlock as an organization upgrades — enforced server-side, not just in the UI."
}, {
  title: "Per-Organization Licensing",
  detail: "A platform admin licenses training for an organization from the admin portal — every licensed member then sees their courses on login, and an admin can assign specific courses to specific people."
}];

const WORKFLOW_STEPS = [{
  title: "Log in",
  detail: "Your organization's license and your plan tier decide which courses you can see — no separate signup."
}, {
  title: "Work through lessons",
  detail: "Each lesson ends in a quick comprehension check before the next one unlocks."
}, {
  title: "Pass the quiz",
  detail: "A real graded assessment at the end of the course, scored immediately."
}, {
  title: "Claim your certificate",
  detail: "A verifiable certificate is issued instantly, with a QR code linking to a public verification page."
}];

const FAQ = [{
  q: "Is this the same as CyberSachet?",
  a: "No. CyberSachet is our security-awareness training product — phishing, passwords, data handling. Moonsav ITOps Academy is a separate, distinctly branded product for Cloud, DevOps, and Infrastructure skills. Both run on the same real course engine and are licensed together under one training license, but they're shown, filtered, and certified separately."
}, {
  q: "How do I get access?",
  a: "Your organization's platform admin licenses training from the admin portal. Once licensed, log in and your courses appear according to your organization's plan — Linux Fundamentals is open on every plan, including Starter."
}, {
  q: "Do I get a real, verifiable certificate?",
  a: "Yes. Passing a course's quiz issues a real certificate with a unique ID, a SHA-256 hash, and a QR code linking to a public verification page — anyone can confirm it's genuine without an account."
}, {
  q: "Can my whole team use it?",
  a: "Yes. Once your organization is licensed, an admin can assign specific courses to specific team members, or — for admins and on the free tier — everyone can browse the full unlocked catalog."
}, {
  q: "What's not built yet?",
  a: "Hands-on cloud lab environments, live instructor-led cohorts, and an AI learning assistant are on the roadmap, listed honestly below — they are not live today."
}];

function CoursePreviewCard({ course, index }) {
  return <SpotlightCard tint="amber" delay={index * 0.05} className="h-full">
      <div className="flex h-full flex-col p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] light:bg-slate-900/[0.05] px-2.5 py-1 text-[11px] font-medium text-white/60 light:text-slate-500">
            <CategoryIcon category={course.category} size={12} />{CATEGORY_LABELS[course.category] ?? course.category}
          </span>
          <span className="shrink-0 rounded-full bg-amber-400/10 light:bg-amber-100 px-2.5 py-1 text-[11px] font-medium capitalize text-amber-300 light:text-amber-700">
            {course.level}
          </span>
        </div>
        <h3 className="mt-4 text-base font-medium text-white light:text-slate-900">{course.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-white/55 light:text-slate-500">{course.description}</p>
        <div className="mt-5 flex items-center justify-between border-t border-white/10 light:border-slate-900/10 pt-4 text-xs text-white/40 light:text-slate-400">
          <span>{course.estimatedMinutes} min</span>
          <span>{course.minPlan === "STARTER" ? "Free on every plan" : `Requires ${course.minPlan.charAt(0) + course.minPlan.slice(1).toLowerCase()}+`}</span>
        </div>
      </div>
    </SpotlightCard>;
}

export default function Academy() {
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["academy-preview-courses"],
    queryFn: fetchAcademyPreviewCourses
  });
  const { data: plannedRows } = useQuery({
    queryKey: ["content", "academy", "planned_capabilities"],
    queryFn: () => fetchContentItems("academy", "planned_capabilities")
  });
  const roadmap = (plannedRows ?? []).map(item => ({ title: item.title, detail: item.body }));
  const capabilities = [...LIVE_TODAY.map(c => ({ ...c, status: "live" })), ...roadmap.map(c => ({ ...c, status: "roadmap" }))];

  const categories = useMemo(() => {
    const map = new Map();
    for (const c of courses ?? []) {
      if (!map.has(c.category)) map.set(c.category, []);
      map.get(c.category).push(c);
    }
    return [...map.entries()];
  }, [courses]);

  const tierCounts = useMemo(() => {
    const counts = Object.fromEntries(PLAN_ORDER.map(p => [p, 0]));
    for (const c of courses ?? []) counts[c.minPlan] = (counts[c.minPlan] ?? 0) + 1;
    // A course's tier unlocks it AND everything below — Professional sees
    // Starter + Professional courses, not just courses tagged Professional.
    let running = 0;
    const cumulative = {};
    for (const p of PLAN_ORDER) { running += counts[p] ?? 0; cumulative[p] = running; }
    return cumulative;
  }, [courses]);

  return <div className="min-h-screen bg-black light:bg-gradient-to-b light:from-slate-50 light:to-white text-white light:text-slate-900 antialiased" style={{
    fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif"
  }}>
      <MarketingNav />

      <main className="pb-24 pt-40">
        <ProductShell>
          <ProductHero itemKey="academy" title="Moonsav ITOps Academy" subtitle="Cloud, DevOps, and Infrastructure training for your team" body="A structured training product for Cloud, DevOps, and Infrastructure skills — real courses, real graded quizzes, and real verifiable certificates, run on the same licensed engine as CyberSachet but shown, filtered, and certified as its own product. Cloud lab environments and instructor-led cohorts are honestly listed as roadmap below, not demoed as if they exist." status="live" capabilities={capabilities} backTo="/solutions" backLabel="Solutions" primaryCta={<Link to="/login" className="inline-block rounded-full bg-white px-7 py-3 text-sm font-normal text-black transition-colors hover:bg-neutral-200">
                Log In to Start Learning
              </Link>} secondaryCta={<a href="#courses" className="text-sm font-medium text-white/70 light:text-slate-500 underline decoration-white/20 light:decoration-slate-900/20 underline-offset-4 hover:text-white light:hover:text-slate-900 hover:decoration-white light:hover:decoration-slate-900">
                Browse the catalog ↓
              </a>} />
        </ProductShell>

        {/* course catalog */}
        <section id="courses" className="mt-20 py-16 light:bg-white light:border-y light:border-slate-900/5 scroll-mt-28">
          <ProductShell>
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45 light:text-slate-400">The catalog</p>
              <h2 className="mt-3 text-3xl font-medium tracking-tight md:text-4xl">Every course, real and published</h2>
              <p className="mt-4 text-sm leading-relaxed text-white/55 light:text-slate-500">
                Not a curated preview — this is the actual published catalog, fetched live. New courses appear here the
                moment they're published, nothing staged.
              </p>
            </Reveal>

            {coursesLoading ? <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map(i => <Skeleton key={i} className="h-52 rounded-2xl" />)}
              </div> : (courses ?? []).length === 0 ? <div className="mt-10">
                <EmptyState title="No courses published yet." description="The catalog is empty right now — check back soon, or contact us if you expected to see courses here." />
              </div> : <div className="mt-10 space-y-12">
                {categories.map(([category, list]) => <div key={category}>
                    <p className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.15em] text-amber-300 light:text-amber-700">
                      <CategoryIcon category={category} size={14} />{CATEGORY_LABELS[category] ?? category}
                    </p>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {list.map((course, i) => <CoursePreviewCard key={course.id} course={course} index={i} />)}
                    </div>
                  </div>)}
              </div>}
          </ProductShell>
        </section>

        {/* how it works */}
        <section className="py-16">
          <ProductShell>
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45 light:text-slate-400">How it works</p>
              <h2 className="mt-3 text-3xl font-medium tracking-tight md:text-4xl">From login to certificate</h2>
            </Reveal>
            <div className="mt-12">
              <WorkflowFlow steps={WORKFLOW_STEPS} />
            </div>
          </ProductShell>
        </section>

        {/* capabilities */}
        <section id="capabilities" className="py-16 light:bg-white light:border-y light:border-slate-900/5 scroll-mt-28">
          <ProductShell>
            <Reveal>
              <p className="mb-10 text-xs font-medium uppercase tracking-[0.15em] text-white/45 light:text-slate-400">Capabilities</p>
            </Reveal>
            <CapabilitiesSplit live={LIVE_TODAY} roadmap={roadmap} />
          </ProductShell>
        </section>

        {/* plan tiers */}
        <section className="py-16">
          <ProductShell>
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <Reveal>
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45 light:text-slate-400">Access by plan</p>
                <h2 className="mt-3 text-3xl font-medium tracking-tight md:text-4xl">Every course has a real tier, enforced server-side</h2>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/55 light:text-slate-500">
                  There's no separate Academy price — access is part of your organization's existing ITOps Solution
                  plan. A course's required tier unlocks it for that plan and every plan above it.
                </p>
                <Link to="/pricing" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-amber-300 light:text-amber-700 hover:text-amber-200">
                  Compare packages <span aria-hidden>→</span>
                </Link>
              </Reveal>
              <Reveal delay={0.1}>
                <div className="grid grid-cols-2 gap-4">
                  {PLAN_ORDER.map(plan => <div key={plan} className="rounded-2xl border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-slate-900/[0.02] p-5">
                      <p className="text-xs font-medium uppercase tracking-wide text-white/40 light:text-slate-400">{plan.charAt(0) + plan.slice(1).toLowerCase()}</p>
                      <p className="mt-2 text-2xl font-semibold tabular-nums text-white light:text-slate-900">{tierCounts[plan] ?? 0}</p>
                      <p className="mt-1 text-xs text-white/45 light:text-slate-500">course{(tierCounts[plan] ?? 0) === 1 ? "" : "s"} unlocked</p>
                    </div>)}
                </div>
              </Reveal>
            </div>
          </ProductShell>
        </section>

        {/* organization licensing */}
        <section className="py-16 light:bg-white light:border-y light:border-slate-900/5">
          <ProductShell>
            <div className="mx-auto max-w-3xl text-center">
              <AcademyMark size={40} className="mx-auto" />
              <h2 className="mt-5 text-3xl font-medium tracking-tight md:text-4xl">Licensed per organization, assigned per person</h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/55 light:text-slate-500">
                A platform admin licenses training for your organization from the admin portal. Once licensed, an
                org admin can assign specific courses to specific team members, or open the whole unlocked catalog
                to everyone — the same real licensing model CyberSachet already uses today.
              </p>
              <Link to="/company" className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-white/15 light:border-slate-900/15 px-5 py-2.5 text-sm font-medium text-white/80 light:text-slate-700 hover:bg-white/5 light:hover:bg-slate-900/5">
                Talk to our team <span aria-hidden>→</span>
              </Link>
            </div>
          </ProductShell>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <ProductShell>
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45 light:text-slate-400">FAQ</p>
              <h2 className="mt-3 text-3xl font-medium tracking-tight md:text-4xl">Common questions</h2>
            </Reveal>
            <div className="mx-auto mt-10 max-w-3xl space-y-3">
              {FAQ.map((item, i) => <Reveal key={item.q} delay={i * 0.05}>
                  <details className="group rounded-2xl border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-slate-900/[0.02] px-5 py-4 open:bg-white/[0.04] light:open:bg-slate-900/[0.03]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-white light:text-slate-900">
                      {item.q}
                      <span className="shrink-0 text-white/40 light:text-slate-400 transition-transform group-open:rotate-45" aria-hidden>+</span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-white/55 light:text-slate-500">{item.a}</p>
                  </details>
                </Reveal>)}
            </div>
          </ProductShell>
        </section>

        {/* cross-link + waitlist */}
        <section className="py-16">
          <ProductShell>
            <div className="mx-auto flex max-w-md flex-col items-center gap-8 text-center">
              <div>
                <p className="text-sm text-white/50 light:text-slate-500">
                  Not a customer yet? Get notified when cloud labs and instructor-led cohorts ship.
                </p>
                <div className="mt-4">
                  <WaitlistForm product="academy" ctaLabel="Join the Waitlist" />
                </div>
              </div>
              <p className="text-sm text-white/40 light:text-slate-400">
                Looking for security-awareness training instead?{" "}
                <Link to="/cybersachet" className="font-medium text-cyan-300 light:text-cyan-600 hover:text-cyan-200">
                  See CyberSachet
                </Link>
              </p>
            </div>
          </ProductShell>
        </section>
      </main>

      <MarketingFooter />
    </div>;
}
