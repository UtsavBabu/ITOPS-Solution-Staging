import { createContext, useContext, useEffect, useState } from "react";
import { playSound } from "../lib/sound";

const SoundContext = createContext(null);
const STORAGE_KEY = "itops-sound-enabled";

// Off by default — same reasoning as prefers-reduced-motion: a UI that makes
// noise without being asked to is a real annoyance in an open office or a
// shared screen share, so this is opt-in, not opt-out.
function getInitial() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function SoundProvider({ children }) {
  const [enabled, setEnabled] = useState(getInitial);
  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  }, [enabled]);
  function play(name) {
    if (enabled) playSound(name);
  }
  function toggle() {
    setEnabled(v => {
      const next = !v;
      if (next) playSound("select");
      return next;
    });
  }
  return <SoundContext.Provider value={{ enabled, toggle, play }}>{children}</SoundContext.Provider>;
}

export function useSound() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used within a SoundProvider");
  return ctx;
}
