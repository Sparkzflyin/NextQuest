"use client";

import { useEffect, useState } from "react";
import { Share } from "lucide-react";

const STORAGE_KEY = "nq_pwa_install_dismissed";
const CONSENT_KEY = "nq_cookie_consent";

function isEligibleEnv() {
  const ua = navigator.userAgent;
  const isIPhone = /iPhone|iPod/.test(ua);
  const isIPad =
    /iPad/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!isIPhone && !isIPad) return false;

  // Non-Safari iOS browsers don't expose Add to Home Screen the same way.
  if (/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)) return false;

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return false;

  try {
    if (localStorage.getItem(STORAGE_KEY)) return false;
  } catch {
    // localStorage unavailable — fall through and show the hint anyway.
  }

  return true;
}

export function IOSInstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const sync = () => {
      if (!isEligibleEnv()) {
        setShow(false);
        return;
      }
      let consented = false;
      try {
        consented = Boolean(localStorage.getItem(CONSENT_KEY));
      } catch {
        consented = true;
      }
      setShow(consented);
    };
    sync();
    window.addEventListener("nq:consent", sync);
    return () => window.removeEventListener("nq:consent", sync);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Install NextQuest on your home screen"
      className="fixed inset-x-3 bottom-3 z-50 border-2 border-neon-violet bg-[#06070d]/95 p-4 shadow-[0_0_24px_rgba(192,132,252,0.35)] backdrop-blur sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-md sm:p-5"
    >
      <div className="font-pixel mb-2 flex items-center gap-2 text-[10px] tracking-widest text-neon-cyan neon-cyan">
        <span className="blink">▮</span>
        <span>INSTALL APP</span>
      </div>
      <p className="font-terminal text-lg leading-snug text-violet-100/90">
        Add NextQuest to your home screen: tap{" "}
        <Share
          aria-label="the Share icon"
          className="inline-block h-5 w-5 -translate-y-0.5 align-middle text-neon-cyan"
        />{" "}
        in the Safari toolbar, then choose{" "}
        <strong className="text-violet-100">&ldquo;Add to Home Screen&rdquo;</strong>.
      </p>
      <div className="mt-4 flex">
        <button
          type="button"
          onClick={dismiss}
          className="font-pixel border-2 border-violet-800/60 px-4 py-3 text-[10px] tracking-widest text-violet-300 transition-all hover:border-violet-500 hover:text-violet-100"
        >
          DISMISS
        </button>
      </div>
    </div>
  );
}
