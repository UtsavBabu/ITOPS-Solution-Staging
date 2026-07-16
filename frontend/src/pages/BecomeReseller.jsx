import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { MarketingNav } from "../components/MarketingNav";
import { MarketingFooter } from "../components/MarketingFooter";
import { submitResellerApplication } from "../api/endpoints";
import { AuroraBackground } from "../components/PageBackgrounds";
import { Reveal, SpotlightCard } from "../components/Animated";

const BENEFITS = [{
  title: "Provision customers directly",
  description: "Once approved, create and manage your own customer organizations from a dedicated reseller console — no waiting on our team."
}, {
  title: "Your book, your view",
  description: "You only ever see the organizations you provisioned. Row-level access control, not a UI toggle — enforced at the database."
}, {
  title: "Real plan control",
  description: "Change your customers' plans directly as their needs grow, from Starter through Business."
}];

function ResellerApplicationForm() {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const mutation = useMutation({
    mutationFn: () => submitResellerApplication({ companyName, contactName, email, phone, message })
  });

  function handleSubmit(event) {
    event.preventDefault();
    mutation.mutate();
  }

  if (mutation.isSuccess) {
    return <div className="rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-900/60 light:bg-white p-8 text-center">
        <p className="text-base font-medium text-white light:text-slate-900">Application received</p>
        <p className="mt-2 text-sm text-white/60 light:text-slate-500">
          We'll review it and reach out at {email} once it's approved.
        </p>
      </div>;
  }

  return <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-900/60 light:bg-white p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block text-white/70 light:text-slate-600">Company name</span>
          <input required value={companyName} onChange={e => setCompanyName(e.target.value)} className="w-full rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-4 py-2.5 text-sm text-white light:text-slate-900 focus:border-white/40 light:focus:border-slate-900/40 focus:outline-none" />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-white/70 light:text-slate-600">Your name</span>
          <input required value={contactName} onChange={e => setContactName(e.target.value)} className="w-full rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-4 py-2.5 text-sm text-white light:text-slate-900 focus:border-white/40 light:focus:border-slate-900/40 focus:outline-none" />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-white/70 light:text-slate-600">Email</span>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-4 py-2.5 text-sm text-white light:text-slate-900 focus:border-white/40 light:focus:border-slate-900/40 focus:outline-none" />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-white/70 light:text-slate-600">Phone (optional)</span>
          <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-4 py-2.5 text-sm text-white light:text-slate-900 focus:border-white/40 light:focus:border-slate-900/40 focus:outline-none" />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block text-white/70 light:text-slate-600">Tell us about your business (optional)</span>
        <textarea rows={4} value={message} onChange={e => setMessage(e.target.value)} placeholder="Who you'd be selling to, roughly how many customers you expect to onboard, anything else worth knowing." className="w-full rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-4 py-2.5 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-white/40 light:focus:border-slate-900/40 focus:outline-none" />
      </label>

      {mutation.isError && <p className="text-sm text-red-400">{mutation.error.message}</p>}

      <button type="submit" disabled={mutation.isPending} className="w-full rounded-full bg-white px-6 py-3 text-sm font-normal text-black transition-colors hover:bg-neutral-200 disabled:opacity-60">
        {mutation.isPending ? "Submitting…" : "Submit Application"}
      </button>
      <p className="text-center text-xs text-white/35 light:text-slate-400">
        Every application is reviewed by our team before reseller access is granted.
      </p>
    </form>;
}

export default function BecomeReseller() {
  return <div className="min-h-screen bg-black light:bg-slate-50 text-white light:text-slate-900 antialiased" style={{
    fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif"
  }}>
      <MarketingNav />

      <main className="px-6 pb-24 pt-40 md:px-10">
        <div className="relative isolate mx-auto -mt-16 max-w-4xl overflow-hidden rounded-3xl pb-16 pt-16 text-center">
          <AuroraBackground tint="amber" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-black light:to-white" />
          <div className="relative z-10">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45 light:text-slate-400">Partners</p>
            <h1 className="mt-4 text-4xl font-medium leading-[1.05] tracking-[-0.03em] md:text-6xl">
              Become a Reseller
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/60 light:text-slate-500">
              Sell ITOps Monitor to your own customers under a dedicated reseller console — provision accounts, manage
              plans, and grow your own book of business.
            </p>
          </div>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-4 md:grid-cols-3">
          {BENEFITS.map((b, i) => <Reveal key={b.title} delay={i * 0.08}>
              <SpotlightCard className="h-full p-6" tint="amber">
                <p className="text-sm font-medium text-white light:text-slate-900">{b.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-white/55 light:text-slate-500">{b.description}</p>
              </SpotlightCard>
            </Reveal>)}
        </div>

        <div className="mx-auto mt-16 max-w-xl">
          <Reveal>
            <ResellerApplicationForm />
          </Reveal>
        </div>
      </main>

      <MarketingFooter />
    </div>;
}
