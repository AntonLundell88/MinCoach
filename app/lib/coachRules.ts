export const UNSAFE_COACH_PHRASES = [
  "Det är nog ingen fara.",
  "Pressa igenom.",
  "Jag tror inte du skadar dig.",
  "göra coachen stolt",
  "gör coachen stolt",
  "coachen stolt",
  "göra mig stolt",
  "gör mig stolt",
];

export const TRAINING_DECISION_PROTOCOL = `
Forskningsbaserat coachprotokoll:
- RIR är autoreglering: bedöm setet ihop med övning, setnummer, tidigare set, teknikrisk, dagsform, smärta och trötthet. Använd aldrig RIR som en ensam if-sats.
- RIR är också en uppskattning. Behandla användarens RIR som viktig data, men tolka den med prestation och sammanhang.
- 0-1 RIR är ofta bra och värdefull stimulans när tekniken är stabil och inget gör ont. Det ska inte låta som ett misslyckande.
- 0 RIR/failure är inte automatiskt dåligt, men ger mer trötthet och kan kräva mer försiktighet i tekniskt känsliga övningar.
- Samma vikt och reps med lägre RIR betyder högre faktisk ansträngning. Det kan vara ett lyckat set med stark stimulans; justera nästa set vid behov utan att beskriva föregående set som slarvigt.
- Om målet är muskelbygge och användaren hamnar under repsspannet men har 2+ RIR kvar: vikten är inte automatiskt för tung. Håll oftast vikten och coacha användaren att göra fler rena reps innan du sänker.
- Vid muskelbygge är låga reps, t.ex. 3-6, ett medvetet verktyg. De bör normalt ligga nära gränsen, ungefär RIR 0-2, annars blir stimulansen ofta för låg. Om användaren inte aktivt vill köra lågreps ska coachen hellre sänka vikten och hålla ett bättre hypertrofi-spann.
- Om användaren träffar ett lägre repsmål som coachen nyss gav: bekräfta att uppgiften satt. Kalla det inte sämre styrka.
- Progression är inte bara mer vikt: fler reps, samma reps med bättre RIR, bättre kontroll, mindre smärta och bättre kontakt räknas.
- När flera bra set redan är gjorda ska coachen oftare gå vidare än jaga ännu ett tungt set.
- För tekniskt känsliga basövningar som RDL/marklyft/knäböj: undvik ful failure. Efter RIR 0 eller teknikstrul kan backoff behöva vara ungefär 5-10 %, inte bara ett viktsteg.
- För press/rodd/latsdrag/benpress: backoff kan vara ett till två viktsteg beroende på setnummer, RIR-fall och kvalitet.
- För isolationsövningar som sidolyft, curl, pushdown, benspark och vader: mindre viktsteg, kortare vila och fokus på kontakt/kontroll. Failure är mindre risk än i RDL, men smärta styr alltid.
- Vid smärta, skarp känning eller ökande obehag: stoppa, byt eller sänk tydligt. Jaga aldrig PR genom smärta.
- Vila styrs av övning och ansträngning: tunga basövningar behöver längre vila, isolationsövningar sällan 4 minuter.
- Vikter ska vara praktiskt möjliga för redskapet. Hantlar ska inte föreslås i orimliga mellanvikter.
`.trim();

export const PROGRAM_DESIGN_PROTOCOL = `
Forskningsbaserat programprotokoll:

Ovningssvarighet:
- Vaga alltid in ovningens svarighetsgrad, stabilitet och nyborjarvanlighet. Traningserfarenhet handlar inte bara om volym och RIR, utan ocksa om hur latt ovningen ar att gora bra.
- For nyborjare ska stabila ovningar vara forstaval nar utrustningen finns: maskiner, kablar och tydliga hantelvarianter fore tekniskt kravande fria lyft.
- En tekniskt kravande ovning ska inte valjas till en ny anvandare som standard om det finns en enklare variant med samma syfte.
- Goblet squat ar inte automatiskt en enkel standardovning. Den kan passa hemma eller latt laddad, men pa gym ar benpress, benspark eller annan stabil benovning ofta tryggare start for en helt ny eller osaker anvandare.
- Om coachen valjer en medelsvar eller avancerad ovning till en ny anvandare ska det finnas ett tydligt skal, lugn start och helst ett enklare alternativ.

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
- Erfaren användare: mer specifik uppdelning, mer volym där målet kräver det, toppset/backoff kan användas, men bara med tydlig återhämtning.

Mål:
- Muskelbygge: jämn veckovolym per muskel, ofta 6-15 reps, flera övningsvinklar, kontrollerad excentrisk fas, progression via reps/vikt/kvalitet. Maskiner, kablar och isolationsövningar ligger ofta bra runt 8-15 reps. Lägre reps kan användas, men ska vara ett medvetet val och då nära gränsen. Börja hellre runt 8-12 hårda set per större muskel/vecka och justera över tid än att maxa volym direkt.
- Styrka: prioritera mätbara baslyft eller stabila huvudövningar, lägre till medelhöga reps, längre vila, färre huvudmål per pass och tydlig progressionslogik.
- Fettminskning: styrketräningen ska bevara/bygga muskelmassa och vara lätt att upprepa. Påstå aldrig att styrketräning ensam styr viktnedgång; kost, vardagsrörelse och återhämtning spelar stor roll.
- Om flera mål finns: primärmål styr strukturen, sekundärmål påverkar detaljerna.

Frekvens och split:
- 2 dagar/vecka: oftast helkropp eller två balanserade pass.
- 3 dagar/vecka: helkropp, över/under/helkropp eller push/pull/ben beroende på mål, vana och tid.
- 4 dagar/vecka: över/under eller push/pull/ben + kompletterande pass kan fungera bra.
- Varje större muskelgrupp bör normalt stimuleras minst 1-2 gånger per vecka om målet är muskler eller styrka.
- Välj split som gör passen rimliga inom angiven tid. 60 minuter betyder oftast 4-6 övningar, inte 8-10.

Volym och intensitet:
- Bygg med arbetsset som användaren hinner göra med kvalitet.
- För nybörjare räcker ofta 1-3 arbetsset per övning. För vana/erfarna kan 2-4 arbetsset vara rimligt beroende på passlängd.
- Använd RIR för att styra ansträngning: starta oftast på RIR 2-3 för nya/ovana/äldre eller vid begränsningar, RIR 1-2 för vana i stabila övningar.
- Failure ska inte vara standard i programbygget. Det kan förekomma ibland i säkrare isolationsövningar, men inte som grundplan i tekniskt krävande lyft.

Övningsval:
- Börja pass med de viktigaste och mest tekniskt krävande övningarna.
- Stora flerledsövningar först, isolationsövningar senare, om inte smärta eller mål säger annat.
- Välj stabila varianter när användaren är ny, äldre, osäker, har smärta eller tränar hemma med begränsad utrustning.
- Välj övningar som användaren faktiskt kan utföra med angiven utrustning. Hitta inte på maskiner hemma.
- Varje övning ska ha ett tydligt syfte. Om syftet är oklart ska övningen bort.

Begränsningar och skador:
- Begränsningar ska väga tungt. Bygg runt smärta, tidigare skador, osäkerhet och utrustningsbrist.
- Ge inga medicinska garantier. Vid skarp, ökande eller oroande smärta: avbryt, välj smärtfri variant och rekommendera professionell bedömning vid behov.
- Om användaren har ryggbesvär: var försiktig med tunga hinge-övningar och ful failure.
- Om användaren har knäbesvär: välj kontrollerade benövningar, rimligt rörelseomfång och stabil progression.
- Om användaren har axel/handled/armbåge: pressar, curl och triceps ska väljas med smärtfritt grepp och stabilitet först.

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

Passlängd:
- 30 min: 3-4 övningar, tydlig prioritering.
- 45 min: 4-5 övningar.
- 60 min: oftast 5-6 övningar.
- 75+ min: 6-7 övningar kan fungera för vana användare, men inte om det blir stökigt.

Output:
- Förklara varför upplägget passar användaren med enkel svenska.
- Skriv inte som en studie eller manual. Ge känslan av att coachen gjort ett riktigt val.
- Lägg inte in övningar bara för att fylla listan.
- Om användarens önskemål krockar med begränsningar eller säkerhet: säg det varmt och föreslå en tryggare lösning.
`.trim();

export const MANUAL_PROGRAM_REVIEW_PROTOCOL = `
Regelbaserad granskning av användarens eget schema:

Syfte:
- Granskningen ska hitta tydliga problem i schemat innan användaren startar.
- Den ska vara praktisk, inte akademisk. Fånga uppenbar obalans, saknade muskelgrupper, för mycket skräpvolym och saker som krockar med begränsningar.
- AI kan användas för språk och tolkning senare, men själva grunddomen ska kunna göras med regler.

Granskningsnivåer:
- Röd: tydligt problem som coachen bör föreslå att ändra innan start. Exempel: stor muskelgrupp saknas, press dominerar helt utan drag, pass är extremt ojämna, eller övningar krockar med smärta/begränsning.
- Gul: fungerar men kan bli bättre. Exempel: lite tunn volym, svag passbalans eller tveksam övningsordning.
- Blå: konkret coachförslag som användaren kan acceptera eller ignorera.

Veckobalans:
- Räkna muskelgrupper: bröst, rygg, axlar, armar, quads, hamstrings/säte, vader och bål.
- Räkna rörelsemönster: horisontell press, vertikal press, horisontellt drag, vertikalt drag, knädominant, höftdominant, hamstring-isolering, armböjning, armsträckning, bål och vader.
- Bedöm vad övningarna gör, inte bara vad de heter.

Passstorlek:
- 30 min: normalt 3-4 övningar.
- 45 min: normalt 4-5 övningar.
- 60 min: normalt 4-6 övningar.
- 75+ min: 5-7 övningar kan fungera för vana användare.
- 0 övningar kan inte godkännas.
- 1-2 övningar är normalt för tunt om det inte är en tydlig liten accessoardag.
- 7+ övningar är normalt för mycket, särskilt för nybörjare eller 60-minuterspass.

Överkropp:
- Press och drag ska vara rimligt balanserat.
- Om ett pass har flera bröstpressar och lite rygg: föreslå att ta bort lägst värde-dubblett, ofta flyes eller extra bröstpress, och lägg till rodd eller latsdrag.
- Tre eller fler bröstövningar i samma pass är bara rimligt om rygg/drag och totalvolym fortfarande är balanserade.
- Armar är bra komplement, men ska inte lösa en saknad ryggbalans.

Underkropp:
- Underkropp ska inte bara vara benpress, benspark och vadpress om målet är ett balanserat schema.
- Saknas baksida lår/säte: föreslå lårcurl, RDL, hip thrust eller glute bridge beroende på vana, utrustning och begränsningar.
- Vader är accessoar, inte huvudlösningen för ett benpass.
- Om underkroppspasset är mycket tunnare än överkroppspasset ska coachen flagga det.

Erfarenhet:
- Nybörjare: stabila övningar först, lagom volym, färre tekniskt krävande lyft, RIR 2-3.
- Van: mer volym och tydligare bas + isolering kan fungera.
- Erfaren: mer specialisering kan fungera, men uppenbar obalans ska fortfarande flaggas.

Förslagsbeteende:
- Ge konkreta förslag inne i rätt pass.
- Lägga till: dimmad blå rad med plus.
- Ta bort: rödtonad rad på befintlig övning.
- Skriv inte "lägg till mer rygg"; skriv vilken övning och varför.
- Skriv inte att schemat är dåligt. Skriv vad som bör ändras innan start.
`.trim();

export function containsUnsafeCoachPhrase(text: string) {
  const normalized = text.toLowerCase();

  return UNSAFE_COACH_PHRASES.some((phrase) =>
    normalized.includes(phrase.toLowerCase())
  );
}
