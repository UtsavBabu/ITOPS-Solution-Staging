import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { submitWaitlistSignup } from "../api/endpoints";
export function WaitlistForm({
  product,
  ctaLabel = "Request Early Access"
}) {
  const [email, setEmail] = useState("");
  const mutation = useMutation({
    mutationFn: () => submitWaitlistSignup({
      email,
      product
    })
  });
  function handleSubmit(event) {
    event.preventDefault();
    mutation.mutate();
  }
  if (mutation.isSuccess) {
    return <p className="rounded-full border border-white/15 light:border-slate-900/15 bg-white/5 light:bg-slate-900/[0.03] px-5 py-3 text-sm text-white/80 light:text-slate-700">
        Thanks — we'll email you at {email} when this ships.
      </p>;
  }
  return <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
      <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" className="w-full rounded-full border border-white/15 light:border-slate-900/15 bg-white/5 light:bg-slate-900/[0.03] px-5 py-3 text-sm text-white light:text-slate-900 placeholder:text-white/40 light:placeholder:text-slate-400 focus:border-white/40 focus:outline-none" />
      <button type="submit" disabled={mutation.isPending} className="whitespace-nowrap rounded-full bg-white px-6 py-3 text-sm font-normal text-black transition-colors hover:bg-neutral-200 disabled:opacity-60">
        {mutation.isPending ? "Submitting…" : ctaLabel}
      </button>
      {mutation.isError && <p className="text-sm text-red-400 sm:hidden">{mutation.error.message}</p>}
    </form>;
}