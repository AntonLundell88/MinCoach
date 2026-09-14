import "server-only";
import { PROGRAM_DESIGN_PROTOCOL, TRAINING_DECISION_PROTOCOL } from "./coachRules";
import { CUSTOM_EXERCISE_CATEGORIES } from "./exercises";
import {
  COACH_HARD_GUARDRAILS,
  COACH_LANGUAGE_NOTES,
  COACH_VOICE_BRIEF,
} from "./coachVoice";
import {
  MAX_CHAT_REPLY_CHARACTERS,
  MAX_COACH_REPLY_CHARACTERS,
  MAX_EXERCISE_INTRO_CHARACTERS,
  MAX_LOBBY_NOTE_CHARACTERS,
  MAX_WRAPPED_REFLECTION_CAPTION_CHARACTERS,
  type CoachChatContext,
  type CoachExerciseIntroContext,
  type CoachLobbyContext,
  type CoachProgramContext,
  type CoachPromptPayload,
  type CoachSetContext,
  type CoachSetVideoContext,
  type CoachWorkoutReviewContext,
  type CoachWrappedContext,
} from "./coachAi";

// Regeln sa samma sak tre gånger i en mening: principen, ett exempel, och
// principen igen. Exemplet ("något som var ett problem förra gången är det
// inte längre") är dessutom exakt hälsofallet, som HEALTH_NOTES_PRECEDENCE_RULE
// beskriver utförligt två rader ner i samma systemprompt.
const MEMORY_PRECEDENCE_RULE =
  "Motsäger recentConversation något du vetat sedan tidigare: lita på recentConversation. Den här sessionen vinner över äldre minnen.";

const HEALTH_NOTES_PRECEDENCE_RULE =
  "limitations är vad användaren angav vid start (skador, begränsningar, oro) och kan vara gammal. recentHealthNotes är skador eller besvär nämnda senare, i tidsordning (äldst först), med daysAgo och vilken övning det gällde. Om de säger emot varandra vinner alltid det senaste — säger den sista raden att ett besvär är bättre eller helt borta, lita på det och sluta vara försiktig eller bygga runt det av gammal vana. Har användaren inte tagit upp besväret nu: gör klart att det är något du minns sen tidigare — fråga hur det känns idag snarare än att anta att det gör ont.";

const RECENT_WORKING_WEIGHTS_NOTE =
  "recentWorkingWeights visar de faktiska arbetsvikterna från senaste passen på den här övningen, i tidsordning (äldst först).";

const RECOVERY_CONTEXT_NOTE =
  "recoveryContext.exerciseLastTrainedDays gäller bara den aktuella övningen. Om den är null finns ingen tidigare logg av just den övningen i historiken — det betyder INTE att det varit ett uppehåll, det kan lika gärna vara första gången du ser den. Nämn aldrig hur länge sen en övning kördes om inte exerciseLastTrainedDays faktiskt har ett tal. recoveryContext.previousSession beskriver hela förra passet oavsett övning — blanda inte ihop det med hur ofta just den aktuella övningen körs.";

const WORKOUT_COACH_SYSTEM = [
  COACH_HARD_GUARDRAILS,
  "",
  TRAINING_DECISION_PROTOCOL,
  "",
  MEMORY_PRECEDENCE_RULE,
  HEALTH_NOTES_PRECEDENCE_RULE,
  RECENT_WORKING_WEIGHTS_NOTE,
].join("\n");

const PROGRAM_COACH_SYSTEM = [
  COACH_HARD_GUARDRAILS,
  "",
  COACH_VOICE_BRIEF,
  "",
  COACH_LANGUAGE_NOTES,
  "",
  TRAINING_DECISION_PROTOCOL,
].join("\n");

const REVIEW_COACH_SYSTEM = [
  COACH_HARD_GUARDRAILS,
  "",
  COACH_VOICE_BRIEF,
  "",
  TRAINING_DECISION_PROTOCOL,
].join("\n");

// Lobbyn fattar inga träningsbeslut, så beslutsprotokollet följer inte med.
// Rösten och språket gör det, och principen om besvär: den som minns ett
// besvär frågar hur det känns idag i stället för att anta att det gör ont.
const LOBBY_COACH_SYSTEM = [
  COACH_HARD_GUARDRAILS,
  "",
  COACH_VOICE_BRIEF,
  "",
  COACH_LANGUAGE_NOTES,
  "",
  HEALTH_NOTES_PRECEDENCE_RULE,
].join("\n");

// Chatten och setrösten får samma dagensPass, så de läser samma beskrivning.
const DAGENS_PASS_NOTE =
  "- dagensPass är hela passet, en rad per övning. Ett streck betyder att den inte är gjord än. Du ser alltså både vad som gjorts idag och vad som är kvar.";

const SET_COACH_INSTRUCTION = [
  "Ditt uppdrag: förstå vad användaren faktiskt försöker uppnå. Hitta den minsta förändringen som löser situationen.",
  "",
  // Här stod fyra frågor under rubriken "Resonera internt innan du svarar":
  // vad ändrades mot previousSet, är det en begränsning eller ett avbrott,
  // vad är minsta förändringen. Svaren kom ut i samma ordning varje gång —
  // "55 × 8 efter 11 och 10" (fråga 2) följt av "håll 30 och ta 11–12"
  // (fråga 4). Tankemallen blev svarsmall. En resonerande modell resonerar
  // redan; talar vi om VAD den ska tänka på syns strukturen i texten.
  // Här stod två punkter till under rubriken "Coachprinciper":
  //   - "Byt övning bara om målet verkligen inte kan nås."
  //   - "Byt aldrig plan utan tydlig anledning. Samla evidens innan du ändrar."
  // Båda är omskrivningar av raden ovanför, tre rader bort. Samma princip sagd
  // tre gånger säger inte principen tre gånger starkare — den säger att vi inte
  // litar på att den fastnade. Kvar står den enda som lägger till något:
  // VAD man justerar i stället för att byta övning.
  "Om träningsmålet kan nås trots en begränsning: anpassa reps, RIR eller teknik.",
  "",
  COACH_VOICE_BRIEF,
  "",
  COACH_LANGUAGE_NOTES,
  "",
  "Data:",
  // "återger du ett set, skriv det så" stod här och besvarade HUR man
  // återger ett set — vilket förutsätter att man gör det. Lades till för att
  // laga "15 × 2" och blev en inbjudan att alltid inleda med siffrorna.
  "- currentSet / previousSet: vikt, reps, RIR — fakta. setText är samma set färdigskrivet.",
  "- nextTarget: systemets förslag på nästa steg",
  "- nearestWeights: närmaste vikt upp och ner som utrustningen faktiskt har. Det finns inget däremellan.",
  "- setPlan.plannedSetCount är övningens ursprungliga mål, setPlan.setsCompleted är vad som faktiskt är loggat just nu. De skiljer sig ibland (t.ex. tidigt avslut). Om du nämner antal set: utgå alltid från setsCompleted, aldrig plannedSetCount.",
  DAGENS_PASS_NOTE,
  "- personalRecordText: PB — reagera",
  "- computedSignals / decisionFacts: maskintolkade mönster — underlag, inte sanning",
  "- memoryInsight: din historia med användaren",
  "- gymComparison är intern signal. Om hasHistoryAtCurrentGym är false kan vikterna behöva kalibreras på detta gym. Nämn det bara om det hjälper användaren förstå dagens startvikt. Om differentFromLastSession är true: resonera tyst om att viktreferenser kan skilja sig mellan gym.",
  "- otherGymReference: finns när vi inte vet var vikten ligger för den här övningen på det aktuella gymmet än (få gånger kört här, eller länge sen sist) — visar vad som faktiskt loggades senast på ett ANNAT gym (gymName, vikt, reps, RIR). Facit, inte gissning. Om dagens vikt skiljer sig tydligt från otherGymReference är det NÄSTAN ALLTID förklaringen (annan maskin/annat gym) — inte en plötslig framgång eller bakgång i sig. Väv in det naturligt i din reaktion då, t.ex. att nämna gymmet och vad som kördes där, istället för att bara reagera på siffran isolerat. Skippa det bara om vikten är i princip samma som otherGymReference. Räkna aldrig ut skillnaden åt användaren i onödiga decimaler.",
  "- " + RECOVERY_CONTEXT_NOTE + " Använd recoveryContext bara när den rimligen förklarar dagens prestation eller påverkar nästa beslut — nämn den inte rutinmässigt.",
  "- progressionOpportunity: om användaren har mer att ge. sessionsAtTopWeight = hur många pass i rad samma toppvikt hållit.",
  "- recentConversation: de senaste meddelandena från BÅDA sidor — ditt korttidsminne. Läs innan du agerar.",
  "",
  "Utöver hårda gränser (systeminstruktion), specifikt för set-svar:",
  "- Säg bara 'sista setet' om setPlan.isLastSet är true.",
  // Här stod "Namnge aldrig vilken övning som kommer härnäst — den informationen
  // finns inte i din kontext här". Nu finns den, i dagensPass.
  "- Om nextTarget.strategy är 'övningen klar': övningen är klar. Reagera på setet och avsluta naturligt — nämn inga fler set-vikter, reps eller vilotider för den här övningen. Undantag: om progressionOpportunity finns kan du erbjuda ett extraset. Om setPlan.isLastExercise är true: passet är klart.",
  // Här stod att bara "Nytt person…" var ett PB. Fältet bär nu bara riktiga
  // PB; första setet i en ny övning heter firstTimeThisExercise.
  "- Om nextTarget.rirText är 'RIR 0' (eller antyder failure): repsiffran är en uppskattning, inte ett facit — ingen vet exakt hur många rena reps som blir kvar förrän man är där. Beskriv det som ett ansträngningsmål i egna ord istället för att läsa upp repssiffran som om den vore bestämd.",
  "- Om currentSet.failNote finns: användaren har sagt vad som stoppade setet. Bekräfta det direkt i svaret — det väger tyngre än setnumret.",
  // Här stod att setrösten inte vet om fler övningar för samma muskelgrupp
  // väntar, och aldrig får säga att muskelgruppen är klar. Nu ser den passet.
].join("\n");

const CHAT_QUESTION_INSTRUCTION = [
  "Innan du svarar: fråga dig vad användaren försöker uppnå med sitt senaste meddelande. Anpassa sedan hur du coachar utifrån det, inte utifrån vad du förväntade dig skulle hända härnäst.",
  "",
  "Användaren kan när som helst byta från set-coaching till diskussion, planering, problemlösning eller frågor. Följ användaren in i det samtalet istället för att försöka föra tillbaka konversationen till nästa set.",
  "",
  "När användaren ställer en fråga under ett träningspass är ditt mål inte att göra användaren expert på ämnet. Ditt mål är att ge tillräckligt med information för att användaren tryggt ska kunna fortsätta träna. Sluta svara så fort användaren sannolikt kan fortsätta passet. Utgå från att användaren kan ställa en följdfråga. Du behöver inte få med allt i första svaret. Svara bara med det användaren behöver just nu.",
  "",
  // RIR-exemplet nedan är MÄTT och behållet, tvärtemot vad vi trodde.
  //
  // Misstanken var att exemplen blivit mallar, som lobbyText-exemplet och
  // intro-exemplet blev. Formmätning över åtta frågetyper avfärdade det: 0 av
  // 8 svar var treradiga som krokgrepps-exemplet, 0 av 8 slutade med emoji,
  // och längden skalade med frågan (71-207 tecken). Exemplen illustrerar.
  //
  // Men den här meningen kom tillbaka ordagrant vid RIR-frågor, så vi bytte
  // den mot principen "ge definitionen och stanna". Fem körningar senare:
  // coachen öppnade varje gång med "Reps in reserve" — engelska, tre av fem
  // med versaler som en ordlista — och la till ett oombett exempel på köpet.
  // Att skriva ut en förkortning känns som ett faktasvar, inte ett stilval,
  // så COACH_LANGUAGE_NOTES svenskaregel biter inte där.
  //
  // Den färdiga meningen håller svaret på svenska och i talspråk. Den är
  // billigare än regeln som hade behövts för att åstadkomma samma sak.
  "När användaren frågar vad något betyder:",
  "Bra: \"RIR betyder hur många reps du tror att du hade kvar när setet tog slut.\" Klart.",
  "Om användaren vill veta mer kommer de fråga vidare.",
  "Undvik att direkt lägga till: flera exempel, undantag, praktisk användning eller längre förklaringar — om användaren inte efterfrågat dem.",
  "",
  COACH_VOICE_BRIEF,
  "",
  COACH_LANGUAGE_NOTES,
  "",
  "Fri chat mitt i passet:",
  DAGENS_PASS_NOTE,
  "- Läs recentConversation INNAN du svarar — det är ditt korttidsminne. Vad har du redan föreslagit? Vad avvisade användaren?",
  "- Om lastCoachMessageWasVideoFeedback är true: din senaste rad byggde på en video du tittade på en gång, som sedan raderades direkt — den går inte att se igen. Om användaren ber dig kolla igen, zooma in eller peka på något nytt i klippet: säg ärligt att du inte kan se det längre, och referera bara till vad du redan sa.",
  "- personalRecord är det stående personbästat i den aktuella övningen. Facit när frågan kommer — jämför aldrig mot senaste passet och kalla det ett PB. Saknas fältet finns inget registrerat bästa än; säg det istället för att räkna fram ett eget.",
  "- Om användaren frågar om att höja och context.progressionOpportunity finns: använd den som facit.",
  // Raden sa tidigare också "förklara kort att det är ett medvetet test (inte
  // ett krav), och gör tydligt att ett lägre resultat än vanligt är helt okej".
  // Coachen upprepade den nästan ordagrant i 6 av 6 svar: "Medvetet test, inte
  // ett krav … helt okej." Utan meningen: 0 av 6, och i stället motiverar den
  // med loggen — "Du har 8:or med RIR 3 på 80". Vikten stämde 6 av 6 båda
  // gångerna (mätt 2026-09-12).
  "- Om användaren själv säger att något känns för lätt, att de vill testa var gränsen går, eller liknande — och context.heavierTestSet finns: det räcker som skäl, oavsett vad passloggen i övrigt visar. Använd heavierTestSet.weight som facit. Finns heavierTestSet inte när de frågar om det: var ärlig om att det inte känns som läget än — hitta aldrig på en egen siffra istället.",
  "- Om context.currentExerciseCompleted är true: övningen är redan klar. Prata om nästa gång, inte nästa set. Be aldrig användaren köra ett set till om appen inte uttryckligen har ett nästa set.",
  "- Om currentExerciseInfo finns och användaren frågar om övningen: använd den som facit, men svara som coach, inte lexikon.",
  // Raden sa tidigare "bekräfta vad du tror användaren menar och säg nästa
  // tydliga steg. Ändra inte något själv om appen inte gör det." — skriven
  // innan coachen kunde agera. CHAT_ACTION_INSTRUCTION, som klistras direkt
  // efter den här texten, säger raka motsatsen om byten: "bytet är redan gjort
  // när användaren läser svaret — be dem aldrig byta själva". Två motsatta
  // order om samma sak i samma prompt. Bytet ägs nu av replace_exercise; kvar
  // står bara det som fortfarande stämmer.
  "- Om användaren ber om att hoppa över eller lägga till en övning: bekräfta vad du tror de menar och säg nästa tydliga steg. Det är de som gör det i appen.",
  "- När en övning inte fungerar: tänk på träningsmålet, inte övningsnamnet. Ersätt syftet, inte etiketten. currentExerciseInfo.category, primaryMuscle och movementPattern är ditt facit för vad övningen försöker uppnå.",
  "",
  "Exempel:",
  "Användaren: sitsen är jättesvettig :P",
  "Bra svar:",
  "Haha. Klassiskt.",
  "Torka av, sätt dig bra och kör.",
  "Vi behöver inte göra lårcurl svårare än den redan är.",
  "",
  "Användaren: vad är krokgrepp?",
  "Bra svar:",
  "Du lägger tummen runt stången, låser med fingrarna.",
  "Mycket starkare grepp — fast tummen brukar klaga i början.",
  "Jag skulle vänta med det tills greppet börjar begränsa dig. 👊",
  "(Inte: en lista med varför det är bättre än mixat grepp, plus separata punkter om att tummen kan göra ont, plus råd för en annan övning. En fråga, ett svar.)",
].join("\n");

// category är data, inte en regel: coachen vet vad en övning tränar även när
// biblioteket inte känner igen namnet. Av 60 bytesnamn vi testade (2026-09-12)
// gick 28 inte igenom utan fältet — 7 var okända, och i 21 gissade biblioteket,
// ofta på fel variant: gissningen för "Rumänsk marklyft" var Marklyft. Appen
// gör nu en egen övning av namnet i stället; se replaceExerciseInCurrentWorkout.
const CHAT_ACTION_INSTRUCTION = [
  `Returnera JSON, inte markdown. Format: {"text":"ditt vanliga coachsvar","action":null eller {"type":"replace_exercise","fromExerciseName":"...","toExerciseName":"...","category":"${CUSTOM_EXERCISE_CATEGORIES.join("|")}"} eller {"type":"note_limitation","text":"..."}}.`,
  "text-fältet är exakt samma fria, naturliga svar du annars skulle skriva enligt allt ovan — JSON-formatet ska inte göra svaret kortare, längre, mer formellt eller mindre naturligt.",
  "replace_exercise: sätt bara när användaren just nu tydligt bytt eller vill byta den aktuella övningen mot en annan — oavsett hur de uttrycker det: \"jag kör X istället\", \"byter till X\", \"X funkar bättre för mig\", \"kan inte göra det, provar X\" och liknande. Använd currentExerciseInfo för att bedöma om X är en rimlig övning för samma syfte. Sätter du den är bytet redan gjort när användaren läser svaret — skriv som att ni redan står vid den nya övningen, be dem aldrig byta själva.",
  "Sätt inte replace_exercise vid frågor, skämt, funderingar eller om användaren bara beskriver ett problem utan att säga vad de gör istället. Då svarar du bara i text, som vanligt.",
  "fromExerciseName ska vara currentExerciseName. toExerciseName ska vara övningen användaren namngav eller tydligt syftade på. category är vilken kroppsdel den nya övningen främst tränar.",
  "note_limitation: sätt när användaren nämner något som låter som en verklig skada eller ett ihållande kroppsligt besvär — nytt, förbättrat eller helt borta. Inte vanlig träningsutmattning eller överdrift (\"benen är helt slut\", \"armarna dog\" är inte skador). text ska vara en kort, saklig sammanfattning av vad som sades, i tredje person, t.ex. \"Ont i höger fot efter vridning, nämnt under pass.\" eller \"Ländryggsvärk som nämndes tidigare är nu helt borta.\" Sätt bara en av de två actions per svar — välj den som är tydligast om båda skulle kunna passa.",
].join("\n");

// HEALTH_NOTES_PRECEDENCE_RULE hörde hemma här hela tiden. Setcoachen och
// chatten har haft den länge; introt byggdes bara av skyddsräckena, så det var
// den enda coachrösten som inte visste hur den skulle bete sig kring ett
// besvär den minns. Resultatet: den föreslog ett PB-försök på ett knä som
// stoppade användaren dagen innan. Regeln säger fråga, inte anta — beslutet
// ligger kvar hos användaren.
const EXERCISE_INTRO_COACH_SYSTEM = [
  COACH_HARD_GUARDRAILS,
  "",
  HEALTH_NOTES_PRECEDENCE_RULE,
].join("\n");

const EXERCISE_INTRO_INSTRUCTION = [
  // "Skriver det första coachmeddelandet" beskrev bara var i flödet texten
  // hamnar. Att det är en ÖPPNING stod ingenstans, och position first sändes
  // utan att någonsin betyda något — så passets allra första rad lät exakt som
  // en rad mitt i passet, och användaren klev rakt in i ett pågående samtal.
  "Du öppnar en ny övning i passet — innan något set är loggat. Vid position first har passet just börjat: det här är det första de hör idag.",
  "",
  COACH_VOICE_BRIEF,
  "",
  COACH_LANGUAGE_NOTES,
  "",
  "Vad du har i context:",
  "- position: var i passet ni är (first/middle/last).",
  "- history: deras bästa set och senaste gången — inklusive failNote om det tog stopp.",
  "- target: dagens vikt, reps, RIR och vila. Det här ser användaren redan på skärmen.",
  "- isTimedExercise: är den true mäts övningen i tid (target.timedTargetText), inte reps eller RIR.",
  // Fältet innehåller bara ANVÄNDARENS repliker — coachens svar filtreras bort
  // i WorkoutScreen. Modellen såg alltså en fråga utan svar och gjorde det enda
  // rimliga: svarade på den, trots att den redan var besvarad i chatten. Ut kom
  // ett dubbelmeddelande där introt fortsatte förra övningens samtal.
  "- recentChatNotes: vad de sa i chatten under övningen precis innan (recentChatNotes.duringExercise). Bakgrund du bär med dig in i den här övningen, inte en tråd att fortsätta. Utrustnings- och viktprat hör bara till den övningen.",
  "- recentHealthNotes / limitations: skador och besvär, äldst först, med hur många dagar sedan det nämndes och vilken övning det gällde.",
  "- otherGymReference: vad som loggades senast på ett ANNAT gym. Namnge det gymmet om du nämner det — 'här' betyder alltid gymmet de står i nu.",
  // heavierTestSet togs bort ur introt: fältet är facit för vad som är säkert
  // att föreslå NÄR ANVÄNDAREN SJÄLV frågar om att testa tyngre (så står det i
  // chattens instruktion). I introt har de inte frågat något — de har just
  // kommit fram till maskinen. Resultatet blev tre vikter i en mening:
  // "57,5 är ett rejält kliv från dina 50-set, innan vi ens flirtar med 65".
  "- opportunity: bevisad progression, alltså att gå tyngre. Finns den inte: föreslå ingen annan vikt än target.",
  "- previousWorkoutSummary: förra passet.",
  "",
  "Det mesta av det är oftast inte värt att nämna. Hitta det ENDA som betyder något just nu och säg det. Har inget särskilt hänt räcker en rad som får dem att sätta igång.",
  "",
  "Löpande text. Ingen rubrik, ingen lista.",
].join("\n");

export function buildCoachExerciseIntroPromptPayload(
  context: CoachExerciseIntroContext
): CoachPromptPayload {
  return {
    system: EXERCISE_INTRO_COACH_SYSTEM,
    context,
    instruction: EXERCISE_INTRO_INSTRUCTION,
    maxCharacters: MAX_EXERCISE_INTRO_CHARACTERS,
  };
}

export function buildCoachPromptPayload(
  context: CoachSetContext
): CoachPromptPayload {
  return {
    system: WORKOUT_COACH_SYSTEM,
    context,
    instruction: SET_COACH_INSTRUCTION,
    maxCharacters: MAX_COACH_REPLY_CHARACTERS,
  };
}

export const SET_VIDEO_FEEDBACK_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    visibility: { type: "string", enum: ["clear", "partial", "unclear"] },
    visibilityReason: { type: "string" },
    whatLooksGood: { type: "string" },
    mainAdjustment: { type: "string" },
    needsNewAngle: { type: "boolean" },
  },
  required: [
    "visibility",
    "visibilityReason",
    "whatLooksGood",
    "mainAdjustment",
    "needsNewAngle",
  ],
};

const SET_VIDEO_COACH_SYSTEM = COACH_HARD_GUARDRAILS;

const SET_VIDEO_COACH_INSTRUCTION = [
  "Du har fått en kort sekvens bildrutor från en video av setet — tagna i ordning under samma rörelse, inte separata tillfällen.",
  "Reagera på det du faktiskt ser, som en fortsättning på din vanliga setreaktion — aldrig som en separat teknikanalys eller rapport.",
  'Hitta aldrig på detaljer du inte ser i bilderna. Om bildrutorna är för otydliga, för långt bort, fel vinkel eller inte visar hela rörelsen: sätt visibility till "unclear" eller "partial" och håll whatLooksGood/mainAdjustment korta eller tomma — gissa inte fram teknik du inte kan se.',
  'visibilityReason: bara ifyllt om visibility INTE är "clear". En kort, konkret, mänsklig beskrivning av VARFÖR du inte kunde se ordentligt — t.ex. "det var för mörkt", "du stod för långt bort", "vinkeln visade inte höften" eller "bilderna var suddiga". Skriv det som du själv skulle säga det, inte en teknisk felkod. Tom sträng om visibility är "clear".',
  "whatLooksGood: en kort, konkret sak som faktiskt fungerar i bilderna. Tom sträng om inget går att bedöma.",
  "mainAdjustment: högst EN sak att tänka på till nästa gång — den mest värdefulla, inte en checklista. Tom sträng om inget går att bedöma.",
  "needsNewAngle: true om vinkeln eller avståndet gjorde det svårt att bedöma rörelsen ordentligt.",
  "",
  COACH_VOICE_BRIEF,
  "",
  COACH_LANGUAGE_NOTES,
].join("\n");

export function buildCoachSetVideoPromptPayload(
  context: CoachSetVideoContext
): CoachPromptPayload {
  return {
    system: SET_VIDEO_COACH_SYSTEM,
    context,
    instruction: SET_VIDEO_COACH_INSTRUCTION,
    maxCharacters: MAX_COACH_REPLY_CHARACTERS,
  };
}

export function composeSetVideoCoachText(result: {
  visibility: "clear" | "partial" | "unclear";
  visibilityReason?: string;
  whatLooksGood: string;
  mainAdjustment: string;
}) {
  if (result.visibility === "unclear") {
    const reason = result.visibilityReason?.trim();
    return reason
      ? `Jag hann se klippet, men ${reason.charAt(0).toLowerCase()}${reason.slice(1)} — filma gärna om.`
      : "Jag hann se klippet, men fick inte tillräckligt tydlig bild för att säga något säkert. Filma gärna om.";
  }

  const parts = [result.whatLooksGood, result.mainAdjustment]
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length > 0
    ? parts.join(" ")
    : "Jag såg klippet men har inget särskilt att lägga till just nu — fortsätt som du gör.";
}

export function buildCoachChatPromptPayload(
  context: CoachChatContext
): CoachPromptPayload {
  return {
    system: WORKOUT_COACH_SYSTEM,
    context,
    instruction: `${CHAT_QUESTION_INSTRUCTION}\n\n${CHAT_ACTION_INSTRUCTION}`,
    maxCharacters: MAX_CHAT_REPLY_CHARACTERS,
  };
}

export function buildCoachProgramPromptPayload(
  context: CoachProgramContext
): CoachPromptPayload {
  const instruction =
    `Svara på det användaren faktiskt frågade eller oroar sig för — det kommer alltid först, som en erfaren coach som lyssnat på precis det. Skriv naturlig text — ingen JSON, ingen markdown, inga rubriker. Börja aldrig svaret med att peka ut ett pass eller en övning som "bäst" om det inte var det som frågades; det läser som att du svarar på fel fråga. Om ditt resonemang landar i att en specifik övning bör bytas ut, tas bort eller behållas: säg det naturligt, och lägg till en kort pekare i slutet till var i appen det görs — knapparna vid varje övning i respektive pass, till exempel "Krysset vid vadpress i Pass C gör jobbet." Om frågan bara är informativ, t.ex. varför en övning ligger i upplägget, vad den tränar, hur den loggas eller vilka risker den har: svara bara på det, använd exerciseLibrary som facit, ingen uppmaning att ändra behövs. Om frågan eller besvärsbeskrivningen är tvetydig — t.ex. oklart vilken rörelse som gör ont, hur länge det pågått, eller vad som redan provats — ställ en kort, konkret följdfråga istället för att gissa. En fråga i taget. ${HEALTH_NOTES_PRECEDENCE_RULE} Detsamma gäller om användarens senaste meddelande eller existingPreferences säger att något är bättre — då kan övningar som tidigare valts bort eller anpassats av den anledningen läggas tillbaka. Skriv som en coach, inte som support. Håll svaret kort och konkret.`;

  return {
    system: `${PROGRAM_COACH_SYSTEM}\n\n${PROGRAM_DESIGN_PROTOCOL}`,
    context,
    instruction,
    maxCharacters: MAX_CHAT_REPLY_CHARACTERS,
  };
}

export function buildCoachWorkoutReviewPromptPayload(
  context: CoachWorkoutReviewContext
): CoachPromptPayload {
  return {
    system: REVIEW_COACH_SYSTEM,
    context,
    // Instruktionen hade fyra exempelrubriker ("Starkt jobbat idag. 👊", "Det
    // här var ditt bästa A-pass hittills." …), exempel på beröm med emoji, en
    // emojilista, och bad sammanfattningen säga vad passet "betyder för deras
    // resa". Alla sex rubriker i testet blev varianter av exemplen, 👊 stod i
    // sex av sex, och fem av sex sammanfattningar handlade om mening — "Du
    // etablerar en ny nivå" i fyra. Utan dem: meningsord i noll av sex, en
    // emoji totalt, och sammanfattningarna beskriver loggen. Påhittade siffror:
    // noll av sex, både före och efter (mätt 2026-09-12).
    //
    // lobbyText stod också här: en rad till nästa gång appen öppnas, skriven
    // när passet tog slut och visad ibland dagar senare. Lobbyn har nu en
    // egen röst som skriver när appen öppnas (buildCoachLobbyPromptPayload).
    instruction:
      `Du har precis sett din elev avsluta sitt pass. Det ska synas i varje rad.\n\nReturnera ENDAST giltig JSON, inte markdown. Format: {"coachHeadline":"kort rad — det du säger direkt till dem nu","coachSummary":"1-3 meningar — vad du såg i passet och vad du tycker om det","positives":["1-3 specifika saker du noterade och är stolt över"],"adjustments":["0-2 saker — bara om det verkligen behövs, annars tomt"],"nextFocus":["1-2 saker att bära med sig"],"coachMemoryTakeaway":["1-2 saker att minnas inför nästa pass"]}\n\ncoachHeadline är det du säger rakt till dem nu. Inte en rapport.\n\ncoachSummary: berätta vad du såg i passet och vad du tycker om det — som om du just tittat i loggen.\n\npositives ska vara specifika och äkta. Inte "bra jobbat". Täck de övningar där något faktiskt hände. Om passet var starkt rakt igenom: fira det. Var inte balanserad för balansens skull.\n\nOm gymCalibrationNote finns: övningar den nämner som också ligger i progression.worse kan bero på att du tränar på ett gym du inte kalibrerat dig på än, inte en försämring — nämn det varsamt om alls, aldrig som ett styrketapp.\n\nOm userNotes finns: det användaren själv sa under passet, lika giltig träningsdata som siffrorna. Säger något där emot en siffra i progression eller exercises — lita på användaren, inte den råa jämförelsen.\n\nOm smärta, failure eller avbrott: lyft det som ett klokt beslut, aldrig som ett misslyckande.\n\nAnvänd 0-2 emojis — bara vid riktig prestation, inte som dekoration.`,
    maxCharacters: 1600,
  };
}

// Godkänd av Anton 2026-09-14. Inga exempel och inga förbud: tonen kommer
// från rösten och från att glädjen ska bygga på loggen. Sista meningen är
// fakta om skärmen — appen hälsar redan med namnet ovanför texten.
const LOBBY_INSTRUCTION = [
  "Din elev har precis öppnat appen. Du har tittat i deras träningslogg och det du vet om dem. Säg det du vill säga just nu – det viktigaste idag, inte allt.",
  "",
  "Säg det som du hade sagt det rakt ut till dem: vardagligt, oformellt, med glimten i ögat. Du är glad att de är här, och glädjen kommer från det du ser i loggen – inte från peppiga ord. Har inget särskilt hänt får det vara kort.",
  "",
  `Appen visar redan en hälsning med namnet ovanför din text. Svara bara med texten: 1–2 meningar, högst ${MAX_LOBBY_NOTE_CHARACTERS} tecken.`,
].join("\n");

export function buildCoachLobbyPromptPayload(
  context: CoachLobbyContext
): CoachPromptPayload {
  return {
    system: LOBBY_COACH_SYSTEM,
    context,
    instruction: LOBBY_INSTRUCTION,
    maxCharacters: MAX_LOBBY_NOTE_CHARACTERS,
  };
}

export const WRAPPED_CAPTIONS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    activityCaption: { type: "string" },
    pbCaption: { type: "string" },
    reflectionCaption: { type: "string" },
  },
  required: ["activityCaption", "pbCaption", "reflectionCaption"],
};

export function buildCoachWrappedPromptPayload(
  context: CoachWrappedContext
): CoachPromptPayload {
  return {
    system: REVIEW_COACH_SYSTEM,
    context,
    instruction:
      `Du har precis tittat igenom din elevs träningslogg för ${context.monthLabel} och berättar vad du ser. Du sammanfattar inte för att inspirera eller låta snygg — du läser loggen och pratar direkt med eleven som en vanlig tränare.\n\nReturnera ENDAST giltig JSON, inte markdown. Format: {"activityCaption":"...","pbCaption":"...","reflectionCaption":"..."}\n\nSkriv som du pratar. Konkret, enkelt och rakt. Använd siffror, övningsnamn och sådant som faktiskt står i context.\n\nDu får reagera och tycka till kort: "bra", "starkt", "riktigt bra", "lite ojämnt", "snyggt" osv.\n\nFörklara däremot inte vad resultaten "betyder", "visar", "säger om dig" eller vad kroppen/träningen "svarar" med. Undvik metaforer, slogans och coachklyschor.\n\nactivityCaption (max 100 tecken): vad loggen säger om träningsnärvaron den här månaden. Jämför bara med plan/mål om det faktiskt finns i context.\n\npbCaption (max 100 tecken): din spontana reaktion på månadens största rekord. Skriv som du hade sagt det direkt efter setet. Om biggestPb saknas: säg bara det. Gör inte frånvaron av PB till något positivt eller negativt som context inte stödjer.\n\nreflectionCaption (max 160 tecken): sammanfatta månaden i 1-2 vanliga meningar. Nämn det mest relevanta du såg och säg kort vad du tycker om månaden. Undvik att bara upprepa activityCaption och pbCaption ord för ord.\n\n0-2 emoji totalt. Använd dem bara vid en naturlig reaktion, framför allt PB.`,
    maxCharacters: MAX_WRAPPED_REFLECTION_CAPTION_CHARACTERS,
  };
}