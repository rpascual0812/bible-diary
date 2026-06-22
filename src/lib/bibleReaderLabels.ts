import type { LangType } from "../types";

type LabelSet = Record<string, string>;

function pick(labels: LabelSet, lang: LangType): string {
  return labels[lang] ?? labels.en;
}

export function getBibleReaderLabels(lang: LangType, verseRef: string) {
  return {
    title: pick(
      {
        en: "Scripture Passage",
        fil: "Banal na Kasulatan",
        ceb: "Balaang Kasulatan",
        bik: "Banal na Kasuratan",
        ilo: "Gubuayan a Kasuratan",
        hil: "Balaan nga Kasulatan",
        es: "Pasaje bíblico",
        la: "Locus Scripturae",
        el: "Βιβλικό απόσπασμα",
        pt: "Passagem bíblica",
        fr: "Passage biblique",
      },
      lang
    ),
    fullChapter: pick(
      {
        en: "Full Chapter",
        fil: "Buong Kapitulo",
        ceb: "Tibuok Kapitulo",
        bik: "Bilog na Kapitulo",
        ilo: "Intero a Kapitulo",
        hil: "Tibuok nga Kapitulo",
        es: "Capítulo completo",
        la: "Caput plenum",
        el: "Πλήρες κεφάλαιο",
        pt: "Capítulo completo",
        fr: "Chapitre complet",
      },
      lang
    ),
    verseOnly: pick(
      {
        en: "Selected Verse",
        fil: "Napiling Bersikulo",
        ceb: "Napiling Bersikulo",
        bik: "Piniling Bersikulo",
        ilo: "Napili a Bersikulo",
        hil: "Napili nga Bersikulo",
        es: "Versículo seleccionado",
        la: "Versus selectus",
        el: "Επιλεγμένο στίχο",
        pt: "Versículo selecionado",
        fr: "Verset sélectionné",
      },
      lang
    ),
    chapterTitle: pick(
      {
        en: "Full Chapter Text",
        fil: "Buong Kapitulo",
        ceb: "Tibuok Kapitulo",
        bik: "Bilog na Kapitulo",
        ilo: "Intero a Kapitulo",
        hil: "Tibuok nga Kapitulo",
        es: "Texto del capítulo",
        la: "Textus capitis",
        el: "Κείμενο κεφαλαίου",
        pt: "Texto do capítulo",
        fr: "Texte du chapitre",
      },
      lang
    ),
    prevChapter: pick(
      {
        en: "Previous Chapter",
        fil: "Nakaraang Kapitulo",
        ceb: "Miaging Kapitulo",
        bik: "Nakaaging Kapitulo",
        ilo: "Napala a Kapitulo",
        hil: "Nagligad nga Kapitulo",
        es: "Capítulo anterior",
        la: "Caput prius",
        el: "Προηγούμενο κεφάλαιο",
        pt: "Capítulo anterior",
        fr: "Chapitre précédent",
      },
      lang
    ),
    nextChapter: pick(
      {
        en: "Next Chapter",
        fil: "Susunod na Kapitulo",
        ceb: "Sunod nga Kapitulo",
        bik: "Sunod na Kapitulo",
        ilo: "Sumaruno a Kapitulo",
        hil: "Sunod nga Kapitulo",
        es: "Siguiente capítulo",
        la: "Caput sequens",
        el: "Επόμενο κεφάλαιο",
        pt: "Próximo capítulo",
        fr: "Chapitre suivant",
      },
      lang
    ),
    loadingVerse: pick(
      {
        en: "Opening scripture scroll...",
        fil: "Binubuksan ang kasulatan...",
        ceb: "Ginaablihan ang kasulatan...",
        bik: "Pinbubukas an kasuratan...",
        ilo: "Lukat ti kasuratan...",
        hil: "Ginabukas ang kasulatan...",
        es: "Abriendo la Escritura...",
        la: "Scriptura aperitur...",
        el: "Άνοιγμα της Γραφής...",
        pt: "Abrindo as Escrituras...",
        fr: "Ouverture des Écritures...",
      },
      lang
    ),
    loadingChapter: pick(
      {
        en: "Fetching chapter verses...",
        fil: "Kinukuha ang mga bersikulo...",
        ceb: "Gikuha ang mga bersikulo...",
        bik: "Kinukuha an mga bersikulo...",
        ilo: "Agala ti mga bersikulo...",
        hil: "Ginakuha ang mga bersikulo...",
        es: "Cargando versículos...",
        la: "Versus capitis accipiuntur...",
        el: "Φόρτωση στίχων...",
        pt: "Carregando versículos...",
        fr: "Chargement des versets...",
      },
      lang
    ),
    verseError: pick(
      {
        en: "Could not retrieve this passage. Try another reference.",
        fil: "Hindi makuha ang talata. Subukan ang ibang sanggunian.",
        ceb: "Dili makuha ang talata. Sulayi ang laing reperensya.",
        bik: "Dai makuwa an talata. Probaran an iba na reperensya.",
        ilo: "Saan a makaala daytoy a paset. Padasen ti sabali a reperensya.",
        hil: "Indi makuha ini nga talata. Sulayi ang iban nga reperensya.",
        es: "No se pudo obtener el pasaje. Prueba otra referencia.",
        la: "Locus non potuit accipi. Aliam referentiam tenta.",
        el: "Δεν ήταν δυνατή η ανάκτηση του αποσπάσματος.",
        pt: "Não foi possível obter esta passagem. Tente outra referência.",
        fr: "Impossible d'obtenir ce passage. Essayez une autre référence.",
      },
      lang
    ),
    chapterError: pick(
      {
        en: "Could not load the full chapter. Please try again.",
        fil: "Hindi ma-load ang buong kapitulo. Subukang muli.",
        ceb: "Dili ma-load ang tibuok kapitulo. Sulayi pag-usab.",
        bik: "Dai ma-load an bilog na kapitulo. Probaran liwat.",
        ilo: "Saan a ma-load ti intero a kapitulo. Padasen manen.",
        hil: "Indi ma-load ang tibuok kapitulo. Sulayi liwat.",
        es: "No se pudo cargar el capítulo completo.",
        la: "Caput plenum non potuit accipi.",
        el: "Δεν ήταν δυνατή η φόρτωση του κεφαλαίου.",
        pt: "Não foi possível carregar o capítulo completo. Tente novamente.",
        fr: "Impossible de charger le chapitre complet. Veuillez réessayer.",
      },
      lang
    ),
    translationPrompt: pick(
      {
        en: `Can you show and explain ${verseRef} in detail?`,
        fil: `Maaari mo bang isulat at ipaliwanag ang ${verseRef} sa wikang Tagalog?`,
        ceb: `Palihug isulat ug ipasabut ang ${verseRef} sa pinulongang Cebuano.`,
        bik: `Paki-sulat asin ipaliwanag an ${verseRef} sa tataramong Bicolano.`,
        ilo: `Paki-surat ken ipamaysa ti lawag ti ${verseRef} iti pagsasao nga Ilocano.`,
        hil: `Palihug isulat kag ipaathag ang ${verseRef} sa polong nga Hiligaynon.`,
        es: `¿Puedes explicar ${verseRef} en detalle?`,
        la: `Explica ${verseRef} in contextu, quaeso.`,
        el: `Μπορείς να εξηγήσεις το ${verseRef} λεπτομερώς;`,
        pt: `Você pode explicar ${verseRef} em detalhes?`,
        fr: `Pouvez-vous expliquer ${verseRef} en détail ?`,
      },
      lang
    ),
    requestTranslation: pick(
      {
        en: "Explain in context",
        fil: "Isalin sa Tagalog",
        ceb: "Hubaron sa Cebuano",
        bik: "I-translate sa Bicolano",
        ilo: "I-translate iti Ilocano",
        hil: "I-translate sa Hiligaynon",
        es: "Explicar en contexto",
        la: "Explica in contextu",
        el: "Εξήγηση στο πλαίσιο",
        pt: "Explicar em contexto",
        fr: "Expliquer en contexte",
      },
      lang
    ),
  };
}
