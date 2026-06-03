export type ExerciseResolveResult =
  | { status: "empty"; name: ""; suggestion: "" }
  | { status: "known"; name: string; suggestion: "" }
  | { status: "suggest"; name: string; suggestion: string }
  | { status: "needsCategory"; name: string; suggestion: "" }
  | { status: "unknown"; name: string; suggestion: "" };

export type ExerciseInfo = {
  equipment: string;
  detail: string;
};

export type ExerciseProfile = ExerciseInfo & {
  category:
    | "bröst"
    | "rygg"
    | "ben"
    | "axlar"
    | "armar"
    | "mage"
    | "helkropp"
    | "okänd";
  techniqueCue: string;
  progressionRule: string;
  caution: string;
  isCustom: boolean;
};

export type ExerciseProgramMeta = {
  difficulty: "enkel" | "medel" | "avancerad";
  beginnerFit: "bra" | "okej" | "undvik_som_standard";
  stability: "hog" | "medel" | "lag";
  beginnerNote: string;
};

export function normalizeExerciseSearchText(text: string) {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getExerciseProgramMeta(name: string): ExerciseProgramMeta {
  const key = normalizeExerciseSearchText(name);

  const stableMachine = [
    "brostpress",
    "chest press",
    "benpress",
    "benspark",
    "larcurl",
    "leg curl",
    "latsdrag",
    "sittande kabelrodd",
    "cable row",
    "cable crunch",
    "vadpress",
  ];

  if (stableMachine.some((item) => key.includes(item))) {
    return {
      difficulty: "enkel",
      beginnerFit: "bra",
      stability: "hog",
      beginnerNote:
        "Stabil och tydlig variant. Bra förstaval för nybörjare när utrustningen finns.",
    };
  }

  if (key.includes("goblet")) {
    return {
      difficulty: "medel",
      beginnerFit: "okej",
      stability: "medel",
      beginnerNote:
        "Kan fungera lätt laddad, särskilt hemma, men kräver knäböjsmönster. På gym är benpress eller benspark ofta tryggare start för en helt ny eller osäker användare.",
    };
  }

  const technicallyDemanding = [
    "knaboj",
    "knoboj",
    "squat",
    "marklyft",
    "rdl",
    "rumanska",
    "skivstangsrodd",
    "barbell row",
    "utfall",
    "dips",
    "chins",
  ];

  if (technicallyDemanding.some((item) => key.includes(item))) {
    return {
      difficulty: "avancerad",
      beginnerFit: "undvik_som_standard",
      stability: "lag",
      beginnerNote:
        "Mer tekniskt krävande. För nybörjare ska den bara väljas om det finns ett tydligt skäl, lugn start och gärna enklare alternativ.",
    };
  }

  const moderateFreeWeight = [
    "hantelpress",
    "hantelrodd",
    "axelpress",
    "hip thrust",
    "sidolyft",
    "curl",
    "pushdown",
    "triceps",
    "planka",
    "jagarstol",
    "hangande benlyft",
    "situps",
  ];

  if (moderateFreeWeight.some((item) => key.includes(item))) {
    return {
      difficulty: "medel",
      beginnerFit: "okej",
      stability: "medel",
      beginnerNote:
        "Fungerar för många nya användare om lasten är lugn och instruktionen är tydlig, men ska inte ersätta stabilare val utan anledning.",
    };
  }

  if (key.includes("armhavning") || key.includes("bodyweight")) {
    return {
      difficulty: "medel",
      beginnerFit: "okej",
      stability: "medel",
      beginnerNote:
        "Kroppsvikt kan vara bra, men ska inte väljas som standard om användaren inte gillar kroppsviktsövningar eller har bättre redskap.",
    };
  }

  return {
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    beginnerNote:
      "Neutral övning. Om användaren är ny ska coachen hellre välja stabilare alternativ om sådana finns.",
  };
}

export function getExerciseProfile(name: string): ExerciseProfile {
  const key = name.trim().toLowerCase();
  const info = getExerciseInfo(name);
  const customCategoryMatch = name.match(
    /\((ben|rygg|bröst|brost|axlar|armar|mage|helkropp)\)$/i
  );

  if (customCategoryMatch?.[1]) {
    const rawCategory = customCategoryMatch[1].toLowerCase();
    const category = rawCategory === "brost" ? "bröst" : rawCategory;

    return {
      ...info,
      category: category as ExerciseProfile["category"],
      techniqueCue: getCustomExerciseCue(category),
      progressionRule:
        "Progressionen ska vara försiktig tills samma utförande har loggats några pass.",
      caution:
        "Det här är en egen övning. Fråga hellre om redskap eller utförande om något är oklart.",
      isCustom: true,
    };
  }

  if (key.includes("hantelpress")) {
    return {
      ...info,
      category: "bröst",
      techniqueCue: "Fokus: stabil handled, kontrollerad sänkning, inga studs.",
      progressionRule:
        "Prioritera stabilitet. Toppset plus backoff räcker ofta när det blir tungt.",
      caution: "Vid handleds- eller axelstrul: stoppa pressen eller byt variant.",
      isCustom: false,
    };
  }

  if (key.includes("bänkpress") || key.includes("bankpress")) {
    return {
      ...info,
      category: "bröst",
      techniqueCue: "Fokus: jämn pressbana och kontrollerad vändning.",
      progressionRule:
        "Höj när toppsetet sitter med rimlig marginal. Backoff efter tungt toppset.",
      caution: "Vid axel- eller handledssmärta: sänk, korta passet eller byt press.",
      isCustom: false,
    };
  }

  if (key.includes("marklyft") || key.includes("rdl")) {
    return {
      ...info,
      category: "ben",
      techniqueCue: "Fokus: höften bak, ryggen låst och ingen ful failure.",
      progressionRule:
        "Hellre 1 RIR än ful 0 RIR. Höj bara när ryggen håller positionen.",
      caution: "Vid ländryggskänning eller teknikbrist: stoppa eller sänk direkt.",
      isCustom: false,
    };
  }

  if (key.includes("rodd")) {
    return {
      ...info,
      category: "rygg",
      techniqueCue: "Fokus: strikt drag och ryggkontakt före mer vikt.",
      progressionRule:
        "Bygg strikt reps innan du höjer. Om det blir slarvigt: sänk.",
      caution: "Om ländryggen tar över: avbryt eller byt roddvariant.",
      isCustom: false,
    };
  }

  if (key.includes("latsdrag")) {
    return {
      ...info,
      category: "rygg",
      techniqueCue: "Fokus: dra med kontroll och håll kontakt hela vägen ner.",
      progressionRule: "Bygg reps med bra ryggkontakt innan du höjer.",
      caution: "Sänk om greppet eller armarna tar över helt.",
      isCustom: false,
    };
  }

  if (key.includes("benspark")) {
    return {
      ...info,
      category: "ben",
      techniqueCue: "Fokus: paus i toppen och kontakt före mer vikt.",
      progressionRule:
        "Kontakt styr. Om tungt blir slarvigt: sänk och pausa i toppen.",
      caution: "Vid knäsmärta: stoppa eller korta rörelsen.",
      isCustom: false,
    };
  }

  if (
    key.includes("benpress") ||
    key.includes("goblet") ||
    key.includes("knäböj") ||
    key.includes("knöböj") ||
    key.includes("utfall") ||
    key.includes("lårcurl") ||
    key.includes("larcurl") ||
    key.includes("hip thrust")
  ) {
    return {
      ...info,
      category: "ben",
      techniqueCue: "Fokus: kontrollerat, stabilt och samma rörelse varje gång.",
      progressionRule:
        "Höj när djup, kontroll och känsla matchar tidigare pass.",
      caution: "Vid knä eller ländrygg: sänk eller byt övning.",
      isCustom: false,
    };
  }

  if (key.includes("vad")) {
    return {
      ...info,
      category: "ben",
      techniqueCue: "Fokus: stretch i botten och paus i toppen.",
      progressionRule:
        "Stretch och paus är viktigare än last. Höj först när repsen är rena.",
      caution: "Om kontakt försvinner: sänk vikt eller tempo.",
      isCustom: false,
    };
  }

  if (key.includes("biceps") || key.includes("curl")) {
    return {
      ...info,
      category: "armar",
      techniqueCue: "Fokus: ren curl och stoppa innan senan börjar bråka.",
      progressionRule: "Höj bara när repsen är rena och smärtfria.",
      caution: "Biceps är smärtstyrd. Jaga inte failure vid senkänning.",
      isCustom: false,
    };
  }

  if (key.includes("triceps") || key.includes("pushdown")) {
    return {
      ...info,
      category: "armar",
      techniqueCue: "Fokus: kontakt i triceps och smärtfritt grepp.",
      progressionRule:
        "Höj bara när kontakt och armbågar känns bra. Smärta styr före vikt.",
      caution: "Vid armbågs- eller handledskänning: sänk, byt grepp eller stoppa.",
      isCustom: false,
    };
  }

  if (key.includes("axelpress") || key.includes("sidolyft")) {
    return {
      ...info,
      category: "axlar",
      techniqueCue: "Fokus: stabil axel och kontrollerad rörelse.",
      progressionRule:
        "Progression sker med renare reps innan tyngre vikt om axeln känns osäker.",
      caution: "Vid axelkänning: sänk eller byt variant.",
      isCustom: false,
    };
  }

  if (isTimedExercise(name)) {
    return {
      ...info,
      category: "mage",
      techniqueCue: "Fokus: stabil position, jämn andning och ingen svankkollaps.",
      progressionRule:
        "Progression sker främst med längre tid i samma form. Extra vikt läggs på först när tiden sitter kontrollerat.",
      caution: "Avbryt om ländrygg, höft eller axlar tar över på fel sätt.",
      isCustom: false,
    };
  }

  if (
    key.includes("situps") ||
    key.includes("crunch") ||
    key.includes("planka") ||
    key.includes("benlyft") ||
    key.includes("hangande benlyft") ||
    key.includes("hängande benlyft")
  ) {
    return {
      ...info,
      category: "mage",
      techniqueCue: "Fokus: kontrollerad bål och jämn rörelse.",
      progressionRule:
        "Progression sker med fler rena reps, långsammare tempo eller lutning.",
      caution: "Avbryt om höft eller ländrygg tar över på fel sätt.",
      isCustom: false,
    };
  }

  return {
    ...info,
    category: "okänd",
    techniqueCue: "Fokus: samma utförande varje gång och smärtfri rörelse.",
    progressionRule:
      "Progressionen ska vara försiktig tills övningen är tydligare definierad.",
    caution:
      "Om användaren har hittat på varianten själv: fråga vad den tränar och vad som kan kännas fel.",
    isCustom: false,
  };
}

export function isBodyweightExercise(name: string) {
  const key = normalizeExerciseSearchText(name);

  return [
    "armhavningar",
    "assisterade chins",
    "chins",
    "dips",
    "hangande benlyft",
    "hoftlyft",
    "jagarstol",
    "planka",
    "ryggresningar",
    "situps",
    "wall sit",
  ].some((bodyweightKey) => key.includes(bodyweightKey));
}

export function isTimedExercise(name: string) {
  const key = normalizeExerciseSearchText(name);

  return [
    "dead hang",
    "hang",
    "jagarstol",
    "planka",
    "sidoplanka",
    "wall sit",
    "wallsit",
  ].some((timedKey) => key.includes(timedKey));
}

function getCustomExerciseCue(category: string) {
  if (category === "ben") return "Fokus: kontrollerat, smärtfritt och samma rörelse varje gång.";
  if (category === "rygg") return "Fokus: ryggkontakt och ren dragbana.";
  if (category === "bröst") return "Fokus: stabil press och smärtfria axlar.";
  if (category === "axlar") return "Fokus: stabil axel och kontrollerad rörelse.";
  if (category === "armar") return "Fokus: kontakt och smärtfria armbågar.";
  if (category === "mage") return "Fokus: kontrollerad bål och jämn rörelse.";
  return "Fokus: samma utförande varje gång och smärtfri rörelse.";
}

export const KNOWN_EXERCISE_NAMES = [
  "Assisterade chins",
  "Axelpress",
  "Bandrodd",
  "Bänkpress",
  "Benspark",
  "Benpress",
  "Bicepscurl",
  "Bröstpress",
  "Cable cross",
  "Cable crunch",
  "Chins",
  "Chins (assisterade)",
  "Dips",
  "Goblet squat",
  "Hack squat",
  "Hammercurl",
  "Hantelpress",
  "Hantelrodd",
  "Hängande benlyft",
  "Hip thrust",
  "Jägarstol",
  "Knäböj",
  "Latsdrag",
  "Lutande hantelpress",
  "Lårcurl",
  "Planka",
  "Rumänska marklyft",
  "Sidolyft",
  "Situps",
  "Sittande kabelrodd",
  "Skivstångsrodd",
  "Stångcurl",
  "Triceps extension",
  "Triceps pushdown",
  "Utfall",
  "Vadpress",
];

const EXERCISE_ALIASES: Record<string, string> = {
  "assisterad chins": "Assisterade chins",
  "assisterade chins": "Assisterade chins",
  "assisted chins": "Assisterade chins",
  "assisted pull up": "Assisterade chins",
  "assisted pull ups": "Assisterade chins",
  axelpress: "Axelpress",
  "axel press": "Axelpress",
  "shoulder press": "Axelpress",
  "dumbbell shoulder press": "Axelpress",
  "band rodd": "Bandrodd",
  bandrodd: "Bandrodd",
  bankpress: "Bänkpress",
  bonkpress: "Bänkpress",
  "bönkpress": "Bänkpress",
  "bänkpress": "Bänkpress",
  bench: "Bänkpress",
  "bench press": "Bänkpress",
  "ben spark": "Benspark",
  "ben extension": "Benspark",
  benspark: "Benspark",
  "leg extension": "Benspark",
  "leg extensions": "Benspark",
  benpres: "Benpress",
  benpress: "Benpress",
  "leg press": "Benpress",
  bicpes: "Bicepscurl",
  "bicep curl": "Bicepscurl",
  biceps: "Bicepscurl",
  "biceps curl": "Bicepscurl",
  bicepscurl: "Bicepscurl",
  brostpress: "Bröstpress",
  "chest press": "Bröstpress",
  "cable fly": "Cable cross",
  "cable flyes": "Cable cross",
  "cable flies": "Cable cross",
  "cable cross": "Cable cross",
  "cable crunch": "Cable crunch",
  dips: "Dips",
  "goblet squat": "Goblet squat",
  goblet: "Goblet squat",
  "hack squat": "Hack squat",
  "hammer curl": "Hammercurl",
  hammercurl: "Hammercurl",
  "db press": "Hantelpress",
  "dumbbell press": "Hantelpress",
  "hantel press": "Hantelpress",
  hantelpress: "Hantelpress",
  hantelrodd: "Hantelrodd",
  "hantel rodd": "Hantelrodd",
  "hangande benlyft": "Hängande benlyft",
  "hängande benlyft": "Hängande benlyft",
  "hanging leg raise": "Hängande benlyft",
  "hanging leg raises": "Hängande benlyft",
  "hip thrust": "Hip thrust",
  hipthrust: "Hip thrust",
  jagarstol: "Jägarstol",
  "jägarstol": "Jägarstol",
  "wall sit": "Jägarstol",
  wallsit: "Jägarstol",
  knaboj: "Knäböj",
  knoboj: "Knäböj",
  "knäböj": "Knäböj",
  "knöböj": "Knäböj",
  squat: "Knäböj",
  "lat pulldown": "Latsdrag",
  "lats drag": "Latsdrag",
  latsdrag: "Latsdrag",
  latsdrtag: "Latsdrag",
  latsdrg: "Latsdrag",
  "incline dumbbell press": "Lutande hantelpress",
  "lutande hantel press": "Lutande hantelpress",
  "lutande hantelpress": "Lutande hantelpress",
  "hamstring curl": "Lårcurl",
  "leg curl": "Lårcurl",
  "lar curl": "Lårcurl",
  larcurl: "Lårcurl",
  "lårcurl": "Lårcurl",
  plankan: "Planka",
  planka: "Planka",
  rdl: "Rumänska marklyft",
  "romanian deadlift": "Rumänska marklyft",
  "rumanska mark": "Rumänska marklyft",
  "rumanska marklyft": "Rumänska marklyft",
  "rumänska marklyft": "Rumänska marklyft",
  "raka marklyft": "Rumänska marklyft",
  "lateral raise": "Sidolyft",
  "lateral raises": "Sidolyft",
  sidolyft: "Sidolyft",
  "sido lyft": "Sidolyft",
  "cable row": "Sittande kabelrodd",
  "sittande kabelrodd": "Sittande kabelrodd",
  "sittande rodd": "Sittande kabelrodd",
  "barbell row": "Skivstångsrodd",
  skivstangsrodd: "Skivstångsrodd",
  "skivstångsrodd": "Skivstångsrodd",
  stangcurl: "Stångcurl",
  "stångcurl": "Stångcurl",
  "tricep extension": "Triceps extension",
  "triceps extension": "Triceps extension",
  triceps: "Triceps pushdown",
  pushdown: "Triceps pushdown",
  pushdowns: "Triceps pushdown",
  "tricep pushdown": "Triceps pushdown",
  "triceps pushdown": "Triceps pushdown",
  "triceps pushdwon": "Triceps pushdown",
  utfall: "Utfall",
  lunges: "Utfall",
  "calf raise": "Vadpress",
  "calf raises": "Vadpress",
  "vad press": "Vadpress",
  vadpress: "Vadpress",
};

function getEditDistance(a: string, b: string) {
  const matrix = Array.from({ length: a.length + 1 }, (_, index) => [index]);

  for (let column = 1; column <= b.length; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

export function resolveExerciseName(rawName: string): ExerciseResolveResult {
  const name = rawName.trim().replace(/[.!?]+$/g, "");
  const manualMatch = name.match(
    /^(egen|eget)\s+(ben|rygg|bröst|brost|axlar|armar|mage|helkropp)\s*:?\s+(.+)$/i
  );
  const manualWithoutCategory = name.match(/^(egen|eget)\s*:?\s+(.+)$/i);

  if (manualMatch?.[2]?.trim() && manualMatch?.[3]?.trim()) {
    const rawCategory = manualMatch[2].toLowerCase();
    const category = rawCategory === "brost" ? "bröst" : rawCategory;
    return {
      status: "known",
      name: `${manualMatch[3].trim()} (${category})`,
      suggestion: "",
    };
  }

  if (manualWithoutCategory?.[2]?.trim()) {
    return {
      status: "needsCategory",
      name: manualWithoutCategory[2].trim(),
      suggestion: "",
    };
  }

  const normalized = normalizeExerciseSearchText(name);

  if (!normalized) {
    return { status: "empty", name: "", suggestion: "" };
  }

  if (EXERCISE_ALIASES[normalized]) {
    return {
      status: "known",
      name: EXERCISE_ALIASES[normalized],
      suggestion: "",
    };
  }

  const exact = KNOWN_EXERCISE_NAMES.find(
    (exercise) => normalizeExerciseSearchText(exercise) === normalized
  );

  if (exact) {
    return { status: "known", name: exact, suggestion: "" };
  }

  const contained = KNOWN_EXERCISE_NAMES.find((exercise) => {
    const known = normalizeExerciseSearchText(exercise);
    return (
      normalized.length >= 5 &&
      (known.includes(normalized) || normalized.includes(known))
    );
  });

  if (contained) {
    return { status: "suggest", name, suggestion: contained };
  }

  const closest = KNOWN_EXERCISE_NAMES.map((exercise) => ({
    exercise,
    distance: getEditDistance(normalized, normalizeExerciseSearchText(exercise)),
  })).sort((a, b) => a.distance - b.distance)[0];

  if (
    closest &&
    closest.distance <= Math.max(2, Math.floor(normalized.length * 0.22))
  ) {
    return { status: "suggest", name, suggestion: closest.exercise };
  }

  return { status: "unknown", name, suggestion: "" };
}

export function getExerciseInfo(name: string): ExerciseInfo {
  const key = name.trim().toLowerCase();
  const customCategoryMatch = name.match(
    /\((ben|rygg|bröst|brost|axlar|armar|mage|helkropp)\)$/i
  );

  if (customCategoryMatch?.[1]) {
    const rawCategory = customCategoryMatch[1].toLowerCase();
    const category = rawCategory === "brost" ? "bröst" : rawCategory;

    return {
      equipment: `Egen övning · ${category}`,
      detail:
        "Det här är en egen övning. Coachen vet vilken del av kroppen den främst tränar, men kan inte ge exakt teknikråd förrän övningen är mer definierad.",
    };
  }

  if (key.includes("triceps pushdown")) {
    return {
      equipment: "Kabelmaskin, rep som standard",
      detail:
        "Pushdown i kabelmaskin. Rep är standard här eftersom det brukar vara snällt för handlederna. Kör du rak stång, håll dig helst till samma variant nästa gång.",
    };
  }

  if (key.includes("dips")) {
    return {
      equipment: "Dipsställning eller assisterad maskin",
      detail:
        "Dips tränar främst bröst och triceps. Assisterad variant går bra om du vill hålla tekniken jämn.",
    };
  }

  if (key.includes("axelpress")) {
    return {
      equipment: "Hantlar, maskin eller skivstång",
      detail:
        "Press över huvudet för axlar. Håll samma variant över tid om du vill jämföra vikter rättvist.",
    };
  }

  if (key.includes("situps")) {
    return {
      equipment: "Matta eller lutande bänk",
      detail:
        "Magövning med kroppsvikt. Håll samma variant över tid så progressionen blir tydlig.",
    };
  }

  if (key.includes("hantelpress") && key.includes("lutande")) {
    return {
      equipment: "Lutande bänk och hantlar",
      detail:
        "Bröstpress med hantlar på lutande bänk. Försök använda ungefär samma bänkvinkel när vi jämför vikter.",
    };
  }

  if (key.includes("hantelpress")) {
    return {
      equipment: "Plan bänk och hantlar",
      detail:
        "Bröstpress med hantlar. Hantlar ger bra rörelsebana och tydlig progression utan att låsa axlarna för hårt.",
    };
  }

  if (key.includes("bänkpress") || key.includes("bankpress")) {
    return {
      equipment: "Plan bänk och skivstång",
      detail:
        "Bröstpress med skivstång på plan bänk. Håll greppbredd och utförande så lika som möjligt när du jämför vikter.",
    };
  }

  if (key.includes("skivstångsrodd") || key.includes("stångrodd")) {
    return {
      equipment: "Skivstång",
      detail:
        "Rodd med skivstång. Håll ungefär samma lutning och grepp varje gång så loggningen blir rättvis.",
    };
  }

  if (key.includes("sidolyft")) {
    return {
      equipment: "Hantlar eller kabel",
      detail:
        "Axellyft åt sidan. Hantlar är standard om inget annat står. Kabel går bra, men håll samma variant över tid.",
    };
  }

  if (key.includes("cable cross")) {
    return {
      equipment: "Kabelmaskin",
      detail:
        "Bröstflyes i kabelmaskin. Justera höjden så rörelsen känns stabil och går att upprepa nästa pass.",
    };
  }

  if (key.includes("stångcurl")) {
    return {
      equipment: "Rak stång eller EZ-stång",
      detail:
        "Bicepscurl med stång. EZ-stång är helt okej om handlederna föredrar det. Använd samma variant när du jämför vikter.",
    };
  }

  if (key.includes("marklyft")) {
    return {
      equipment: "Skivstång eller hantlar",
      detail:
        "Rumänska marklyft tränar främst baksida lår och säte. Det är inte ett maxlyft här, utan en kontrollerad höftfällning.",
    };
  }

  if (key.includes("benpress")) {
    return {
      equipment: "Benpressmaskin",
      detail:
        "Benpress i maskin. Fotplacering och maskinmodell påverkar känslan, så försök använda samma variant när det går.",
    };
  }

  if (key.includes("benspark")) {
    return {
      equipment: "Bensparksmaskin",
      detail:
        "Framsida lår i maskin. Justera ryggstöd och fotrulle så knäleden känns bra innan du börjar.",
    };
  }

  if (key.includes("vadpress")) {
    return {
      equipment: "Vadpressmaskin, benpress eller hantlar",
      detail:
        "Vadträning. Maskin är standard på gym, men benpress eller hantlar fungerar om maskinen saknas.",
    };
  }

  if (key.includes("latsdrag")) {
    return {
      equipment: "Latsdragsmaskin",
      detail:
        "Drag ovanifrån i kabelmaskin. Greppet kan variera, men håll samma grepp om du vill jämföra vikter exakt.",
    };
  }

  if (key.includes("cable crunch")) {
    return {
      equipment: "Kabelmaskin och rep",
      detail:
        "Magövning i kabelmaskin. Rep är standard här. Tanken är kontrollerad böjning, inte att rycka ner vikten.",
    };
  }

  if (key.includes("hip thrust")) {
    return {
      equipment: "Bänk och skivstång eller maskin",
      detail:
        "Sätesövning. Maskin eller skivstång fungerar, men använd samma variant om du vill följa progressionen tydligt.",
    };
  }

  if (key.includes("lårcurl")) {
    return {
      equipment: "Lårcurlmaskin",
      detail:
        "Baksida lår i maskin. Liggande eller sittande variant går bra, men försök hålla dig till samma över tid.",
    };
  }

  if (key.includes("utfall")) {
    return {
      equipment: "Kroppsvikt eller hantlar",
      detail:
        "Utfall tränar ben och säte. Kroppsvikt räcker om du vill hålla passet lättare eller om knäna behöver lugnare start.",
    };
  }

  if (key.includes("goblet squat")) {
    return {
      equipment: "Hantel eller kettlebell",
      detail:
        "Knäböj med vikt framför kroppen. Bra hemmaövning och lätt att justera efter dagsform.",
    };
  }

  return {
    equipment: "Standardvariant",
    detail:
      "Använd den variant du kan göra konsekvent. När vi loggar vikter är samma utförande från gång till gång viktigare än exakt maskinmodell.",
  };
}
