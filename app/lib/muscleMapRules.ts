import {
  getAllExerciseNames,
  getExerciseDefinition,
  normalizeExerciseSearchText,
} from "./exercises";

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
  | "calves"
  | "serratus_anterior"
  | "neck_flexors"
  | "neck_extensors"
  | "tibialis_anterior";

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
  serratus_anterior: ["serratus-anterior-left", "serratus-anterior-right"],
  neck_flexors: ["neck-left", "neck-right"],
  neck_extensors: ["nape"],
  tibialis_anterior: ["tibialis-anterior-left", "tibialis-anterior-right"],
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
  coreTwist: {
    label: "StrengthLog: Core Twist (Russian Twist)",
    url: "https://www.strengthlog.com/russian-twist/",
  },
  lyingLegRaise: {
    label: "StrengthLog: Lying Leg Raise",
    url: "https://www.strengthlog.com/lying-leg-raise/",
  },
  bicycleCrunch: {
    label: "StrengthLog: Bicycle Crunch",
    url: "https://www.strengthlog.com/bicycle-crunch/",
  },
  closeGripPushup: {
    label: "ExRx: Close Grip Push-up (Diamond Push-up)",
    url: "https://exrx.net/WeightExercises/Triceps/BWCloseGripPushup",
  },
  burpee: {
    label: "ExRx: Burpee",
    url: "https://exrx.net/Aerobic/Exercises/Burpee",
  },
  kettlebellSwing: {
    label: "StrengthLog: Kettlebell Swing",
    url: "https://www.strengthlog.com/kettlebell-swing/",
  },
  dumbbellChestFly: {
    label: "StrengthLog: Dumbbell Chest Fly",
    url: "https://www.strengthlog.com/dumbbell-chest-fly/",
  },
  arnoldPress: {
    label: "StrengthLog: Arnold Press",
    url: "https://www.strengthlog.com/arnold-press/",
  },
  reverseCurl: {
    label: "ExRx: Barbell Reverse Curl",
    url: "https://exrx.net/WeightExercises/Brachioradialis/BBReverseCurl",
  },
  trapBarDeadlift: {
    label: "StrengthLog: Trap Bar Deadlift (High Handles)",
    url: "https://www.strengthlog.com/trap-bar-deadlift-with-high-handles/",
  },
  smithBenchPress: {
    label: "StrengthLog: Smith Machine Bench Press",
    url: "https://www.strengthlog.com/smith-machine-bench-press/",
  },
  cableLateralRaise: {
    label: "StrengthLog: Cable Lateral Raise",
    url: "https://www.strengthlog.com/cable-lateral-raise/",
  },
  landminePress: {
    label: "StrengthLog: Landmine Press",
    url: "https://www.strengthlog.com/landmine-press/",
  },
  cableWoodchop: {
    label: "StrengthLog: Cable Machine Wood Chop (High to Low)",
    url: "https://www.strengthlog.com/cable-machine-wood-chop-high-to-low/",
  },
  lateralLunge: {
    label: "StrengthLog: Side Lunge (Bodyweight)",
    url: "https://www.strengthlog.com/side-lunges-bodyweight/",
  },
  nordicCurl: {
    label: "StrengthLog: Nordic Hamstring Curl",
    url: "https://www.strengthlog.com/stiff-legged-deadlifts-vs-nordic-hamstring-curl/",
  },
  pushUpPlus: {
    label: "ExRx: Push-up Plus",
    url: "https://exrx.net/WeightExercises/SerratusAnterior/BWPushUpPlus",
  },
  lyingNeckCurl: {
    label: "StrengthLog: Lying Neck Curl",
    url: "https://www.strengthlog.com/lying-neck-curl/",
  },
  lyingNeckExtension: {
    label: "StrengthLog: Lying Neck Extension",
    url: "https://www.strengthlog.com/lying-neck-extension/",
  },
  tibialisRaise: {
    label: "StrengthLog: Tibialis Raise",
    url: "https://www.strengthlog.com/tibialis-raise/",
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
  "viktade dips": review(
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
  "viktade chins": verticalPull,
  "viktad plankan": review(
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
  "russian twist": review(
    {
      primary: "Sneda magmuskler",
      secondary: "Mage",
    },
    {
      primary: ["obliques"],
      active: [],
      secondary: ["abs"],
    },
    [SOURCES.coreTwist]
  ),
  "liggande benlyft": review(
    {
      primary: "Mage",
      active: "Höftböjare",
      secondary: "Sneda magmuskler",
    },
    {
      primary: ["abs"],
      active: ["hip_flexors"],
      secondary: ["obliques"],
    },
    [SOURCES.lyingLegRaise]
  ),
  "bicycle crunch": review(
    {
      primary: "Sneda magmuskler",
      secondary: "Mage, höftböjare",
    },
    {
      primary: ["obliques"],
      active: [],
      secondary: ["abs", "hip_flexors"],
    },
    [SOURCES.bicycleCrunch]
  ),
  diamantarmhavningar: review(
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
    [SOURCES.closeGripPushup]
  ),
  burpees: review(
    {
      primary: "Framsida lår",
      active: "Bröst",
      secondary: "Bål, framsida axel",
    },
    {
      primary: ["quads"],
      active: ["chest_sternal"],
      secondary: ["core", "front_delts_press"],
    },
    [SOURCES.burpee],
    "medium"
  ),
  "kettlebell swing": review(
    {
      primary: "Säte, ländrygg",
      active: "Baksida lår",
      secondary: "Insida lår, övre trapezius, underarm",
    },
    {
      primary: ["glutes", "lower_back"],
      active: ["hamstrings"],
      secondary: ["adductors", "upper_traps", "forearms"],
    },
    [SOURCES.kettlebellSwing]
  ),
  hantelflyes: review(
    {
      primary: "Bröst",
      secondary: "Framsida axel",
    },
    {
      primary: ["chest_upper", "chest_sternal"],
      active: [],
      secondary: ["front_delts"],
    },
    [SOURCES.dumbbellChestFly]
  ),
  "arnold press": review(
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
    [SOURCES.arnoldPress]
  ),
  "reverse curl": review(
    {
      primary: "Underarm",
      active: "Biceps",
    },
    {
      primary: ["forearms"],
      active: ["biceps"],
      secondary: [],
    },
    [SOURCES.reverseCurl]
  ),
  trapstangsmarklyft: review(
    {
      primary: "Säte",
      active: "Framsida lår, baksida lår",
      secondary: "Ländrygg, underarm, övre trapezius",
    },
    {
      primary: ["glutes"],
      active: ["quads", "hamstrings"],
      secondary: ["lower_back", "forearms", "upper_traps"],
    },
    [SOURCES.trapBarDeadlift]
  ),
  "smith bankpress": flatPress([SOURCES.smithBenchPress]),
  "kabel sidolyft": review(
    {
      primary: "Sida axel",
    },
    {
      primary: ["side_delts"],
      active: [],
      secondary: [],
    },
    [SOURCES.cableLateralRaise]
  ),
  "landmine press": review(
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
    [SOURCES.landminePress]
  ),
  kabelrotation: review(
    {
      primary: "Sneda magmuskler",
      active: "Mage",
      secondary: "Bål",
    },
    {
      primary: ["obliques"],
      active: ["abs"],
      secondary: ["core"],
    },
    [SOURCES.cableWoodchop]
  ),
  "stodd benlyft": review(
    {
      primary: "Mage",
      active: "Höftböjare",
    },
    {
      primary: ["abs"],
      active: ["hip_flexors"],
      secondary: [],
    },
    [SOURCES.legRaise]
  ),
  sidoutfall: review(
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
    [SOURCES.lateralLunge]
  ),
  "nordic hamstring curl": review(
    {
      primary: "Baksida lår",
      active: "Säte",
    },
    {
      primary: ["hamstrings"],
      active: ["glutes"],
      secondary: [],
    },
    [SOURCES.nordicCurl]
  ),
  "skulderbladspush up": review(
    {
      primary: "Serratus anterior",
      active: "Bröst",
      secondary: "Framsida axel",
    },
    {
      primary: ["serratus_anterior"],
      active: ["chest_sternal", "chest_upper"],
      secondary: ["front_delts_press"],
    },
    [SOURCES.pushUpPlus]
  ),
  "nackcurl liggande": review(
    {
      primary: "Nacke, framsida",
    },
    {
      primary: ["neck_flexors"],
      active: [],
      secondary: [],
    },
    [SOURCES.lyingNeckCurl]
  ),
  "nackresning liggande": review(
    {
      primary: "Nacke, baksida",
      secondary: "Övre trapezius",
    },
    {
      primary: ["neck_extensors"],
      active: [],
      secondary: ["upper_traps"],
    },
    [SOURCES.lyingNeckExtension]
  ),
  "tibialis lyft": review(
    {
      primary: "Framsida smalben",
    },
    {
      primary: ["tibialis_anterior"],
      active: [],
      secondary: [],
    },
    [SOURCES.tibialisRaise]
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

export type MuscleTier = "primary" | "active" | "secondary";

export type MuscleTokenExercise = {
  name: string;
  tier: MuscleTier;
};

const TIER_RANK: Record<MuscleTier, number> = { primary: 3, active: 2, secondary: 1 };

// Byggs en gång vid modulladdning: token -> vilka övningar taggar den,
// och med vilken tyngd (primär/aktiv/sekundär). Går via getAllExerciseNames
// (riktiga övningsnamn), inte REVIEWED_MUSCLE_MAPS nycklarna direkt, eftersom
// flera övningar delar samma review()-objekt (t.ex. verticalPull) och en
// nyckel-baserad iteration inte skulle ge tillbaka de riktiga namnen.
const EXERCISES_BY_TOKEN: Partial<Record<MuscleMapToken, MuscleTokenExercise[]>> = (() => {
  const result: Partial<Record<MuscleMapToken, MuscleTokenExercise[]>> = {};

  function addToken(token: MuscleMapToken, name: string, tier: MuscleTier) {
    const list = result[token] ?? (result[token] = []);
    if (!list.some((entry) => entry.name === name)) {
      list.push({ name, tier });
    }
  }

  for (const name of getAllExerciseNames()) {
    const review = getReviewedExerciseMuscleMap(name);
    if (!review) continue;

    review.map.primary.forEach((token) => addToken(token, name, "primary"));
    review.map.active.forEach((token) => addToken(token, name, "active"));
    review.map.secondary.forEach((token) => addToken(token, name, "secondary"));
  }

  return result;
})();

// Omvänd av BODY_MUSCLE_TOKEN_IDS: kroppsdel-id -> vilka tokens den tillhör.
// Vissa id:n (t.ex. abs-upper-left) delas av flera tokens (abs och core) —
// därför en lista, inte en enda token.
const TOKENS_BY_BODY_PART_ID: Record<string, MuscleMapToken[]> = (() => {
  const result: Record<string, MuscleMapToken[]> = {};

  (Object.keys(BODY_MUSCLE_TOKEN_IDS) as MuscleMapToken[]).forEach((token) => {
    BODY_MUSCLE_TOKEN_IDS[token].forEach((id) => {
      const list = result[id] ?? (result[id] = []);
      list.push(token);
    });
  });

  return result;
})();

export function getExercisesForMuscleToken(token: MuscleMapToken): MuscleTokenExercise[] {
  return EXERCISES_BY_TOKEN[token] ?? [];
}

// Given ett kroppsdel-id från body-muscles onMuscleClick: alla övningar som
// tränar någon av de tokens id:t tillhör, sorterat primär -> aktiv ->
// sekundär. Förekommer en övning via flera tokens vinner den högsta tyngden.
export function getExercisesForBodyPartId(id: string): MuscleTokenExercise[] {
  const tokens = TOKENS_BY_BODY_PART_ID[id] ?? [];
  const merged = new Map<string, MuscleTier>();

  tokens.forEach((token) => {
    getExercisesForMuscleToken(token).forEach(({ name, tier }) => {
      const existing = merged.get(name);
      if (!existing || TIER_RANK[tier] > TIER_RANK[existing]) {
        merged.set(name, tier);
      }
    });
  });

  return Array.from(merged.entries())
    .map(([name, tier]) => ({ name, tier }))
    .sort(
      (a, b) =>
        TIER_RANK[b.tier] - TIER_RANK[a.tier] || a.name.localeCompare(b.name, "sv")
    );
}

// Svensk visningstext per token, för rubriken när man tryckt på en muskel.
export const MUSCLE_TOKEN_LABELS: Record<MuscleMapToken, string> = {
  chest_upper: "Övre bröst",
  chest_sternal: "Bröst",
  front_delts: "Framsida axel",
  front_delts_press: "Framsida axel",
  side_delts: "Sida axel",
  rear_delts: "Baksida axel",
  triceps: "Triceps",
  biceps: "Biceps",
  forearms: "Underarm",
  lats: "Lats",
  upper_back: "Övre rygg",
  upper_traps: "Övre trapezius",
  lower_back: "Ländrygg",
  abs: "Mage",
  obliques: "Sneda magmuskler",
  core: "Bål",
  hip_flexors: "Höftböjare",
  quads: "Framsida lår",
  hamstrings: "Baksida lår",
  glutes: "Säte",
  adductors: "Insida lår",
  calves: "Vader",
  serratus_anterior: "Serratus anterior",
  neck_flexors: "Nacke, framsida",
  neck_extensors: "Nacke, baksida",
  tibialis_anterior: "Framsida smalben",
};

// Given ett kroppsdel-id: bästa svenska namnet att visa som rubrik. Väljer
// den mest specifika token bland de som delar id:t (minst antal id:n i sin
// egen lista) — annars vinner breda samlingstokens som "core" ofta över
// mer exakta som "mage"/"sneda magmuskler" för samma kroppsdel.
// Alla id:n som delar minst en token med det givna id:t (inklusive id:t
// själv) — används för att highlighta t.ex. både vänster och höger
// baksida lår när en av dem trycks, inte bara den exakta sidan man rörde.
export function getRelatedBodyPartIds(id: string): string[] {
  const tokens = TOKENS_BY_BODY_PART_ID[id] ?? [];
  const ids = new Set<string>();

  tokens.forEach((token) => {
    BODY_MUSCLE_TOKEN_IDS[token].forEach((relatedId) => ids.add(relatedId));
  });

  return Array.from(ids);
}

export function getMuscleLabelForBodyPartId(id: string): string | null {
  const tokens = TOKENS_BY_BODY_PART_ID[id] ?? [];
  if (tokens.length === 0) return null;

  const mostSpecific = tokens.reduce((best, token) =>
    BODY_MUSCLE_TOKEN_IDS[token].length < BODY_MUSCLE_TOKEN_IDS[best].length
      ? token
      : best
  );

  return MUSCLE_TOKEN_LABELS[mostSpecific];
}
