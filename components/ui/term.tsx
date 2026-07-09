"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { GLOSSARY } from "@/lib/glossary";

/**
 * Terme de glossaire : soulignement pointillé + bulle de définition au
 * survol, au focus clavier ou au tap (mobile). Bulle rendue en portail
 * (position fixed) pour ignorer les overflow/containing blocks.
 */
export function Term({ id, children }: { id: string; children: ReactNode }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const entry = GLOSSARY[id];
  if (!entry) return <>{children}</>;

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ x: r.left + r.width / 2, y: r.bottom });
  };
  const hide = () => setPos(null);

  return (
    <>
      <button
        ref={ref}
        type="button"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={() => (pos ? hide() : show())}
        aria-label={`Définition : ${entry.label}`}
        className="cursor-help underline decoration-ink-3/60 decoration-dotted underline-offset-2 uppercase"
      >
        {children}
      </button>
      {pos
        ? createPortal(
            <div
              role="tooltip"
              className="pointer-events-none fixed z-[60] w-64 rounded-lg border border-line bg-surface p-2.5 text-left shadow-xl"
              style={{
                left: Math.min(Math.max(pos.x - 128, 8), window.innerWidth - 264),
                top: Math.min(pos.y + 8, window.innerHeight - 140),
              }}
            >
              <p className="text-[11px] font-bold text-ink">{entry.label}</p>
              <p className="mt-1 text-[11px] leading-relaxed normal-case tracking-normal text-ink-2">
                {entry.def}
              </p>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
