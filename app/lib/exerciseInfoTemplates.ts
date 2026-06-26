import { normalizeExerciseSearchText } from "./exercises";

export type ExerciseInfoTemplate = {
  equipment: string;
  steps: string[];
  feel: string;
  log: string;
};

function template(
  equipment: string,
  steps: string[],
  feel: string,
  log: string
): ExerciseInfoTemplate {
  return { equipment, steps, feel, log };
}

const weightLog = "Vikt, reps och RIR.";
const machineLog = "Maskinens vikt, reps och RIR.";
const bodyweightLog = "Reps och RIR. Extra vikt loggas bara om du använder den.";
const timeLog = "Tid.";

const flatPress = template(
  "Plan bänk + skivstång",
  [
    "Ligg stabilt med fötterna i golvet.",
    "Sänk kontrollerat mot bröstet.",
    "Pressa upp utan att tappa skuldrorna.",
  ],
  "Det ska främst kännas i bröstet. Framsida axel och triceps hjälper till. Skarp smärta i axel, bröst eller handled är en stoppsignal.",
  "Total vikt på stången, reps och RIR."
);

const dumbbellPress = template(
  "Plan bänk + hantlar",
  [
    "Ligg stabilt med fötterna i golvet.",
    "Sänk kontrollerat till brösthöjd.",
    "Pressa upp med handlederna raka.",
  ],
  "Det ska främst kännas i bröstet. Lite framsida axel och triceps är normalt. Skarp axelsmärta är en stoppsignal.",
  "Vikt per hantel, reps och RIR."
);

const pushup = template(
  "Kroppsvikt",
  [
    "Håll kroppen lång och stabil.",
    "Sänk kontrollerat utan att tappa höften.",
    "Pressa upp med smärtfria handleder.",
  ],
  "Det ska främst kännas i bröst och triceps. Bålen ska hålla kroppen stabil. Skarp axel- eller handledssmärta är en stoppsignal.",
  bodyweightLog
);

const stableRow = template(
  "Roddmaskin eller kabel",
  [
    "Sitt stabilt med lång rygg.",
    "Dra handtaget mot kroppen.",
    "Släpp fram kontrollerat utan att tappa positionen.",
  ],
  "Det ska främst kännas i övre rygg och lats. Biceps hjälper till. Sänk vikten om ländryggen gör jobbet.",
  machineLog
);

const freeRow = template(
  "Hantel och stöd",
  [
    "Stöd kroppen så ryggen kan hållas stilla.",
    "Dra armbågen bakåt mot höften.",
    "Sänk kontrollerat utan att vrida kroppen.",
  ],
  "Det ska främst kännas i övre rygg och lats. Biceps hjälper till. Sänk vikten om ländryggen tar över.",
  "Vikt per hantel, reps och RIR."
);

const barbellRow = template(
  "Skivstång",
  [
    "Fäll i höften och håll ryggen stabil.",
    "Dra stången kontrollerat mot kroppen.",
    "Sänk utan att ändra överkroppens lutning.",
  ],
  "Det ska främst kännas i övre rygg och lats. Biceps hjälper till. Ländryggen ska hålla positionen, inte göra ont.",
  "Total vikt på stången, reps och RIR."
);

const verticalPull = template(
  "Latsdragsmaskin eller chinsräcke",
  [
    "Starta med axlarna stabila.",
    "Dra armbågarna nedåt mot kroppen.",
    "Släpp upp kontrollerat utan att axlarna rycks upp.",
  ],
  "Det ska främst kännas i lats, övre rygg och lite baksida axel. Biceps hjälper till. Sänk svårigheten om armarna tar över helt.",
  weightLog
);

const squat = template(
  "Vikt eller maskin",
  [
    "Stå stabilt med samma fotposition varje set.",
    "Sänk kontrollerat till ett djup som känns bra.",
    "Pressa upp utan att knäna faller in.",
  ],
  "Det ska främst kännas i framsida lår och säte. Baksida lår, insida lår och bål hjälper till. Knä- eller ryggsmärta styr djup och vikt.",
  weightLog
);

const splitSquat = template(
  "Kroppsvikt eller hantlar",
  [
    "Stå stabilt innan du börjar.",
    "Sänk kontrollerat med knät i en trygg bana.",
    "Pressa upp utan att tappa balansen.",
  ],
  "Det ska främst kännas i framsida lår och säte. Baksida lår och bål hjälper till. Knäsmärta styr djup och vikt.",
  weightLog
);

const hamstringCurl = template(
  "Lårcurlmaskin",
  [
    "Ställ in maskinen så knäleden ligger rätt.",
    "Curl vikten kontrollerat.",
    "Släpp tillbaka utan att tappa kontakt.",
  ],
  "Det ska främst kännas i baksida lår. Lite vadarbete är normalt. Sänk vikten om kramp eller knäobehag styr rörelsen.",
  machineLog
);

const gluteBridge = template(
  "Bänk, golv, skivstång eller maskin",
  [
    "Placera fötterna stabilt.",
    "Pressa höften upp kontrollerat.",
    "Stanna innan ländryggen tar över.",
  ],
  "Det ska främst kännas i sätet. Baksida lår hjälper till. Sänk vikten om ländryggen gör jobbet.",
  weightLog
);

const shoulderPress = template(
  "Hantlar, maskin eller skivstång",
  [
    "Starta med vikten nära axelhöjd.",
    "Pressa upp utan att svanka kraftigt.",
    "Sänk kontrollerat till samma startläge.",
  ],
  "Det ska främst kännas i axlarna. Triceps hjälper till. Skarp axelsmärta eller tydlig svankkompensation är en stoppsignal.",
  "Vikt, reps och RIR. Vid hantlar loggar du vikt per hantel."
);

const rearDelt = template(
  "Hantlar, kabel, band eller maskin",
  [
    "Starta lätt och håll nacken lugn.",
    "För armarna utåt/bakåt kontrollerat.",
    "Stanna innan du börjar rycka med kroppen.",
  ],
  "Det ska främst kännas i baksida axel och övre rygg. Sänk vikten om nacken eller ländryggen tar över.",
  weightLog
);

const bicepsCurl = template(
  "Hantlar, stång eller kabel",
  [
    "Stå stabilt med armbågarna nära kroppen.",
    "Curl vikten utan att kasta upp den.",
    "Sänk kontrollerat hela vägen.",
  ],
  "Det ska främst kännas i biceps. Underarmar hjälper till. Sänk vikten om armbåge eller handled känns fel.",
  weightLog
);

const triceps = template(
  "Kabel, hantel eller stång",
  [
    "Håll överarmen stabil.",
    "Sträck armbågen kontrollerat.",
    "Släpp tillbaka utan att tappa kontakt.",
  ],
  "Det ska främst kännas i triceps. Sänk vikten eller byt grepp om armbåge eller handled protesterar.",
  weightLog
);

const abCrunch = template(
  "Matta, kabel eller maskin",
  [
    "Starta med bålen spänd.",
    "Böj kontrollerat utan att rycka.",
    "Återgå lugnt till startläget.",
  ],
  "Det ska främst kännas i magen. Sänk svårigheten om höftböjare eller ländrygg tar över.",
  weightLog
);

const REVIEWED_EXERCISE_INFO_TEMPLATES: Record<string, ExerciseInfoTemplate> = {
  brostpress: template(
    "Bröstpressmaskin",
    [
      "Ställ in sitsen så handtagen hamnar nära brösthöjd.",
      "Pressa fram kontrollerat.",
      "Släpp tillbaka vikten utan att tappa axlarna framåt.",
    ],
    "Det ska främst kännas i bröstet. Lite framsida axel och triceps är normalt. Justera sits eller vikt om axeln tar över.",
    machineLog
  ),
  bankpress: flatPress,
  hantelpress: dumbbellPress,
  "lutande hantelpress": template(
    "Lutande bänk + hantlar",
    [
      "Använd låg till måttlig lutning.",
      "Sänk kontrollerat mot övre bröstet.",
      "Pressa upp med handlederna raka.",
    ],
    "Det ska främst kännas i övre bröstet. Bröst, framsida axel och triceps hjälper till. Skarp axelsmärta är en stoppsignal.",
    "Vikt per hantel, reps och RIR."
  ),
  armhavningar: pushup,
  "knastaende armhavningar": pushup,
  "upphojda armhavningar": pushup,
  latsdrag: template(
    "Latsdragsmaskin",
    [
      "Sitt stabilt med låren under stödet.",
      "Dra stången mot övre bröstet.",
      "Släpp upp kontrollerat utan att axlarna rycks upp.",
    ],
    "Det ska främst kännas i latsen, övre ryggen och lite baksida axel. Biceps hjälper till. Sänk vikten om armarna tar över helt.",
    machineLog
  ),
  "assisterade chins": verticalPull,
  chins: verticalPull,
  "high row": verticalPull,
  "sittande kabelrodd": stableRow,
  hantelrodd: freeRow,
  bandrodd: template(
    "Träningsband",
    [
      "Fäst bandet stabilt.",
      "Dra armbågarna bakåt med lugn kontroll.",
      "Släpp tillbaka utan att tappa bandspänningen.",
    ],
    "Det ska främst kännas i övre rygg och lats. Biceps hjälper till. Justera bandspänningen om nacken tar över.",
    "Band, reps och RIR. Skriv gärna vilket band du använde."
  ),
  "inverterad rodd": template(
    "Lågt räcke eller ringar",
    [
      "Håll kroppen lång och stabil.",
      "Dra bröstet mot stången/ringarna.",
      "Sänk kontrollerat utan att höften faller.",
    ],
    "Det ska främst kännas i övre rygg och lats. Biceps och bål hjälper till. Gör kroppen mer upprätt om det blir för tungt.",
    bodyweightLog
  ),
  maskinrodd: stableRow,
  "broststodd rodd": template(
    "Bröststödd roddmaskin eller lutande bänk + hantlar",
    [
      "Låt bröstet vila stabilt mot stödet.",
      "Dra armbågarna bakåt kontrollerat.",
      "Släpp fram utan att lyfta kroppen från stödet.",
    ],
    "Det ska främst kännas i övre rygg och lats. Biceps hjälper till. Sänk vikten om du måste rycka.",
    weightLog
  ),
  stangrodd: barbellRow,
  "t bar rodd": barbellRow,
  benpress: template(
    "Benpressmaskin",
    [
      "Placera fötterna stabilt på plattan.",
      "Sänk kontrollerat till ett djup som känns bra.",
      "Pressa upp utan att låsa knäna hårt.",
    ],
    "Det ska främst kännas i framsida lår och säte. Baksida lår och insida lår hjälper till. Knä- eller ryggsmärta styr djup och vikt.",
    machineLog
  ),
  benspark: template(
    "Bensparksmaskin",
    [
      "Ställ in ryggstöd och fotrulle.",
      "Sträck knäna kontrollerat.",
      "Sänk tillbaka utan att släppa vikten.",
    ],
    "Det ska främst kännas i framsida lår. Knäsmärta styr vikt och rörelseutslag.",
    machineLog
  ),
  "goblet squat": squat,
  knaboj: squat,
  "bulgarian split squat": splitSquat,
  "utfall bakat": splitSquat,
  "step up": splitSquat,
  "hack squat": squat,
  "smith squat": squat,
  "rumanska marklyft": template(
    "Skivstång eller hantlar",
    [
      "Starta med mjuka knän och lång rygg.",
      "Fäll i höften tills baksida lår sträcks.",
      "Res dig genom att pressa höften framåt.",
    ],
    "Det ska främst kännas i baksida lår och säte. Ländryggen ska hålla positionen, inte göra ont.",
    weightLog
  ),
  larcurl: hamstringCurl,
  "sittande larcurl": hamstringCurl,
  "liggande larcurl": hamstringCurl,
  "hip thrust": gluteBridge,
  hoftlyft: gluteBridge,
  "cable kickback": template(
    "Kabelmaskin + ankelrem",
    [
      "Stå stabilt med lätt böjt stödben.",
      "För benet bakåt utan att svanka.",
      "Släpp tillbaka kontrollerat.",
    ],
    "Det ska främst kännas i sätet. Baksida lår hjälper till. Sänk vikten om ländryggen tar över.",
    machineLog
  ),
  jagarstol: template(
    "Vägg + kroppsvikt",
    [
      "Sätt ryggen mot väggen.",
      "Håll knä och fötter stabila.",
      "Stanna innan positionen faller isär.",
    ],
    "Det ska främst kännas i framsida lår. Säte hjälper till. Avbryt om knäsmärta tar över.",
    timeLog
  ),
  axelpress: shoulderPress,
  axelpressmaskin: shoulderPress,
  sidolyft: template(
    "Hantlar eller kabel",
    [
      "Starta lätt med armarna vid sidan.",
      "Lyft kontrollerat ut åt sidan.",
      "Sänk långsamt utan att gunga.",
    ],
    "Det ska främst kännas på sidan av axeln. Sänk vikten om nacke eller framsida axel tar över.",
    weightLog
  ),
  "omvanda flyes": rearDelt,
  "rear delt maskin": rearDelt,
  "face pull": rearDelt,
  bicepscurl: bicepsCurl,
  stangcurl: bicepsCurl,
  kabelcurl: bicepsCurl,
  "preacher curl": bicepsCurl,
  hammercurl: template(
    "Hantlar",
    [
      "Håll handflatorna mot varandra.",
      "Curl vikten utan att kasta upp den.",
      "Sänk kontrollerat hela vägen.",
    ],
    "Det ska kännas i biceps och underarm. Sänk vikten om armbåge eller handled känns fel.",
    "Vikt per hantel, reps och RIR."
  ),
  "triceps pushdown": triceps,
  "triceps extension": triceps,
  "overhead cable extension": triceps,
  dips: template(
    "Dipsställning eller assisterad maskin",
    [
      "Starta med axlarna stabila.",
      "Sänk kontrollerat till smärtfritt djup.",
      "Pressa upp utan att axlarna faller fram.",
    ],
    "Det ska främst kännas i triceps och bröst. Framsida axel hjälper till. Skarp axelsmärta är en stoppsignal.",
    bodyweightLog
  ),
  "pec deck": template(
    "Pec deck-maskin",
    [
      "Ställ in sitsen så armarna rör sig i brösthöjd.",
      "För armarna ihop kontrollerat.",
      "Släpp tillbaka tills bröstet sträcks lätt.",
    ],
    "Det ska främst kännas i bröstet. Lite framsida axel är normalt. Sänk vikten om axeln tar över.",
    machineLog
  ),
  "cable flyes": template(
    "Kabelmaskin",
    [
      "Ställ kabelhöjden så rörelsen känns stabil.",
      "För händerna ihop framför kroppen.",
      "Släpp tillbaka kontrollerat till lätt stretch.",
    ],
    "Det ska främst kännas i bröstet. Lite framsida axel är normalt. Sänk vikten om axeln tar över.",
    machineLog
  ),
  planka: template(
    "Matta + kroppsvikt",
    [
      "Håll kroppen lång från huvud till häl.",
      "Spänn bålen utan att tappa andningen.",
      "Avsluta när positionen börjar falla.",
    ],
    "Det ska främst kännas i bålen. Säte och axlar hjälper till. Ländrygg ska inte göra ont.",
    timeLog
  ),
  sidoplanka: template(
    "Matta + kroppsvikt",
    [
      "Placera armbågen stabilt under axeln.",
      "Lyft höften och håll kroppen rak.",
      "Avsluta innan höften faller.",
    ],
    "Det ska främst kännas i sidan av bålen. Axlar och säte hjälper till. Sänk svårigheten om axeln känns fel.",
    timeLog
  ),
  "cable crunch": abCrunch,
  "machine crunch": abCrunch,
  situps: template(
    "Matta eller lutande bänk",
    [
      "Starta kontrollerat med fötterna stabila.",
      "Rulla upp utan att rycka.",
      "Sänk tillbaka lugnt.",
    ],
    "Det ska främst kännas i magen. Höftböjare hjälper till. Sänk svårigheten om ländrygg eller höft tar över.",
    bodyweightLog
  ),
  "hangande benlyft": template(
    "Chinsräcke eller ställning",
    [
      "Häng stabilt med kontrollerade axlar.",
      "Lyft benen utan att svinga.",
      "Sänk kontrollerat innan nästa rep.",
    ],
    "Det ska främst kännas i mage och höftböjare. Greppet hjälper till. Sänk svårigheten om du börjar svinga.",
    bodyweightLog
  ),
  hoftabduktion: template(
    "Abduktionsmaskin",
    [
      "Sitt stabilt i maskinen.",
      "Pressa benen utåt kontrollerat.",
      "Släpp tillbaka utan att vikten slår i.",
    ],
    "Det ska främst kännas i säte och utsida höft. Sänk vikten om du måste gunga.",
    machineLog
  ),
  hoftadduktion: template(
    "Adduktionsmaskin",
    [
      "Sitt stabilt i maskinen.",
      "För benen inåt kontrollerat.",
      "Släpp tillbaka utan att vikten slår i.",
    ],
    "Det ska främst kännas i insida lår. Sänk vikten om höft eller knä känns fel.",
    machineLog
  ),
  ryggresning: template(
    "Ryggresningsbänk",
    [
      "Ställ in stödet så höften kan röra sig.",
      "Sänk överkroppen kontrollerat.",
      "Res dig utan att översträcka ländryggen.",
    ],
    "Det ska främst kännas i ländrygg, säte och baksida lår. Avbryt vid skarp ryggsmärta.",
    bodyweightLog
  ),
  vadpress: template(
    "Vadpressmaskin, benpress eller hantlar",
    [
      "Starta med stabil fotposition.",
      "Sänk till kontrollerad stretch.",
      "Pressa upp och pausa kort i toppen.",
    ],
    "Det ska främst kännas i vaderna. Sänk vikten om du tappar stretch eller studs.",
    weightLog
  ),
};

export function getReviewedExerciseInfoTemplate(
  exerciseName: string
): ExerciseInfoTemplate | null {
  return (
    REVIEWED_EXERCISE_INFO_TEMPLATES[normalizeExerciseSearchText(exerciseName)] ??
    null
  );
}
