/**
 * Bara MinCoachs egna ställningstaganden. Blocket var 15 punkter och 2181
 * tecken "forskningsbaserat coachprotokoll" — allmän träningslära som
 * modellen redan kan, plus två punkter som numera räknas i kod (vila via
 * getRestTargetRange, viktsteg via getExerciseWeightStep) och tre
 * omformuleringar av samma sak som COACH_VOICE_BRIEF redan säger.
 *
 * Rubriken var en del av problemet: "protokoll" får modellen att skriva som
 * en kliniker, vilket var precis det register vi ville bort från.
 *
 * Kvar står bara det en annan coach hade gjort annorlunda — alltså val, inte
 * fakta. Övningsspecifika fakta bär biblioteket i progressionRule och caution.
 */
export const TRAINING_DECISION_PROTOCOL = `
Så här coachar MinCoach:
- Under repsspannet men 2+ RIR kvar: vikten är sällan för tung. Håll den och be om fler rena reps innan du sänker.
- Jaga aldrig PB genom smärta.
`.trim();

/**
 * Skickas till övningssteget i programbygget — ETT anrop per pass, alltså
 * tre till sex gånger per bygge. Allt som ligger här kostar den mängden.
 *
 * Borttaget som direkt fel:
 * - Rubriken "Forskningsbaserat programprotokoll". Se kommentaren ovanför
 *   TRAINING_DECISION_PROTOCOL: "protokoll" får modellen att skriva som en
 *   kliniker. Samma lärdom gällde här hela tiden.
 * - "Passlängd". Sa "60 min: oftast 5-6 övningar" medan getPassExerciseTarget
 *   räknar fram 3-5 och valideringen underkänner 6. Alla fyra intervall var
 *   oense med koden — prompten pekade mot ett tal vi själva slänger.
 * - "Frekvens och split". Splitten är redan bestämd i steg 1; det här steget
 *   får passets fokus färdigt och väljer bara övningar i det.
 * - "Output". Beskrev hur prosan skulle skrivas. Steget returnerar JSON utan
 *   ett enda textfält.
 * - Fjärde punkten under Övningssvårighet, som stod ordagrant i
 *   PROGRAM_BUILD_SYSTEM_PROMPT också — där i en bättre version som namnger
 *   de faktiska fälten (beginnerFit, difficulty, stability).
 * - Två dubbletter i slutet: "fyll inte listan" (samma som "om syftet är
 *   oklart ska övningen bort") och "önskemål krockar med säkerhet" (samma som
 *   "om preferenser och säkerhet krockar vinner säkerheten").
 *
 * Första avsnittet saknade alla svenska diakriter ("Vaga alltid in ovningens
 * svarighetsgrad"). Vi matade modellen bruten svenska och bad den skriva
 * korrekt — och den ekar det den får.
 *
 * Borttaget i en andra runda, som dubbletter av en BÄTTRE formulering:
 * PROGRAM_BUILD_SYSTEM_PROMPT bäddar in hela den här konstanten och upprepar
 * sedan flera av dess regler i fältform. Övningssteget gör samma sak. Den
 * abstrakta versionen förlorar varje gång — "prioritera beginnerFit 'bra'"
 * är körbart, "stabila övningar ska vara förstaval" är en åsikt.
 * - Hela "Övningssvårighet". Alla tre punkter finns som fältregler i både
 *   byggprompten (difficulty/beginnerFit/stability) och övningssteget.
 * - "Välj övningar som användaren faktiskt kan utföra med angiven utrustning.
 *   Hitta inte på maskiner hemma." Poolen är redan filtrerad på plats och
 *   utrustning, båda prompterna säger "välj ENDAST från availableExercises",
 *   och normalizeExercise slänger allt annat i kod. Fyra lager, samma regel.
 * - "Varje övning ska ha ett tydligt syfte" stod ordagrant i byggprompten
 *   också. Kvar står bara den actionbara halvan.
 *
 * TREDJE RUNDAN — allmän träningslära, MÄTT och inte klippt på känsla.
 * Åtta profiler, två varv var, före och efter. Borta: Kön ("utgå inte från
 * stereotyper"), Ålder ("styrketräning är värdefullt högt upp i ålder"), Mål
 * ("muskelbygge: ofta 6-15 reps") och Volym. Sju av åtta profiler blev
 * oförändrade eller likvärdiga.
 *
 * Den åttonde gick sönder: van användare med "ont i höger axel vid press över
 * huvudet". Sex körningar av varje version:
 *
 *   före kapningen:  hantelpress 6/6, face pull 6/6
 *   efter kapningen: hantelpress 0/6, face pull 0/6
 *                    (bänkpress och triceps pushdown i stället)
 *
 * Ingen version valde militärpress, så själva begränsningen respekterades —
 * det var VARIANTVALET som blev slarvigare. Tre rader köpte tillbaka det:
 * "har ont någonstans" i stabila-varianter-raden, RIR-intervallen (utan dem
 * blev "RIR 1-2" till "RIR 2" på flera ställen), och "Gör en led ont". Med
 * dem: hantelpress 5/6, face pull 6/6.
 *
 * Bänkpress och Hantelpress är identiska på difficulty, beginnerFit och
 * stability — men INTE på equipment ("skivstång" mot "hantlar") eller
 * equipmentTags (["barbell",...] mot ["dumbbells",...]), och båda fälten
 * skickas till övningssteget. Datan räcker alltså.
 *
 * Det som saknades var kopplingen, inte informationen: att en öm led mår
 * bättre av varianten som låter den röra sig fritt. Därför är "Gör en led
 * ont" en princip applicerad på befintlig data, inte ett plåster för ett
 * fält som fattas. Något nytt fält i exercises.ts behövs inte — och hade
 * fallit på femproblemstestet ändå.
 */
export const PROGRAM_DESIGN_PROTOCOL = `
Så här bygger MinCoach program:
- Ett upplägg som användaren faktiskt genomför slår ett "optimalt" som blir för krångligt. Undvik onödig variation.
- Börja passet med de viktigaste och mest tekniskt krävande övningarna.
- Om syftet med en övning är oklart ska den bort.
- Failure är inte standard i programbygget. Det kan förekomma i säkrare isolationsövningar, aldrig som grundplan i tekniskt krävande lyft.
- Välj stabila varianter när användaren är ny, äldre, osäker eller har ont någonstans.
- Startpunkten ska vara mer konservativ när träningsvana, smärta eller begränsningar är oklara: RIR 2-3 för nya, ovana, äldre eller vid begränsningar, RIR 1-2 för vana i stabila övningar.
- Begränsningar väger tungt: bygg runt smärta, tidigare skador, osäkerhet och utrustningsbrist. Ge inga medicinska garantier — rekommendera professionell bedömning vid behov.
- Gör en led ont: välj varianten som låter den hitta sin egen bana framför den som låser banan, och ta med något som stärker runt besväret.
- Preferenser är en stark mjuk signal. Användaren ska känna att programmet är byggt för vad hen gillar att göra. Krockar de med säkerheten vinner säkerheten; krockar de med utrustningen vinner utrustningen.
- Om utrustningen är oklar: välj enklare och fråga hellre än anta.
- Om flera mål finns: primärmålet styr strukturen, sekundärmålet detaljerna.
- Påstå aldrig att styrketräning ensam styr viktnedgång.
`.trim();
