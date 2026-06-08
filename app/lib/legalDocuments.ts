export type LegalDocumentId = "terms" | "privacy" | "training-safety";

export type LegalDocument = {
  id: LegalDocumentId;
  label: string;
  title: string;
  updatedAt: string;
  intro: string;
  sections: Array<{
    title: string;
    body: string[];
  }>;
};

export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    id: "terms",
    label: "Villkor",
    title: "Användarvillkor",
    updatedAt: "2026-06-08",
    intro:
      "Det här är ett beta-underlag för MinCoach. Texten ska juristgranskas innan publik lansering, betalning eller bredare distribution.",
    sections: [
      {
        title: "Vad MinCoach är",
        body: [
          "MinCoach är en digital AI-baserad träningscoach som hjälper dig planera pass, förstå övningar och logga träning.",
          "Appen är ett träningsstöd. Den ersätter inte läkare, fysioterapeut, personlig tränare eller annan vårdpersonal.",
        ],
      },
      {
        title: "Beta",
        body: [
          "Under betan kan funktioner ändras, försvinna eller fungera annorlunda än väntat.",
          "AI-svar och träningsförslag kan bli fel. Du ansvarar alltid för att bara utföra sådant som känns säkert för dig.",
        ],
      },
      {
        title: "Ditt ansvar",
        body: [
          "Använd inte appen om du är sjuk, skadad eller osäker utan att först rådfråga relevant vårdpersonal.",
          "Avbryt, sänk belastningen eller hoppa över övningen om något gör ont, känns fel eller gör dig osäker.",
          "Du ska inte maxa eller pressa igenom smärta bara för att coachen föreslår något.",
        ],
      },
      {
        title: "Konton och betalning",
        body: [
          "Inloggning, kontosynk och betalning är inte färdigställda i den här beta-versionen.",
          "När konto eller Stripe aktiveras behöver villkoren uppdateras med pris, ångerrätt, uppsägning, support och betalningsvillkor.",
        ],
      },
      {
        title: "Kontakt",
        body: [
          "Kontaktuppgifter och juridisk ansvarig part behöver fastställas innan publik lansering.",
        ],
      },
    ],
  },
  {
    id: "privacy",
    label: "Integritet",
    title: "Integritetspolicy",
    updatedAt: "2026-06-08",
    intro:
      "Det här är en praktisk beta-policy. Den ska granskas juridiskt innan konton, betalning eller publik lansering.",
    sections: [
      {
        title: "Vilken data appen kan behandla",
        body: [
          "MinCoach kan behandla profiluppgifter som namn, ålder, träningsvana, mål, utrustning, träningsdagar och frivilliga begränsningar.",
          "Appen kan också behandla träningsdata, exempelvis schema, övningar, set, vikt, reps, RIR, passhistorik, personbästan, feedback och coachmeddelanden.",
          "Begränsningar, skador eller smärta kan vara känsliga uppgifter. Skriv inte mer än appen behöver för att hjälpa dig träna säkrare.",
        ],
      },
      {
        title: "Varför data används",
        body: [
          "Data används för att bygga och justera träningsupplägg, visa historik, ge coachrespons och förbättra beta-versionen.",
          "Viss data kan skickas till AI-tjänster för att generera coachsvar. Skicka inte information du inte vill att appens tjänster ska behandla.",
        ],
      },
      {
        title: "Lagring",
        body: [
          "I beta-versionen kan data lagras lokalt i webbläsaren och i MinCoach beta-databas via Supabase när synk är aktiv.",
          "Data kan även behandlas av tekniska leverantörer som används för drift, databas, hosting och AI-funktioner.",
          "När konton aktiveras ska lagringen kopplas tydligt till användarkonto och raderingsfunktion.",
        ],
      },
      {
        title: "Dina rättigheter",
        body: [
          "Du ska kunna begära information om dina personuppgifter, rättelse, radering, begränsning och dataportabilitet där det är tillämpligt.",
          "Du kan också invända mot viss behandling och lämna klagomål till Integritetsskyddsmyndigheten om du anser att personuppgifter hanteras fel.",
        ],
      },
      {
        title: "Att göra innan publik lansering",
        body: [
          "Fastställ personuppgiftsansvarig, kontaktuppgifter, rättslig grund, lagringstid, underbiträden och rutiner för radering/export.",
          "Uppdatera policyn när Supabase Auth, Stripe, domänen mincoach.app och eventuell analytics är färdigställda.",
        ],
      },
    ],
  },
  {
    id: "training-safety",
    label: "Träningssäkerhet",
    title: "Träningssäkerhet och friskrivning",
    updatedAt: "2026-06-08",
    intro:
      "MinCoach ska hjälpa dig träna smartare, men du bestämmer alltid över kroppen och passet.",
    sections: [
      {
        title: "Inte medicinsk rådgivning",
        body: [
          "MinCoach ger träningsstöd, inte medicinsk rådgivning, diagnos eller behandling.",
          "Rådfråga vårdpersonal om du har sjukdom, skada, graviditet, återkommande smärta eller är osäker på om träning passar dig.",
        ],
      },
      {
        title: "Smärta går före planen",
        body: [
          "Skarp, ökande eller ovanlig smärta betyder att du stoppar, sänker belastningen eller byter övning.",
          "Yrsel, illamående, bröstsmärta, andfåddhet som känns fel eller annan tydlig varningssignal ska tas på allvar.",
          "Vid akut eller allvarlig oro ska du kontakta vården. Ring 112 vid akuta livshotande symtom och 1177 om du är osäker i Sverige.",
        ],
      },
      {
        title: "AI kan ha fel",
        body: [
          "AI-coachen kan misstolka dig, missa sammanhang eller föreslå något som inte passar din dagsform.",
          "Följ inte ett råd blint. Anpassa alltid efter teknik, kontroll, dagsform och kroppens signaler.",
        ],
      },
      {
        title: "Träna kontrollerat",
        body: [
          "Börja hellre för lätt än för tungt när en övning, vikt eller appens upplägg är nytt.",
          "Första veckan ska ge information, inte bevisa maxkapacitet.",
        ],
      },
    ],
  },
];

export function getLegalDocument(id: LegalDocumentId) {
  return LEGAL_DOCUMENTS.find((document) => document.id === id) ?? LEGAL_DOCUMENTS[0];
}
