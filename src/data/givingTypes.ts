import type { LangType } from "../types";

export interface GivingType {
  id: string;
  label: string;
  description: string;
}

export const GIVING_TYPES: Partial<Record<LangType, GivingType[]>> = {
  en: [
    { id: "tithe", label: "Tithe (Ikasampung Bahagi)", description: "10% of personal increase dedicated to the Lord." },
    { id: "offering", label: "General Offering", description: "Voluntary church giving for operations and ministries." },
    { id: "love_gift", label: "Love Gift", description: "Pastoral support, speaker honorariums, and special needs." },
    { id: "missions", label: "Missions & Mercy Ministry", description: "Sponsorship of local outreach and regional evangelism." },
    { id: "building", label: "Church Building Fund", description: "Expansion of physical sanctuary and equipment." },
  ],
  fil: [
    { id: "tithe", label: "Ikapu / Ikasampung Bahagi", description: "Bahagi para sa Panginoon mula sa ating mga biyaya." },
    { id: "offering", label: "Karaniwang Handog", description: "Kusang-loob na alay para sa pagpapalago ng simbahan." },
    { id: "love_gift", label: "Kaloob ng Pagmamahal (Love Gift)", description: "Suporta para sa mga Pastor, panauhing tagapagsalita o kapatid sa pananampalataya." },
    { id: "missions", label: "Suporta sa Misyon at Kahabagan", description: "Tulong sa mga gawaing panlabas at pagkakawanggawa." },
    { id: "building", label: "Proyekto sa Pagpapatayo ng Simbahan", description: "Para sa pagbili, pagpapaayos, o pagpapalawak ng gusali." },
  ],
  ceb: [
    { id: "tithe", label: "Ikapulo / Tibuok Ikapulo", description: "Ikapulo nga bahin sa grasya nga gihalad ngadto sa Ginoo." },
    { id: "offering", label: "Kinatibuk-ang Halad", description: "Boluntaryo nga halad alang sa mga kalihokan sa simbahan." },
    { id: "love_gift", label: "Halad sa Gugma (Love Gift)", description: "Suporta alang sa mga Pastor, mamumulong ug pinasahi nga panginahanglan." },
    { id: "missions", label: "Misyon ug Gasa sa Kaluoy", description: "Sponsorship sa lokal nga outreaches ug rehiyonal nga pag-ebanghelyo." },
    { id: "building", label: "Pundo sa Pagpatayo sa Simbahan", description: "Alang sa pagpalapad sa puy-anan ug kagamitan." },
  ],
  bik: [
    { id: "tithe", label: "Ikasampulong Bahagi (Tithe)", description: "An ikasampulong porsiyento kan satuyang biyaya para sa Kagurangnan." },
    { id: "offering", label: "Banal na Alay / Handog", description: "Kusang-gibo na suporta sa operasyon kan simbahan." },
    { id: "love_gift", label: "Kaloob nin Pagkamoot (Love Gift)", description: "Suporta sa satuyang Pastor o mga nanganangaipo." },
    { id: "missions", label: "Gibo sa Misyon o Kahabagan", description: "Sponsorship sa mga lokal na outreaches asin pag-ebanghelyo." },
    { id: "building", label: "Pundo sa Pagpapatugdok kan Simbahan", description: "Para sa paggibo o pagpakarhay kan satuyang templo." },
  ],
  ilo: [
    { id: "tithe", label: "Ikapulo wenno Tithe", description: "Maysa a pagkapulo a paset ti biag nga idonasion iti Apo." },
    { id: "offering", label: "Kadawyan a Daton", description: "Naimpusoan a daton para iti iglesiatyo." },
    { id: "love_gift", label: "Sagut ti Ayat (Love Gift)", description: "Suporta para kadagiti Pastor wenno addaan nangruna a masapul." },
    { id: "missions", label: "Suporta iti Misyon ken Kaasi", description: "Tulong para kadagiti out-of-town missions ken tulong panagbasa." },
    { id: "building", label: "Pangbangon a Pundo ti Iglesia", description: "Para iti pannakapapintas wenno pangpalawa ti simbaan." },
  ],
  hil: [
    { id: "tithe", label: "Ikapulo (Tithe)", description: "Bahin nga ginalat-an para sa Ginoo gikan sa aton pagsanyog." },
    { id: "offering", label: "Kinabatasan nga Halad", description: "Kusa nga hatag para sa operasyon sang aton simbahan." },
    { id: "love_gift", label: "Gasa sang Gugma (Love Gift)", description: "Suporta para sa aton mga Pastor kag pinasahi nga kinahanglanon." },
    { id: "missions", label: "Suporta sa Misyon kag Kaluoy", description: "Bulig para sa lokal nga pagpalapnag sang Pulong sang Dios." },
    { id: "building", label: "Pundo sa Pagpatindog sang Simbahan", description: "Para sa pagmentinar kag pagpalapad sang sagrado nga templo." },
  ],
};

export function getGivingTypes(lang: LangType): GivingType[] {
  return GIVING_TYPES[lang] ?? GIVING_TYPES.en ?? [];
}

export function getDefaultDonationPurpose(lang: LangType): string {
  return getGivingTypes(lang).find((item) => item.id === "love_gift")?.label ?? "Love Gift";
}
