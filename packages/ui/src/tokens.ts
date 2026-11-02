export const colors = {
  ivory: "#F5EFE6",
  dusk: "#1F1914",
  ink: "#231C16",
  gold: "#DDAF3A",
  deepGold: "#7A5C17",
  muted: "#6B5E52",
  error: "#A32A1E",
} as const;

export const motion = {
  arriveSeconds: 0.7,
  rippleSeconds: 0.09,
  risePixels: 24,
  hoverSeconds: 0.3,
  pageOutSeconds: 0.45,
  pageInSeconds: 0.7,
  softSettle: "cubic-bezier(0.22, 1, 0.36, 1)",
  travel: "cubic-bezier(0.65, 0, 0.35, 1)",
  parallaxMin: 0.12,
  parallaxMax: 0.18,
} as const;
