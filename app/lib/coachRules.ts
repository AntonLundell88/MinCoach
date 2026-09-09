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
 * Kvar står fortfarande mycket allmän träningslära som modellen redan kan
 * (Kön, Ålder, Mål, Volym). Den frågan är ett eget steg som ska mätas mot
 * riktiga bygg-profiler, inte klippas på känsla.
 */
export const PROGRAM_DESIGN_PROTOCOL = `
Grundprincip:
- Bygg upplägg från användarens mål, ålder, kön, träningsvana, antal dagar, passlängd, plats, utrustning, begränsningar och preferenser. Alla dessa parametrar ska väga in i beslutet.
- Programmet ska vara effektivt, repeterbart och lätt att följa i verkligheten. Ett upplägg som användaren faktiskt genomför slår ett "optimalt" upplägg som blir för krångligt.
- Prioritera säker progression, tillräcklig volym, återhämtning och tydliga övningsval. Undvik onödig variation.

Ålder:
- Högre ålder betyder inte att användaren ska tränas svagt, men startpunkten ska vara mer konservativ om träningsvana, smärta eller begränsningar är oklara.
- För äldre användare: prioritera teknik, balans mellan stora rörelser och kontrollerade maskin-/hantelvarianter, gradvis progression, längre uppvärmning och återhämtning.
- Undvik att bygga programmet runt tekniskt riskfylld failure för äldre eller ovana användare. Använd hellre RIR 2-3 i början.
- Styrketräning är värdefullt även högt upp i ålder: muskelmassa, styrka, funktion och fallprevention är relevanta mål.

Kön:
- Utgå inte från stereotyper. Kvinnor och män kan träna med samma grundprinciper: progressiv överbelastning, tillräcklig volym, bra teknik och återhämtning.
- Kön kan påverka preferenser, återhämtning, absolut styrkenivå och vissa risk-/komfortval, men ska inte styra mot "lättare" eller mindre seriös träning.
- Om kön är "vill inte säga" eller annat: bygg neutralt utifrån mål, vana, utrustning och begränsningar.

Träningsvana:
- Nybörjare: färre övningar, färre totala set, tydliga rörelsemönster, RIR 2-3, mest stabila övningar och enkel progression.
- Van användare: något mer volym, tydligare basövningar + kompletterande isolationsarbete, RIR 1-3.
- Erfaren användare: mer specifik uppdelning, mer volym där målet kräver det, ett tungt set följt av lättare set kan användas, men bara med tydlig återhämtning.

Mål:
- Muskelbygge: jämn veckovolym per muskel, ofta 6-15 reps, flera övningsvinklar, kontrollerad excentrisk fas, progression via reps/vikt/kvalitet. Maskiner, kablar och isolationsövningar ligger ofta bra runt 8-15 reps. Lägre reps kan användas, men ska vara ett medvetet val och då nära gränsen. Börja hellre runt 8-12 hårda set per större muskel/vecka och justera över tid än att maxa volym direkt.
- Styrka: prioritera mätbara baslyft eller stabila huvudövningar, lägre till medelhöga reps, längre vila, färre huvudmål per pass och tydlig progressionslogik.
- Fettminskning: styrketräningen ska bevara/bygga muskelmassa och vara lätt att upprepa. Påstå aldrig att styrketräning ensam styr viktnedgång; kost, vardagsrörelse och återhämtning spelar stor roll.
- Om flera mål finns: primärmål styr strukturen, sekundärmål påverkar detaljerna.

Volym och intensitet:
- Bygg med arbetsset som användaren hinner göra med kvalitet.
- För nybörjare räcker ofta 1-3 arbetsset per övning. För vana/erfarna kan 2-4 arbetsset vara rimligt beroende på passlängd.
- Använd RIR för att styra ansträngning: starta oftast på RIR 2-3 för nya/ovana/äldre eller vid begränsningar, RIR 1-2 för vana i stabila övningar.
- Failure ska inte vara standard i programbygget. Det kan förekomma ibland i säkrare isolationsövningar, men inte som grundplan i tekniskt krävande lyft.

Övningsval:
- Börja pass med de viktigaste och mest tekniskt krävande övningarna.
- Stora flerledsövningar först, isolationsövningar senare, om inte smärta eller mål säger annat.
- Välj stabila varianter när användaren är ny, äldre, osäker, har smärta eller tränar hemma med begränsad utrustning.
- Om syftet med en övning är oklart ska den bort.

Begränsningar och skador:
- Begränsningar ska väga tungt. Bygg runt smärta, tidigare skador, osäkerhet och utrustningsbrist.
- Ge inga medicinska garantier. Rekommendera professionell bedömning vid behov.

Utrustning och plats:
- Gym: maskiner, kablar, fria vikter och hantlar kan kombineras.
- Hemma med hantlar: bygg runt hantelpressar, roddar, goblet squat, split squat, RDL med hantlar, axlar, armar och bål.
- Hemma utan utrustning: kroppsvikt, tempo, enbensvarianter, höftlyft, armhävningsvarianter, bål och konditionsnära upplägg.
- Om utrustningen är oklar: välj enklare och fråga hellre efter mer än att anta.

Övningspreferenser:
- Preferenser är en stark mjuk signal. Användaren ska känna att programmet är byggt för vad hen faktiskt gillar att göra.
- Prioritera valda typer som fria vikter, hantlar, maskiner, kablar, kroppsvikt eller band när de passar mål, säkerhet och utrustning.
- Om användaren inte väljer kroppsvikt ska programmet inte bygga runt armhävningar, planka eller liknande om det finns rimliga alternativ.
- Om preferenser och säkerhet krockar vinner säkerheten. Förklara kort varför.
- Om preferenser och utrustning krockar vinner utrustningen. Hitta inte på redskap som inte finns.
`.trim();
