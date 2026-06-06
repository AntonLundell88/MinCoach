import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const root = path.join(import.meta.dirname, "..");
const sourcePath = path.join(root, "app", "lib", "exercises.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

const moduleShim = { exports: {} };
const sandbox = {
  exports: moduleShim.exports,
  module: moduleShim,
  console,
};

vm.runInNewContext(compiled, sandbox, { filename: sourcePath });

const { getProgramExercisePool } = moduleShim.exports;

if (typeof getProgramExercisePool !== "function") {
  throw new Error("Kunde inte läsa getProgramExercisePool från övningsbiblioteket.");
}

const cases = [
  {
    name: "hemma + ny + inga redskap",
    args: { location: "hemma", equipment: [], trainingExperience: "nyborjare" },
    includes: [
      "Knästående armhävningar",
      "Upphöjda armhävningar",
      "Höftlyft",
      "Jägarstol",
      "Planka",
    ],
    excludes: ["Chins", "Latsdrag", "Benpress", "Cable crunch", "Hantelpress"],
    patterns: ["horisontell_press", "utfall_ett_ben", "hoftstrackning", "bal_stabilitet"],
  },
  {
    name: "hemma + ny + hantlar",
    args: {
      location: "hemma",
      equipment: ["dumbbells", "bench"],
      trainingExperience: "nyborjare",
    },
    includes: ["Hantelpress", "Hantelrodd", "Goblet squat", "Bicepscurl", "Triceps extension"],
    excludes: ["Latsdrag", "Benpress", "Cable crunch", "Stångcurl"],
    patterns: ["horisontell_press", "horisontellt_drag", "knaboj", "armbojning"],
  },
  {
    name: "hemma + van + pull-up bar",
    args: {
      location: "hemma",
      equipment: ["pullup_bar"],
      trainingExperience: "van",
    },
    includes: ["Chins", "Inverterad rodd"],
    excludes: ["Latsdrag", "Benpress", "Cable crunch"],
    patterns: ["vertikalt_drag", "horisontellt_drag"],
  },
  {
    name: "gym + ny",
    args: { location: "gym", equipment: [], trainingExperience: "nyborjare" },
    includes: [
      "Bröstpress",
      "Latsdrag",
      "Benpress",
      "Benspark",
      "Lårcurl",
      "Maskinrodd",
      "Axelpressmaskin",
      "Machine crunch",
    ],
    excludes: ["Knäböj", "Rumänska marklyft", "Chins", "Dips"],
    patterns: ["horisontell_press", "vertikalt_drag", "knaboj", "hamstring_isolering"],
  },
  {
    name: "gym + erfaren",
    args: { location: "gym", equipment: [], trainingExperience: "erfaren" },
    includes: [
      "Bänkpress",
      "Knäböj",
      "Rumänska marklyft",
      "Chins",
      "Dips",
      "Hack squat",
      "T-bar rodd",
      "Overhead cable extension",
    ],
    excludes: ["Bandrodd"],
    patterns: ["horisontell_press", "vertikalt_drag", "hoftfallning", "armstrackning"],
  },
];

const failures = [];

function names(pool) {
  return pool.map((exercise) => exercise.name);
}

function patterns(pool) {
  return new Set(pool.map((exercise) => exercise.movementPattern).filter(Boolean));
}

function hasForbiddenHomeGymEquipment(pool, equipment) {
  const available = new Set(equipment ?? []);

  return pool.filter((exercise) => {
    if (exercise.environment === "gym") return true;
    const tags = exercise.equipmentTags ?? [];
    const hasAllowedHomeOption =
      tags.includes("none") ||
      tags.includes("bodyweight") ||
      (tags.includes("dumbbells") &&
        (available.has("dumbbells") || available.has("adjustable_dumbbells"))) ||
      (tags.includes("bands") && available.has("bands")) ||
      (tags.includes("kettlebell") && available.has("kettlebell")) ||
      (tags.includes("pullup_bar") && available.has("pullup_bar")) ||
      (tags.includes("barbell") && available.has("barbell"));

    return (
      !hasAllowedHomeOption &&
      (tags.includes("machines") || tags.includes("cables") || tags.includes("barbell"))
    );
  });
}

for (const testCase of cases) {
  const pool = getProgramExercisePool(testCase.args);
  const poolNames = names(pool);
  const poolPatterns = patterns(pool);

  for (const expected of testCase.includes) {
    if (!poolNames.includes(expected)) {
      failures.push(`${testCase.name}: saknar ${expected}`);
    }
  }

  for (const forbidden of testCase.excludes) {
    if (poolNames.includes(forbidden)) {
      failures.push(`${testCase.name}: innehåller förbjuden övning ${forbidden}`);
    }
  }

  for (const pattern of testCase.patterns) {
    if (!poolPatterns.has(pattern)) {
      failures.push(`${testCase.name}: saknar rörelsemönster ${pattern}`);
    }
  }

  if (testCase.args.location === "hemma") {
    const badHomeExercises = hasForbiddenHomeGymEquipment(pool, testCase.args.equipment);
    for (const exercise of badHomeExercises) {
      failures.push(`${testCase.name}: otillåten hemmaövning ${exercise.name}`);
    }
  }

  console.log(`${testCase.name}: ${pool.length} övningar`);
  console.log(`  ${poolNames.slice(0, 12).join(", ")}`);
}

if (failures.length > 0) {
  console.error("\nÖvningspool-kontrollen hittade problem:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nÖvningspool-kontrollen är grön.");
