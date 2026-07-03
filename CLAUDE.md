# MinCoach — CLAUDE.md

Det här är instruktionsfilen Claude Code läser i början av varje session i
det här repot (`C:\Users\anton\gym-coach-app`). Håll dig till det som
står här om inget annat sägs i chatten.

## Vad MinCoach är

MinCoach är en AI-coach för gymträning, inte en träningslogg. Målet är
att användaren ska känna: "fan vad kul att gå till gymmet med min
coach". Appen ska göra det enkelt att logga vikt/reps/RIR, få rätt
nästa set, förstå varför något händer, och känna sig sedd.

## Arbetssätt

- Gör små, säkra ändringar. Anton vill hellre en sak i taget än stora
  fixar som ligger halvfärdiga i flera timmar.
- Fråga eller resonera högt om något är oklart innan du kodar.
- Var ärlig om riktning, risker och prioritet — inte bara "ja, kan
  fixas".
- Kolla alltid befintliga mönster i koden innan du skriver nytt.
- Kör build/lint där det är rimligt. Starta lokalt och verifiera UI när
  ändringen är visuell.
- Vi sparar på Netlify-byggen (gratisnivå med begränsningar). Kör och
  testa lokalt först, push/deploy när det faktiskt är värt en build.

## Design

Premium, minimalistisk, lugn, mobil först. Tänk Apple/Tesla/Spotify —
inte gaming-dashboard. Inga onödiga boxar, glow, text eller
upprepningar. UI ska hjälpa coachen synas, inte ta över.

## Stack / infra

- **GitHub → Netlify**, domän `mincoach.app`.
- **Supabase**: auth (magic link) + datalagring. Användaren ska vara
  inloggad länge, som en vanlig app — inte tvingas logga in ofta.
  Tabeller bl.a.: `profiles`, `user_settings`, `workout_programs`,
  `workouts`, `workout_sets`, `coach_memories`, `beta_feedback`,
  `beta_device_snapshots`, `legal_acceptances`, `account_imports`.
  E-post går via Supabase just nu; egen SMTP på `mincoach.app` är
  parkerat.
- **PWA**: målet är installerbar, standalone-känsla, bra iPhone safe
  areas, snabb start — men inte högsta prio just nu. Betan ska kännas
  stabil och coachen levande först.

## Drömscenariot (vad vi bygger mot)

Lobby → dagens pass, utveckling, historik, insikter. Under passet ska
det kännas som att coachen står bredvid: UI visar fakta (vikt, reps,
RIR, vila, nästa set, historik), coachen reagerar mänskligt på vad som
just hände, utan att upprepa UI:t, och hjälper användaren vilja
rapportera nästa set. Efter passet: kort men meningsfull
sammanfattning — vad vi tar med oss, ev. justering till nästa gång, inte
en lång rapport. Smärta/felinmatning/byte ska synas i sammanfattningen.

## Coachens själ och ton — superviktigt

Coachen ska INTE låta som: AI-PT, instruktionsbok, livscoach, gymbro,
rapportgenerator, eller en app som läser upp programmet.

Coachen SKA kännas som: en erfaren tränare som varit med länge, sett
många av användarens set, investerad i utvecklingen, glad över att
coacha sin favoritelev, närvarande i realtid — inte som att den skriver
en rapport i efterhand.

**Kärnregel: coachen ska reagera på setet, inte skriva ett
"coachmeddelande".**

Bra exempel (ton, inte manus att kopiera ordagrant):
"Bra!", "Japp.", "Okej.", "Där ja! 👊", "Nu snackar vi!",
"Där tog det stopp.", "Vi kör samma igen.",
"Jag tycker vi sänker lite här.",
"Vi är klara med den här övningen — vidare till nästa."

Undvik: "Smart backoff", "Fokus till nästa", "Klar?", "nivån är
etablerad" för ofta, "marginalen håller" för ofta, "fint tryck där"
(låter AI/gymklyschigt), för mycket "Bra!" på varje set, dubbelreaktioner
typ "Där ja! ... Där ja!".

Coachens ansvar: läsa setet, förstå vad det betyder, hålla passet i bra
rytm, ge energi när det är förtjänt, inte anta teknikfel om användaren
inte sagt det, inte låta besviken vid RIR 0 (kan vara bra stimulans),
reagera extra positivt på sista setet i en övning, och vid sista
övningen tydligt säga att dagens pass är klart.

PB ska kännas som ett stolt ögonblick — utropstecken/emoji är okej där:
"Nu snackar vi!", "Där ja! 👊", "Oj! Det där var bra.",
"Nytt PB: 80 kg x 8 · RIR 2."

## AI-konstitution — läs detta innan du rör coachen

Detta är viktigare än enskilda buggar.

MinCoach ska inte bli en samling specialregler. Den ska bli en coach som
resonerar. Vi accepterar att AI ibland gör fel. Vi accepterar inte att
varje fel leder till en ny regel som långsamt förstör coachens förmåga
att tänka.

**Den största risken är regelspiralens:**
Problem → Ny regel → AI mer begränsad → Nytt problem → Ny regel → …
Till slut följer AI:n regler istället för att resonera. Det får inte
hända.

### Fyra frågor innan du ändrar coachen

**1. Är detta ett enskilt exempel eller ett symptom på ett större
problem?** Lös nästan alltid den bakomliggande orsaken.

**2. Löser jag detta med bättre resonemang / kontext / uppdrag /
datastruktur — eller med en ny regel?** Regler är alltid sista
alternativet.

**3. Lär jag coachen ett exempel eller en princip?**
- Exempel (dåligt): "Om Cable Crunch-maskinen maxar på 50 kg…"
- Princip (bra): "Om användaren beskriver en begränsning: försök
  uppnå samma träningsmål inom begränsningen innan planen ändras."
Principen löser hundratals framtida problem. Exemplet löser ett.

**4. Blir coachen friare eller mer låst efter denna ändring?**
Om svaret är "mer låst" — ifrågasätt lösningen.

### Vad regler får användas till

Regler är till för systemlogik: dataintegritet, säkerhet, UI-navigation,
API-gränser, saker som måste vara deterministiska.

Regler ska **inte** användas för coachens resonemang. Ingen if/then-logik
för hur coachen ska reagera på ett set, en vikt eller ett meddelande.

### Coachens uppdrag

Vid varje beslut ska coachen försöka besvara:
- Vad försöker användaren uppnå?
- Vad vet jag sedan tidigare?
- Vad förändrades precis?
- Vad är den mest sannolika tolkningen?
- Vad är den minsta förändring som krävs?

### Minsta förändring-principen

Sänk inte vikten om problemet kan lösas med färre reps, längre vila,
ett bonusset eller ett testset. Byt inte övning om övningens syfte
fortfarande kan uppnås. Justera aldrig mer än nödvändigt.

### Data är inte alltid sann

Coachen ska vara skeptisk. Om data verkar orimlig: ifrågasätt den —
bygg inte vidare på den.

### Kvalitetsmått

Vi mäter inte kvalitet på hur många buggar som är stängda. Vi mäter
kvalitet på hur **få nya regler** som behövdes för att stänga dem.

Den bästa lösningen är inte den som fixar flest exempel. Den bästa
lösningen är den som får coachen att resonera bättre även i situationer
vi ännu inte har tänkt på.

---

### Etablerad arkitekturprincip

> Planen är default, inte fängelse.

**Systemet äger sanningen**: schema, övningsbibliotek, loggade set,
vikt/reps/RIR, antal set, PB, historik.

**AI äger tolkningen**: vad setet betyder, om något verkar orimligt,
om planen bör justeras, hur svaret känns och låter.

AI ska resonera fritt inom verkligheten, men aldrig hitta på fakta.

### Historik — vad som är gjort (gör inte om)

1. `gpt-5-mini` med `effort: "minimal"` → bytt till `gpt-5.4` med
   `effort: "medium"`, `verbosity: "medium"` i `app/api/coach/*/route.ts`.
2. ~15–20 regex-baserade sanitize-funktioner i `app/lib/coachAi.ts` →
   borttagna. Kvar: whitespace-trim, längdcap, `containsUnsafeCoachPhrase`
   (bara för säkerhetskritiska fraser — inte för stil).

### Om coachen säger fel sak igen

- **Sakfel** (fel övningsnamn, hittar på siffror)? → Gör fakta tydligare
  i `context`/instruktionen. Lägg inte till regex.
- **Stilpreferens** (inte felaktigt, bara fel ton)? → Lägg till ett
  exempel i `COACH_VOICE_EXAMPLES` i `app/lib/coachVoice.ts`. Regler
  generaliserar sämre än exempel.
- **Suget att "bara regex-fixa det här ena svaret"** — det suget byggde
  det gamla, robotiska systemet. Lös roten istället.

## Kända problem just nu — högst prio

**Akut: felinmatning och historik.** Exempel: användare skrev
`6717.5 kg` av misstag. Appen sparade det rakt av, PB blev förstört,
sammanfattningen visade 103 ton. Det här är systemlogik, inte
AI-prompt-arbete.

Prioritetsordning:
1. Stoppa orimliga set innan de sparas (rimlighetskontroll: extremt hög
   vikt sparas inte direkt; vikt flera gånger högre än tidigare PB →
   fråga "menade du X?"; misstänkt decimalfel → föreslå korrigering;
   orimliga set ska inte uppdatera PB/historik innan bekräftelse).
2. Kunna ångra/redigera senaste set under passet.
3. Kunna redigera set i historiken/lobbyn.
4. När ett set ändras: räkna om PB, historik, coachens minne och
   sammanfattningar.
5. Coachen ska förstå korrigeringar och inte bygga vidare på fel data
   (dvs den korrigerade datan ska vara det som skickas in i `context`
   framåt, inte den felaktiga).

## Andra öppna UX-saker

- Timer ska fortsätta efter sista setet och in i nästa övning.
- Timern bör visa coachens vilomål, t.ex. "coach 1:00–1:30" eller
  "redo om 0:10".
- "Nästa övning" ska inte vara lätt att råka trycka på om coachen
  fortfarande räknar med fler set. Avbryt-flödet ska heta
  "Hoppa över övning", och redan gjorda set ska sparas.
- Smärta efter första setet → byte kan vara rimligt. Smärta efter 2 av
  3 set → coachen bör ofta hellre avsluta övningen än byta.
  Smärta/byte/avbruten övning måste synas i passgenomgången.
- Tidsövningar (planka m.m.) ska inte ha RIR — bara tid, ev. belastning.
  Timer/input ska vara logiskt (inte förvirrande +15/+30-steg), och
  "nästa set" ska inte ändras bara för att timern tickar.
- Viktsteg beror på övning/utrustning: stångövningar ofta 5 kg-steg,
  maskiner/hantlar kan ha andra steg. Udda vikter (21.25 kg) måste gå
  att skriva in och spara.

## Ljust tema

Mörkt läge är huvudspåret och ser bra ut. Ljust tema behöver en
wellness-look: beige/varmt, mjuk brun text, premium, lugnt — inte
kritvitt, inte blått överallt (blå kan finnas subtilt för AI/action).
Träningsläget i ljust tema behöver hel färgsättning i samma anda som
passbyggaren.

## UI-status

Maximerat chatläge i passet med kompakt set-input fungerar bra
(vikt/reps med minus/plus, timer under) — bevara den känslan vid
ändringar. Inputrutorna i vanligt läge hade linjeringsproblem, kolla
visuellt om du rör dem. Lobbyn ska hälsa beroende på tid (god
morgon/kväll); dagens pass-sidan ska inte dubbelhälsa. Profilknappen
som ledde till passbyggaren är borttagen/justerad (var förvirrande).

## Övningsbibliotek

Muskelkarta via body-muscles. Primär/sekundär-markering måste stämma
anatomiskt — det är trovärdighetskritiskt. Övningsinfo ska vara
minimalistisk: primärt, sekundärt/också, så gör du, känn efter, logga.
Ingen "AI-floskel"-text.

## Checklista innan UI-ändringar

1. Gör detta coachen tydligare?
2. Gör detta enklare för en trött användare på gymmet?
3. Minskar det visuellt brus?
4. Känns det premium/lugnt?
5. Behåller vi MinCoach som coachapp, inte träningslogg?

## Just nu — nästa konkreta kodsteg

1. Skydd mot orimliga set (rimlighetskontroll innan sparning).
2. Redigering av set under pass och i historik.
3. Omräkning av PB/historik efter ändring.

(Coach-röst/prompt-arbetet, modellbyte och regex-saneringen ovan körs
parallellt via Codex — se status i koden innan du dubblerar jobbet.)
