import { getExerciseDefinition, normalizeExerciseSearchText } from "./exercises";

export type MuscleMapLevel = "primary" | "active" | "secondary";

export type MuscleMapToken =
  | "chest_upper"
  | "chest_sternal"
  | "front_delts"
  | "front_delts_press"
  | "side_delts"
  | "rear_delts"
  | "triceps"
  | "biceps"
  | "forearms"
  | "lats"
  | "upper_back"
  | "upper_traps"
  | "lower_back"
  | "abs"
  | "obliques"
  | "core"
  | "hip_flexors"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "adductors"
  | "calves";

export type ReviewedMuscleMap = {
  reviewedAt: string;
  confidence: "high" | "medium";
  labels: {
    primary: string;
    active?: string;
    secondary?: string;
  };
  map: Record<MuscleMapLevel, MuscleMapToken[]>;
  sources: Array<{
    label: string;
    url: string;
  }>;
};

type Source = ReviewedMuscleMap["sources"][number];

const REVIEWED_AT = "2026-06-06";

export const BODY_MUSCLE_TOKEN_IDS: Record<MuscleMapToken, string[]> = {
  chest_upper: ["chest-upper-left", "chest-upper-right"],
  chest_sternal: ["chest-lower-left", "chest-lower-right"],
  front_delts: ["shoulder-front-left", "shoulder-front-right"],
  front_delts_press: [
    "shoulder-front-left",
    "shoulder-front-right",
    "shoulder-side-left",
    "shoulder-side-right",
  ],
  side_delts: ["shoulder-side-left", "shoulder-side-right"],
  rear_delts: ["deltoid-rear-left", "deltoid-rear-right"],
  triceps: [
    "triceps-long-left",
    "triceps-lateral-left",
    "triceps-long-right",
    "triceps-lateral-right",
  ],
  biceps: ["biceps-left", "biceps-right"],
  forearms: [
    "forearm-left",
    "forearm-right",
    "forearm-flexors-left",
    "forearm-extensors-left",
    "forearm-flexors-right",
    "forearm-extensors-right",
  ],
  lats: [
    "lats-upper-left",
    "lats-mid-left",
    "lats-lower-left",
    "lats-upper-right",
    "lats-mid-right",
    "lats-lower-right",
  ],
  upper_back: [
    "traps-mid-left",
    "traps-lower-left",
    "traps-mid-right",
    "traps-lower-right",
  ],
  upper_traps: ["traps-upper-left", "traps-upper-right"],
  lower_back: [
    "spine",
    "lower-back-erectors-left",
    "lower-back-ql-left",
    "lower-back-erectors-right",
    "lower-back-ql-right",
  ],
  abs: ["abs-upper-left", "abs-upper-right", "abs-lower-left", "abs-lower-right"],
  obliques: ["obliques-left", "obliques-right"],
  core: [
    "abs-upper-left",
    "abs-upper-right",
    "abs-lower-left",
    "abs-lower-right",
    "obliques-left",
    "obliques-right",
    "lower-back-erectors-left",
    "lower-back-ql-left",
    "lower-back-erectors-right",
    "lower-back-ql-right",
  ],
  hip_flexors: ["hip-flexor-left", "hip-flexor-right"],
  quads: ["quads-left", "quads-right"],
  hamstrings: [
    "hamstrings-medial-left",
    "hamstrings-lateral-left",
    "hamstrings-medial-right",
    "hamstrings-lateral-right",
  ],
  glutes: [
    "gluteus-medius-left",
    "gluteus-maximus-left",
    "gluteus-medius-right",
    "gluteus-maximus-right",
  ],
  adductors: ["adductors-left", "adductors-right"],
  calves: [
    "calves-gastroc-medial-left",
    "calves-gastroc-lateral-left",
    "calves-soleus-left",
    "calves-gastroc-medial-right",
    "calves-gastroc-lateral-right",
    "calves-soleus-right",
  ],
};

const SOURCES = {
  bench: {
    label: "ExRx Bench Press Analysis",
    url: "https://exrx.net/Kinesiology/BenchPress",
  },
  dumbbellBench: {
    label: "ExRx Dumbbell Bench Press",
    url: "https://exrx.net/WeightExercises/PectoralSternal/DBBenchPress",
  },
  inclineBench: {
    label: "ExRx Incline Bench Press",
    url: "https://exrx.net/WeightExercises/PectoralClavicular/BBInclineBenchPress",
  },
  pushup: {
    label: "ExRx Push-up",
    url: "https://exrx.net/WeightExercises/PectoralSternal/BWPushup",
  },
  chestPress: {
    label: "ExRx Lever Chest Press",
    url: "https://exrx.net/WeightExercises/PectoralSternal/LVChestPressH",
  },
  chestFly: {
    label: "ExRx Lever Pec Deck Fly",
    url: "https://exrx.net/WeightExercises/PectoralSternal/LVPecDeckFly",
  },
  shoulderPress: {
    label: "ExRx Dumbbell Shoulder Press",
    url: "https://exrx.net/WeightExercises/DeltoidAnterior/DBShoulderPress",
  },
  lateralRaise: {
    label: "ExRx Dumbbell Lateral Raise",
    url: "https://exrx.net/WeightExercises/DeltoidLateral/DBLateralRaise",
  },
  rearDelt: {
    label: "ExRx Rear Delt Row",
    url: "https://exrx.net/WeightExercises/DeltoidPosterior/CBRearDeltRow",
  },
  pulldown: {
    label: "ExRx Lat Pulldown",
    url: "https://exrx.net/WeightExercises/LatissimusDorsi/CBFrontPulldown",
  },
  pullup: {
    label: "ExRx Pull-up",
    url: "https://exrx.net/WeightExercises/LatissimusDorsi/BWPullup",
  },
  row: {
    label: "ExRx Cable Seated Row",
    url: "https://exrx.net/WeightExercises/BackGeneral/CBSeatedRow",
  },
  barbellRow: {
    label: "ExRx Barbell Bent-over Row",
    url: "https://exrx.net/WeightExercises/BackGeneral/BBBentOverRow",
  },
  legPress: {
    label: "ExRx Seated Leg Press",
    url: "https://exrx.net/WeightExercises/Quadriceps/LVSeatedLegPress",
  },
  squat: {
    label: "ExRx Squat Analysis",
    url: "https://exrx.net/Kinesiology/Squats",
  },
  legExtension: {
    label: "ExRx Lever Leg Extension",
    url: "https://exrx.net/WeightExercises/Quadriceps/LVLegExtension",
  },
  rdl: {
    label: "ExRx Romanian Deadlift",
    url: "https://exrx.net/WeightExercises/OlympicLifts/RomanianDeadlift",
  },
  legCurl: {
    label: "ExRx Lying Leg Curl",
    url: "https://exrx.net/WeightExercises/Hamstrings/CBLyingLegCurl",
  },
  hipThrust: {
    label: "ExRx Barbell Hip Thrust",
    url: "https://exrx.net/WeightExercises/GluteusMaximus/BBHipThrust",
  },
  bicepsCurl: {
    label: "ExRx Dumbbell Curl",
    url: "https://exrx.net/WeightExercises/Biceps/DBCurl",
  },
  hammerCurl: {
    label: "ExRx Hammer Curl",
    url: "https://exrx.net/WeightExercises/Brachioradialis/DBHammerCurl",
  },
  tricepsPushdown: {
    label: "ExRx Triceps Pushdown",
    url: "https://exrx.net/WeightExercises/Triceps/CBPushdown",
  },
  tricepsExtension: {
    label: "ExRx Triceps Extension",
    url: "https://exrx.net/WeightExercises/Triceps/DBTriExt",
  },
  dip: {
    label: "ExRx Triceps Dip",
    url: "https://exrx.net/WeightExercises/Triceps/BWTriDip",
  },
  plank: {
    label: "ExRx Front Plank",
    url: "https://exrx.net/WeightExercises/RectusAbdominis/BWFrontPlank",
  },
  sidePlank: {
    label: "ExRx Side Plank",
    url: "https://exrx.net/WeightExercises/Obliques/BWSidePlank",
  },
  crunch: {
    label: "ExRx Crunch",
    url: "https://exrx.net/WeightExercises/RectusAbdominis/BWCrunch",
  },
  legRaise: {
    label: "ExRx Hanging Leg Raise",
    url: "https://exrx.net/WeightExercises/HipFlexors/BWHangingLegRaise",
  },
  hipAbduction: {
    label: "ExRx Hip Abduction",
    url: "https://exrx.net/WeightExercises/HipAbductor/LVSeatedHipAbduction",
  },
  hipAdduction: {
    label: "ExRx Hip Adduction",
    url: "https://exrx.net/WeightExercises/HipAdductors/LVSeatedHipAdduction",
  },
  calfRaise: {
    label: "ExRx Calf Raise",
    url: "https://exrx.net/WeightExercises/Gastrocnemius/LVStandingCalfRaise",
  },
  backExtension: {
    label: "ExRx Back Extension",
    url: "https://exrx.net/WeightExercises/ErectorSpinae/WtBackExtension",
  },
  deadlift: {
    label: "ExRx Barbell Deadlift",
    url: "https://exrx.net/WeightExercises/GluteusMaximus/BBDeadlift",
  },
  militaryPress: {
    label: "ExRx Barbell Military Press",
    url: "https://exrx.net/WeightExercises/DeltoidAnterior/BBMilitaryPress",
  },
  shrug: {
    label: "ExRx Dumbbell Shrug",
    url: "https://exrx.net/WeightExercises/TrapeziusUpper/DBShrug",
  },
  concentrationCurl: {
    label: "ExRx Dumbbell Concentration Curl",
    url: "https://exrx.net/WeightExercises/Brachialis/DBConcentrationCurl",
  },
  lunge: {
    label: "ExRx Dumbbell Lunge",
    url: "https://exrx.net/WeightExercises/Quadriceps/DBLunge",
  },
  closeGripBench: {
    label: "ExRx Barbell Close Grip Bench Press",
    url: "https://exrx.net/WeightExercises/Triceps/BBCloseGripBenchPress",
  },
  lyingTricepsExt: {
    label: "ExRx Barbell Lying Triceps Extension",
    url: "https://exrx.net/WeightExercises/Triceps/BBLyingTriExt",
  },
  leverTricepsExt: {
    label: "ExRx Lever Triceps Extension",
    url: "https://exrx.net/WeightExercises/Triceps/LVTriExt",
  },
  frontSquat: {
    label: "ExRx Barbell Front Squat",
    url: "https://exrx.net/WeightExercises/Quadriceps/BBFrontSquat",
  },
  standingLegCurl: {
    label: "ExRx Lever Standing Leg Curl",
    url: "https://exrx.net/WeightExercises/Hamstrings/LVStandingLegCurl",
  },
  seatedCalfRaise: {
    label: "ExRx Lever Seated Calf Raise",
    url: "https://exrx.net/WeightExercises/Soleus/LVSeatedCalfRaise",
  },
  frontRaise: {
    label: "ExRx Dumbbell Front Raise",
    url: "https://exrx.net/WeightExercises/DeltoidAnterior/DBFrontRaise",
  },
  uprightRow: {
    label: "ExRx Barbell Upright Row",
    url: "https://exrx.net/WeightExercises/DeltoidLateral/BBUprightRow",
  },
  machinePullover: {
    label: "ExRx Lever Pullover",
    url: "https://exrx.net/WeightExercises/LatissimusDorsi/LVPullover",
  },
  straightArmPulldown: {
    label: "ExRx Cable Bent-over Pullover (Straight Arm Pulldown)",
    url: "https://exrx.net/WeightExercises/LatissimusDorsi/CBBentoverPullover",
  },
  goodMorning: {
    label: "ExRx Barbell Bent Knee Good-morning",
    url: "https://exrx.net/WeightExercises/ErectorSpinae/BBBentKneeGoodMorning",
  },
  farmersWalk: {
    label: "StrengthLog: Farmers Walk",
    url: "https://www.strengthlog.com/farmers-walk/",
  },
  sumoDeadlift: {
    label: "StrengthLog: Sumo Deadlift",
    url: "https://www.strengthlog.com/sumo-deadlift/",
  },
  walkingLunge: {
    label: "StrengthLog: Dumbbell Walking Lunge",
    url: "https://www.strengthlog.com/dumbbell-walking-lunge/",
  },
  abWheelRollout: {
    label: "StrengthLog: Kneeling Ab Wheel Roll-Out",
    url: "https://www.strengthlog.com/kneeling-ab-wheel-roll-out/",
  },
} satisfies Record<string, Source>;

function review(
  labels: ReviewedMuscleMap["labels"],
  map: ReviewedMuscleMap["map"],
  sources: Source[],
  confidence: ReviewedMuscleMap["confidence"] = "high"
): ReviewedMuscleMap {
  return {
    reviewedAt: REVIEWED_AT,
    confidence,
    labels,
    map,
    sources,
  };
}

const flatPress = (sources: Source[]) =>
  review(
    {
      primary: "Bröst",
      active: "Övre bröst",
      secondary: "Framsida axel, triceps",
    },
    {
      primary: ["chest_sternal"],
      active: ["chest_upper"],
      secondary: ["front_delts_press", "triceps"],
    },
    sources
  );

const dumbbellPress = review(
  {
    primary: "Bröst",
    secondary: "Framsida axel, triceps",
  },
  {
    primary: ["chest_upper", "chest_sternal"],
    active: [],
    secondary: ["front_delts_press", "triceps"],
  },
  [SOURCES.dumbbellBench, SOURCES.bench]
);

const inclinePress = review(
  {
    primary: "Övre bröst",
    active: "Bröst",
    secondary: "Framsida axel, triceps",
  },
  {
    primary: ["chest_upper"],
    active: ["chest_sternal"],
    secondary: ["front_delts_press", "triceps"],
  },
  [SOURCES.inclineBench]
);

const pushup = review(
  {
    primary: "Bröst",
    active: "Bål",
    secondary: "Triceps, framsida axel",
  },
  {
    primary: ["chest_upper", "chest_sternal"],
    active: ["core"],
    secondary: ["triceps", "front_delts_press"],
  },
  [SOURCES.pushup]
);

const chestFly = review(
  {
    primary: "Bröst",
    secondary: "Framsida axel",
  },
  {
    primary: ["chest_upper", "chest_sternal"],
    active: [],
    secondary: ["front_delts"],
  },
  [SOURCES.chestFly]
);

const verticalPull = review(
  {
    primary: "Lats",
    active: "Övre rygg, baksida axel",
    secondary: "Biceps, underarm",
  },
  {
    primary: ["lats"],
    active: ["upper_back", "rear_delts"],
    secondary: ["biceps", "forearms"],
  },
  [SOURCES.pulldown, SOURCES.pullup]
);

const stableRow = review(
  {
    primary: "Övre rygg",
    active: "Lats, baksida axel",
    secondary: "Biceps, underarm",
  },
  {
    primary: ["upper_back"],
    active: ["lats", "rear_delts"],
    secondary: ["biceps", "forearms"],
  },
  [SOURCES.row]
);

const unsupportedRow = review(
  {
    primary: "Övre rygg",
    active: "Lats, baksida axel",
    secondary: "Biceps, underarm, ländrygg",
  },
  {
    primary: ["upper_back"],
    active: ["lats", "rear_delts"],
    secondary: ["biceps", "forearms", "lower_back"],
  },
  [SOURCES.barbellRow],
  "medium"
);

const squatPattern = review(
  {
    primary: "Framsida lår",
    active: "Säte",
    secondary: "Baksida lår, insida lår, bål",
  },
  {
    primary: ["quads"],
    active: ["glutes"],
    secondary: ["hamstrings", "adductors", "core"],
  },
  [SOURCES.squat]
);

const machineSquatPattern = review(
  {
    primary: "Framsida lår",
    active: "Säte",
    secondary: "Insida lår, baksida lår",
  },
  {
    primary: ["quads"],
    active: ["glutes"],
    secondary: ["adductors", "hamstrings"],
  },
  [SOURCES.squat]
);

const hamstringCurl = review(
  {
    primary: "Baksida lår",
    secondary: "Vader",
  },
  {
    primary: ["hamstrings"],
    active: [],
    secondary: ["calves"],
  },
  [SOURCES.legCurl]
);

const gluteBridgePattern = review(
  {
    primary: "Säte",
    active: "Baksida lår",
    secondary: "Bål",
  },
  {
    primary: ["glutes"],
    active: ["hamstrings"],
    secondary: ["core"],
  },
  [SOURCES.hipThrust]
);

const shoulderPress = review(
  {
    primary: "Framsida axel",
    active: "Sida axel",
    secondary: "Triceps, övre bröst",
  },
  {
    primary: ["front_delts"],
    active: ["side_delts"],
    secondary: ["triceps", "chest_upper"],
  },
  [SOURCES.shoulderPress]
);

const rearDelt = review(
  {
    primary: "Baksida axel",
    active: "Övre rygg",
  },
  {
    primary: ["rear_delts"],
    active: ["upper_back"],
    secondary: [],
  },
  [SOURCES.rearDelt]
);

const bicepsCurl = review(
  {
    primary: "Biceps",
    secondary: "Underarm",
  },
  {
    primary: ["biceps"],
    active: [],
    secondary: ["forearms"],
  },
  [SOURCES.bicepsCurl]
);

const tricepsOnly = (sources: Source[]) =>
  review(
    {
      primary: "Triceps",
    },
    {
      primary: ["triceps"],
      active: [],
      secondary: [],
    },
    sources
  );

const REVIEWED_MUSCLE_MAPS: Record<string, ReviewedMuscleMap> = {
  brostpress: flatPress([SOURCES.chestPress]),
  bankpress: flatPress([SOURCES.bench]),
  hantelpress: dumbbellPress,
  "lutande hantelpress": inclinePress,
  armhavningar: pushup,
  "knastaende armhavningar": pushup,
  "upphojda armhavningar": pushup,
  latsdrag: verticalPull,
  "assisterade chins": verticalPull,
  chins: verticalPull,
  "high row": verticalPull,
  "sittande kabelrodd": stableRow,
  hantelrodd: stableRow,
  bandrodd: stableRow,
  "inverterad rodd": review(
    {
      primary: "Övre rygg",
      active: "Lats, bål",
      secondary: "Biceps, underarm",
    },
    {
      primary: ["upper_back"],
      active: ["lats", "core"],
      secondary: ["biceps", "forearms"],
    },
    [SOURCES.row]
  ),
  maskinrodd: stableRow,
  "broststodd rodd": stableRow,
  stangrodd: unsupportedRow,
  "t bar rodd": unsupportedRow,
  benpress: review(
    {
      primary: "Framsida lår",
      active: "Säte",
      secondary: "Baksida lår, insida lår, vader",
    },
    {
      primary: ["quads"],
      active: ["glutes"],
      secondary: ["hamstrings", "adductors", "calves"],
    },
    [SOURCES.legPress]
  ),
  benspark: review(
    {
      primary: "Framsida lår",
    },
    {
      primary: ["quads"],
      active: [],
      secondary: [],
    },
    [SOURCES.legExtension]
  ),
  "goblet squat": squatPattern,
  knaboj: squatPattern,
  "bulgarian split squat": squatPattern,
  "utfall bakat": squatPattern,
  "step up": squatPattern,
  "hack squat": machineSquatPattern,
  "smith squat": squatPattern,
  "rumanska marklyft": review(
    {
      primary: "Baksida lår",
      active: "Säte",
      secondary: "Ländrygg, underarm",
    },
    {
      primary: ["hamstrings"],
      active: ["glutes"],
      secondary: ["lower_back", "forearms"],
    },
    [SOURCES.rdl]
  ),
  larcurl: hamstringCurl,
  "sittande larcurl": hamstringCurl,
  "liggande larcurl": hamstringCurl,
  "hip thrust": gluteBridgePattern,
  hoftlyft: gluteBridgePattern,
  "cable kickback": review(
    {
      primary: "Säte",
      secondary: "Baksida lår",
    },
    {
      primary: ["glutes"],
      active: [],
      secondary: ["hamstrings"],
    },
    [SOURCES.hipThrust]
  ),
  jagarstol: review(
    {
      primary: "Framsida lår",
      active: "Säte",
    },
    {
      primary: ["quads"],
      active: ["glutes"],
      secondary: [],
    },
    [SOURCES.squat]
  ),
  axelpress: shoulderPress,
  axelpressmaskin: shoulderPress,
  sidolyft: review(
    {
      primary: "Sida axel",
    },
    {
      primary: ["side_delts"],
      active: [],
      secondary: [],
    },
    [SOURCES.lateralRaise]
  ),
  "omvanda flyes": rearDelt,
  "rear delt maskin": rearDelt,
  "face pull": rearDelt,
  bicepscurl: bicepsCurl,
  stangcurl: bicepsCurl,
  kabelcurl: bicepsCurl,
  "preacher curl": bicepsCurl,
  hammercurl: review(
    {
      primary: "Biceps",
      active: "Underarm",
    },
    {
      primary: ["biceps"],
      active: ["forearms"],
      secondary: [],
    },
    [SOURCES.hammerCurl]
  ),
  "triceps pushdown": tricepsOnly([SOURCES.tricepsPushdown]),
  "triceps extension": tricepsOnly([SOURCES.tricepsExtension]),
  "overhead cable extension": tricepsOnly([SOURCES.tricepsExtension]),
  dips: review(
    {
      primary: "Triceps",
      active: "Bröst",
      secondary: "Framsida axel",
    },
    {
      primary: ["triceps"],
      active: ["chest_sternal", "chest_upper"],
      secondary: ["front_delts_press"],
    },
    [SOURCES.dip]
  ),
  "pec deck": chestFly,
  "cable flyes": chestFly,
  planka: review(
    {
      primary: "Bål",
      secondary: "Säte, axlar",
    },
    {
      primary: ["core"],
      active: [],
      secondary: ["glutes", "front_delts"],
    },
    [SOURCES.plank]
  ),
  sidoplanka: review(
    {
      primary: "Sneda magmuskler",
      active: "Bål",
      secondary: "Säte, axlar",
    },
    {
      primary: ["obliques"],
      active: ["abs", "lower_back"],
      secondary: ["glutes", "side_delts"],
    },
    [SOURCES.sidePlank]
  ),
  "cable crunch": review(
    {
      primary: "Mage",
    },
    {
      primary: ["abs"],
      active: [],
      secondary: [],
    },
    [SOURCES.crunch]
  ),
  "machine crunch": review(
    {
      primary: "Mage",
    },
    {
      primary: ["abs"],
      active: [],
      secondary: [],
    },
    [SOURCES.crunch]
  ),
  situps: review(
    {
      primary: "Mage",
      secondary: "Höftböjare",
    },
    {
      primary: ["abs"],
      active: [],
      secondary: ["hip_flexors"],
    },
    [SOURCES.crunch]
  ),
  "hangande benlyft": review(
    {
      primary: "Mage",
      active: "Höftböjare",
      secondary: "Underarm",
    },
    {
      primary: ["abs"],
      active: ["hip_flexors"],
      secondary: ["forearms"],
    },
    [SOURCES.legRaise]
  ),
  hoftabduktion: review(
    {
      primary: "Säte, utsida höft",
    },
    {
      primary: ["glutes"],
      active: [],
      secondary: [],
    },
    [SOURCES.hipAbduction]
  ),
  hoftadduktion: review(
    {
      primary: "Insida lår",
    },
    {
      primary: ["adductors"],
      active: [],
      secondary: [],
    },
    [SOURCES.hipAdduction]
  ),
  ryggresning: review(
    {
      primary: "Ländrygg",
      active: "Säte, baksida lår",
    },
    {
      primary: ["lower_back"],
      active: ["glutes", "hamstrings"],
      secondary: [],
    },
    [SOURCES.backExtension]
  ),
  vadpress: review(
    {
      primary: "Vader",
    },
    {
      primary: ["calves"],
      active: [],
      secondary: [],
    },
    [SOURCES.calfRaise]
  ),
  marklyft: review(
    {
      primary: "Säte",
      active: "Baksida lår, framsida lår",
      secondary: "Ländrygg, underarm, övre trapezius",
    },
    {
      primary: ["glutes"],
      active: ["hamstrings", "quads"],
      secondary: ["lower_back", "forearms", "upper_traps"],
    },
    [SOURCES.deadlift]
  ),
  militarpress: review(
    {
      primary: "Framsida axel",
      active: "Sida axel",
      secondary: "Triceps, övre bröst",
    },
    {
      primary: ["front_delts"],
      active: ["side_delts"],
      secondary: ["triceps", "chest_upper"],
    },
    [SOURCES.militaryPress]
  ),
  axelryck: review(
    {
      primary: "Övre trapezius",
      active: "Övre rygg",
    },
    {
      primary: ["upper_traps"],
      active: ["upper_back"],
      secondary: [],
    },
    [SOURCES.shrug]
  ),
  koncentrationscurl: review(
    {
      primary: "Biceps",
      active: "Underarm",
    },
    {
      primary: ["biceps"],
      active: ["forearms"],
      secondary: [],
    },
    [SOURCES.concentrationCurl]
  ),
  framatutfall: review(
    {
      primary: "Framsida lår",
      active: "Säte",
      secondary: "Baksida lår, insida lår, bål",
    },
    {
      primary: ["quads"],
      active: ["glutes"],
      secondary: ["hamstrings", "adductors", "core"],
    },
    [SOURCES.lunge]
  ),
  "lutande bankpress": inclinePress,
  "smal bankpress": review(
    {
      primary: "Triceps",
      active: "Bröst",
      secondary: "Framsida axel",
    },
    {
      primary: ["triceps"],
      active: ["chest_upper", "chest_sternal"],
      secondary: ["front_delts_press"],
    },
    [SOURCES.closeGripBench]
  ),
  "fransk press": tricepsOnly([SOURCES.lyingTricepsExt]),
  tricepsmaskin: tricepsOnly([SOURCES.leverTricepsExt]),
  frontboj: review(
    {
      primary: "Framsida lår",
      active: "Säte",
      secondary: "Baksida lår, insida lår, bål",
    },
    {
      primary: ["quads"],
      active: ["glutes"],
      secondary: ["hamstrings", "adductors", "core"],
    },
    [SOURCES.frontSquat]
  ),
  "larcurl staende": review(
    {
      primary: "Baksida lår",
      secondary: "Vader",
    },
    {
      primary: ["hamstrings"],
      active: [],
      secondary: ["calves"],
    },
    [SOURCES.standingLegCurl]
  ),
  "sittande vadpress": review(
    {
      primary: "Vader",
    },
    {
      primary: ["calves"],
      active: [],
      secondary: [],
    },
    [SOURCES.seatedCalfRaise]
  ),
  framatlyft: review(
    {
      primary: "Framsida axel",
    },
    {
      primary: ["front_delts"],
      active: [],
      secondary: [],
    },
    [SOURCES.frontRaise]
  ),
  "upright row": review(
    {
      primary: "Sida axel",
      active: "Övre trapezius",
      secondary: "Framsida axel",
    },
    {
      primary: ["side_delts"],
      active: ["upper_traps"],
      secondary: ["front_delts"],
    },
    [SOURCES.uprightRow]
  ),
  "pullover maskin": review(
    {
      primary: "Lats",
      secondary: "Bröst, triceps",
    },
    {
      primary: ["lats"],
      active: [],
      secondary: ["chest_sternal", "triceps"],
    },
    [SOURCES.machinePullover]
  ),
  "straight arm pulldown": review(
    {
      primary: "Lats",
      secondary: "Bröst, triceps, baksida axel",
    },
    {
      primary: ["lats"],
      active: [],
      secondary: ["chest_sternal", "triceps", "rear_delts"],
    },
    [SOURCES.straightArmPulldown]
  ),
  "god morgon": review(
    {
      primary: "Ländrygg",
      active: "Säte, baksida lår",
    },
    {
      primary: ["lower_back"],
      active: ["glutes", "hamstrings"],
      secondary: [],
    },
    [SOURCES.goodMorning]
  ),
  bondepromenad: review(
    {
      primary: "Underarm",
      active: "Bål, säte",
      secondary: "Övre trapezius, framsida lår",
    },
    {
      primary: ["forearms"],
      active: ["core", "glutes"],
      secondary: ["upper_traps", "quads"],
    },
    [SOURCES.farmersWalk]
  ),
  "sumo marklyft": review(
    {
      primary: "Säte",
      active: "Ländrygg",
      secondary: "Framsida lår, baksida lår, insida lår",
    },
    {
      primary: ["glutes"],
      active: ["lower_back"],
      secondary: ["quads", "hamstrings", "adductors"],
    },
    [SOURCES.sumoDeadlift]
  ),
  "gaende utfall": review(
    {
      primary: "Framsida lår",
      active: "Säte",
      secondary: "Insida lår",
    },
    {
      primary: ["quads"],
      active: ["glutes"],
      secondary: ["adductors"],
    },
    [SOURCES.walkingLunge]
  ),
  rullhjul: review(
    {
      primary: "Mage",
      secondary: "Sneda magmuskler",
    },
    {
      primary: ["abs"],
      active: [],
      secondary: ["obliques"],
    },
    [SOURCES.abWheelRollout]
  ),
};

export function getReviewedExerciseMuscleMap(
  exerciseName: string
): ReviewedMuscleMap | null {
  const normalized = normalizeExerciseSearchText(exerciseName);
  const direct = REVIEWED_MUSCLE_MAPS[normalized];
  if (direct) return direct;

  const definition = getExerciseDefinition(exerciseName);
  if (!definition) return null;

  return REVIEWED_MUSCLE_MAPS[normalizeExerciseSearchText(definition.name)] ?? null;
}
