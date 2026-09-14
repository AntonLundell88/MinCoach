// "Coachen funderar •••" medan coachens ord skrivs. Samma ord och prickar i
// passets chatt och i lobbyn.
const coachThinkingWords = [
  "tänker",
  "funderar",
  "begrundar",
  "grubblar",
  "kontemplerar",
  "överväger",
  "klurar",
];

export function getRandomThinkingWord(current?: string) {
  const options = coachThinkingWords.filter((item) => item !== current);
  return options[Math.floor(Math.random() * options.length)] ?? coachThinkingWords[0];
}

export function CoachThinkingDots() {
  return (
    <span className="flex items-end gap-1" aria-hidden="true">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-300/80 [animation-duration:900ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-300/80 [animation-delay:150ms] [animation-duration:900ms]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-300/80 [animation-delay:300ms] [animation-duration:900ms]" />
    </span>
  );
}
