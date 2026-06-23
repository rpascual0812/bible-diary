import type { LangType } from "../types";

export type PtFrKey = string;

export const LANG_PT_FR: Record<
  PtFrKey,
  { pt: string; fr: string }
> = {
  studyArchives: {
    pt: "Arquivos de Estudo",
    fr: "Archives d'étude",
  },
  noChats: {
    pt: "Nenhum estudo salvo ainda.",
    fr: "Aucune étude enregistrée pour l'instant.",
  },
  newChat: {
    pt: "Novo Estudo",
    fr: "Nouvelle étude",
  },
  giving: {
    pt: "Oferta",
    fr: "Offrande",
  },
  langLabel: {
    pt: "Idioma da Conversa",
    fr: "Langue de conversation",
  },
  themeLabel: {
    pt: "Tema do App",
    fr: "Thème de l'application",
  },
  bibleVersionLabel: {
    pt: "Versão da Bíblia",
    fr: "Version de la Bible",
  },
  themeLight: { pt: "Claro", fr: "Clair" },
  themeDark: { pt: "Escuro", fr: "Sombre" },
  themeFloralVerdant: { pt: "Cântico Verde", fr: "Cantique Verdoyant" },
  themeFloralBlush: { pt: "Bênção Rosada", fr: "Bénédiction Rosée" },
  themeFloralLavender: { pt: "Liturgia Lavanda", fr: "Liturgie Lavande" },
  themeFloralAmber: { pt: "Aleluia Âmbar", fr: "Alléluia Ambre" },
  themeFloralAzure: { pt: "Cântico Azul", fr: "Cantique Azur" },
  themeFloralCrimson: { pt: "Sânctus Escarlate", fr: "Sanctus Écarlate" },
  themeFloralNavy: { pt: "Invocatio Índigo", fr: "Invocatio Indigo" },
  demoTitle: {
    pt: "Simulador offline",
    fr: "Simulateur hors ligne",
  },
  simOffline: {
    pt: "Simular offline",
    fr: "Simuler hors ligne",
  },
  connected: { pt: "Conectado", fr: "Connecté" },
  noNet: { pt: "Sem internet", fr: "Pas d'internet" },
  currentChat: {
    pt: "Estudo atual",
    fr: "Étude en cours",
  },
  renameChat: {
    pt: "Renomear chat",
    fr: "Renommer la conversation",
  },
  renamePlaceholder: {
    pt: "Título do chat",
    fr: "Titre de la conversation",
  },
  save: { pt: "Salvar", fr: "Enregistrer" },
  cancel: { pt: "Cancelar", fr: "Annuler" },
  deleteChat: {
    pt: "Excluir chat",
    fr: "Supprimer la conversation",
  },
  deleteChatConfirm: {
    pt: "Isso removerá permanentemente este estudo e todas as mensagens. Não pode ser desfeito.",
    fr: "Cela supprimera définitivement cette étude et tous ses messages. Cette action est irréversible.",
  },
  delete: { pt: "Excluir", fr: "Supprimer" },
  exportConversations: { pt: "Exportar", fr: "Exporter" },
  importConversations: { pt: "Importar", fr: "Importer" },
  exportEmpty: {
    pt: "Ainda não há conversas para exportar.",
    fr: "Aucune conversation à exporter pour l'instant.",
  },
  exportError: {
    pt: "Não foi possível exportar as conversas. Tente novamente.",
    fr: "Impossible d'exporter les conversations. Veuillez réessayer.",
  },
  importSuccess: {
    pt: "{count} conversa(s) importada(s).",
    fr: "{count} conversation(s) importée(s).",
  },
  importError: {
    pt: "Não foi possível importar o arquivo. Escolha uma exportação válida do Daily Healing Word.",
    fr: "Impossible d'importer ce fichier. Choisissez une exportation Daily Healing Word valide.",
  },
  introGuide: {
    pt: "Guia de estudo",
    fr: "Guide d'étude",
  },
  offlineActive: {
    pt: "Modo offline",
    fr: "Mode hors ligne",
  },
  onlineActive: { pt: "Online", fr: "En ligne" },
  cloudQuotaActive: {
    pt: "Limite de IA na nuvem atingido",
    fr: "Limite d'IA cloud atteinte",
  },
  closeStudy: {
    pt: "Fechar estudo",
    fr: "Fermer l'étude",
  },
  titleMain: {
    pt: "Daily Healing Word",
    fr: "Daily Healing Word",
  },
  welcomeDesc: {
    pt: "Bem-vindo ao Daily Healing Word. Pergunte qualquer coisa sobre a Bíblia ou teologia.",
    fr: "Bienvenue sur Daily Healing Word. Posez toute question sur la Bible ou la théologie.",
  },
  offlineBanner: {
    pt: "Você está offline — usando o banco de dados local de estudo bíblico.",
    fr: "Vous êtes hors ligne — utilisation de la base d'étude biblique locale.",
  },
  queryGuide: {
    pt: "Experimente: João 3:16, Salmo 23, paz, esperança…",
    fr: "Essayez : Jean 3:16, Psaume 23, paix, espérance…",
  },
  dailyVerseLabel: {
    pt: "Versículo do Dia",
    fr: "Verset du jour",
  },
  dailyVerseLoading: {
    pt: "Carregando o versículo de hoje…",
    fr: "Chargement du verset du jour…",
  },
  dailyVerseTap: {
    pt: "Toque para estudar",
    fr: "Appuyez pour étudier",
  },
  suggestedPassages: {
    pt: "Passagens sugeridas",
    fr: "Passages suggérés",
  },
  verseSuggestionsLoading: {
    pt: "Carregando sugestões…",
    fr: "Chargement des suggestions…",
  },
  suggestMore: {
    pt: "Sugerir mais",
    fr: "Suggérer plus",
  },
  continueStudy: {
    pt: "Continue seu estudo",
    fr: "Poursuivez votre étude",
  },
  offlineSummaryTitle: {
    pt: "Estudo bíblico offline",
    fr: "Étude biblique hors ligne",
  },
  offlineSummaryDesc: {
    pt: "Este app funciona totalmente offline, permitindo ler, pesquisar e estudar a Bíblia a qualquer momento — mesmo sem internet. Ele lembra seu progresso e inclui um assistente de estudo bíblico que pode ajudar a explorar personagens, temas como fé, paz e amor, e passagens conhecidas como o Salmo 23 e o Sermão da Montanha.",
    fr: "Cette application fonctionne entièrement hors ligne, vous permettant de lire, rechercher et étudier la Bible à tout moment — même sans connexion internet. Elle mémorise votre progression et inclut un assistant d'étude biblique pour explorer des personnages, des thèmes comme la foi, la paix et l'amour, ainsi que des passages connus comme le Psaume 23 et le Sermon sur la Montagne.",
  },
  scribe: { pt: "Escriba", fr: "Scribe" },
  consulting: {
    pt: "Consultando as Escrituras…",
    fr: "Consultation des Écritures…",
  },
  translating: {
    pt: "Traduzindo conversa…",
    fr: "Traduction de la conversation…",
  },
  selectGuide: {
    pt: "Selecionar guia de estudo",
    fr: "Choisir un guide d'étude",
  },
  placeholderOnline: {
    pt: "Pergunte ao Daily Healing Word…",
    fr: "Interrogez Daily Healing Word…",
  },
  placeholderOffline: {
    pt: "Pergunte offline (paz, esperança, Jesus)…",
    fr: "Demandez hors ligne (paix, espérance, Jésus)…",
  },
  sourceFooter: {
    pt: "Referências bíblicas baseadas nas versões King James e English Standard",
    fr: "Références bibliques basées sur les versions King James et English Standard",
  },
  bibleNavigation: {
    pt: "Navegação de estudo bíblico",
    fr: "Navigation d'étude biblique",
  },
  givingSanctuary: {
    pt: "Santuário de Ofertas",
    fr: "Sanctuaire des offrandes",
  },
  donationSubtitle: {
    pt: "Sua contribuição generosa ajuda a pagar os custos de IA do Daily Healing Word e apoia missões da igreja.",
    fr: "Votre contribution généreuse aide à couvrir les coûts d'IA de Daily Healing Word et soutient les missions de l'Église.",
  },
  donationAmountLabel: {
    pt: "Valor da oferta (PHP)",
    fr: "Montant de l'offrande (PHP)",
  },
  donationPurposeLabel: {
    pt: "Categoria da oferta",
    fr: "Catégorie d'offrande",
  },
  donationNamePlaceholder: {
    pt: "Nome do contribuinte (opcional)",
    fr: "Nom du donateur (facultatif)",
  },
  donationEmailPlaceholder: {
    pt: "E-mail (opcional)",
    fr: "E-mail (facultatif)",
  },
  donationPhonePlaceholder: {
    pt: "Telefone (opcional)",
    fr: "Téléphone (facultatif)",
  },
  donationSubmit: {
    pt: "Continuar com Xendit",
    fr: "Continuer avec Xendit",
  },
  donationOpenCheckout: {
    pt: "Abrir pagamento seguro",
    fr: "Ouvrir le paiement sécurisé",
  },
  donationReadyTitle: {
    pt: "Pagamento pronto",
    fr: "Paiement prêt",
  },
  donationReadyDesc: {
    pt: "Abra o Xendit para concluir sua contribuição com segurança.",
    fr: "Ouvrez Xendit pour finaliser votre offrande en toute sécurité.",
  },
  donationManualTitle: {
    pt: "Banco e GCash direto",
    fr: "Banque et GCash direct",
  },
  donationMinAmount: {
    pt: "O valor mínimo da oferta é PHP 20,00.",
    fr: "Le montant minimum de l'offrande est de PHP 20,00.",
  },
  donationGatewayError: {
    pt: "Não foi possível conectar ao gateway de pagamento.",
    fr: "Impossible de se connecter à la passerelle de paiement.",
  },
  donationNoCheckoutUrl: {
    pt: "Nenhuma URL de pagamento foi retornada.",
    fr: "Aucune URL de paiement n'a été renvoyée.",
  },
  nativeModuleUnavailable: {
    pt: "Importar e exportar exigem uma versão atualizada do app. Recompile com EAS ou execute expo run:android / expo run:ios e reinstale o app.",
    fr: "L'import et l'export nécessitent une version mise à jour de l'application. Recompilez avec EAS ou exécutez expo run:android / expo run:ios, puis réinstallez l'application.",
  },
};

export function resolvePtFrTranslation(
  key: string,
  lang: LangType,
  fallbackEn: string,
): string | undefined {
  if (lang !== "pt" && lang !== "fr") return undefined;
  const entry = LANG_PT_FR[key];
  if (!entry) return undefined;
  return entry[lang] ?? fallbackEn;
}
