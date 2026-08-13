// iOS Safari (även som installerad PWA) stödjer inte Vibration API — det
// här blir ett tyst no-op där, men fungerar på Android/Chrome. Håll ändå
// kvar anropen: standardbaserat, kostar inget, och fungerar redan där det
// stöds.
export function triggerHaptic(pattern: number | number[] = 12) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  navigator.vibrate(pattern);
}
