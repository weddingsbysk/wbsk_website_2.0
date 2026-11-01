const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  "aria-hidden": true,
} as const;

export function MenuIcon() {
  return (
    <svg {...base} width="24" height="24" viewBox="0 0 24 24">
      <path d="M3 8.5h18M3 15.5h18" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg {...base} width="24" height="24" viewBox="0 0 24 24">
      <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" strokeLinecap="round" />
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <svg {...base} className="wbsk-arrow" width="16" height="10" viewBox="0 0 16 10">
      <path d="M1 5h13.5M10.5 1l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
