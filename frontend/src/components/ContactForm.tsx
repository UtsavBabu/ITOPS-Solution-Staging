import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { submitContactMessage } from "../api/endpoints";
import type { ContactTopic } from "../api/types";

const TOPICS: Array<{ value: ContactTopic; label: string }> = [
  { value: "sales", label: "Sales" },
  { value: "support", label: "Support" },
  { value: "company", label: "Company" },
  { value: "other", label: "Other" },
];

export function ContactForm({ defaultTopic = "other" as ContactTopic }: { defaultTopic?: ContactTopic }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<ContactTopic>(defaultTopic);
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: () => submitContactMessage({ name, email, topic, message }),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  if (mutation.isSuccess) {
    return (
      <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-8 text-center">
        <p className="text-base font-medium text-white">Message Sent</p>
        <p className="mt-2 text-sm text-white/60">We'll get back to you at {email} shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-neutral-900/60 p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block text-white/70">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-black/40 px-4 py-2.5 text-sm text-white focus:border-white/40 focus:outline-none"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-white/70">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-black/40 px-4 py-2.5 text-sm text-white focus:border-white/40 focus:outline-none"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block text-white/70">Topic</span>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value as ContactTopic)}
          className="w-full rounded-lg border border-white/15 bg-black/40 px-4 py-2.5 text-sm text-white focus:border-white/40 focus:outline-none"
        >
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block text-white/70">Message</span>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-lg border border-white/15 bg-black/40 px-4 py-2.5 text-sm text-white focus:border-white/40 focus:outline-none"
        />
      </label>

      {mutation.isError && <p className="text-sm text-red-400">{mutation.error.message}</p>}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded-full bg-white px-6 py-3 text-sm font-normal text-black transition-colors hover:bg-neutral-200 disabled:opacity-60"
      >
        {mutation.isPending ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
