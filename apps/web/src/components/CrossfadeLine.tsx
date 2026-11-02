"use client";

import { useEffect, useRef, useState } from "react";

/** One line whose words cross-fade when they change. Only the quiet copy is read out (Decision 05). */
export function CrossfadeLine({ text }: { text: string }) {
  const [layers, setLayers] = useState({ a: text, b: "", onA: true });
  const firstRef = useRef(true);
  const [spoken, setSpoken] = useState("");

  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    setLayers((now) => (now.onA ? { a: now.a, b: text, onA: false } : { a: text, b: now.b, onA: true }));
    setSpoken(text);
  }, [text]);

  return (
    <>
      <p className="wbsk-crossline" aria-hidden="true" style={{ margin: 0 }}>
        <span data-on={layers.onA}>{layers.a}</span>
        <span data-on={!layers.onA}>{layers.b}</span>
      </p>
      <p className="wbsk-sr" aria-live="polite">
        {spoken}
      </p>
    </>
  );
}
