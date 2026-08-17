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

export type ExerciseEnvironment = "gym" | "hemma" | "båda";
export type ExerciseLogType = "weight_reps_rir" | "time_rir" | "bodyweight_reps_rir";
export type ExerciseTrainingValue = "hög" | "medel" | "låg";

export type ExerciseMovementPattern =
  | "horisontell_press"
  | "vertikal_press"
  | "horisontellt_drag"
  | "vertikalt_drag"
  | "knaboj"
  | "utfall_ett_ben"
  | "hoftfallning"
  | "hoftstrackning"
  | "knadominant_isolering"
  | "hamstring_isolering"
  | "armbojning"
  | "armstrackning"
  | "axel_isolering"
  | "bal_stabilitet"
  | "bal_flexion"
  | "vad";

export type ExerciseDefinition = {
  key?: string;
  name: string;
  aliases: string[];
  primaryMuscle: string;
  secondaryMuscles: string[];
  category: ExerciseProfile["category"];
  equipmentTags: string[];
  equipment: string;
  environment: ExerciseEnvironment;
  exerciseType:
    | "basövning"
    | "isolationsövning"
    | "kroppsövning"
    | "statisk/tidsövning";
  movementPattern?: ExerciseMovementPattern;
  logType: ExerciseLogType;
  difficulty: ExerciseProgramMeta["difficulty"];
  beginnerFit: ExerciseProgramMeta["beginnerFit"];
  stability: ExerciseProgramMeta["stability"];
  suitableFor: Array<"nyborjare" | "van" | "erfaren">;
  popularity: number;
  trainingValue: ExerciseTrainingValue;
  risks: string;
  substitutions: string[];
  detail: string;
  coachReason: string;
  userFacingWhy?: string;
  techniqueCue: string;
  techniqueFocus?: string[];
  progressionRule: string;
  beginnerNote: string;
};

const EXERCISE_LIBRARY: ExerciseDefinition[] = [
  {
    name: "Bröstpress",
    aliases: ["brostpress", "chest press", "maskinpress"],
    primaryMuscle: "bröst",
    secondaryMuscles: ["framsida axel", "triceps"],
    category: "bröst",
    equipmentTags: ["machines"],
    equipment: "Bröstpressmaskin",
    environment: "gym",
    exerciseType: "basövning",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 8,
    trainingValue: "hög",
    risks: "Ställ in sitsen så axlar och handleder känns stabila.",
    substitutions: ["Hantelpress", "Bänkpress", "Armhävningar"],
    detail:
      "Bröstpress tränar främst bröst, men även framsida axel och triceps. Den är vald när coachen vill ha en stabil press där tekniken är lätt att hålla jämn.",
    coachReason:
      "Ger mycket bröstträning med låg teknisk tröskel och tydlig progression.",
    techniqueCue:
      "Tänk på att trycka jämnt, hålla skuldrorna stabila och utföra övningen kontrollerat.",
    techniqueFocus: ["scapular stability", "even force distribution", "controlled eccentric"],
    progressionRule:
      "Höj när repsen sitter med samma kontroll och rimlig marginal.",
    beginnerNote:
      "Stabil och tydlig variant. Bra förstaval för nybörjare när utrustningen finns.",
  },
  {
    name: "Bänkpress",
    aliases: ["bankpress", "bench", "bench press"],
    primaryMuscle: "bröst",
    secondaryMuscles: ["framsida axel", "triceps"],
    category: "bröst",
    equipmentTags: ["barbell", "bench", "free_weights"],
    equipment: "Plan bänk och skivstång",
    environment: "gym",
    exerciseType: "basövning",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["van", "erfaren"],
    popularity: 10,
    trainingValue: "hög",
    risks: "Kan reta axel eller handled om grepp, bana eller vikt blir fel.",
    substitutions: ["Bröstpress", "Hantelpress", "Lutande hantelpress"],
    detail:
      "Bänkpress tränar främst bröst, men även framsida axel och triceps. Den är bra när vi vill ha ett tydligt styrkemått och mycket träning på kort tid.",
    coachReason:
      "Passar när användaren vill bygga styrka eller muskler och kan hålla tekniken stabil.",
    techniqueCue: "Fokus: jämn pressbana och kontrollerad vändning.",
    techniqueFocus: ["scapular retraction", "leg drive", "controlled descent", "bar to lower chest"],
    progressionRule:
      "Höj när toppsetet sitter med rimlig marginal. Backoff efter tungt toppset.",
    beginnerNote:
      "Kan fungera, men är inte tryggaste standardvalet för helt nya användare om stabil maskin finns.",
  },
  {
    name: "Hantelpress",
    aliases: ["db press", "dumbbell press", "hantel press"],
    primaryMuscle: "bröst",
    secondaryMuscles: ["framsida axel", "triceps"],
    category: "bröst",
    equipmentTags: ["dumbbells", "bench"],
    equipment: "Plan bänk och hantlar",
    environment: "båda",
    exerciseType: "basövning",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 9,
    trainingValue: "hög",
    risks: "Kräver stabila handleder och kontroll i bottenläget.",
    substitutions: ["Bröstpress", "Bänkpress", "Armhävningar"],
    detail:
      "Hantelpress tränar bröst med fri rörelsebana. Den passar bra när användaren har hantlar och vill ha en press som går att justera mjukt.",
    coachReason:
      "Ger bra bröstarbete utan att låsa axlarna lika hårt som skivstång.",
    techniqueCue: "Fokus: stabil handled, kontrollerad sänkning, inga studs.",
    techniqueFocus: ["wrist alignment", "scapular stability", "controlled descent"],
    progressionRule:
      "Prioritera stabilitet. Toppset plus backoff räcker ofta när det blir tungt.",
    beginnerNote:
      "Fungerar för många nya användare om lasten är lugn och instruktionen är tydlig.",
  },
  {
    name: "Lutande hantelpress",
    aliases: ["incline dumbbell press", "lutande hantel press"],
    primaryMuscle: "övre bröst",
    secondaryMuscles: ["framsida axel", "triceps"],
    category: "bröst",
    equipmentTags: ["dumbbells", "bench"],
    equipment: "Lutande bänk och hantlar",
    environment: "båda",
    exerciseType: "basövning",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 8,
    trainingValue: "hög",
    risks: "För hög lutning kan göra övningen mer axeldominerad.",
    substitutions: ["Hantelpress", "Bröstpress", "Bänkpress"],
    detail:
      "Lutande hantelpress tränar bröst med lite mer fokus mot övre bröst och framsida axel.",
    coachReason:
      "Bra när coachen vill få in press utan att allt måste vara tung plan press.",
    techniqueCue: "Fokus: samma bänkvinkel, lugn botten och jämn press.",
    techniqueFocus: ["scapular retraction", "controlled descent", "consistent incline angle"],
    progressionRule:
      "Höj när samma vinkel och samma kontroll går att upprepa.",
    beginnerNote:
      "Okej för nybörjare med lätta hantlar och tydlig kontroll.",
  },
  {
    name: "Armhävningar",
    aliases: ["armhavningar", "push up", "push ups", "pushup", "pushups"],
    primaryMuscle: "bröst",
    secondaryMuscles: ["triceps", "framsida axel", "bål"],
    category: "bröst",
    equipmentTags: ["none", "bodyweight"],
    equipment: "Kroppsvikt",
    environment: "båda",
    exerciseType: "kroppsövning",
    logType: "bodyweight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 10,
    trainingValue: "medel",
    risks: "Kan kännas i handleder eller axlar om positionen blir för tung.",
    substitutions: ["Hantelpress", "Bröstpress", "Bänkpress"],
    detail:
      "Armhävningar tränar bröst, triceps och bål med kroppsvikt. Extra vikt kan läggas till senare, men kroppsvikt räcker ofta långt.",
    coachReason:
      "Ett bra hemma-alternativ när användaren saknar pressutrustning.",
    techniqueCue: "Fokus: rak kropp, lugn sänkning och smärtfria handleder.",
    techniqueFocus: ["rigid plank position", "controlled descent", "full range of motion"],
    progressionRule:
      "Progression sker med fler rena reps, långsammare tempo eller extra vikt först när formen sitter.",
    beginnerNote:
      "Bra hemma, men ska inte byggas runt om användaren inte gillar kroppsvikt och har bättre redskap.",
  },
  {
    name: "Latsdrag",
    aliases: ["lat pulldown", "lats drag", "latsdrag", "pulldown"],
    primaryMuscle: "lats",
    secondaryMuscles: ["övre rygg", "biceps"],
    category: "rygg",
    equipmentTags: ["machines", "cables"],
    equipment: "Latsdragsmaskin",
    environment: "gym",
    exerciseType: "basövning",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 10,
    trainingValue: "hög",
    risks: "Sänk vikten om armarna tar över eller axeln känns fel.",
    substitutions: ["Assisterade chins", "Bandrodd", "Hantelrodd"],
    detail:
      "Latsdrag tränar främst ryggens dragmuskler och biceps. Den är vald när coachen vill ha en stabil ryggövning med tydlig belastning.",
    coachReason:
      "Trygg ryggträning med enkel progression och låg teknisk tröskel.",
    techniqueCue: "Fokus: dra med kontroll och håll kontakt hela vägen ner.",
    techniqueFocus: ["scapular depression", "elbow to hip", "controlled eccentric", "chest up"],
    progressionRule: "Bygg reps med bra ryggkontakt innan du höjer.",
    beginnerNote:
      "Stabil och tydlig variant. Bra förstaval för nybörjare när utrustningen finns.",
  },
  {
    name: "Sittande kabelrodd",
    aliases: ["cable row", "sittande rodd", "sittande kabelrodd"],
    primaryMuscle: "övre rygg",
    secondaryMuscles: ["lats", "biceps"],
    category: "rygg",
    equipmentTags: ["machines", "cables"],
    equipment: "Kabelroddmaskin",
    environment: "gym",
    exerciseType: "basövning",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 9,
    trainingValue: "hög",
    risks: "Om ländryggen börjar dra jobbet, sänk och gör rörelsen striktare.",
    substitutions: ["Hantelrodd", "Bandrodd", "Skivstångsrodd"],
    detail:
      "Sittande kabelrodd tränar övre rygg och lats. Den är vald när coachen vill ha ett stabilt horisontellt drag.",
    coachReason:
      "Bra ryggvolym med tydlig teknik och lätt belastningskontroll.",
    techniqueCue: "Fokus: strikt drag och ryggkontakt innan vi höjer.",
    techniqueFocus: ["scapular retraction", "upright torso", "controlled return"],
    progressionRule:
      "Bygg strikt reps innan du höjer. Om det blir slarvigt: sänk.",
    beginnerNote:
      "Stabil och tydlig variant. Bra förstaval för nybörjare när utrustningen finns.",
  },
  {
    name: "Hantelrodd",
    aliases: ["hantel rodd", "dumbbell row", "db row"],
    primaryMuscle: "övre rygg",
    secondaryMuscles: ["lats", "biceps"],
    category: "rygg",
    equipmentTags: ["dumbbells", "bench"],
    equipment: "Hantel, gärna med bänk som stöd",
    environment: "båda",
    exerciseType: "basövning",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 9,
    trainingValue: "hög",
    risks: "Kan bli ländryggsdominant om stöd och position slarvas bort.",
    substitutions: ["Sittande kabelrodd", "Bandrodd", "Skivstångsrodd"],
    detail:
      "Hantelrodd tränar rygg med fri vikt. Den passar hemma eller på gym när användaren har hantlar och kan hålla positionen stabil.",
    coachReason:
      "Ett starkt ryggval när kabel eller maskin saknas.",
    techniqueCue: "Fokus: dra armbågen bakåt och håll bålen stilla.",
    techniqueFocus: ["elbow back to hip", "stable torso", "controlled return"],
    progressionRule:
      "Höj först när rörelsen är lika strikt från första till sista rep.",
    beginnerNote:
      "Fungerar för många nya användare om lasten är lugn och stödet är bra.",
  },
  {
    name: "Stångrodd",
    aliases: [
      "stangrodd",
      "stångrodd",
      "skivstangsrodd",
      "skivstångsrodd",
      "barbell row",
      "bent over row",
      "bent-over row",
    ],
    primaryMuscle: "övre rygg",
    secondaryMuscles: ["lats", "baksida axel", "biceps", "ländrygg"],
    category: "rygg",
    equipmentTags: ["barbell", "free_weights"],
    equipment: "Skivstång",
    environment: "gym",
    exerciseType: "basövning",
    movementPattern: "horisontellt_drag",
    logType: "weight_reps_rir",
    difficulty: "avancerad",
    beginnerFit: "undvik_som_standard",
    stability: "lag",
    suitableFor: ["van", "erfaren"],
    popularity: 8,
    trainingValue: "hög",
    risks: "Kräver stabil höftfällning. Sänk vikten om ländryggen tappar positionen.",
    substitutions: ["Bröststödd rodd", "Maskinrodd", "Sittande kabelrodd"],
    detail:
      "Stångrodd tränar övre rygg, lats och biceps med skivstång. Den ger mycket ryggträning men kräver att överkroppens lutning hålls stabil.",
    coachReason:
      "Stark ryggövning för vana användare när coachen vill ha ett tungt horisontellt drag.",
    techniqueCue: "Fokus: håll samma lutning och dra stången kontrollerat mot kroppen.",
    techniqueFocus: ["stable hip hinge", "elbow back to hip", "scapular retraction"],
    progressionRule:
      "Höj först när ryggen håller positionen från första till sista rep.",
    beginnerNote:
      "Inte standard för helt nya. Bröststödd rodd, maskinrodd eller kabelrodd är oftast tryggare.",
  },
  {
    name: "Bandrodd",
    aliases: ["band rodd", "resistansbandsrodd", "band row"],
    primaryMuscle: "övre rygg",
    secondaryMuscles: ["lats", "biceps"],
    category: "rygg",
    equipmentTags: ["bands"],
    equipment: "Träningsband",
    environment: "hemma",
    exerciseType: "basövning",
    logType: "bodyweight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 6,
    trainingValue: "medel",
    risks: "Bandets motstånd är svårare att jämföra exakt mellan pass.",
    substitutions: ["Hantelrodd", "Sittande kabelrodd", "Assisterade chins"],
    detail:
      "Bandrodd tränar rygg med träningsband. Den är särskilt användbar hemma när maskiner eller hantlar saknas.",
    coachReason:
      "Gör att ett hemmapass fortfarande får ett riktigt dragmoment.",
    techniqueCue: "Fokus: håll bandet spänt och dra med rygg, inte nacke.",
    techniqueFocus: ["scapular retraction", "controlled return"],
    progressionRule:
      "Progression sker med mer bandspänning, fler kontrollerade reps eller långsammare tempo.",
    beginnerNote:
      "Trygg start för hemma, men svårare att mäta exakt än vikter.",
  },
  {
    name: "Assisterade chins",
    aliases: ["assisterad chins", "assisted chins", "assisted pull ups", "assisted chin up"],
    primaryMuscle: "lats",
    secondaryMuscles: ["övre rygg", "biceps"],
    category: "rygg",
    equipmentTags: ["machines", "bodyweight"],
    equipment: "Assisterad chinsmaskin eller band",
    environment: "gym",
    exerciseType: "kroppsövning",
    logType: "bodyweight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 8,
    trainingValue: "hög",
    risks: "Kan kännas i armbåge eller axel om greppet stressar leden.",
    substitutions: ["Latsdrag", "Bandrodd", "Hantelrodd"],
    detail:
      "Assisterade chins tränar rygg och biceps med avlastning. Den är vald när coachen vill bygga dragstyrka utan att kräva full kroppsvikt direkt.",
    coachReason:
      "Bra steg mot chins när användaren har rätt utrustning och greppet känns bra.",
    techniqueCue: "Fokus: kontrollerat drag och lugn väg ner.",
    techniqueFocus: ["scapular depression", "controlled eccentric", "full arm extension at bottom"],
    progressionRule:
      "Minska assistansen först när repsen är rena och axlarna känns trygga.",
    beginnerNote:
      "Kan passa nybörjare med maskin, men latsdrag är ofta enklare förstaval.",
  },
  {
    name: "Benpress",
    aliases: ["benpres", "leg press"],
    primaryMuscle: "framsida lår",
    secondaryMuscles: ["säte", "baksida lår"],
    category: "ben",
    equipmentTags: ["machines"],
    equipment: "Benpressmaskin",
    environment: "gym",
    exerciseType: "basövning",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 10,
    trainingValue: "hög",
    risks: "Knä och ländrygg styr djup och fotplacering.",
    substitutions: ["Goblet squat", "Benspark", "Knäböj"],
    detail:
      "Benpress tränar främst lår och säte i en stabil maskin. Den är ofta ett tryggt förstaval när coachen vill bygga ben utan hög teknisk tröskel.",
    coachReason:
      "Ger mycket benträning med stabilitet och tydlig belastning.",
    techniqueCue: "Fokus: kontrollerat djup och samma fotplacering varje set.",
    techniqueFocus: ["knee tracking", "controlled depth", "heel in platform"],
    progressionRule:
      "Höj när djup, kontroll och känsla matchar tidigare pass.",
    beginnerNote:
      "Stabil och tydlig variant. Bra förstaval för nybörjare när utrustningen finns.",
  },
  {
    name: "Benspark",
    aliases: ["ben spark", "leg extension", "leg extensions"],
    primaryMuscle: "framsida lår",
    secondaryMuscles: [],
    category: "ben",
    equipmentTags: ["machines"],
    equipment: "Bensparksmaskin",
    environment: "gym",
    exerciseType: "isolationsövning",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 9,
    trainingValue: "medel",
    risks: "Vid knäsmärta styr smärtan före vikt och rörelseutslag.",
    substitutions: ["Benpress", "Goblet squat", "Jägarstol"],
    detail:
      "Benspark tränar framsida lår isolerat. Den är vald när coachen vill ge lårarbete utan att belasta rygg eller balans lika mycket.",
    coachReason:
      "Stabil och lätt att dosera, särskilt för nya eller trötta ben.",
    techniqueCue: "Fokus: paus i toppen och kontakt innan vi höjer.",
    techniqueFocus: ["quad contraction at top", "controlled eccentric", "full range"],
    progressionRule:
      "Kontakt styr. Om tungt blir slarvigt: sänk och pausa i toppen.",
    beginnerNote:
      "Stabil och tydlig variant. Bra förstaval för nybörjare när utrustningen finns.",
  },
  {
    name: "Goblet squat",
    aliases: ["goblet", "goblet squat"],
    primaryMuscle: "framsida lår",
    secondaryMuscles: ["säte", "bål"],
    category: "ben",
    equipmentTags: ["dumbbells", "kettlebell"],
    equipment: "Hantel eller kettlebell",
    environment: "båda",
    exerciseType: "basövning",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 8,
    trainingValue: "hög",
    risks: "Kräver knäböjsmönster. Djup och knäkontroll ska styra.",
    substitutions: ["Benpress", "Benspark", "Jägarstol"],
    detail:
      "Goblet squat tränar lår, säte och bål med vikt framför kroppen. Den är användbar hemma, men ska inte väljas slentrianmässigt för helt nya användare.",
    coachReason:
      "Bra när användaren har hantel eller kettlebell och behöver ett starkt benval hemma.",
    techniqueCue: "Fokus: bröstet högt, knäna stabila och jämnt djup.",
    techniqueFocus: ["chest up", "knee tracking", "controlled descent"],
    progressionRule:
      "Höj när bottenläget är kontrollerat och samma rörelse kan upprepas.",
    beginnerNote:
      "Kan fungera lätt laddad, särskilt hemma, men kräver knäböjsmönster.",
  },
  {
    name: "Knäböj",
    aliases: ["knaboj", "knoboj", "squat", "back squat"],
    primaryMuscle: "framsida lår",
    secondaryMuscles: ["säte", "bål", "baksida lår"],
    category: "ben",
    equipmentTags: ["barbell", "free_weights"],
    equipment: "Skivstång och rack",
    environment: "gym",
    exerciseType: "basövning",
    logType: "weight_reps_rir",
    difficulty: "avancerad",
    beginnerFit: "undvik_som_standard",
    stability: "lag",
    suitableFor: ["van", "erfaren"],
    popularity: 10,
    trainingValue: "hög",
    risks: "Tekniskt krävande. Knä, höft och rygg måste kännas trygga.",
    substitutions: ["Benpress", "Goblet squat", "Benspark"],
    detail:
      "Knäböj tränar ben och bål med hög överföring till styrka. Den är stark, men kräver mer teknik än många alternativ.",
    coachReason:
      "Passar när användaren har vana, mål som kräver tydlig basstyrka och trygg teknik.",
    techniqueCue: "Fokus: stabil bål, jämnt djup och ingen stressad vändning.",
    techniqueFocus: ["braced core", "knee tracking", "hip depth", "vertical bar path"],
    progressionRule:
      "Höj bara när djup och position håller genom hela setet.",
    beginnerNote:
      "Mer tekniskt krävande. För nybörjare ska den bara väljas med tydligt skäl och enklare alternativ.",
  },
  {
    name: "Rumänska marklyft",
    aliases: ["rdl", "romanian deadlift", "rumanska marklyft", "raka marklyft"],
    primaryMuscle: "baksida lår",
    secondaryMuscles: ["säte", "ländrygg"],
    category: "ben",
    equipmentTags: ["barbell", "dumbbells", "free_weights"],
    equipment: "Skivstång eller hantlar",
    environment: "båda",
    exerciseType: "basövning",
    logType: "weight_reps_rir",
    difficulty: "avancerad",
    beginnerFit: "undvik_som_standard",
    stability: "lag",
    suitableFor: ["van", "erfaren"],
    popularity: 8,
    trainingValue: "hög",
    risks: "Ryggposition och höftfällning måste styra. Ingen ful failure.",
    substitutions: ["Lårcurl", "Hip thrust", "Bandrodd"],
    detail:
      "Rumänska marklyft tränar främst baksida lår och säte. Det är inte ett maxlyft här, utan en kontrollerad höftfällning.",
    coachReason:
      "Mycket träning för baksidan när tekniken är trygg och användaren har vana.",
    techniqueCue: "Fokus: höften bak, ryggen låst och ingen ful failure.",
    techniqueFocus: ["hip hinge", "neutral spine", "bar close to body"],
    progressionRule:
      "Hellre 1 RIR än ful 0 RIR. Höj bara när ryggen håller positionen.",
    beginnerNote:
      "Mer tekniskt krävande. För nybörjare ska den bara väljas med tydligt skäl och lugn start.",
  },
  {
    name: "Lårcurl",
    aliases: ["hamstring curl", "leg curl", "larcurl"],
    primaryMuscle: "baksida lår",
    secondaryMuscles: ["vader"],
    category: "ben",
    equipmentTags: ["machines"],
    equipment: "Lårcurlmaskin",
    environment: "gym",
    exerciseType: "isolationsövning",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 8,
    trainingValue: "medel",
    risks: "Håll höften stilla och undvik ryck.",
    substitutions: ["Rumänska marklyft", "Hip thrust", "Jägarstol"],
    detail:
      "Lårcurl tränar baksida lår i maskin. Den är vald när coachen vill ha tydlig hamstringträning utan att ländryggen måste jobba hårt.",
    coachReason:
      "Trygg isolering för baksida lår och lätt att dosera.",
    techniqueCue: "Fokus: böj kontrollerat och håll höften stilla.",
    techniqueFocus: ["hip stays neutral", "controlled eccentric", "full range of motion"],
    progressionRule:
      "Höj när repsen är rena utan ryck eller tappad position.",
    beginnerNote:
      "Stabil och tydlig variant. Bra förstaval för nybörjare när utrustningen finns.",
  },
  {
    name: "Hip thrust",
    aliases: ["hipthrust"],
    primaryMuscle: "säte",
    secondaryMuscles: ["baksida lår"],
    category: "ben",
    equipmentTags: ["barbell", "bench", "machines", "dumbbells"],
    equipment: "Bänk och skivstång, hantel eller maskin",
    environment: "båda",
    exerciseType: "basövning",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 8,
    trainingValue: "hög",
    risks: "Kan bli obekväm i höft/ländrygg om positionen inte stämmer.",
    substitutions: ["Lårcurl", "Goblet squat", "Benpress"],
    detail:
      "Hip thrust tränar främst säte. Den passar när coachen vill bygga höftstyrka utan att göra passet ryggtungt.",
    coachReason:
      "Bra sätesövning med tydlig progression när positionen känns bra.",
    techniqueCue: "Fokus: pausa i toppen och håll bålen stabil.",
    techniqueFocus: ["full hip extension at top", "braced core", "chin tucked"],
    progressionRule:
      "Höj när toppen är stark utan att ländryggen tar över.",
    beginnerNote:
      "Okej för nybörjare med lugn start och tydlig setup.",
  },
  {
    name: "Jägarstol",
    aliases: ["jagarstol", "wall sit", "wallsit"],
    primaryMuscle: "framsida lår",
    secondaryMuscles: ["säte"],
    category: "ben",
    equipmentTags: ["none", "bodyweight"],
    equipment: "Vägg och kroppsvikt",
    environment: "båda",
    exerciseType: "statisk/tidsövning",
    logType: "time_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 7,
    trainingValue: "medel",
    risks: "Avbryt vid knäsmärta eller om positionen känns fel.",
    substitutions: ["Benspark", "Benpress", "Goblet squat"],
    detail:
      "Jägarstol tränar framsida lår statiskt och loggas med tid. Den är användbar hemma eller när vi vill ha kontrollerad belastning utan redskap.",
    coachReason:
      "En trygg tidsövning för lår när vikt eller maskin saknas.",
    techniqueCue: "Fokus: jämn andning, stabil knävinkel och ryggen mot väggen.",
    techniqueFocus: ["stable knee angle", "even breathing", "upright torso"],
    progressionRule:
      "Progression sker främst med längre tid i samma position. Extra vikt först när tiden sitter.",
    beginnerNote:
      "Trygg och enkel om knäna känns bra.",
  },
  {
    name: "Axelpress",
    aliases: ["axel press", "shoulder press", "dumbbell shoulder press"],
    primaryMuscle: "framsida axel",
    secondaryMuscles: ["triceps", "övre bröst"],
    category: "axlar",
    equipmentTags: ["dumbbells", "barbell", "machines"],
    equipment: "Hantlar, maskin eller skivstång",
    environment: "båda",
    exerciseType: "basövning",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 8,
    trainingValue: "hög",
    risks: "Axelkänning styr direkt. Maskin eller lättare hantlar kan vara tryggare.",
    substitutions: ["Sidolyft", "Bröstpress", "Lutande hantelpress"],
    detail:
      "Axelpress tränar axlar och triceps. Den är vald när coachen vill bygga pressstyrka över huvudet och axeln känns trygg.",
    coachReason:
      "Bra axelövning när användaren kan pressa smärtfritt.",
    techniqueCue: "Fokus: stabil axel och kontrollerad rörelse.",
    techniqueFocus: ["scapular stability", "controlled descent", "neutral wrist"],
    progressionRule:
      "Progression sker med renare reps innan tyngre vikt om axeln känns osäker.",
    beginnerNote:
      "Okej med lugn last, men press över huvudet ska inte pressas igenom vid axelbesvär.",
  },
  {
    name: "Sidolyft",
    aliases: ["lateral raise", "lateral raises", "sido lyft"],
    primaryMuscle: "sida axel",
    secondaryMuscles: [],
    category: "axlar",
    equipmentTags: ["dumbbells", "cables"],
    equipment: "Hantlar eller kabel",
    environment: "båda",
    exerciseType: "isolationsövning",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 9,
    trainingValue: "medel",
    risks: "För tung vikt gör ofta att nacke och sving tar över.",
    substitutions: ["Axelpress", "Cable cross"],
    detail:
      "Sidolyft tränar främst sidan av axeln. Den är vald när coachen vill bygga axlar utan att lägga allt på tunga pressar.",
    coachReason:
      "Bra komplettering för axlar med låg systemisk belastning.",
    techniqueCue: "Fokus: mjuk armbåge, lugn lyftbana och ingen sving.",
    techniqueFocus: ["scapular depression", "slight elbow bend", "controlled return"],
    progressionRule:
      "Höj först när repsen är rena och axeln känns smärtfri.",
    beginnerNote:
      "Fungerar för många nya användare med lätt vikt och tydlig kontroll.",
  },
  {
    name: "Bicepscurl",
    aliases: ["bicep curl", "biceps curl", "biceps"],
    primaryMuscle: "biceps",
    secondaryMuscles: ["underarm"],
    category: "armar",
    equipmentTags: ["dumbbells", "free_weights"],
    equipment: "Hantlar eller stång",
    environment: "båda",
    exerciseType: "isolationsövning",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 10,
    trainingValue: "medel",
    risks: "Vid armbågs- eller underarmskänning ska vikt och failure ned.",
    substitutions: ["Hammercurl", "Stångcurl", "Bandrodd"],
    detail:
      "Bicepscurl tränar biceps. Den är enkel att förstå och lätt att dosera, men armbågarna ska kännas bra.",
    coachReason:
      "Ger direkt armträning utan att störa resten av passet för mycket.",
    techniqueCue: "Fokus: ren curl, stilla armbågar och ingen sving.",
    techniqueFocus: ["fixed upper arm", "controlled eccentric", "full range of motion"],
    progressionRule: "Höj bara när repsen är rena och smärtfria.",
    beginnerNote:
      "Enkel övning, men ska hållas lugn vid armbåge eller handled.",
  },
  {
    name: "Hammercurl",
    aliases: ["hammer curl"],
    primaryMuscle: "biceps",
    secondaryMuscles: ["underarm"],
    category: "armar",
    equipmentTags: ["dumbbells"],
    equipment: "Hantlar",
    environment: "båda",
    exerciseType: "isolationsövning",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 8,
    trainingValue: "medel",
    risks: "Kan kännas i underarm vid för snabb progression.",
    substitutions: ["Bicepscurl", "Stångcurl"],
    detail:
      "Hammercurl tränar biceps och underarm med neutralt grepp. Den kan kännas snällare för vissa handleder.",
    coachReason:
      "Bra armval när neutralt grepp passar bättre.",
    techniqueCue: "Fokus: håll överarmen stilla och vikten kontrollerad.",
    techniqueFocus: ["fixed upper arm", "neutral wrist", "controlled eccentric"],
    progressionRule:
      "Höj när greppet och armbågen känns lugna genom hela setet.",
    beginnerNote:
      "Enkel och ofta trygg med rimlig vikt.",
  },
  {
    name: "Triceps pushdown",
    aliases: ["tricep pushdown", "pushdown", "pushdowns", "triceps"],
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    category: "armar",
    equipmentTags: ["cables"],
    equipment: "Kabelmaskin, rep som standard",
    environment: "gym",
    exerciseType: "isolationsövning",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 9,
    trainingValue: "medel",
    risks: "Armbåge och handled styr grepp och vikt.",
    substitutions: ["Triceps extension", "Dips", "Armhävningar"],
    detail:
      "Triceps pushdown tränar triceps i kabel. Rep är standard eftersom det ofta är snällt för handlederna.",
    coachReason:
      "Lätt att dosera och bra när coachen vill ge tricepsarbete utan tung press.",
    techniqueCue: "Fokus: kontakt i triceps och smärtfritt grepp.",
    techniqueFocus: ["elbow fixed at side", "full extension", "controlled return"],
    progressionRule:
      "Höj bara när kontakt och armbågar känns bra. Smärta styr före vikt.",
    beginnerNote:
      "Stabil och tydlig variant när kabel finns.",
  },
  {
    name: "Planka",
    aliases: ["plankan", "plank"],
    primaryMuscle: "bål",
    secondaryMuscles: ["axlar", "säte"],
    category: "mage",
    equipmentTags: ["none", "bodyweight"],
    equipment: "Matta och kroppsvikt",
    environment: "båda",
    exerciseType: "statisk/tidsövning",
    logType: "time_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 10,
    trainingValue: "medel",
    risks: "Avbryt om ländrygg eller axlar tar över på fel sätt.",
    substitutions: ["Sidoplanka", "Situps", "Cable crunch"],
    detail:
      "Planka tränar bål statiskt och loggas med tid, inte reps. Den är vald när coachen vill ha kontroll och position före belastning.",
    coachReason:
      "En enkel och tydlig bålövning som fungerar hemma och på gym.",
    techniqueCue: "Fokus: stabil position, jämn andning och ingen svankkollaps.",
    techniqueFocus: ["neutral spine", "glutes engaged", "even breathing"],
    progressionRule:
      "Progression sker främst med längre tid i samma form. Extra vikt först när tiden sitter kontrollerat.",
    beginnerNote:
      "Trygg start om axlar och ländrygg känns bra.",
  },
  {
    name: "Sidoplanka",
    aliases: ["side plank", "sidoplankan"],
    primaryMuscle: "sneda magmuskler",
    secondaryMuscles: ["bål", "axlar"],
    category: "mage",
    equipmentTags: ["none", "bodyweight"],
    equipment: "Matta och kroppsvikt",
    environment: "båda",
    exerciseType: "statisk/tidsövning",
    logType: "time_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 7,
    trainingValue: "medel",
    risks: "Axeln ska kännas stabil. Byt variant vid obehag.",
    substitutions: ["Planka", "Situps", "Cable crunch"],
    detail:
      "Sidoplanka tränar sidan av bålen och loggas med tid. Den är vald när coachen vill stärka bålens sidostabilitet.",
    coachReason:
      "Bra komplement till vanlig planka när axeln känns trygg.",
    techniqueCue: "Fokus: rak linje, lugn andning och stabil axel.",
    techniqueFocus: ["straight body line", "stable shoulder", "hip elevated"],
    progressionRule:
      "Progression sker med längre tid, bättre position eller extra vikt senare.",
    beginnerNote:
      "Okej för nybörjare, men välj vanlig planka först om axeln känns osäker.",
  },
  {
    name: "Cable crunch",
    aliases: ["cable crunch", "kabelcrunch"],
    primaryMuscle: "mage",
    secondaryMuscles: [],
    category: "mage",
    equipmentTags: ["cables"],
    equipment: "Kabelmaskin och rep",
    environment: "gym",
    exerciseType: "isolationsövning",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["van", "erfaren"],
    popularity: 7,
    trainingValue: "medel",
    risks: "Ryck inte ner vikten. Ländrygg och höft ska inte ta över.",
    substitutions: ["Planka", "Situps", "Hängande benlyft"],
    detail:
      "Cable crunch tränar mage i kabelmaskin. Den ska bara väljas när kabel faktiskt finns.",
    coachReason:
      "Ger progressiv magträning på gym, men hör inte hemma i ett vanligt hemmapass.",
    techniqueCue: "Fokus: kontrollerad böjning och mage före höft.",
    techniqueFocus: ["spinal flexion not hip flexion", "controlled return", "abs initiate"],
    progressionRule:
      "Höj när rörelsen är ren och du kan upprepa samma bana.",
    beginnerNote:
      "Inte ett förstaval hemma eller för helt nya användare om enklare bålövningar räcker.",
  },
  {
    name: "Situps",
    aliases: ["sit ups", "sit-up", "situps"],
    primaryMuscle: "mage",
    secondaryMuscles: ["höftböjare"],
    category: "mage",
    equipmentTags: ["none", "bodyweight"],
    equipment: "Matta eller lutande bänk",
    environment: "båda",
    exerciseType: "kroppsövning",
    logType: "bodyweight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 8,
    trainingValue: "medel",
    risks: "Byt variant om höft eller ländrygg tar över på fel sätt.",
    substitutions: ["Planka", "Cable crunch", "Hängande benlyft"],
    detail:
      "Situps tränar mage med kroppsvikt och loggas med reps. Håll samma variant över tid så progressionen blir tydlig.",
    coachReason:
      "En enkel magövning när användaren vill logga reps utan redskap.",
    techniqueCue: "Fokus: kontrollerad bål och jämn rörelse.",
    techniqueFocus: ["controlled movement", "abs initiate", "neutral neck"],
    progressionRule:
      "Progression sker med fler rena reps, långsammare tempo eller lutning.",
    beginnerNote:
      "Okej om ländryggen känns bra, men planka kan vara lugnare förstaval.",
  },
  {
    name: "Hängande benlyft",
    aliases: ["hangande benlyft", "hanging leg raise", "hanging leg raises"],
    primaryMuscle: "mage",
    secondaryMuscles: ["höftböjare", "grepp"],
    category: "mage",
    equipmentTags: ["bodyweight"],
    equipment: "Chinsräcke eller ställning",
    environment: "gym",
    exerciseType: "kroppsövning",
    logType: "bodyweight_reps_rir",
    difficulty: "avancerad",
    beginnerFit: "undvik_som_standard",
    stability: "lag",
    suitableFor: ["van", "erfaren"],
    popularity: 7,
    trainingValue: "hög",
    risks: "Kräver grepp och axelkontroll. Byt vid axel- eller ländryggskänning.",
    substitutions: ["Planka", "Situps", "Cable crunch"],
    detail:
      "Hängande benlyft tränar mage och höftböjare med kroppsvikt. Den är effektiv, men mer krävande än vanliga magövningar.",
    coachReason:
      "Passar när användaren är van och vill ha tyngre bålträning.",
    techniqueCue: "Fokus: kontrollerad bål och ingen gungning.",
    techniqueFocus: ["no swinging", "controlled eccentric", "abs initiate"],
    progressionRule:
      "Bygg rena reps innan du gör varianten tyngre.",
    beginnerNote:
      "Avancerad som standard. Välj enklare bålövning för nya användare.",
  },
  {
    name: "Knästående armhävningar",
    aliases: ["knastående armhävningar", "kneeling push up", "knee push ups"],
    primaryMuscle: "bröst",
    secondaryMuscles: ["triceps", "framsida axel", "bål"],
    category: "bröst",
    equipmentTags: ["none", "bodyweight"],
    equipment: "Kroppsvikt",
    environment: "båda",
    exerciseType: "kroppsövning",
    movementPattern: "horisontell_press",
    logType: "bodyweight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "medel",
    suitableFor: ["nyborjare", "van"],
    popularity: 7,
    trainingValue: "medel",
    risks: "Handleder och axlar ska kännas lugna. Höj hellre med bättre kontroll än fler slarviga reps.",
    substitutions: ["Armhävningar", "Bröstpress", "Hantelpress"],
    detail:
      "Knästående armhävningar tränar bröst och triceps med lägre belastning än vanliga armhävningar. Den är användbar hemma när vanlig armhävning är för tung.",
    coachReason:
      "Ger en trygg pressvariant utan redskap för nya användare eller begränsad hemmaträning.",
    techniqueCue: "Fokus: rak linje från knä till axel och lugn sänkning.",
    techniqueFocus: ["rigid torso", "controlled descent", "full range of motion"],
    progressionRule:
      "Bygg rena reps först. Gå vidare till upphöjda eller vanliga armhävningar när kontrollen sitter.",
    beginnerNote:
      "Bra förstaval hemma för nybörjare när press med full kroppsvikt blir för tung.",
  },
  {
    name: "Upphöjda armhävningar",
    aliases: ["incline push up", "incline push ups", "upphojda armhavningar"],
    primaryMuscle: "bröst",
    secondaryMuscles: ["triceps", "framsida axel", "bål"],
    category: "bröst",
    equipmentTags: ["none", "bodyweight"],
    equipment: "Bänk, bordskant eller stabil upphöjning",
    environment: "båda",
    exerciseType: "kroppsövning",
    movementPattern: "horisontell_press",
    logType: "bodyweight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 7,
    trainingValue: "medel",
    risks: "Upphöjningen måste vara stabil. Byt variant om handleder eller axlar protesterar.",
    substitutions: ["Knästående armhävningar", "Armhävningar", "Bröstpress"],
    detail:
      "Upphöjda armhävningar är en lättare pressvariant där händerna placeras högre än fötterna. Den är bra när coachen vill dosera kroppsviktspress hemma.",
    coachReason:
      "Gör armhävningar mer skalbara och passar bra när användaren saknar pressredskap.",
    techniqueCue: "Fokus: stabil upphöjning, rak kropp och kontrollerad vändning.",
    techniqueFocus: ["scapular retraction", "controlled descent", "full range of motion"],
    progressionRule:
      "Sänk höjden gradvis eller bygg fler rena reps innan du går till golvet.",
    beginnerNote:
      "Mycket bra hemma-alternativ för nya användare.",
  },
  {
    name: "Inverterad rodd",
    aliases: ["inverted row", "australian pull up", "australian row"],
    primaryMuscle: "övre rygg",
    secondaryMuscles: ["lats", "biceps", "bål"],
    category: "rygg",
    equipmentTags: ["pullup_bar"],
    equipment: "Lågt räcke, ringar eller stabil stång",
    environment: "båda",
    exerciseType: "kroppsövning",
    movementPattern: "horisontellt_drag",
    logType: "bodyweight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 7,
    trainingValue: "hög",
    risks: "Utrustningen måste vara stabil. Höj kroppen om draget blir för tungt eller axeln känns fel.",
    substitutions: ["Bandrodd", "Hantelrodd", "Sittande kabelrodd"],
    detail:
      "Inverterad rodd tränar rygg med kroppsvikt. Den är ett starkt hemma-alternativ när användaren har räcke eller ringar men saknar roddmaskin.",
    coachReason:
      "Ger ett riktigt horisontellt drag hemma utan kabel eller maskin.",
    techniqueCue: "Fokus: dra bröstet mot stången och håll kroppen stilla.",
    techniqueFocus: ["scapular retraction", "rigid body line", "chest to bar"],
    progressionRule:
      "Gör övningen tyngre genom lägre kroppsvinkel, fler rena reps eller långsammare tempo.",
    beginnerNote:
      "Okej om utrustningen är säker och vinkeln kan göras lätt nog.",
  },
  {
    name: "Chins",
    aliases: ["pull up", "pull ups", "pullup", "pullups", "chin up", "chin ups", "chinup", "chinups"],
    primaryMuscle: "lats",
    secondaryMuscles: ["övre rygg", "biceps", "grepp"],
    category: "rygg",
    equipmentTags: ["pullup_bar"],
    equipment: "Chinsräcke",
    environment: "båda",
    exerciseType: "kroppsövning",
    movementPattern: "vertikalt_drag",
    logType: "bodyweight_reps_rir",
    difficulty: "avancerad",
    beginnerFit: "undvik_som_standard",
    stability: "lag",
    suitableFor: ["van", "erfaren"],
    popularity: 9,
    trainingValue: "hög",
    risks: "Kan belasta armbåge, axel och grepp hårt. Undvik slarviga negativa reps till failure.",
    substitutions: ["Assisterade chins", "Latsdrag", "Inverterad rodd"],
    detail:
      "Chins tränar rygg och biceps med kroppsvikt. Den är effektiv men kräver styrka, grepp och axelkontroll.",
    coachReason:
      "Bra för vana användare som redan klarar kroppsviktsdrag med kontroll.",
    techniqueCue: "Fokus: starta kontrollerat, dra bröstet upp och sänk lugnt.",
    techniqueFocus: ["scapular depression", "controlled eccentric", "full arm extension at bottom"],
    progressionRule:
      "Bygg rena reps innan extra vikt. Backa till assistans om formen faller.",
    beginnerNote:
      "Inte standard för nybörjare. Välj latsdrag, bandrodd eller assisterad variant först.",
  },
  {
    name: "Bulgarian split squat",
    aliases: ["bulgarian split squat", "bulgariska split squats", "bulgariska utfall"],
    primaryMuscle: "framsida lår",
    secondaryMuscles: ["säte", "baksida lår", "bål"],
    category: "ben",
    equipmentTags: ["none", "bodyweight", "dumbbells"],
    equipment: "Kroppsvikt eller hantlar och bänk/stol",
    environment: "båda",
    exerciseType: "basövning",
    movementPattern: "utfall_ett_ben",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "lag",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 8,
    trainingValue: "hög",
    risks: "Balans och knäkänsla styr. Börja med kroppsvikt om positionen är osäker.",
    substitutions: ["Utfall bakåt", "Goblet squat", "Benpress"],
    detail:
      "Bulgarian split squat tränar ben och säte ett ben i taget. Den är stark hemma när användaren saknar tung benträningsutrustning.",
    coachReason:
      "Ger mycket benträning med lite utrustning och är lätt att göra tyngre med hantlar.",
    techniqueCue: "Fokus: stabil fot, kontrollerat djup och knä i lugn bana.",
    techniqueFocus: ["front knee tracking", "upright torso", "controlled descent"],
    progressionRule:
      "Bygg kroppsviktskontroll först. Lägg till hantlar när balansen och knät känns trygga.",
    beginnerNote:
      "Kan fungera men ska startas lugnt. För helt nya kan utfall bakåt vara snällare.",
  },
  {
    name: "Utfall bakåt",
    aliases: ["reverse lunge", "reverse lunges", "bakåtutfall", "utfall"],
    primaryMuscle: "framsida lår",
    secondaryMuscles: ["säte", "baksida lår", "bål"],
    category: "ben",
    equipmentTags: ["none", "bodyweight", "dumbbells"],
    equipment: "Kroppsvikt eller hantlar",
    environment: "båda",
    exerciseType: "basövning",
    movementPattern: "utfall_ett_ben",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 8,
    trainingValue: "hög",
    risks: "Steglängd och knäkontroll ska kännas bra. Sänk eller byt vid knäkänning.",
    substitutions: ["Goblet squat", "Jägarstol", "Bulgarian split squat"],
    detail:
      "Utfall bakåt tränar lår och säte med kroppsvikt eller hantlar. Det är ofta snällare och mer kontrollerbart än framåtutfall.",
    coachReason:
      "Bra benval hemma när coachen vill ha mer än statiska övningar men utan maskin.",
    techniqueCue: "Fokus: kliv bak lugnt och tryck upp genom främre foten.",
    techniqueFocus: ["front knee tracking", "upright torso", "controlled step"],
    progressionRule:
      "Öka reps eller lägg till hantlar när samma steglängd och kontroll sitter.",
    beginnerNote:
      "Okej för nybörjare om balansen är rimlig och knät känns bra.",
  },
  {
    name: "Höftlyft",
    aliases: ["hoftlyft", "glute bridge", "glute bridges"],
    primaryMuscle: "säte",
    secondaryMuscles: ["baksida lår", "bål"],
    category: "ben",
    equipmentTags: ["none", "bodyweight", "dumbbells"],
    equipment: "Kroppsvikt eller hantel",
    environment: "båda",
    exerciseType: "basövning",
    movementPattern: "hoftstrackning",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 7,
    trainingValue: "medel",
    risks: "Ländryggen ska inte ta över. Pausa i toppen och byt variant vid obehag.",
    substitutions: ["Hip thrust", "Jägarstol", "Rumänska marklyft"],
    detail:
      "Höftlyft tränar säte med låg teknisk tröskel. Den passar hemma eller som enklare alternativ till hip thrust.",
    coachReason:
      "Trygg sätesövning utan krav på bänk, maskin eller tung vikt.",
    techniqueCue: "Fokus: pausa i toppen och håll bålen stabil.",
    techniqueFocus: ["full hip extension", "glute contraction at top", "stable upper back"],
    progressionRule:
      "Bygg reps och paus först. Lägg till hantel när säte, inte ländrygg, gör jobbet.",
    beginnerNote:
      "Bra och trygg start för nya användare.",
  },
  {
    name: "Step-up",
    aliases: ["step up", "step ups", "uppsteg"],
    primaryMuscle: "framsida lår",
    secondaryMuscles: ["säte", "baksida lår", "bål"],
    category: "ben",
    equipmentTags: ["none", "bodyweight", "dumbbells"],
    equipment: "Stabil låda/bänk och eventuellt hantlar",
    environment: "båda",
    exerciseType: "basövning",
    movementPattern: "utfall_ett_ben",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 6,
    trainingValue: "medel",
    risks: "Underlaget måste vara stabilt. Välj låg höjd om knä eller balans känns osäkert.",
    substitutions: ["Utfall bakåt", "Goblet squat", "Jägarstol"],
    detail:
      "Step-up tränar ben ett ben i taget på en stabil upphöjning. Den fungerar hemma när höjden kan hållas säker och jämn.",
    coachReason:
      "Ett praktiskt benalternativ med lite utrustning och tydlig skalning.",
    techniqueCue: "Fokus: tryck genom hela foten på lådan och bromsa vägen ner.",
    techniqueFocus: ["drive through heel", "knee tracking", "controlled return"],
    progressionRule:
      "Öka reps, höjd eller hantlar först när varje repetition ser likadan ut.",
    beginnerNote:
      "Okej om höjden är låg och stabil. Annars välj jägarsits eller goblet squat.",
  },
  {
    name: "Omvända flyes",
    aliases: ["reverse flyes", "reverse fly", "bakåtflyes", "rear delt fly"],
    primaryMuscle: "baksida axel",
    secondaryMuscles: ["övre rygg"],
    category: "axlar",
    equipmentTags: ["dumbbells", "bands", "cables"],
    equipment: "Hantlar, band eller kabel",
    environment: "båda",
    exerciseType: "isolationsövning",
    movementPattern: "axel_isolering",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 7,
    trainingValue: "medel",
    risks: "För tung vikt gör lätt att nacke och sving tar över.",
    substitutions: ["Sidolyft", "Bandrodd", "Sittande kabelrodd"],
    detail:
      "Omvända flyes tränar baksida axel och övre rygg. Den är en lätt isolationsövning som passar när axlar behöver mer balans.",
    coachReason:
      "Bra komplettering till press och rodd utan att passet blir tungt.",
    techniqueCue: "Fokus: små kontrollerade lyft och avslappnad nacke.",
    techniqueFocus: ["scapular retraction", "slight elbow bend", "controlled return"],
    progressionRule:
      "Höj bara när rörelsen är ren och axeln känns lugn.",
    beginnerNote:
      "Bra med lätt vikt eller band, men ska inte ersätta riktig ryggrodd.",
  },
  {
    name: "Stångcurl",
    aliases: ["stangcurl", "stångcurl", "barbell curl", "ez curl", "ez bar curl"],
    primaryMuscle: "biceps",
    secondaryMuscles: ["underarm"],
    category: "armar",
    equipmentTags: ["barbell"],
    equipment: "Rak stång eller EZ-stång",
    environment: "båda",
    exerciseType: "isolationsövning",
    movementPattern: "armbojning",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 8,
    trainingValue: "medel",
    risks: "Handleder och armbågar styr. EZ-stång är ofta snällare än rak stång.",
    substitutions: ["Bicepscurl", "Hammercurl", "Bandrodd"],
    detail:
      "Stångcurl tränar biceps med stång. Den är lätt att logga men kan vara mer krävande för handleder än hantlar.",
    coachReason:
      "Bra när användaren har stång och vill ha enkel armprogression.",
    techniqueCue: "Fokus: stilla överarmar och smärtfritt grepp.",
    techniqueFocus: ["fixed upper arm", "controlled eccentric", "wrist neutral"],
    progressionRule:
      "Höj bara när repsen är rena utan sving eller armbågskänning.",
    beginnerNote:
      "Okej, men hantelcurl är ofta enklare om handlederna är känsliga.",
  },
  {
    name: "Triceps extension",
    aliases: ["tricep extension", "triceps extension", "hantel triceps extension", "dumbbell overhead extension"],
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    category: "armar",
    equipmentTags: ["dumbbells", "barbell", "free_weights"],
    equipment: "Hantel, EZ-stång eller skivstång",
    environment: "båda",
    exerciseType: "isolationsövning",
    movementPattern: "armstrackning",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 7,
    trainingValue: "medel",
    risks: "Armbågar ska kännas lugna. Sänk eller byt till pushdown om leden protesterar.",
    substitutions: ["Triceps pushdown", "Armhävningar", "Dips"],
    detail:
      "Triceps extension tränar triceps med fri vikt. Den är ett hemmaalternativ när kabel saknas men hantlar eller stång finns.",
    coachReason:
      "Ger tricepsarbete utan kabel, men måste doseras försiktigt för armbågar.",
    techniqueCue: "Fokus: stabil överarm och smärtfri armbågsbana.",
    techniqueFocus: ["elbow fixed", "full extension", "controlled return"],
    progressionRule:
      "Bygg reps med ren kontroll innan vikten höjs.",
    beginnerNote:
      "Okej med lätt vikt, men armhävningsvarianter kan vara enklare först.",
  },
  {
    name: "Dips",
    aliases: ["dips", "assisterade dips", "bench dips", "tricep dips", "chest dips"],
    primaryMuscle: "triceps",
    secondaryMuscles: ["bröst", "framsida axel"],
    category: "armar",
    equipmentTags: ["bodyweight"],
    equipment: "Dipsställning eller assisterad maskin",
    environment: "gym",
    exerciseType: "kroppsövning",
    movementPattern: "armstrackning",
    logType: "bodyweight_reps_rir",
    difficulty: "avancerad",
    beginnerFit: "undvik_som_standard",
    stability: "lag",
    suitableFor: ["van", "erfaren"],
    popularity: 8,
    trainingValue: "hög",
    risks: "Kan vara tuff för axlar och armbågar. Djup och belastning ska vara smärtfria.",
    substitutions: ["Triceps pushdown", "Triceps extension", "Armhävningar"],
    detail:
      "Dips tränar triceps, bröst och framsida axel med kroppsvikt. Den är effektiv men inte ett tryggt standardval för nya användare.",
    coachReason:
      "Passar vana användare som tål kroppsviktspress och vill ha tung tricepsträning.",
    techniqueCue: "Fokus: kontrollerat djup och axlar som känns stabila.",
    techniqueFocus: ["slight forward lean", "controlled descent", "full arm extension at top"],
    progressionRule:
      "Bygg rena reps innan extra vikt. Backa direkt vid axel- eller armbågskänning.",
    beginnerNote:
      "Inte standard för nybörjare. Välj pushdown, extension eller armhävningsvariant först.",
  },
  {
    name: "Pec deck",
    aliases: ["pec deck", "pecdeck", "machine fly", "bröstflyes maskin", "butterfly", "butterfly machine"],
    primaryMuscle: "bröst",
    secondaryMuscles: ["framsida axel"],
    category: "bröst",
    equipmentTags: ["machines"],
    equipment: "Pec deck-maskin",
    environment: "gym",
    exerciseType: "isolationsövning",
    movementPattern: "horisontell_press",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 8,
    trainingValue: "medel",
    risks: "Ställ in så axeln inte hamnar för långt bak i bottenläget.",
    substitutions: ["Bröstpress", "Cable flyes", "Hantelpress"],
    detail:
      "Pec deck tränar bröst isolerat i en stabil maskin. Den passar när coachen vill ha bröstvolym utan att pressar blir för tunga.",
    coachReason:
      "Stabil och enkel bröstisolering, särskilt bra efter en huvudpress.",
    techniqueCue:
      "Tänk på att pressa ihop långsamt och jobba inte med axlarna.",
    techniqueFocus: ["scapular retraction", "controlled return", "avoid forward shoulder roll"],
    progressionRule:
      "Höj när kontakten och rörelsebanan är samma genom hela setet.",
    beginnerNote:
      "Trygg gymövning om maskinen går att ställa in bra.",
  },
  {
    name: "Cable flyes",
    aliases: ["cable fly", "cable flyes", "cable flies", "cable cross", "cable crossover"],
    primaryMuscle: "bröst",
    secondaryMuscles: ["framsida axel"],
    category: "bröst",
    equipmentTags: ["cables"],
    equipment: "Kabelmaskin",
    environment: "gym",
    exerciseType: "isolationsövning",
    movementPattern: "horisontell_press",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 8,
    trainingValue: "medel",
    risks: "För mycket stretch eller för tung vikt kan reta axeln.",
    substitutions: ["Pec deck", "Bröstpress", "Hantelpress"],
    detail:
      "Cable flyes tränar bröst med kabel och jämn belastning. Den ska vara kontrollerad, inte en tung press.",
    coachReason:
      "Bra bröstkomplement på gym när användaren kan hålla axlarna lugna.",
    techniqueCue: "Fokus: lätt böjda armbågar och samma kabelhöjd varje gång.",
    techniqueFocus: ["slight elbow bend", "controlled return", "chest leads not arms"],
    progressionRule:
      "Höj först när du kan hålla samma bana utan att axeln dras fram.",
    beginnerNote:
      "Okej, men pec deck eller bröstpress är ofta enklare först.",
  },
  {
    name: "Maskinrodd",
    aliases: ["machine row", "roddmaskin", "sittande maskinrodd"],
    primaryMuscle: "övre rygg",
    secondaryMuscles: ["lats", "biceps"],
    category: "rygg",
    equipmentTags: ["machines"],
    equipment: "Roddmaskin",
    environment: "gym",
    exerciseType: "basövning",
    movementPattern: "horisontellt_drag",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 9,
    trainingValue: "hög",
    risks: "Sänk vikten om axlarna åker fram eller ländryggen börjar jobba.",
    substitutions: ["Sittande kabelrodd", "Bröststödd rodd", "Hantelrodd"],
    detail:
      "Maskinrodd tränar rygg med stabilt stöd och tydlig belastning. Den är ett tryggt gymval för horisontellt drag.",
    coachReason:
      "Ger bra ryggvolym med låg teknisk tröskel.",
    techniqueCue: "Fokus: dra armbågarna bakåt och pausa kort utan att rycka.",
    techniqueFocus: ["scapular retraction", "elbow to hip", "controlled return"],
    progressionRule:
      "Bygg strikt reps innan du höjer. Om överkroppen gungar: sänk.",
    beginnerNote:
      "Mycket bra förstaval för rygg på gym.",
  },
  {
    name: "Bröststödd rodd",
    aliases: ["chest supported row", "bröststödd rodd", "incline dumbbell row"],
    primaryMuscle: "övre rygg",
    secondaryMuscles: ["lats", "biceps"],
    category: "rygg",
    equipmentTags: ["dumbbells", "machines", "bench"],
    equipment: "Bröststödd roddmaskin eller lutande bänk och hantlar",
    environment: "båda",
    exerciseType: "basövning",
    movementPattern: "horisontellt_drag",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 8,
    trainingValue: "hög",
    risks: "Håll bröstet mot stödet och låt inte nacken ta över.",
    substitutions: ["Maskinrodd", "Sittande kabelrodd", "Hantelrodd"],
    detail:
      "Bröststödd rodd tränar rygg med mindre belastning på ländrygg. Den är stabil och lätt att dosera.",
    coachReason:
      "Starkt ryggval när coachen vill ha drag utan ländryggströtthet.",
    techniqueCue: "Fokus: bröstet kvar i stödet och kontrollerat drag.",
    techniqueFocus: ["scapular retraction", "chest stays on pad", "controlled return"],
    progressionRule:
      "Höj när du kan pausa i toppläget utan att tappa position.",
    beginnerNote:
      "Trygg och tydlig om maskin eller bänk finns.",
  },
  {
    name: "T-bar rodd",
    aliases: ["t-bar row", "tbar row", "t bar rodd"],
    primaryMuscle: "övre rygg",
    secondaryMuscles: ["lats", "biceps", "ländrygg"],
    category: "rygg",
    equipmentTags: ["machines", "barbell"],
    equipment: "T-bar-maskin eller landmine med stång",
    environment: "gym",
    exerciseType: "basövning",
    movementPattern: "horisontellt_drag",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["van", "erfaren"],
    popularity: 8,
    trainingValue: "hög",
    risks: "Kan bli ländryggstung om stöd eller vinkel slarvas bort.",
    substitutions: ["Bröststödd rodd", "Maskinrodd", "Sittande kabelrodd"],
    detail:
      "T-bar rodd tränar rygg tungt med tydlig dragbana. Den passar bäst för vana användare eller när maskinen ger bra stöd.",
    coachReason:
      "Ger tung ryggträning när användaren klarar positionen.",
    techniqueCue: "Fokus: fast bål, samma lutning och inget ryck från ländryggen.",
    techniqueFocus: ["stable hip hinge", "elbow back", "controlled return"],
    progressionRule:
      "Höj bara när draget är strikt och positionen håller hela setet.",
    beginnerNote:
      "Inte förstaval för helt nya. Maskinrodd är oftast tryggare.",
  },
  {
    name: "High row",
    aliases: ["high row", "machine high row", "hög rodd"],
    primaryMuscle: "lats",
    secondaryMuscles: ["övre rygg", "biceps"],
    category: "rygg",
    equipmentTags: ["machines"],
    equipment: "High row-maskin",
    environment: "gym",
    exerciseType: "basövning",
    movementPattern: "vertikalt_drag",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 8,
    trainingValue: "hög",
    risks: "Axeln ska kännas lugn. Sänk om armarna eller nacken tar över.",
    substitutions: ["Latsdrag", "Assisterade chins", "Maskinrodd"],
    detail:
      "High row tränar lats och övre rygg i maskin. Den är ett stabilt alternativ till latsdrag när maskinen finns.",
    coachReason:
      "Tryggt vertikalt drag med bra stöd och enkel progression.",
    techniqueCue: "Fokus: dra ner och bak med armbågarna, inte med nacken.",
    techniqueFocus: ["elbow wide and back", "scapular retraction", "controlled return"],
    progressionRule:
      "Bygg reps med bra ryggkontakt innan du höjer.",
    beginnerNote:
      "Bra gymval för nya användare när maskinen passar kroppen.",
  },
  {
    name: "Axelpressmaskin",
    aliases: ["shoulder press machine", "machine shoulder press", "axelpress maskin"],
    primaryMuscle: "framsida axel",
    secondaryMuscles: ["triceps", "övre bröst"],
    category: "axlar",
    equipmentTags: ["machines"],
    equipment: "Axelpressmaskin",
    environment: "gym",
    exerciseType: "basövning",
    movementPattern: "vertikal_press",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 8,
    trainingValue: "hög",
    risks: "Axeln styr rörelseutslag. Pressa inte igenom obehag.",
    substitutions: ["Axelpress", "Sidolyft", "Bröstpress"],
    detail:
      "Axelpressmaskin tränar axlar och triceps med mer stabilitet än fria vikter.",
    coachReason:
      "Bra förstaval för axelpress på gym, särskilt för nya användare.",
    techniqueCue: "Fokus: stabil rygg mot stödet och smärtfri pressbana.",
    techniqueFocus: ["scapular stability", "controlled descent", "full range of motion"],
    progressionRule:
      "Höj när repsen sitter utan axelstress eller svank.",
    beginnerNote:
      "Tryggare än fri axelpress för många nya användare.",
  },
  {
    name: "Rear delt-maskin",
    aliases: ["rear delt machine", "reverse pec deck", "bakre axel maskin", "rear delt fly machine"],
    primaryMuscle: "baksida axel",
    secondaryMuscles: ["övre rygg"],
    category: "axlar",
    equipmentTags: ["machines"],
    equipment: "Rear delt-maskin eller reverse pec deck",
    environment: "gym",
    exerciseType: "isolationsövning",
    movementPattern: "axel_isolering",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 7,
    trainingValue: "medel",
    risks: "För tung vikt gör att nacke och ryck tar över.",
    substitutions: ["Omvända flyes", "Face pull", "Maskinrodd"],
    detail:
      "Rear delt-maskin tränar baksida axel och övre rygg i stabil bana.",
    coachReason:
      "Bra axelkomplement på gym, särskilt när mycket press finns i programmet.",
    techniqueCue: "Fokus: låga axlar, kort paus bak och ingen sving.",
    techniqueFocus: ["scapular retraction", "controlled return", "avoid shoulder elevation"],
    progressionRule:
      "Höj först när baksida axel gör jobbet utan nackspänning.",
    beginnerNote:
      "Trygg och enkel med lätt vikt.",
  },
  {
    name: "Face pull",
    aliases: ["face pull", "face pulls", "ansiktsdrag"],
    primaryMuscle: "baksida axel",
    secondaryMuscles: ["övre rygg", "rotatorkuff"],
    category: "axlar",
    equipmentTags: ["cables"],
    equipment: "Kabelmaskin med rep",
    environment: "gym",
    exerciseType: "isolationsövning",
    movementPattern: "axel_isolering",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 7,
    trainingValue: "medel",
    risks: "Ska inte bli tungt ryck med ländrygg eller nacke.",
    substitutions: ["Rear delt-maskin", "Omvända flyes", "Maskinrodd"],
    detail:
      "Face pull tränar baksida axel och övre rygg med kabel. Den är ett komplement, inte en huvudövning.",
    coachReason:
      "Bra för axelbalans när användaren klarar tekniken lugnt.",
    techniqueCue: "Fokus: dra repet mot ansiktet med låga axlar och mjuk kontroll.",
    techniqueFocus: ["external rotation", "pull to face level", "controlled return"],
    progressionRule:
      "Höj inte om tekniken blir ryckig. Fler rena reps slår mer vikt här.",
    beginnerNote:
      "Okej, men rear delt-maskin är ofta enklare först.",
  },
  {
    name: "Hack squat",
    aliases: ["hack squat", "hacksquat", "hack squat maskin"],
    primaryMuscle: "framsida lår",
    secondaryMuscles: ["säte"],
    category: "ben",
    equipmentTags: ["machines"],
    equipment: "Hack squat-maskin",
    environment: "gym",
    exerciseType: "basövning",
    movementPattern: "knaboj",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 8,
    trainingValue: "hög",
    risks: "Knä och höft styr djup. Börja lätt tills maskinens bana känns bra.",
    substitutions: ["Benpress", "Smith squat", "Goblet squat"],
    detail:
      "Hack squat tränar framsida lår och säte i styrd maskin. Den är stark men kan kännas olika beroende på maskin.",
    coachReason:
      "Bra gymalternativ när coachen vill ha mer knäböjsmönster utan fri skivstång.",
    techniqueCue: "Fokus: kontrollerat djup och knän som följer tåriktningen.",
    techniqueFocus: ["knee tracking", "controlled depth", "heel placement"],
    progressionRule:
      "Höj när djup och knäkänsla är stabila från set till set.",
    beginnerNote:
      "Okej för nybörjare om den startas lugnt. Benpress är enklare först.",
  },
  {
    name: "Smith squat",
    aliases: ["smith squat", "smith knäböj", "smithmaskin knäböj"],
    primaryMuscle: "framsida lår",
    secondaryMuscles: ["säte", "bål"],
    category: "ben",
    equipmentTags: ["machines", "barbell"],
    equipment: "Smithmaskin",
    environment: "gym",
    exerciseType: "basövning",
    movementPattern: "knaboj",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 7,
    trainingValue: "hög",
    risks: "Smithbanan kan tvinga positionen. Fotplacering och knäkänsla styr.",
    substitutions: ["Benpress", "Hack squat", "Goblet squat"],
    detail:
      "Smith squat tränar ben i en styrd stångbana. Den kan vara stabil, men passar inte alla kroppar lika bra.",
    coachReason:
      "Användbar när fri knäböj inte är rätt men användaren vill ha ett knäböjsmönster.",
    techniqueCue: "Fokus: hitta fotplacering där knä och höft känns naturliga.",
    techniqueFocus: ["knee tracking", "controlled depth", "foot position"],
    progressionRule:
      "Höj bara när samma djup och position är smärtfri.",
    beginnerNote:
      "Okej, men inte automatiskt bättre än benpress för nya användare.",
  },
  {
    name: "Sittande lårcurl",
    aliases: ["seated leg curl", "sittande lårcurl", "sittande larcurl"],
    primaryMuscle: "baksida lår",
    secondaryMuscles: ["vader"],
    category: "ben",
    equipmentTags: ["machines"],
    equipment: "Sittande lårcurlmaskin",
    environment: "gym",
    exerciseType: "isolationsövning",
    movementPattern: "hamstring_isolering",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 8,
    trainingValue: "medel",
    risks: "Justera maskinen så knä och höft känns stabila.",
    substitutions: ["Lårcurl", "Liggande lårcurl", "Rumänska marklyft"],
    detail:
      "Sittande lårcurl tränar baksida lår i maskin. Den är stabil och lätt att logga.",
    coachReason:
      "Trygg hamstringträning utan att belasta ländryggen.",
    techniqueCue: "Fokus: böj kontrollerat och håll höften stilla.",
    techniqueFocus: ["controlled eccentric", "full range of motion", "hip stays neutral"],
    progressionRule:
      "Höj när repsen är rena utan ryck eller tappad position.",
    beginnerNote:
      "Mycket bra förstaval för baksida lår på gym.",
  },
  {
    name: "Liggande lårcurl",
    aliases: ["lying leg curl", "liggande lårcurl", "liggande larcurl", "prone leg curl"],
    primaryMuscle: "baksida lår",
    secondaryMuscles: ["vader"],
    category: "ben",
    equipmentTags: ["machines"],
    equipment: "Liggande lårcurlmaskin",
    environment: "gym",
    exerciseType: "isolationsövning",
    movementPattern: "hamstring_isolering",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 8,
    trainingValue: "medel",
    risks: "Håll höften ner mot stödet och undvik ryck.",
    substitutions: ["Sittande lårcurl", "Lårcurl", "Rumänska marklyft"],
    detail:
      "Liggande lårcurl tränar baksida lår i maskin. Den är tydlig och enkel att dosera.",
    coachReason:
      "Bra hamstringisolering när coachen vill undvika höftfällning eller ländryggsbelastning.",
    techniqueCue: "Fokus: lugn curl, höften stilla och full kontroll ner.",
    techniqueFocus: ["hip stays neutral", "controlled eccentric", "avoid hip rise"],
    progressionRule:
      "Höj när du kan hålla samma tempo och position genom setet.",
    beginnerNote:
      "Trygg gymövning om maskinen passar kroppen.",
  },
  {
    name: "Höftabduktion",
    aliases: ["hip abduction", "abductor machine", "höftabduktion", "abductor"],
    primaryMuscle: "säte",
    secondaryMuscles: ["utsida höft"],
    category: "ben",
    equipmentTags: ["machines"],
    equipment: "Abduktionsmaskin",
    environment: "gym",
    exerciseType: "isolationsövning",
    movementPattern: "hoftstrackning",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 7,
    trainingValue: "medel",
    risks: "Ska kännas i säte/utsida höft, inte som ryck i ländrygg.",
    substitutions: ["Hip thrust", "Höftlyft", "Cable kickback"],
    detail:
      "Höftabduktion tränar säte och utsida höft i maskin. Den är ett komplement, inte huvudövningen för ben.",
    coachReason:
      "Bra säteskomplement med låg tröskel och tydlig dosering.",
    techniqueCue: "Fokus: kontrollerad öppning och kort paus utan att gunga.",
    techniqueFocus: ["controlled return", "avoid lateral torso lean"],
    progressionRule:
      "Höj först när du kan hålla kontroll i ytterläget.",
    beginnerNote:
      "Enkel och trygg som komplement.",
  },
  {
    name: "Höftadduktion",
    aliases: ["hip adduction", "adductor machine", "höftadduktion", "adductor"],
    primaryMuscle: "insida lår",
    secondaryMuscles: [],
    category: "ben",
    equipmentTags: ["machines"],
    equipment: "Adduktionsmaskin",
    environment: "gym",
    exerciseType: "isolationsövning",
    movementPattern: "knadominant_isolering",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 6,
    trainingValue: "låg",
    risks: "Undvik för stort rörelseutslag om insida lår känns stressad.",
    substitutions: ["Benpress", "Goblet squat", "Utfall bakåt"],
    detail:
      "Höftadduktion tränar insida lår i maskin. Den är främst ett komplement om användaren vill ha mer lårvolym.",
    coachReason:
      "Lätt komplement för insida lår, men sällan en nödvändig huvudövning.",
    techniqueCue: "Fokus: kontrollerad rörelse och ingen ryckig stretch.",
    techniqueFocus: ["controlled return", "full range of motion"],
    progressionRule:
      "Höj först när rörelsen känns jämn och smärtfri.",
    beginnerNote:
      "Trygg men lågt prioriterad jämfört med benpress, lårcurl och benspark.",
  },
  {
    name: "Cable kickback",
    aliases: ["cable kickback", "glute kickback", "kabel kickback"],
    primaryMuscle: "säte",
    secondaryMuscles: ["baksida lår"],
    category: "ben",
    equipmentTags: ["cables"],
    equipment: "Kabelmaskin med ankelrem",
    environment: "gym",
    exerciseType: "isolationsövning",
    movementPattern: "hoftstrackning",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 7,
    trainingValue: "medel",
    risks: "Ländryggen ska inte svanka för att få upp vikten.",
    substitutions: ["Hip thrust", "Höftlyft", "Höftabduktion"],
    detail:
      "Cable kickback tränar säte i kabel. Den är ett komplement till större sätesövningar.",
    coachReason:
      "Bra när användaren vill ha mer sätesvolym utan tung systembelastning.",
    techniqueCue: "Fokus: liten kontrollerad rörelse och säte före svank.",
    techniqueFocus: ["hip extension not lumbar extension", "controlled return", "stable torso"],
    progressionRule:
      "Höj bara när kontakten sitter utan att ländryggen tar över.",
    beginnerNote:
      "Okej, men hip thrust eller höftlyft är enklare att förstå först.",
  },
  {
    name: "Kabelcurl",
    aliases: ["cable curl", "kabelcurl", "cable biceps curl"],
    primaryMuscle: "biceps",
    secondaryMuscles: ["underarm"],
    category: "armar",
    equipmentTags: ["cables"],
    equipment: "Kabelmaskin med handtag eller stång",
    environment: "gym",
    exerciseType: "isolationsövning",
    movementPattern: "armbojning",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 8,
    trainingValue: "medel",
    risks: "Armbåge och handled styr grepp och vikt.",
    substitutions: ["Bicepscurl", "Hammercurl", "Preacher curl"],
    detail:
      "Kabelcurl tränar biceps med jämn kabelbelastning. Den är lätt att dosera på gym.",
    coachReason:
      "Trygg bicepsövning med stabil belastning och enkel progression.",
    techniqueCue: "Fokus: stilla överarmar och full kontroll ner.",
    techniqueFocus: ["fixed upper arm", "controlled eccentric", "full range of motion"],
    progressionRule:
      "Höj när repsen är rena utan sving eller handledskänning.",
    beginnerNote:
      "Bra gymalternativ för nya användare.",
  },
  {
    name: "Preacher curl",
    aliases: ["preacher curl", "scott curl", "scottcurl"],
    primaryMuscle: "biceps",
    secondaryMuscles: ["underarm"],
    category: "armar",
    equipmentTags: ["machines", "barbell"],
    equipment: "Preacher-maskin eller Scottbänk",
    environment: "gym",
    exerciseType: "isolationsövning",
    movementPattern: "armbojning",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 7,
    trainingValue: "medel",
    risks: "Bottenläget kan stressa bicepssenan. Undvik tung failure.",
    substitutions: ["Kabelcurl", "Bicepscurl", "Hammercurl"],
    detail:
      "Preacher curl tränar biceps med överarmen stödd. Den är strikt men kan bli tuff i bottenläget.",
    coachReason:
      "Bra strikt armövning när användaren tål bottenläget.",
    techniqueCue: "Fokus: kontroll ner och stoppa innan armbågen känns stressad.",
    techniqueFocus: ["controlled eccentric", "full range of motion", "no swinging"],
    progressionRule:
      "Höj först när bottenläget är lugnt och repsen är rena.",
    beginnerNote:
      "Okej med lätt vikt, men kabelcurl är ofta snällare.",
  },
  {
    name: "Overhead cable extension",
    aliases: ["overhead cable extension", "overhead triceps extension", "triceps över huvudet kabel"],
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    category: "armar",
    equipmentTags: ["cables"],
    equipment: "Kabelmaskin med rep",
    environment: "gym",
    exerciseType: "isolationsövning",
    movementPattern: "armstrackning",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 7,
    trainingValue: "medel",
    risks: "Kan kännas i armbåge eller axel om rörelsen blir för djup eller tung.",
    substitutions: ["Triceps pushdown", "Triceps extension", "Dips"],
    detail:
      "Overhead cable extension tränar triceps med armen över huvudet. Den är bra för variation men ska doseras lugnt.",
    coachReason:
      "Ger tricepsarbete i annan vinkel än pushdown när armbågarna känns bra.",
    techniqueCue: "Fokus: stabil överarm och smärtfri stretch.",
    techniqueFocus: ["elbow fixed", "full extension at top", "controlled return"],
    progressionRule:
      "Höj bara när armbåge och axel känns lugna genom hela setet.",
    beginnerNote:
      "Okej, men pushdown är tryggare förstaval.",
  },
  {
    name: "Ryggresning",
    aliases: ["back extension", "hyperextension", "ryggresning"],
    primaryMuscle: "ländrygg",
    secondaryMuscles: ["säte", "baksida lår"],
    category: "ben",
    equipmentTags: ["machines", "bodyweight"],
    equipment: "Ryggresningsbänk",
    environment: "gym",
    exerciseType: "kroppsövning",
    movementPattern: "hoftfallning",
    logType: "bodyweight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 7,
    trainingValue: "medel",
    risks: "Ska kännas kontrollerat. Undvik att kasta upp ryggen eller jaga failure.",
    substitutions: ["Höftlyft", "Hip thrust", "Rumänska marklyft"],
    detail:
      "Ryggresning tränar höftfällning, säte, baksida lår och ländrygg med kroppsvikt eller lätt vikt.",
    coachReason:
      "Bra kontrollerad baksideövning när användaren tål rörelsen.",
    techniqueCue: "Fokus: höften som gångjärn och kontrollerad topp utan översträckning.",
    techniqueFocus: ["neutral spine throughout", "hip hinge", "controlled return"],
    progressionRule:
      "Bygg rena reps innan extra vikt. Stoppa om ländryggen känns fel.",
    beginnerNote:
      "Okej med kort rörelse och lugn start, men inte vid osäker rygg.",
  },
  {
    name: "Machine crunch",
    aliases: ["machine crunch", "ab crunch machine", "magmaskin"],
    primaryMuscle: "mage",
    secondaryMuscles: [],
    category: "mage",
    equipmentTags: ["machines"],
    equipment: "Magmaskin",
    environment: "gym",
    exerciseType: "isolationsövning",
    movementPattern: "bal_flexion",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 7,
    trainingValue: "medel",
    risks: "Höft och ländrygg ska inte ta över. Justera sits och rörelseutslag.",
    substitutions: ["Cable crunch", "Planka", "Situps"],
    detail:
      "Machine crunch tränar mage i en stabil maskin. Den är lättare att kontrollera än kabelcrunch för många nya användare.",
    coachReason:
      "Trygg progressiv magövning på gym när maskinen passar kroppen.",
    techniqueCue: "Fokus: böj med magen och håll rörelsen kontrollerad.",
    techniqueFocus: ["spinal flexion not hip flexion", "controlled return", "abs initiate"],
    progressionRule:
      "Höj när du kan upprepa samma bana utan att rycka.",
    beginnerNote:
      "Bra gymalternativ för nya användare.",
  },
  {
    name: "Vadpress",
    aliases: ["calf raise", "calf raises", "vad press", "standing calf raise"],
    primaryMuscle: "vader",
    secondaryMuscles: [],
    category: "ben",
    equipmentTags: ["machines", "dumbbells"],
    equipment: "Vadpressmaskin, benpress eller hantlar",
    environment: "båda",
    exerciseType: "isolationsövning",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 7,
    trainingValue: "medel",
    risks: "Kontakt och rörelseutslag är viktigare än tung vikt.",
    substitutions: ["Tåhävningar med hantlar", "Stående vadpress"],
    detail:
      "Vadpress tränar vader. Maskin är standard på gym, men hantlar kan fungera hemma.",
    coachReason:
      "En enkel komplettering när vader ska få eget arbete.",
    techniqueCue: "Fokus: stretch i botten och paus i toppen.",
    techniqueFocus: ["full range of motion", "controlled eccentric", "even weight distribution"],
    progressionRule:
      "Stretch och paus är viktigare än last. Höj först när repsen är rena.",
    beginnerNote:
      "Enkel och trygg när den görs kontrollerat.",
  },
  {
    name: "Marklyft",
    aliases: ["deadlift", "konventionell marklyft", "skivstångsmarklyft", "vanlig marklyft", "conventional deadlift"],
    primaryMuscle: "säte",
    secondaryMuscles: ["baksida lår", "framsida lår", "ländrygg", "underarm"],
    category: "ben",
    equipmentTags: ["barbell", "free_weights"],
    equipment: "Skivstång",
    environment: "gym",
    exerciseType: "basövning",
    movementPattern: "hoftfallning",
    logType: "weight_reps_rir",
    difficulty: "avancerad",
    beginnerFit: "undvik_som_standard",
    stability: "lag",
    suitableFor: ["van", "erfaren"],
    popularity: 9,
    trainingValue: "hög",
    risks: "Kräver stabil ryggposition och kontrollerat grepp. Sänk vikten om ryggen böjs eller stången vandrar bort från kroppen.",
    substitutions: ["Rumänska marklyft", "Hip thrust", "Benpress"],
    detail:
      "Marklyft tränar säte, baksida lår och ländrygg tillsammans med grepp och framsida lår. Det är ett tungt helhetslyft, inte bara ett tillägg i benpasset.",
    coachReason:
      "Ger mycket träning på kort tid för vana användare som klarar tekniken tryggt.",
    techniqueCue: "Fokus: stången nära kroppen, rak rygg och höft och knä som sträcks samtidigt.",
    techniqueFocus: ["neutral spine", "bar close to body", "hip and knee extend together"],
    progressionRule:
      "Höj bara när ryggpositionen håller genom hela setet. Hellre 1-2 RIR än en ful sista rep.",
    beginnerNote:
      "Mer tekniskt krävande. För nybörjare ska den bara väljas med tydligt skäl, låg startvikt och gärna Rumänska marklyft eller hip thrust först.",
  },
  {
    name: "Militärpress",
    aliases: ["military press", "overhead press", "stående skivstångspress", "standing barbell press", "ohp"],
    primaryMuscle: "framsida axel",
    secondaryMuscles: ["triceps", "övre bröst"],
    category: "axlar",
    equipmentTags: ["barbell", "free_weights"],
    equipment: "Skivstång",
    environment: "gym",
    exerciseType: "basövning",
    movementPattern: "vertikal_press",
    logType: "weight_reps_rir",
    difficulty: "avancerad",
    beginnerFit: "undvik_som_standard",
    stability: "lag",
    suitableFor: ["van", "erfaren"],
    popularity: 8,
    trainingValue: "hög",
    risks: "Kräver stabil bål och axelrörlighet. Sänk vikten eller byt till sittande/hantelvariant om ländryggen svankar eller axeln känns fel.",
    substitutions: ["Axelpress", "Axelpressmaskin", "Sidolyft"],
    detail:
      "Militärpress tränar axlar och triceps med skivstång i stående position. Den kräver mer bål- och axelstabilitet än sittande eller hantelvarianter.",
    coachReason:
      "Stark axelövning för vana användare som vill ha ett tyngre, mer tekniskt pressval.",
    techniqueCue: "Fokus: spänd bål, stången rakt upp och ingen svank i ländryggen.",
    techniqueFocus: ["braced core", "vertical bar path", "full lockout overhead"],
    progressionRule:
      "Höj bara när bålen och ryggen håller stilla genom hela setet.",
    beginnerNote:
      "Inte standard för nybörjare. Axelpress med hantlar eller maskin är oftast tryggare förstaval.",
  },
  {
    name: "Axelryck",
    aliases: ["shrugs", "shrug", "trapezius shrug", "hantelryck"],
    primaryMuscle: "övre trapezius",
    secondaryMuscles: ["övre rygg"],
    category: "rygg",
    equipmentTags: ["barbell", "dumbbells", "free_weights"],
    equipment: "Hantlar eller skivstång",
    environment: "båda",
    exerciseType: "isolationsövning",
    movementPattern: "axel_isolering",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 8,
    trainingValue: "medel",
    risks: "Undvik att rulla axlarna eller använda sving. Håll nacken avslappnad.",
    substitutions: ["Stångrodd", "Hantelrodd"],
    detail:
      "Axelryck tränar övre trapezius genom att lyfta axlarna rakt upp mot öronen. Den är en enkel isolering som kompletterar rygg- och axelpass.",
    coachReason:
      "Ger direkt trapeziusträning utan att störa resten av passet.",
    techniqueCue: "Fokus: lyft rakt upp, pausa kort i toppen och sänk kontrollerat utan sving.",
    techniqueFocus: ["straight up movement", "controlled eccentric", "relaxed neck"],
    progressionRule:
      "Höj när rörelsen är ren och nacken känns avslappnad genom hela setet.",
    beginnerNote:
      "Enkel och trygg övning för de flesta.",
  },
  {
    name: "Koncentrationscurl",
    aliases: ["concentration curl", "concentration curls"],
    primaryMuscle: "biceps",
    secondaryMuscles: ["underarm"],
    category: "armar",
    equipmentTags: ["dumbbells"],
    equipment: "Hantel",
    environment: "båda",
    exerciseType: "isolationsövning",
    movementPattern: "armbojning",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 7,
    trainingValue: "medel",
    risks: "Vid armbågskänning: sänk vikten eller byt till en annan curlvariant.",
    substitutions: ["Bicepscurl", "Hammercurl", "Stångcurl"],
    detail:
      "Koncentrationscurl tränar biceps sittande med armbågen stödd mot insidan av låret. Den ger en väldigt isolerad rörelse utan hjälp från kroppen.",
    coachReason:
      "Bra avslutande armövning när fokus ska ligga helt på biceps utan sving.",
    techniqueCue: "Fokus: stöd armbågen, curla utan sving och sänk kontrollerat.",
    techniqueFocus: ["fixed upper arm", "no torso swing", "controlled eccentric"],
    progressionRule:
      "Höj bara när rörelsen är helt ren utan hjälp från kroppen.",
    beginnerNote:
      "Enkel och trygg med lätt till medeltung vikt.",
  },
  {
    name: "Framåtutfall",
    aliases: ["forward lunge", "forward lunges", "utfall framåt"],
    primaryMuscle: "framsida lår",
    secondaryMuscles: ["säte", "baksida lår", "bål"],
    category: "ben",
    equipmentTags: ["none", "bodyweight", "dumbbells"],
    equipment: "Kroppsvikt eller hantlar",
    environment: "båda",
    exerciseType: "basövning",
    movementPattern: "utfall_ett_ben",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "lag",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 8,
    trainingValue: "hög",
    risks: "Kliv inte för kort. Knäkontroll och balans ska styra, inte fart framåt.",
    substitutions: ["Utfall bakåt", "Goblet squat", "Bulgarian split squat"],
    detail:
      "Framåtutfall tränar lår och säte med kroppsvikt eller hantlar. Den är något mer belastande för framknäet än utfall bakåt eftersom steget går framåt.",
    coachReason:
      "Bra benval när coachen vill variera utfallsriktning eller öka svårighetsgraden något.",
    techniqueCue: "Fokus: kliv kontrollerat framåt och tryck tillbaka genom hela foten.",
    techniqueFocus: ["front knee tracking", "controlled step", "upright torso"],
    progressionRule:
      "Öka reps eller lägg till hantlar när samma steglängd och kontroll sitter.",
    beginnerNote:
      "Okej för nybörjare, men Utfall bakåt är ofta en snällare start för knäna.",
  },
  {
    name: "Lutande bänkpress",
    aliases: ["incline bench press", "incline barbell press"],
    primaryMuscle: "övre bröst",
    secondaryMuscles: ["framsida axel", "triceps"],
    category: "bröst",
    equipmentTags: ["barbell", "bench", "free_weights"],
    equipment: "Lutande bänk och skivstång",
    environment: "gym",
    exerciseType: "basövning",
    movementPattern: "horisontell_press",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["van", "erfaren"],
    popularity: 7,
    trainingValue: "hög",
    risks: "Kan reta axel eller handled om vinkeln blir för brant eller grepp/bana blir fel.",
    substitutions: ["Lutande hantelpress", "Bänkpress", "Hantelpress"],
    detail:
      "Lutande bänkpress tränar övre bröst, framsida axel och triceps med skivstång. Den ger ett tydligt styrkemått för övre bröst men kräver samma teknikstabilitet som vanlig bänkpress.",
    coachReason:
      "Passar när användaren vill bygga övre bröst med skivstång och kan hålla tekniken stabil.",
    techniqueCue: "Fokus: samma bänkvinkel varje gång och kontrollerad sänkning mot övre bröstet.",
    techniqueFocus: ["scapular retraction", "consistent incline angle", "controlled descent"],
    progressionRule:
      "Höj när toppsetet sitter med rimlig marginal och samma vinkel.",
    beginnerNote:
      "Inte förstaval för helt nya. Lutande hantelpress är ofta snällare att lära sig med.",
  },
  {
    name: "Smal bänkpress",
    aliases: ["close grip bench press", "close-grip bench press", "narrow grip bench press"],
    primaryMuscle: "triceps",
    secondaryMuscles: ["bröst", "framsida axel"],
    category: "armar",
    equipmentTags: ["barbell", "bench", "free_weights"],
    equipment: "Plan bänk och skivstång",
    environment: "gym",
    exerciseType: "basövning",
    movementPattern: "armstrackning",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["van", "erfaren"],
    popularity: 7,
    trainingValue: "hög",
    risks: "För smalt grepp kan stressa handleder. Håll armbågarna nära kroppen, inte helt låsta inåt.",
    substitutions: ["Triceps pushdown", "Dips", "Bänkpress"],
    detail:
      "Smal bänkpress tränar triceps med skivstång och ett smalare grepp än vanlig bänkpress. Bröst och framsida axel hjälper till.",
    coachReason:
      "Ger tung tricepsträning med samma pressmönster som bänkpress.",
    techniqueCue: "Fokus: armbågarna nära kroppen och jämn pressbana.",
    techniqueFocus: ["elbows close to body", "controlled descent", "full extension"],
    progressionRule:
      "Höj när armbågarna känns stabila och greppet inte belastar handlederna.",
    beginnerNote:
      "Inte förstaval för nya användare. Triceps pushdown eller dips är ofta enklare att lära sig med.",
  },
  {
    name: "Fransk press",
    aliases: ["skull crusher", "skull crushers", "lying triceps extension", "ez-press", "lying tricep extension"],
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    category: "armar",
    equipmentTags: ["barbell", "dumbbells", "free_weights"],
    equipment: "Skivstång, EZ-stång eller hantlar",
    environment: "båda",
    exerciseType: "isolationsövning",
    movementPattern: "armstrackning",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["van", "erfaren"],
    popularity: 7,
    trainingValue: "medel",
    risks: "Sänk vikten direkt om armbågarna eller axlarna protesterar. Håll stången kontrollerad nära pannan.",
    substitutions: ["Triceps extension", "Triceps pushdown", "Dips"],
    detail:
      "Fransk press tränar triceps liggande med stången förd mot pannan. Den är en isolerad rörelse som kräver stabila armbågar.",
    coachReason:
      "Ger en tydlig tricepssträckning med bra stretch i botten.",
    techniqueCue: "Fokus: stilla överarmar och kontrollerad bana förbi huvudet.",
    techniqueFocus: ["fixed upper arm", "controlled path around head", "full extension"],
    progressionRule:
      "Höj bara när armbågarna känns helt smärtfria genom hela setet.",
    beginnerNote:
      "Kräver god armbågskontroll. Triceps pushdown är ofta ett snällare förstaval.",
  },
  {
    name: "Tricepsmaskin",
    aliases: ["triceps machine", "lever triceps extension", "machine triceps extension"],
    primaryMuscle: "triceps",
    secondaryMuscles: [],
    category: "armar",
    equipmentTags: ["machines"],
    equipment: "Tricepsmaskin",
    environment: "gym",
    exerciseType: "isolationsövning",
    movementPattern: "armstrackning",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 6,
    trainingValue: "medel",
    risks: "Ställ in sätet så armbågarna ligger i linje med maskinens led.",
    substitutions: ["Triceps pushdown", "Triceps extension", "Dips"],
    detail:
      "Tricepsmaskin tränar triceps sittande i en stödd maskin. Den är stabil och enkel att dosera.",
    coachReason:
      "Trygg tricepsövning med låg teknisk tröskel, bra när kabel eller fri vikt inte behövs.",
    techniqueCue: "Fokus: sträck armarna helt och släpp tillbaka kontrollerat.",
    techniqueFocus: ["full extension", "controlled return", "elbows aligned with pivot"],
    progressionRule:
      "Höj när rörelsen är ren från första till sista rep.",
    beginnerNote:
      "Stabil och tydlig variant. Bra förstaval för nybörjare när maskinen finns.",
  },
  {
    name: "Frontböj",
    aliases: ["front squat"],
    primaryMuscle: "framsida lår",
    secondaryMuscles: ["säte", "bål", "baksida lår"],
    category: "ben",
    equipmentTags: ["barbell", "free_weights"],
    equipment: "Skivstång och rack",
    environment: "gym",
    exerciseType: "basövning",
    movementPattern: "knaboj",
    logType: "weight_reps_rir",
    difficulty: "avancerad",
    beginnerFit: "undvik_som_standard",
    stability: "lag",
    suitableFor: ["van", "erfaren"],
    popularity: 6,
    trainingValue: "hög",
    risks: "Kräver bra handleds- och axelrörlighet för stångplaceringen. Sänk vikten om bålen tippar framåt.",
    substitutions: ["Knäböj", "Benpress", "Goblet squat"],
    detail:
      "Frontböj tränar framsida lår mer och ländrygg mindre än vanlig knäböj eftersom stången ligger framför axlarna. Den kräver god bålkontroll och rörlighet.",
    coachReason:
      "Bra för vana användare som vill ha ett mer knädominant benlyft med skonsammare rygghållning.",
    techniqueCue: "Fokus: armbågarna höga, bålen upprätt och jämnt djup.",
    techniqueFocus: ["high elbows", "upright torso", "knee tracking"],
    progressionRule:
      "Höj bara när bålen håller upprätt genom hela setet.",
    beginnerNote:
      "Mer tekniskt krävande än vanlig knäböj. Inte standard för nybörjare.",
  },
  {
    name: "Lårcurl stående",
    aliases: ["standing leg curl"],
    primaryMuscle: "baksida lår",
    secondaryMuscles: ["vader"],
    category: "ben",
    equipmentTags: ["machines", "cables"],
    equipment: "Lårcurlmaskin eller kabel, stående",
    environment: "gym",
    exerciseType: "isolationsövning",
    movementPattern: "hamstring_isolering",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 6,
    trainingValue: "medel",
    risks: "Håll höften stilla och undvik att svanka.",
    substitutions: ["Sittande lårcurl", "Liggande lårcurl", "Rumänska marklyft"],
    detail:
      "Lårcurl stående tränar baksida lår ett ben i taget. Den är vald när coachen vill ha en unilateral variant av lårcurl.",
    coachReason:
      "Bra hamstring-isolering med extra fokus på balans mellan sidorna.",
    techniqueCue: "Fokus: böj kontrollerat och håll höften stilla genom hela setet.",
    techniqueFocus: ["hip stays neutral", "controlled eccentric", "full range of motion"],
    progressionRule:
      "Höj när repsen är rena utan ryck på båda benen.",
    beginnerNote:
      "Stabil och tydlig variant. Bra förstaval för nybörjare när utrustningen finns.",
  },
  {
    name: "Sittande vadpress",
    aliases: ["seated calf raise"],
    primaryMuscle: "vader",
    secondaryMuscles: [],
    category: "ben",
    equipmentTags: ["machines"],
    equipment: "Sittande vadpressmaskin",
    environment: "gym",
    exerciseType: "isolationsövning",
    movementPattern: "vad",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 6,
    trainingValue: "medel",
    risks: "Kontakt och rörelseutslag är viktigare än tung vikt.",
    substitutions: ["Vadpress", "Tåhävningar med hantlar"],
    detail:
      "Sittande vadpress tränar vaderna med böjda knän, vilket ger mer fokus på den djupare vadmuskeln (soleus) än stående vadpress.",
    coachReason:
      "Bra komplement till stående vadpress för att träffa vaderna från ett annat läge.",
    techniqueCue: "Fokus: stretch i botten och paus i toppen.",
    techniqueFocus: ["full range of motion", "controlled eccentric", "pause at top"],
    progressionRule:
      "Stretch och paus är viktigare än last. Höj först när repsen är rena.",
    beginnerNote:
      "Enkel och trygg när den görs kontrollerat.",
  },
  {
    name: "Framåtlyft",
    aliases: ["front raise", "front raises", "frontlyft"],
    primaryMuscle: "framsida axel",
    secondaryMuscles: [],
    category: "axlar",
    equipmentTags: ["dumbbells", "cables", "barbell"],
    equipment: "Hantlar, kabel eller skivstång",
    environment: "båda",
    exerciseType: "isolationsövning",
    movementPattern: "axel_isolering",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 6,
    trainingValue: "medel",
    risks: "För tung vikt gör att sving eller rygg tar över. Håll rörelsen kontrollerad.",
    substitutions: ["Axelpress", "Sidolyft"],
    detail:
      "Framåtlyft tränar framsida axel isolerat genom att lyfta vikten rakt fram. Den är ett enkelt komplement till pressövningar.",
    coachReason:
      "Ger extra fokus på framsida axel utan att belasta lika mycket som en press.",
    techniqueCue: "Fokus: lyft rakt fram till axelhöjd och sänk kontrollerat utan sving.",
    techniqueFocus: ["controlled swing-free lift", "stop at shoulder height", "controlled eccentric"],
    progressionRule:
      "Höj bara när rörelsen är helt fri från sving.",
    beginnerNote:
      "Enkel och trygg övning för de flesta.",
  },
  {
    name: "Upright row",
    aliases: ["uppdrag", "upright rows"],
    primaryMuscle: "sida axel",
    secondaryMuscles: ["framsida axel", "övre trapezius"],
    category: "axlar",
    equipmentTags: ["barbell", "dumbbells", "cables"],
    equipment: "Skivstång, hantlar eller kabel",
    environment: "båda",
    exerciseType: "isolationsövning",
    movementPattern: "axel_isolering",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["van", "erfaren"],
    popularity: 6,
    trainingValue: "medel",
    risks: "Kan reta axelleden vid för smalt grepp eller för hög dragbana. Sänk vikten eller bredda greppet om axeln känns fel.",
    substitutions: ["Sidolyft", "Axelryck"],
    detail:
      "Upright row tränar sida axel och övre trapezius genom att dra vikten rakt upp mot hakan. Grepp och dragbana avgör hur mycket axeln belastas.",
    coachReason:
      "Ger axel- och trapeziusträning i en rörelse när coachen vill kombinera de två.",
    techniqueCue: "Fokus: dra med armbågarna leder och håll ett bredare grepp om axeln känns trång.",
    techniqueFocus: ["elbows lead the pull", "moderate grip width", "controlled return"],
    progressionRule:
      "Höj bara om axeln känns helt bekväm genom hela rörelsebanan.",
    beginnerNote:
      "Inte förstaval för nya användare. Sidolyft och axelryck ger liknande träning med mindre axelrisk.",
  },
  {
    name: "Pullover-maskin",
    aliases: ["machine pullover", "pullover machine"],
    primaryMuscle: "lats",
    secondaryMuscles: ["bröst", "triceps"],
    category: "rygg",
    equipmentTags: ["machines"],
    equipment: "Pullover-maskin",
    environment: "gym",
    exerciseType: "isolationsövning",
    movementPattern: "vertikalt_drag",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 6,
    trainingValue: "medel",
    risks: "Ställ in sitsen så axelleden är i linje med maskinens led.",
    substitutions: ["Latsdrag", "Sittande kabelrodd"],
    detail:
      "Pullover-maskin tränar lats genom att dra armarna nedåt framför kroppen. Bröst och triceps hjälper till.",
    coachReason:
      "Ett stabilt komplement till drag när coachen vill isolera lats mer än vid vanligt drag.",
    techniqueCue: "Fokus: dra med raka armar och känn stretchen i toppen.",
    techniqueFocus: ["controlled range of motion", "shoulder aligned with pivot", "controlled return"],
    progressionRule:
      "Höj när stretchen och kontakten känns bra genom hela setet.",
    beginnerNote:
      "Stabil och tydlig variant. Bra förstaval för nybörjare när maskinen finns.",
  },
  {
    name: "Straight arm pulldown",
    aliases: ["raka armars drag", "straight-arm pulldown"],
    primaryMuscle: "lats",
    secondaryMuscles: ["bröst", "triceps", "baksida axel"],
    category: "rygg",
    equipmentTags: ["cables"],
    equipment: "Kabelmaskin, hög position",
    environment: "gym",
    exerciseType: "isolationsövning",
    movementPattern: "vertikalt_drag",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 6,
    trainingValue: "medel",
    risks: "Håll armbågarna lätt böjda och stilla. Sänk vikten om ländryggen börjar svanka.",
    substitutions: ["Latsdrag", "Pullover-maskin"],
    detail:
      "Straight arm pulldown tränar lats genom att dra kabeln nedåt med raka armar från en hög position. Den isolerar lats mer än vanligt latsdrag.",
    coachReason:
      "Bra komplement när coachen vill ge lats extra fokus utan att biceps tar över.",
    techniqueCue: "Fokus: håll armarna nästan raka och dra med lats, inte armarna.",
    techniqueFocus: ["fixed elbow angle", "lat-driven pull", "controlled return"],
    progressionRule:
      "Höj när rörelsen känns ren utan att ryggen svankar.",
    beginnerNote:
      "Okej för nya användare med lätt vikt och tydlig kontroll.",
  },
  {
    name: "God morgon",
    aliases: ["good morning", "good mornings"],
    primaryMuscle: "ländrygg",
    secondaryMuscles: ["säte", "baksida lår"],
    category: "rygg",
    equipmentTags: ["barbell", "free_weights"],
    equipment: "Skivstång",
    environment: "gym",
    exerciseType: "basövning",
    movementPattern: "hoftfallning",
    logType: "weight_reps_rir",
    difficulty: "avancerad",
    beginnerFit: "undvik_som_standard",
    stability: "lag",
    suitableFor: ["van", "erfaren"],
    popularity: 5,
    trainingValue: "medel",
    risks: "Mycket tekniskt känslig för ländryggen. Använd lätt vikt och stoppa vid minsta osäkerhet i ryggen.",
    substitutions: ["Rumänska marklyft", "Ryggresning", "Hip thrust"],
    detail:
      "God morgon tränar ländrygg, säte och baksida lår genom att fälla överkroppen framåt med stången på axlarna. Den kräver mycket god teknik och bör byggas upp med lätt vikt.",
    coachReason:
      "Ett effektivt komplement till marklyft-mönstret för vana användare som vill styrketräna ländryggen specifikt.",
    techniqueCue: "Fokus: rak rygg, lätt böjda knän och kontrollerad fällning framåt.",
    techniqueFocus: ["neutral spine", "slight knee bend", "controlled hip hinge"],
    progressionRule:
      "Höj extremt försiktigt. Ryggpositionen ska hålla perfekt innan vikten någonsin ökar.",
    beginnerNote:
      "Inte en nybörjarövning. Rumänska marklyft ger liknande träning med mindre risk.",
  },
  {
    name: "Bondepromenad",
    aliases: ["farmers walk", "farmer's walk", "farmer carry", "farmer's carry"],
    primaryMuscle: "underarm",
    secondaryMuscles: ["bål", "säte", "övre trapezius", "framsida lår"],
    category: "helkropp",
    equipmentTags: ["dumbbells", "kettlebell", "free_weights"],
    equipment: "Hantlar eller kettlebells",
    environment: "båda",
    exerciseType: "basövning",
    movementPattern: "bal_stabilitet",
    logType: "time_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 6,
    trainingValue: "medel",
    risks: "Håll bålen spänd och gången kontrollerad. Sänk vikten om ryggen böjs eller axlarna hasar ner.",
    substitutions: ["Planka", "Axelryck", "Hip thrust"],
    detail:
      "Bondepromenad tränar grepp och underarmar tillsammans med bål, säte, övre trapezius och ben genom att bära tung vikt i en kontrollerad gång. Den loggas med tid, precis som planka.",
    coachReason:
      "Ett effektivt helkroppstillägg som bygger grepp- och bålstyrka på kort tid.",
    techniqueCue: "Fokus: bröstet högt, bålen spänd och korta, kontrollerade steg.",
    techniqueFocus: ["braced core", "shoulders back", "controlled steps"],
    progressionRule:
      "Öka tiden eller vikten först när greppet och hållningen håller genom hela setet.",
    beginnerNote:
      "Okej för nybörjare med lättare vikt och kort sträcka/tid.",
  },
  {
    name: "Sumo marklyft",
    aliases: ["sumo deadlift"],
    primaryMuscle: "säte",
    secondaryMuscles: ["ländrygg", "framsida lår", "baksida lår", "insida lår"],
    category: "ben",
    equipmentTags: ["barbell", "free_weights"],
    equipment: "Skivstång",
    environment: "gym",
    exerciseType: "basövning",
    movementPattern: "hoftfallning",
    logType: "weight_reps_rir",
    difficulty: "avancerad",
    beginnerFit: "undvik_som_standard",
    stability: "lag",
    suitableFor: ["van", "erfaren"],
    popularity: 7,
    trainingValue: "hög",
    risks: "Kräver bra höftrörlighet för den breda stansen. Sänk vikten om knäna faller inåt eller ryggen böjs.",
    substitutions: ["Marklyft", "Rumänska marklyft", "Hip thrust"],
    detail:
      "Sumo marklyft tränar säte och ländrygg med en bred stans och grepp innanför knäna. Den belastar framsida lår och insida lår mer, och ländryggen något mindre, än vanlig marklyft.",
    coachReason:
      "Ett alternativ till vanlig marklyft för vana användare som vill avlasta ländryggen något eller har längre bål i förhållande till benen.",
    techniqueCue: "Fokus: bred stans, knäna i linje med tårna och stången nära kroppen.",
    techniqueFocus: ["wide stance", "knees track over toes", "bar close to body"],
    progressionRule:
      "Höj bara när stansen och knäkontrollen håller genom hela setet.",
    beginnerNote:
      "Mer tekniskt krävande. För nybörjare ska den bara väljas med tydligt skäl och låg startvikt.",
  },
  {
    name: "Gående utfall",
    aliases: ["walking lunge", "walking lunges"],
    primaryMuscle: "framsida lår",
    secondaryMuscles: ["säte", "insida lår"],
    category: "ben",
    equipmentTags: ["none", "bodyweight", "dumbbells"],
    equipment: "Kroppsvikt eller hantlar",
    environment: "båda",
    exerciseType: "basövning",
    movementPattern: "utfall_ett_ben",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "lag",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 7,
    trainingValue: "hög",
    risks: "Kräver mer balans än stillastående utfall eftersom du rör dig kontinuerligt framåt. Ta kortare steg om balansen känns osäker.",
    substitutions: ["Framåtutfall", "Utfall bakåt", "Goblet squat"],
    detail:
      "Gående utfall tränar framsida lår, säte och insida lår genom att kliva kontinuerligt framåt istället för att gå tillbaka mellan varje rep. Den är mer krävande för balansen än stillastående utfall.",
    coachReason:
      "Bra när coachen vill göra utfall mer dynamiskt och kondition-betonat.",
    techniqueCue: "Fokus: jämn steglängd och kontrollerad övergång mellan benen.",
    techniqueFocus: ["controlled step transition", "front knee tracking", "upright torso"],
    progressionRule:
      "Öka reps eller lägg till hantlar när balansen och steglängden är jämn mellan benen.",
    beginnerNote:
      "Okej för nybörjare men kräver mer balans än stillastående utfall. Prova Framåtutfall eller Utfall bakåt först om balansen känns osäker.",
  },
  {
    name: "Rullhjul",
    aliases: ["ab wheel", "ab wheel rollout", "ab roller", "rullhjulet", "ab rollout"],
    primaryMuscle: "mage",
    secondaryMuscles: ["sneda magmuskler"],
    category: "mage",
    equipmentTags: ["none", "bodyweight"],
    equipment: "Rullhjul",
    environment: "båda",
    exerciseType: "isolationsövning",
    movementPattern: "bal_stabilitet",
    logType: "bodyweight_reps_rir",
    difficulty: "avancerad",
    beginnerFit: "undvik_som_standard",
    stability: "lag",
    suitableFor: ["van", "erfaren"],
    popularity: 6,
    trainingValue: "hög",
    risks: "Sänk rörelseutslaget om ländryggen börjar svanka. Rulla inte längre ut än du kan kontrollera tillbaka.",
    substitutions: ["Cable crunch", "Planka", "Hängande benlyft"],
    detail:
      "Rullhjul tränar magen genom att rulla ut och tillbaka på knä med ett litet hjul. Forskning visar att den är särskilt effektiv för nedre magen.",
    coachReason:
      "En av de mest effektiva magövningarna som finns, men kräver god bålkontroll för att göras säkert.",
    techniqueCue: "Fokus: håll ryggen rak genom hela rörelsen och rulla bara så långt du kan kontrollera tillbaka.",
    techniqueFocus: ["neutral spine", "controlled range of motion", "core braced throughout"],
    progressionRule:
      "Öka rörelseutslaget gradvis. Fler kontrollerade reps är bättre än att rulla för långt och tappa ryggpositionen.",
    beginnerNote:
      "Krävande för bålen. Nya användare bör börja med kortare rörelseutslag eller välja planka/cable crunch först.",
  },
  {
    name: "Viktade dips",
    aliases: ["weighted dips", "dips med vikt", "viktbälte dips", "belted dips"],
    primaryMuscle: "triceps",
    secondaryMuscles: ["bröst", "framsida axel"],
    category: "armar",
    equipmentTags: ["bodyweight", "free_weights"],
    equipment: "Dipsställning och viktbälte eller hantel mellan fötterna",
    environment: "gym",
    exerciseType: "basövning",
    movementPattern: "armstrackning",
    logType: "weight_reps_rir",
    difficulty: "avancerad",
    beginnerFit: "undvik_som_standard",
    stability: "lag",
    suitableFor: ["van", "erfaren"],
    popularity: 6,
    trainingValue: "hög",
    risks:
      "Lägg bara till vikt när kroppsviktsdips känns kontrollerat och smärtfritt genom hela rörelsen. Gå inte djupare än vad axlarna klarar stabilt.",
    substitutions: ["Dips", "Smal bänkpress", "Tricepsmaskin"],
    detail:
      "Viktade dips är vanliga dips med extra vikt i ett bälte eller hållet mellan fötterna. Den är vald när kroppsvikt inte längre räcker för att fortsätta bygga styrka i triceps och bröst.",
    coachReason:
      "Ger fortsatt progression när kroppsviktsdips blir för lätta, med samma rörelse användaren redan behärskar.",
    techniqueCue: "Fokus: samma kontrollerade djup som vanliga dips, håll axlarna stabila hela vägen ner.",
    techniqueFocus: ["controlled depth", "scapular stability", "shoulder-safe range"],
    progressionRule:
      "Lägg till vikt i små steg, till exempel 2,5 kg åt gången, när nuvarande vikt känns kontrollerad med bra djup.",
    beginnerNote:
      "Inte för nybörjare. Bygg upp till 8-10 rena kroppsviktsdips innan vikt läggs till.",
  },
  {
    name: "Viktade chins",
    aliases: ["weighted pull ups", "weighted chin ups", "viktade pullups", "chins med vikt"],
    primaryMuscle: "lats",
    secondaryMuscles: ["övre rygg", "biceps", "grepp"],
    category: "rygg",
    equipmentTags: ["pullup_bar", "free_weights"],
    equipment: "Chinsräcke och viktbälte eller hantel",
    environment: "gym",
    exerciseType: "basövning",
    movementPattern: "vertikalt_drag",
    logType: "weight_reps_rir",
    difficulty: "avancerad",
    beginnerFit: "undvik_som_standard",
    stability: "lag",
    suitableFor: ["van", "erfaren"],
    popularity: 6,
    trainingValue: "hög",
    risks:
      "Lägg bara till vikt när kroppsviktschins görs med full kontroll och bra grepp. Undvik ryckiga rörelser i botten av rörelsen.",
    substitutions: ["Chins", "Latsdrag", "Assisterade chins"],
    detail:
      "Viktade chins är vanliga chins med extra vikt i ett bälte eller hållet mellan fötterna. Den är vald när kroppsvikt inte längre räcker för att fortsätta bygga styrka i ryggen.",
    coachReason:
      "Naturlig fortsättning när kroppsviktschins blir för lätta, utan att byta rörelse.",
    techniqueCue: "Fokus: full sträckning i botten, dra med ryggen och undvik att svinga med kroppen.",
    techniqueFocus: ["full range of motion", "controlled tempo", "minimal body swing"],
    progressionRule:
      "Lägg till vikt i små steg när nuvarande vikt klaras med kontroll och bra grepp genom hela setet.",
    beginnerNote:
      "Inte för nybörjare. Bygg upp till 8-10 rena kroppsviktschins innan vikt läggs till.",
  },
  {
    name: "Viktad plankan",
    aliases: ["weighted plank", "plankan med vikt", "viktskiva planka"],
    primaryMuscle: "bål",
    secondaryMuscles: ["säte", "axlar"],
    category: "mage",
    equipmentTags: ["bodyweight", "free_weights"],
    equipment: "Matta och viktskiva på ryggen",
    environment: "båda",
    exerciseType: "statisk/tidsövning",
    logType: "time_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "hog",
    suitableFor: ["van", "erfaren"],
    popularity: 6,
    trainingValue: "medel",
    risks:
      "Lägg vikten centrerat över höft/rygg, inte över nacken. Sänk vikten eller tiden om ländryggen börjar svanka.",
    substitutions: ["Planka", "Sidoplanka", "Cable crunch"],
    detail:
      "Viktad plankan är vanlig planka med en viktskiva på ryggen. Den är vald när vanlig planka hålls länge utan att kännas krävande längre.",
    coachReason:
      "Ger fortsatt utmaning i bålstyrka när tiden i vanlig planka blir för lång för att vara effektiv.",
    techniqueCue: "Fokus: håll höften i linje med axlar och fötter, låt inte ryggen svanka under vikten.",
    techniqueFocus: ["neutral spine under load", "braced core", "even weight distribution"],
    progressionRule:
      "Öka vikten på skivan i små steg i första hand, i andra hand tiden, när nuvarande nivå känns kontrollerad.",
    beginnerNote:
      "Vänta med vikt tills vanlig planka klaras runt 45-60 sekunder med bra position.",
  },
  {
    name: "Russian twist",
    aliases: ["ryska vridningar", "russian twists", "trunk rotation twist"],
    primaryMuscle: "sneda magmuskler",
    secondaryMuscles: ["mage", "höftböjare"],
    category: "mage",
    equipmentTags: ["bodyweight", "dumbbells", "free_weights"],
    equipment: "Viktskiva, hantel eller kroppsvikt",
    environment: "båda",
    exerciseType: "isolationsövning",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 7,
    trainingValue: "medel",
    risks:
      "Rör dig kontrollerat, inte med fart. Vid ryggkänslighet: håll fötterna i golvet istället för lyfta för mindre belastning.",
    substitutions: ["Sidoplanka", "Cable crunch", "Rullhjul"],
    detail:
      "Russian twist tränar sneda magmuskler genom att vrida bålen sida till sida, sittande med lyfta eller stödda fötter. Den är vald när träningen behöver mer rotation, inte bara böjning framåt.",
    coachReason:
      "Ett enkelt sätt att få in rotationsträning för bålen, som annars saknas i de flesta magprogram.",
    techniqueCue: "Fokus: vrid från bålen, inte bara armarna, och håll rörelsen kontrollerad.",
    techniqueFocus: ["controlled rotation", "core braced", "minimal momentum"],
    progressionRule:
      "Öka vikten på skivan eller hanteln när rörelsen känns kontrollerad genom hela setet.",
    beginnerNote:
      "Bra för nybörjare utan vikt. Håll fötterna i golvet först, lyft dem när bålkontrollen känns stabil.",
  },
  {
    name: "Liggande benlyft",
    aliases: ["lying leg raise", "lying leg raises", "floor leg raise"],
    primaryMuscle: "mage",
    secondaryMuscles: ["höftböjare"],
    category: "mage",
    equipmentTags: ["none", "bodyweight"],
    equipment: "Matta",
    environment: "båda",
    exerciseType: "kroppsövning",
    logType: "bodyweight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 7,
    trainingValue: "medel",
    risks:
      "Håll ländryggen mot golvet genom hela rörelsen. Böj knäna eller minska rörelseutslaget om ryggen lyfter från golvet.",
    substitutions: ["Hängande benlyft", "Situps", "Cable crunch"],
    detail:
      "Liggande benlyft tränar nedre delen av magen genom att lyfta raka eller lätt böjda ben liggande på rygg. Den är vald som ett tillgängligt alternativ till hängande benlyft utan krav på grepp eller chinsräcke.",
    coachReason:
      "Ger samma nedre mage-fokus som hängande benlyft, men utan grepp- och axelkravet som gör den svårare.",
    techniqueCue: "Fokus: tryck ländryggen mot golvet och sänk benen bara så långt du kan hålla positionen.",
    techniqueFocus: ["lower back pressed down", "controlled eccentric", "hip flexor coordination"],
    progressionRule:
      "Öka rörelseutslaget eller antal reps innan du lägger till en viktmanschett vid fötterna.",
    beginnerNote:
      "Bra förstaval för nedre mage. Håll knäna lätt böjda om raka ben känns för tungt i ländryggen.",
  },
  {
    name: "Bicycle crunch",
    aliases: ["cykelcrunch", "bicycle crunches", "cross body crunch"],
    primaryMuscle: "sneda magmuskler",
    secondaryMuscles: ["mage", "höftböjare"],
    category: "mage",
    equipmentTags: ["none", "bodyweight"],
    equipment: "Matta",
    environment: "båda",
    exerciseType: "kroppsövning",
    logType: "bodyweight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 7,
    trainingValue: "medel",
    risks:
      "Dra inte i nacken med händerna. Sänk farten om ländryggen börjar svanka från golvet.",
    substitutions: ["Situps", "Russian twist", "Cable crunch"],
    detail:
      "Bicycle crunch tränar sneda magmusklerna och magen genom att föra armbåge mot motsatt knä i en cykelrörelse. Den är vald när träningen behöver kombinera böjning och rotation i samma övning.",
    coachReason:
      "Tränar rakt och sneda magmuskler i samma rörelse, effektivt utan utrustning.",
    techniqueCue: "Fokus: rör dig kontrollerat och för armbågen mot knäet, inte bara armbågen mot luften.",
    techniqueFocus: ["controlled rotation", "lower back grounded", "no neck pulling"],
    progressionRule:
      "Öka antal reps eller sänk farten för mer kontroll innan du lägger till tempo eller pauser i toppläget.",
    beginnerNote:
      "Bra för nybörjare. Gör rörelsen långsammare om det känns svårt att hålla kontrollen.",
  },
  {
    name: "Diamantarmhävningar",
    aliases: ["diamond push ups", "diamond pushups", "triangel armhävningar", "close grip push ups"],
    primaryMuscle: "triceps",
    secondaryMuscles: ["bröst", "framsida axel"],
    category: "armar",
    equipmentTags: ["none", "bodyweight"],
    equipment: "Kroppsvikt",
    environment: "båda",
    exerciseType: "kroppsövning",
    movementPattern: "horisontell_press",
    logType: "bodyweight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["van", "erfaren"],
    popularity: 6,
    trainingValue: "medel",
    risks:
      "Belastar handleder och axlar mer än vanliga armhävningar. Håll armbågarna nära kroppen, inte utåt.",
    substitutions: ["Armhävningar", "Smal bänkpress", "Triceps pushdown"],
    detail:
      "Diamantarmhävningar är armhävningar med händerna ihop under bröstet i en diamantform. Den är vald när fokus ska ligga mer på triceps än vanliga armhävningar ger.",
    coachReason:
      "Flyttar mer av belastningen till triceps utan att byta till utrustning.",
    techniqueCue: "Fokus: håll armbågarna nära kroppen och sänk bröstet mot händerna kontrollerat.",
    techniqueFocus: ["elbows tucked", "controlled eccentric", "wrist alignment"],
    progressionRule:
      "Öka reps innan du höjer fötterna för mer belastning.",
    beginnerNote:
      "Svårare än vanliga armhävningar. Bygg upp med vanliga armhävningar eller knästående variant först.",
  },
  {
    name: "Burpees",
    aliases: ["burpee", "burpees"],
    primaryMuscle: "framsida lår",
    secondaryMuscles: ["bröst", "axlar", "bål"],
    category: "helkropp",
    equipmentTags: ["none", "bodyweight"],
    equipment: "Kroppsvikt",
    environment: "båda",
    exerciseType: "kroppsövning",
    logType: "bodyweight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["van", "erfaren"],
    popularity: 6,
    trainingValue: "medel",
    risks:
      "Hög belastning på leder och andning. Hoppa inte i slutet om knän, rygg eller kondition inte orkar just nu — kliv upp istället.",
    substitutions: ["Armhävningar", "Knäböj", "Goblet squat"],
    detail:
      "Burpees kombinerar knäböj, planka, armhävning och hopp i en sammanhängande rörelse. Den är vald när passet behöver ett kroppsviktsmoment med både styrka och puls.",
    coachReason:
      "Ger mycket träning på kort tid utan utrustning, bra när pulsen ska upp mellan styrkemoment.",
    techniqueCue: "Fokus: kontrollerad takt genom hela rörelsen, hellre jämna reps än snabba och sjaskiga.",
    techniqueFocus: ["controlled pacing", "full body coordination", "soft landing"],
    progressionRule:
      "Öka antal reps eller sänk vilan mellan set innan du lägger till mer hopphöjd.",
    beginnerNote:
      "Krävande rörelse. Ta bort hoppet och kliv upp istället om tekniken blir sjaskig eller andningen blir för ansträngd.",
  },
  {
    name: "Kettlebell swing",
    aliases: ["kettlebellswing", "kb swing", "russian kettlebell swing"],
    primaryMuscle: "säte",
    secondaryMuscles: ["baksida lår", "ländrygg", "underarm"],
    category: "helkropp",
    equipmentTags: ["kettlebell"],
    equipment: "Kettlebell",
    environment: "båda",
    exerciseType: "basövning",
    movementPattern: "hoftstrackning",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["van", "erfaren"],
    popularity: 7,
    trainingValue: "hög",
    risks:
      "Rörelsen drivs av höften, inte armarna eller ryggen. Sänk vikten om tekniken blir ryckig eller ländryggen tar över.",
    substitutions: ["Höftlyft", "Rumänska marklyft", "Hip thrust"],
    detail:
      "Kettlebell swing tränar säte och baksida lår genom en explosiv höftsträckning som svänger vikten framåt. Den är vald när passet behöver ett tempo- och kraftmoment, inte bara kontrollerad styrka.",
    coachReason:
      "Ger höftdriven kraft och puls i samma rörelse, ett bra komplement till mer kontrollerade höftövningar.",
    techniqueCue: "Fokus: driv rörelsen från höften, inte armarna, och håll ryggen rak genom hela svängen.",
    techniqueFocus: ["hip hinge power", "neutral spine", "arms as passive links"],
    progressionRule:
      "Öka vikten på kettlebellen när tekniken är stabil genom hela setet, inte bara de första reppen.",
    beginnerNote:
      "Kräver bra höftteknik innan vikten ökar. Öva rörelsen med lätt vikt eller be om en teknikgenomgång först.",
  },
  {
    name: "Hantelflyes",
    aliases: ["dumbbell flyes", "dumbbell fly", "hantelflyes", "chest fly hantlar"],
    primaryMuscle: "bröst",
    secondaryMuscles: ["framsida axel"],
    category: "bröst",
    equipmentTags: ["dumbbells", "bench", "free_weights"],
    equipment: "Plan bänk och hantlar",
    environment: "gym",
    exerciseType: "isolationsövning",
    movementPattern: "horisontell_press",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["van", "erfaren"],
    popularity: 7,
    trainingValue: "medel",
    risks:
      "Böj armbågarna lätt genom hela rörelsen. Sänk inte hantlarna djupare än axlarna tillåter utan stress i frampartiet.",
    substitutions: ["Cable flyes", "Pec deck", "Hantelpress"],
    detail:
      "Hantelflyes tränar bröstet genom att föra hantlarna i en båge från utsträckt läge in mot mitten. Den är vald när bröstträningen behöver ett rörelsemönster utan tricepsinblandning som i press.",
    coachReason:
      "Isolerar bröstet tydligare än pressövningar, bra komplement när triceps redan är trött.",
    techniqueCue: "Fokus: håll en lätt böjning i armbågarna och för hantlarna i en jämn båge, inte rakt ner.",
    techniqueFocus: ["fixed elbow angle", "controlled range", "chest-led movement"],
    progressionRule:
      "Öka vikten när rörelsen hålls kontrollerad och axlarna känns stabila genom hela setet.",
    beginnerNote:
      "Lättare att tappa kontrollen i botten än i pressövningar. Börja lätt tills rörelsebanan känns säker.",
  },
  {
    name: "Arnold press",
    aliases: ["arnoldpress", "arnold shoulder press"],
    primaryMuscle: "framsida axel",
    secondaryMuscles: ["sida axel", "triceps"],
    category: "axlar",
    equipmentTags: ["dumbbells", "free_weights"],
    equipment: "Hantlar",
    environment: "båda",
    exerciseType: "basövning",
    movementPattern: "vertikal_press",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["van", "erfaren"],
    popularity: 6,
    trainingValue: "medel",
    risks:
      "Rotationen ökar kraven på axelleden. Sänk vikten eller byt till vanlig axelpress om rörelsen gör ont i axeln.",
    substitutions: ["Axelpress", "Militärpress", "Axelpressmaskin"],
    detail:
      "Arnold press är en axelpress med hantlar där handflatorna vrids från kroppen och utåt under lyftet. Den är vald när axelträningen ska involvera sida axel mer än en vanlig axelpress gör.",
    coachReason:
      "Rotationen ger sida axel mer arbete genom rörelsen, ett bra tillägg för den som redan gör vanlig axelpress.",
    techniqueCue: "Fokus: rotera kontrollerat i takt med att hantlarna pressas upp, inte ryckigt i början.",
    techniqueFocus: ["controlled rotation", "shoulder-friendly path", "steady tempo"],
    progressionRule:
      "Öka vikten när rotationen är jämn och kontrollerad genom hela setet.",
    beginnerNote:
      "Mer komplex teknik än vanlig axelpress. Lär dig vanlig axelpress först om rörelsen känns rörig.",
  },
  {
    name: "Reverse curl",
    aliases: ["omvänd curl", "reverse bicep curl", "overhand curl", "backhandsfattat curl"],
    primaryMuscle: "underarm",
    secondaryMuscles: ["biceps"],
    category: "armar",
    equipmentTags: ["barbell", "dumbbells", "free_weights"],
    equipment: "Stång eller hantlar",
    environment: "båda",
    exerciseType: "isolationsövning",
    movementPattern: "armbojning",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "okej",
    stability: "hog",
    suitableFor: ["van", "erfaren"],
    popularity: 5,
    trainingValue: "medel",
    risks:
      "Använd lättare vikt än i vanlig curl. Överhandsgreppet gör rörelsen svagare för handlederna.",
    substitutions: ["Stångcurl", "Hammercurl", "Kabelcurl"],
    detail:
      "Reverse curl är en bicepscurl med överhandsgrepp, handflatorna nedåt. Den är vald när underarmen behöver mer fokus än vanlig curl ger.",
    coachReason:
      "Bygger underarm och grepp på ett sätt vanlig curl och hammercurl inte täcker lika mycket.",
    techniqueCue: "Fokus: håll handlederna raka och stilla, låt inte stången rulla i greppet.",
    techniqueFocus: ["neutral wrist", "controlled tempo", "no wrist rolling"],
    progressionRule:
      "Öka vikten först när handlederna klarar rörelsen utan att kännas belastade.",
    beginnerNote:
      "Ovanare grepp än vanlig curl. Börja lätt tills handlederna vant sig.",
  },
  {
    name: "Trapstångsmarklyft",
    aliases: ["trap bar deadlift", "hex bar deadlift", "trapstång marklyft", "hexstång marklyft"],
    primaryMuscle: "säte",
    secondaryMuscles: ["framsida lår", "baksida lår", "ländrygg"],
    category: "ben",
    equipmentTags: ["barbell", "free_weights"],
    equipment: "Trapstång (hexstång)",
    environment: "gym",
    exerciseType: "basövning",
    movementPattern: "hoftfallning",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "bra",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 6,
    trainingValue: "hög",
    risks:
      "Håll ryggen neutral genom hela lyftet. Sänk vikten om ländryggen rundas i botten.",
    substitutions: ["Marklyft", "Rumänska marklyft", "Goblet squat"],
    detail:
      "Trapstångsmarklyft är ett marklyft med en sexkantig stång du står inuti, vilket ger ett mer upprätt lyft än vanligt skivstångsmarklyft. Den är vald när tekniken ska vara enklare att lära utan att tappa styrkeeffekten.",
    coachReason:
      "Mer nybörjarvänlig än vanligt marklyft eftersom grepp och kroppsposition kräver mindre teknik.",
    techniqueCue: "Fokus: driv genom hälarna och res dig med rak rygg, håll stången nära kroppen genom hela lyftet.",
    techniqueFocus: ["upright torso", "neutral spine", "leg drive"],
    progressionRule:
      "Höj vikten när tekniken är stabil och ryggen håller sig neutral genom hela setet.",
    beginnerNote:
      "Ofta enklare startpunkt än vanligt marklyft. Bra val för den som vill lära sig grundrörelsen med mindre teknisk press på ryggen.",
  },
  {
    name: "Smith bänkpress",
    aliases: ["smith machine bench press", "smithmaskin bänkpress", "smith bench"],
    primaryMuscle: "bröst",
    secondaryMuscles: ["framsida axel", "triceps"],
    category: "bröst",
    equipmentTags: ["machines", "bench"],
    equipment: "Smithmaskin och bänk",
    environment: "gym",
    exerciseType: "basövning",
    movementPattern: "horisontell_press",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 7,
    trainingValue: "medel",
    risks:
      "Stången rör sig i en fast bana — se till att bänken är placerad så stången går rakt över bröstet.",
    substitutions: ["Bänkpress", "Hantelpress", "Bröstpress"],
    detail:
      "Smith bänkpress är bänkpress i en styrd maskin där stången rör sig i en fast, vertikal bana. Den är vald när tekniken ska vara enklare och balansen inte ska vara begränsande faktorn.",
    coachReason:
      "Tar bort balanskravet i vanlig bänkpress, bra när fokus ska vara ren styrka i bröst och triceps.",
    techniqueCue: "Fokus: samma rörelse som vanlig bänkpress, kontrollera farten ner och pressa jämnt upp.",
    techniqueFocus: ["fixed bar path", "controlled eccentric", "even press"],
    progressionRule:
      "Höj vikten när reppen känns kontrollerade med bra fart hela vägen upp.",
    beginnerNote:
      "Bra förstaval för att lära sig pressrörelsen utan att också behöva balansera stången.",
  },
  {
    name: "Kabel sidolyft",
    aliases: ["cable lateral raise", "kabel lateral raise", "cable sidolyft"],
    primaryMuscle: "sida axel",
    secondaryMuscles: [],
    category: "axlar",
    equipmentTags: ["cables"],
    equipment: "Kabelmaskin med lågt fäste",
    environment: "gym",
    exerciseType: "isolationsövning",
    movementPattern: "axel_isolering",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["van", "erfaren"],
    popularity: 6,
    trainingValue: "medel",
    risks:
      "Använd lätt vikt. Ryck inte igång rörelsen med hela kroppen.",
    substitutions: ["Sidolyft", "Axelpressmaskin", "Framåtlyft"],
    detail:
      "Kabel sidolyft tränar sida axel med kabel istället för hantel, vilket ger jämnare belastning genom hela rörelsen. Den är vald när sidolyft med hantel tappar spänning i toppen av rörelsen.",
    coachReason:
      "Håller spänningen i sida axel genom hela rörelsen på ett sätt hanteln inte gör lika bra.",
    techniqueCue: "Fokus: lyft med armbågen ledande, inte handleden, och håll rörelsen kontrollerad hela vägen ner.",
    techniqueFocus: ["constant tension", "elbow-led motion", "controlled return"],
    progressionRule:
      "Öka vikten i små steg när rörelsen hålls kontrollerad utan att kroppen börjar hjälpa till.",
    beginnerNote:
      "Samma rörelse som sidolyft men lite svårare att hitta rätt vinkel. Prova hantelvarianten först om kabelversionen känns rörig.",
  },
  {
    name: "Landmine press",
    aliases: ["landmine shoulder press", "stångpress vinklad"],
    primaryMuscle: "framsida axel",
    secondaryMuscles: ["triceps", "övre bröst"],
    category: "axlar",
    equipmentTags: ["barbell", "free_weights"],
    equipment: "Skivstång i landmine-fäste",
    environment: "gym",
    exerciseType: "basövning",
    movementPattern: "vertikal_press",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["van", "erfaren"],
    popularity: 5,
    trainingValue: "medel",
    risks:
      "Håll bålen stabil, låt inte ryggen svanka bakåt när stången pressas upp.",
    substitutions: ["Axelpress", "Militärpress", "Arnold press"],
    detail:
      "Landmine press är en axelpress där stången är fäst i golvet och rör sig i en vinklad båge istället för rakt upp. Den är vald när axeln behöver en skonsammare pressvinkel än rak press.",
    coachReason:
      "Vinkeln avlastar axelleden jämfört med rak press, bra alternativ vid axelkänslighet.",
    techniqueCue: "Fokus: pressa stången framåt-uppåt i sin naturliga båge, håll bålen stilla under hela rörelsen.",
    techniqueFocus: ["natural arc path", "braced core", "shoulder-friendly angle"],
    progressionRule:
      "Öka vikten när rörelsen är kontrollerad och bålen håller sig stabil genom hela setet.",
    beginnerNote:
      "Bra alternativ om vanlig axelpress känns jobbig för axlarna. Börja lätt för att lära in vinkeln.",
  },
  {
    name: "Kabelrotation",
    aliases: ["cable woodchop", "cable woodchopper", "kabel woodchop", "diagonalt kabeldrag"],
    primaryMuscle: "sneda magmuskler",
    secondaryMuscles: ["mage", "bål"],
    category: "mage",
    equipmentTags: ["cables"],
    equipment: "Kabelmaskin med handtag",
    environment: "gym",
    exerciseType: "isolationsövning",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["van", "erfaren"],
    popularity: 5,
    trainingValue: "medel",
    risks:
      "Rör dig kontrollerat, inte med ryck. Vid ryggkänslighet: minska rörelseutslaget.",
    substitutions: ["Russian twist", "Sidoplanka", "Cable crunch"],
    detail:
      "Kabelrotation tränar sneda magmuskler genom att dra kabeln diagonalt över kroppen, från höft till motsatt axel eller tvärtom. Den är vald när bålträningen behöver rotation, inte bara böjning eller stabilitet.",
    coachReason:
      "Ger bålen ett roterande rörelsemönster som varken planka eller crunch tränar.",
    techniqueCue: "Fokus: rotera från bålen med raka armar, inte bara med armarna själva.",
    techniqueFocus: ["controlled rotation", "straight arms", "hip stability"],
    progressionRule:
      "Öka vikten när rörelsen hålls kontrollerad och jämn i båda riktningarna.",
    beginnerNote:
      "Ovan rörelse för många. Öva med lätt vikt tills rotationen känns naturlig.",
  },
  {
    name: "Stödd benlyft",
    aliases: ["captains chair", "captain's chair leg raise", "armstöd benlyft", "roman chair leg raise"],
    primaryMuscle: "mage",
    secondaryMuscles: ["höftböjare"],
    category: "mage",
    equipmentTags: ["machines"],
    equipment: "Benlyftsställning med armstöd",
    environment: "gym",
    exerciseType: "kroppsövning",
    logType: "bodyweight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 6,
    trainingValue: "medel",
    risks:
      "Svinga inte fart med benen. Böj knäna om raka ben gör rörelsen okontrollerad.",
    substitutions: ["Hängande benlyft", "Liggande benlyft", "Cable crunch"],
    detail:
      "Stödd benlyft tränar nedre magen genom att lyfta benen med stöd för underarmarna, till skillnad från hängande benlyft där hela kroppsvikten hänger i greppet. Den är vald som ett mellansteg när hängande benlyft är för krävande på grepp och axlar.",
    coachReason:
      "Ger samma magträning som hängande benlyft utan att grepp och axlar blir den begränsande faktorn.",
    techniqueCue: "Fokus: luta inte bakåt, lyft benen med magen och sänk kontrollerat.",
    techniqueFocus: ["controlled lift", "no backward lean", "hip flexor coordination"],
    progressionRule:
      "Öka rörelseutslag och reps innan du går vidare till hängande benlyft utan stöd.",
    beginnerNote:
      "Bra mellansteg om hängande benlyft känns för tungt på grepp eller axlar.",
  },
  {
    name: "Sidoutfall",
    aliases: ["lateral lunge", "side lunge", "sidledes utfall"],
    primaryMuscle: "framsida lår",
    secondaryMuscles: ["säte", "insida lår"],
    category: "ben",
    equipmentTags: ["none", "bodyweight", "dumbbells"],
    equipment: "Kroppsvikt eller hantlar",
    environment: "båda",
    exerciseType: "basövning",
    movementPattern: "utfall_ett_ben",
    logType: "weight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["van", "erfaren"],
    popularity: 6,
    trainingValue: "medel",
    risks:
      "Håll tån i samma riktning som knäet när du böjer benet i sidled. Gå inte djupare än höften klarar kontrollerat.",
    substitutions: ["Utfall bakåt", "Framåtutfall", "Bulgarian split squat"],
    detail:
      "Sidoutfall tränar framsida lår och insida lår genom ett kliv i sidled istället för framåt eller bakåt. Den är vald när benträningen behöver ett sidledes rörelsemönster som annars saknas.",
    coachReason:
      "Täcker en rörelseriktning de andra utfallsvarianterna inte gör, bra för höftens sidostabilitet.",
    techniqueCue: "Fokus: skjut höften bakåt och håll bålen upprätt när du kliver ut i sidled.",
    techniqueFocus: ["lateral hip control", "upright torso", "knee tracking over toe"],
    progressionRule:
      "Öka djupet eller lägg till hantlar när balansen i rörelsen känns stabil.",
    beginnerNote:
      "Kräver mer balans och höftrörlighet än vanliga utfall. Öva utan vikt först.",
  },
  {
    name: "Nordic hamstring curl",
    aliases: ["nordic curl", "nordic hamstring curls", "nordiska lårcurl"],
    primaryMuscle: "baksida lår",
    secondaryMuscles: ["säte"],
    category: "ben",
    equipmentTags: ["bodyweight", "machines"],
    equipment: "Nordic curl-bänk eller partner som håller fötterna",
    environment: "gym",
    exerciseType: "kroppsövning",
    movementPattern: "hamstring_isolering",
    logType: "bodyweight_reps_rir",
    difficulty: "avancerad",
    beginnerFit: "undvik_som_standard",
    stability: "lag",
    suitableFor: ["erfaren"],
    popularity: 5,
    trainingValue: "hög",
    risks:
      "Mycket krävande excentriskt för baksida lår. Sänk dig bara så långt du kan bromsa kontrollerat — släpp inte ner dig okontrollerat.",
    substitutions: ["Lårcurl", "Rumänska marklyft", "Liggande lårcurl"],
    detail:
      "Nordic hamstring curl tränar baksida lår genom att sänka överkroppen framåt kontrollerat med fötterna fasthållna, utan att böja i höften. Den är vald när baksida lår behöver excentrisk styrka som maskiner inte ger.",
    coachReason:
      "Bygger excentrisk styrka i baksida lår som forskning kopplar till minskad skaderisk, men kräver redan god styrka i övningen.",
    techniqueCue: "Fokus: bromsa nedgången så länge som möjligt med baksida lår, inte höften.",
    techniqueFocus: ["eccentric control", "hip stays extended", "hamstring-led braking"],
    progressionRule:
      "Öka hur långt ner du kan bromsa kontrollerat innan du ökar antal reps.",
    beginnerNote:
      "Mycket krävande. Kräver redan stark baksida lår — testa lårcurl och RDL tungt innan denna.",
  },
  {
    name: "Skulderbladspush-up",
    aliases: ["push up plus", "push-up plus", "scapula push up", "serratus push up"],
    primaryMuscle: "serratus anterior",
    secondaryMuscles: ["bröst", "framsida axel"],
    category: "bröst",
    equipmentTags: ["none", "bodyweight"],
    equipment: "Kroppsvikt",
    environment: "båda",
    exerciseType: "kroppsövning",
    movementPattern: "horisontell_press",
    logType: "bodyweight_reps_rir",
    difficulty: "medel",
    beginnerFit: "okej",
    stability: "medel",
    suitableFor: ["van", "erfaren"],
    popularity: 4,
    trainingValue: "medel",
    risks:
      "Håll rörelsen liten och kontrollerad — det är bara skulderbladen som rör sig, inte hela armhävningen om igen.",
    substitutions: ["Armhävningar", "Pullover-maskin"],
    detail:
      "Skulderbladspush-up är en armhävning med ett extra litet tryck i toppläget där bara skulderbladen skjuts isär. Den är vald när axelstabiliteten behöver ett riktat komplement som vanliga armhävningar inte ger.",
    coachReason:
      "Bygger serratus anterior, en muskel som stabiliserar skulderbladet och sällan tränas av andra övningar i biblioteket.",
    techniqueCue: "Fokus: håll armarna raka i toppläget och skjut bara skulderbladen isär, inte hela kroppen.",
    techniqueFocus: ["scapular protraction", "controlled small range", "stable elbows"],
    progressionRule:
      "Öka reps innan du lägger till en viktväst — rörelsen är liten, mer vikt hjälper sällan förrän tekniken sitter.",
    beginnerNote:
      "Ovan rörelse för de flesta. Lär dig vanliga armhävningar bra först, sen läggs det lilla extra trycket till.",
  },
  {
    name: "Nackcurl liggande",
    aliases: ["lying neck curl", "neck curl", "nackcurl"],
    primaryMuscle: "nacke, framsida",
    secondaryMuscles: [],
    category: "axlar",
    equipmentTags: ["none", "bodyweight", "free_weights"],
    equipment: "Bänk, eventuellt viktskiva",
    environment: "båda",
    exerciseType: "isolationsövning",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "okej",
    stability: "hog",
    suitableFor: ["van", "erfaren"],
    popularity: 3,
    trainingValue: "låg",
    risks:
      "Rör dig långsamt och utan ryck. Öka belastning försiktigt — nacken är känslig för snabba eller tunga rörelser.",
    substitutions: ["Nackresning liggande"],
    detail:
      "Nackcurl liggande tränar nackens framsida genom att lyfta huvudet mot bröstet, liggande på rygg. Den är vald för den som vill träna nacken specifikt, till exempel inom kontaktsport.",
    coachReason: "En av få sätt att träna nackens framsida direkt — inget annat i biblioteket gör det.",
    techniqueCue: "Fokus: rör huvudet långsamt och kontrollerat, stanna innan hakan pressas mot bröstet.",
    techniqueFocus: ["controlled tempo", "small range of motion", "no jerking"],
    progressionRule:
      "Öka reps först. Lägg bara till en lätt viktskiva mot pannan när rörelsen känns helt kontrollerad.",
    beginnerNote: "Ovanlig övning för de flesta. Börja utan vikt och med få reps för att lära känna rörelsen.",
  },
  {
    name: "Nackresning liggande",
    aliases: ["lying neck extension", "neck extension", "nackresning"],
    primaryMuscle: "nacke, baksida",
    secondaryMuscles: ["övre trapezius"],
    category: "axlar",
    equipmentTags: ["none", "bodyweight", "free_weights"],
    equipment: "Bänk, eventuellt viktskiva",
    environment: "båda",
    exerciseType: "isolationsövning",
    logType: "weight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "okej",
    stability: "hog",
    suitableFor: ["van", "erfaren"],
    popularity: 3,
    trainingValue: "låg",
    risks:
      "Rör dig långsamt och utan ryck. Öka belastning försiktigt — nacken är känslig för snabba eller tunga rörelser.",
    substitutions: ["Nackcurl liggande"],
    detail:
      "Nackresning liggande tränar nackens baksida genom att lyfta huvudet bakåt, liggande på mage. Den är vald för den som vill träna nacken specifikt, till exempel inom kontaktsport.",
    coachReason: "Komplement till nackcurl — tränar baksidan av nacken som annars inte får riktad träning.",
    techniqueCue: "Fokus: rör huvudet långsamt och kontrollerat, låt inte ryggen ta över rörelsen.",
    techniqueFocus: ["controlled tempo", "small range of motion", "isolated from upper back"],
    progressionRule:
      "Öka reps först. Lägg bara till en lätt viktskiva mot bakhuvudet när rörelsen känns helt kontrollerad.",
    beginnerNote: "Ovanlig övning för de flesta. Börja utan vikt och med få reps för att lära känna rörelsen.",
  },
  {
    name: "Tibialis-lyft",
    aliases: ["tibialis raise", "tibia raise", "shin raise"],
    primaryMuscle: "framsida smalben",
    secondaryMuscles: [],
    category: "ben",
    equipmentTags: ["none", "bodyweight", "free_weights"],
    equipment: "Kroppsvikt, eventuellt viktskiva eller kettlebell",
    environment: "båda",
    exerciseType: "isolationsövning",
    logType: "bodyweight_reps_rir",
    difficulty: "enkel",
    beginnerFit: "bra",
    stability: "hog",
    suitableFor: ["nyborjare", "van", "erfaren"],
    popularity: 4,
    trainingValue: "låg",
    risks: "Låg skaderisk. Öka belastning gradvis om smalbenen känns ovana vid rörelsen först.",
    substitutions: ["Vadpress"],
    detail:
      "Tibialis-lyft tränar framsidan av smalbenet genom att dra tårna uppåt mot skenbenet, stående mot en vägg eller sittande. Den är vald när vristerna eller skenbenen behöver riktad styrka, till exempel vid löpning eller instabila fötter.",
    coachReason:
      "Bra komplement för vriststabilitet, men behövs oftast bara vid specifika besvär eller löpning — inte en standardövning för de flesta.",
    techniqueCue: "Fokus: dra tårna rakt uppåt mot skenbenet, håll hälarna stilla i marken.",
    techniqueFocus: ["controlled dorsiflexion", "heel stays planted", "full range"],
    progressionRule:
      "Öka reps först. Lägg till lätt vikt i en påse eller använd en kettlebell över tårna när kroppsvikt känns lätt.",
    beginnerNote:
      "Enkel och säker övning. Bra vid löparbesvär eller om vristerna känns instabila, annars inte nödvändig som standard.",
  },
];

const EXERCISE_DEFINITIONS_BY_NAME = new Map(
  EXERCISE_LIBRARY.map((exercise) => [
    normalizeExerciseSearchText(exercise.name),
    exercise,
  ])
);

const EXERCISE_DEFINITIONS_BY_KEY = new Map(
  EXERCISE_LIBRARY.map((exercise) => [getExerciseKey(exercise.name), exercise])
);

const LIBRARY_ALIAS_MAP = EXERCISE_LIBRARY.reduce<Record<string, string>>(
  (aliases, exercise) => {
    aliases[normalizeExerciseSearchText(exercise.name)] = exercise.name;
    exercise.aliases.forEach((alias) => {
      aliases[normalizeExerciseSearchText(alias)] = exercise.name;
    });
    return aliases;
  },
  {}
);

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

export function getExerciseKey(name: string) {
  return normalizeExerciseSearchText(name).replace(/\s+/g, "_");
}

export function exerciseKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parsePlannedSetCount(sets?: string | null) {
  if (!sets) return null;

  const numbers = sets.match(/\d+/g)?.map(Number).filter(Number.isFinite) ?? [];
  if (numbers.length === 0) return null;

  return Math.max(1, Math.min(...numbers));
}

export function getExerciseDefinition(identifier: string) {
  const normalized = normalizeExerciseSearchText(identifier);
  const byKey = EXERCISE_DEFINITIONS_BY_KEY.get(normalized.replace(/\s+/g, "_"));
  if (byKey) return byKey;

  const resolvedName = LIBRARY_ALIAS_MAP[normalized] ?? identifier;
  return EXERCISE_DEFINITIONS_BY_NAME.get(normalizeExerciseSearchText(resolvedName));
}

export function getExerciseDefinitionByKey(exerciseKey: string) {
  return EXERCISE_DEFINITIONS_BY_KEY.get(
    normalizeExerciseSearchText(exerciseKey).replace(/\s+/g, "_")
  );
}

export function getAllExerciseNames(): string[] {
  return EXERCISE_LIBRARY.map((exercise) => exercise.name);
}

export function getExerciseUserInfo(identifier: string) {
  const definition = getExerciseDefinition(identifier);

  if (!definition) {
    const profile = getExerciseProfile(identifier);

    return {
      exerciseKey: "",
      name: identifier,
      trains: profile.category === "okänd" ? "Okänd huvudmuskel" : profile.category,
      equipment: profile.equipment,
      whyChosen: profile.detail,
      logTypeText: isTimedExercise(identifier)
        ? "Loggas med tid."
        : isBodyweightExercise(identifier)
          ? "Loggas med reps och marginal. Extra vikt är valfritt."
          : "Loggas med vikt, reps och RIR.",
      keepInMind: profile.caution,
      easierAlternative: "",
      techniqueCue: profile.techniqueCue,
      progressionRule: profile.progressionRule,
    };
  }

  const secondary = definition.secondaryMuscles.length
    ? `, plus ${definition.secondaryMuscles.join(", ")}`
    : "";
  const easierAlternative =
    definition.substitutions.find((substitution) => {
      const substitute = getExerciseDefinition(substitution);
      return (
        substitute &&
        (substitute.difficulty === "enkel" || substitute.beginnerFit === "bra")
      );
    }) ?? definition.substitutions[0] ?? "";

  return {
    exerciseKey: getExerciseKey(definition.name),
    name: definition.name,
    trains: `${definition.primaryMuscle}${secondary}`,
    equipment: definition.equipment,
    whyChosen: definition.userFacingWhy ?? definition.coachReason,
    logTypeText:
      definition.logType === "time_rir"
        ? "Loggas med tid. Extra vikt kan läggas till senare om positionen sitter."
        : definition.logType === "bodyweight_reps_rir"
          ? "Loggas med reps och marginal. Extra vikt är valfritt om du använder viktväst, kedja eller hantel."
          : "Loggas med vikt, reps och RIR.",
    keepInMind: definition.risks,
    easierAlternative,
    techniqueCue: definition.techniqueCue,
    progressionRule: definition.progressionRule,
  };
}

function matchesHomeEquipment(
  exercise: ExerciseDefinition,
  equipment: string[]
) {
  const available = new Set(equipment.length > 0 ? equipment : ["none"]);
  const hasExplicitGymEquipment = exercise.equipmentTags.some(
    (tag) =>
      (tag === "machines" && available.has("machines")) ||
      (tag === "cables" && available.has("cables"))
  );

  if (exercise.environment === "gym" && !hasExplicitGymEquipment) return false;
  if (exercise.equipmentTags.includes("none")) return true;
  if (
    exercise.equipmentTags.includes("bodyweight") &&
    exercise.equipmentTags.every((tag) => tag === "bodyweight" || tag === "none")
  ) {
    return true;
  }

  return exercise.equipmentTags.some((tag) => {
    if (tag === "free_weights") {
      return (
        available.has("barbell") ||
        available.has("dumbbells") ||
        available.has("adjustable_dumbbells") ||
        available.has("kettlebell")
      );
    }

    if (tag === "machines" || tag === "cables") {
      return available.has(tag);
    }

    if (tag === "dumbbells") {
      return available.has("dumbbells") || available.has("adjustable_dumbbells");
    }

    return available.has(tag);
  });
}

function getExercisePreferenceScore(
  exercise: ExerciseDefinition,
  preferences: string[]
) {
  if (preferences.length === 0) return 0;

  return exercise.equipmentTags.reduce((score, tag) => {
    if (preferences.includes(tag)) return score + 12;
    if (tag === "barbell" && preferences.includes("free_weights")) return score + 10;
    if (tag === "dumbbells" && preferences.includes("dumbbells")) return score + 10;
    if (tag === "bodyweight" && preferences.includes("bodyweight")) return score + 8;
    return score;
  }, 0);
}

function getTrainingValueScore(value: ExerciseTrainingValue) {
  if (value === "hög") return 18;
  if (value === "medel") return 10;
  return 2;
}

function getExerciseMovementPattern(
  exercise: ExerciseDefinition
): ExerciseMovementPattern {
  if (exercise.movementPattern) return exercise.movementPattern;

  const key = normalizeExerciseSearchText(exercise.name);

  if (key.includes("press") && exercise.category === "bröst") {
    return "horisontell_press";
  }
  if (key.includes("armhavning")) return "horisontell_press";
  if (key.includes("axelpress")) return "vertikal_press";
  if (key.includes("latsdrag") || key.includes("chins")) return "vertikalt_drag";
  if (key.includes("rodd")) return "horisontellt_drag";
  if (key.includes("knaboj") || key.includes("goblet") || key.includes("benpress")) {
    return "knaboj";
  }
  if (key.includes("utfall") || key.includes("split squat")) return "utfall_ett_ben";
  if (key.includes("marklyft")) return "hoftfallning";
  if (key.includes("hip thrust") || key.includes("hoftlyft")) return "hoftstrackning";
  if (key.includes("benspark") || key.includes("jagarstol")) return "knadominant_isolering";
  if (key.includes("larcurl")) return "hamstring_isolering";
  if (key.includes("curl")) return "armbojning";
  if (key.includes("triceps") || key.includes("dips")) return "armstrackning";
  if (key.includes("sidolyft") || key.includes("flyes")) return "axel_isolering";
  if (key.includes("planka")) return "bal_stabilitet";
  if (key.includes("crunch") || key.includes("situps") || key.includes("benlyft")) return "bal_flexion";
  if (key.includes("vad")) return "vad";

  return exercise.category === "mage" ? "bal_stabilitet" : "knaboj";
}

export function getProgramExercisePool(args: {
  location: "gym" | "hemma";
  equipment?: string[];
  exercisePreferences?: string[];
  trainingExperience?: "nyborjare" | "van" | "erfaren";
  limit?: number;
}) {
  const equipment = args.equipment ?? [];
  const preferences = args.exercisePreferences ?? [];
  const trainingExperience = args.trainingExperience ?? "van";

  return EXERCISE_LIBRARY.filter((exercise) => {
    if (args.location === "hemma") {
      if (!matchesHomeEquipment(exercise, equipment)) return false;
    } else if (exercise.environment === "hemma") {
      const needsNoEquipment = exercise.equipmentTags.every(
        (tag) => tag === "none" || tag === "bodyweight"
      );
      const matchesPreferredEquipment = exercise.equipmentTags.some((tag) =>
        preferences.includes(tag)
      );
      if (!needsNoEquipment && !matchesPreferredEquipment) return false;
    }

    if (
      trainingExperience === "nyborjare" &&
      exercise.beginnerFit === "undvik_som_standard"
    ) {
      return false;
    }

    return exercise.suitableFor.includes(trainingExperience);
  })
    .map((exercise) => ({
      exercise,
      score:
        (exercise.stability === "hog" ? 24 : exercise.stability === "medel" ? 12 : 0) +
        (exercise.beginnerFit === "bra" ? 22 : exercise.beginnerFit === "okej" ? 10 : -30) +
        (exercise.difficulty === "enkel" ? 18 : exercise.difficulty === "medel" ? 8 : -14) +
        getTrainingValueScore(exercise.trainingValue) +
        exercise.popularity +
        getExercisePreferenceScore(exercise, preferences),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, args.limit ?? 80)
    .map(({ exercise }) => ({
      exerciseKey: getExerciseKey(exercise.name),
      name: exercise.name,
      aliases: exercise.aliases,
      category: exercise.category,
      equipment: exercise.equipment,
      environment: exercise.environment,
      equipmentTags: exercise.equipmentTags,
      primaryMuscle: exercise.primaryMuscle,
      secondaryMuscles: exercise.secondaryMuscles,
      exerciseType: exercise.exerciseType,
      movementPattern: getExerciseMovementPattern(exercise),
      logType: exercise.logType,
      difficulty: exercise.difficulty,
      beginnerFit: exercise.beginnerFit,
      stability: exercise.stability,
      beginnerNote: exercise.beginnerNote,
      trainingValue: exercise.trainingValue,
      risks: exercise.risks,
      substitutions: exercise.substitutions,
      coachReason: exercise.coachReason,
      detail: exercise.detail,
      techniqueCue: exercise.techniqueCue,
      progressionRule: exercise.progressionRule,
      caution: exercise.risks,
    }));
}

export function getExerciseProgramMeta(name: string): ExerciseProgramMeta {
  const key = normalizeExerciseSearchText(name);
  const definition = getExerciseDefinition(name);

  if (definition) {
    return {
      difficulty: definition.difficulty,
      beginnerFit: definition.beginnerFit,
      stability: definition.stability,
      beginnerNote: definition.beginnerNote,
    };
  }

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
  const definition = getExerciseDefinition(name);
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

  if (definition) {
    return {
      equipment: definition.equipment,
      detail: definition.detail,
      category: definition.category,
      techniqueCue: definition.techniqueCue,
      progressionRule: definition.progressionRule,
      caution: definition.risks,
      isCustom: false,
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
      techniqueCue: "Fokus: strikt drag och ryggkontakt innan vi höjer.",
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
      techniqueCue: "Fokus: paus i toppen och kontakt innan vi höjer.",
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
      techniqueCue: "Fokus: ren curl, stilla armbågar och ingen sving.",
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
  const definition = getExerciseDefinition(name);

  if (definition) {
    return (
      definition.logType === "bodyweight_reps_rir" ||
      definition.logType === "time_rir"
    );
  }

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
  const definition = getExerciseDefinition(name);

  if (definition) {
    return definition.logType === "time_rir";
  }

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

export function isBarbellExercise(name: string): boolean {
  const lower = name.toLowerCase();
  const definition = getExerciseDefinition(name);
  const tags = definition?.equipmentTags ?? [];
  const equipment = definition?.equipment.toLowerCase() ?? "";
  const namedBarbell =
    lower.includes("stång") ||
    lower.includes("skivstång") ||
    lower.includes("barbell");
  const barbellOnly =
    tags.includes("barbell") &&
    !tags.includes("dumbbells") &&
    !tags.includes("machines") &&
    !tags.includes("cables");
  return namedBarbell || barbellOnly || equipment === "skivstång";
}

export function getExerciseWeightStep(name: string): number {
  if (isBarbellExercise(name)) return 5;

  const tags = getExerciseDefinition(name)?.equipmentTags ?? [];
  const isDumbbellOnly =
    tags.includes("dumbbells") &&
    !tags.includes("machines") &&
    !tags.includes("cables") &&
    !tags.includes("barbell");

  if (isDumbbellOnly || isBodyweightExercise(name)) return 2.5;

  return 5;
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

export const KNOWN_EXERCISE_NAMES = Array.from(new Set([
  ...EXERCISE_LIBRARY.map((exercise) => exercise.name),
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
]));

const EXERCISE_ALIASES: Record<string, string> = {
  ...LIBRARY_ALIAS_MAP,
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
  "barbell row": "Stångrodd",
  "bent over row": "Stångrodd",
  "bent-over row": "Stångrodd",
  skivstangsrodd: "Stångrodd",
  "skivstångsrodd": "Stångrodd",
  stangrodd: "Stångrodd",
  "stångrodd": "Stångrodd",
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

type ExerciseSearchTerm = { term: string; canonicalName: string };

const KNOWN_EXERCISE_SEARCH_TERMS: ExerciseSearchTerm[] = [
  ...EXERCISE_LIBRARY.flatMap((exercise) => [
    { term: exercise.name, canonicalName: exercise.name },
    ...exercise.aliases.map((alias) => ({ term: alias, canonicalName: exercise.name })),
  ]),
  ...KNOWN_EXERCISE_NAMES.filter(
    (name) => !EXERCISE_LIBRARY.some((exercise) => exercise.name === name)
  ).map((name) => ({ term: name, canonicalName: name })),
];

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

  const contained = KNOWN_EXERCISE_SEARCH_TERMS.find(({ term }) => {
    const known = normalizeExerciseSearchText(term);
    return (
      normalized.length >= 5 &&
      (known.includes(normalized) || normalized.includes(known))
    );
  });

  if (contained) {
    return { status: "suggest", name, suggestion: contained.canonicalName };
  }

  const closest = KNOWN_EXERCISE_SEARCH_TERMS.map(({ term, canonicalName }) => ({
    canonicalName,
    distance: getEditDistance(normalized, normalizeExerciseSearchText(term)),
  })).sort((a, b) => a.distance - b.distance)[0];

  if (
    closest &&
    closest.distance <= Math.max(2, Math.floor(normalized.length * 0.22))
  ) {
    return { status: "suggest", name, suggestion: closest.canonicalName };
  }

  return { status: "unknown", name, suggestion: "" };
}

export function getExerciseInfo(name: string): ExerciseInfo {
  const key = name.trim().toLowerCase();
  const definition = getExerciseDefinition(name);
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

  if (definition) {
    return {
      equipment: definition.equipment,
      detail: definition.detail,
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
