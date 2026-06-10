import React, { useState, useEffect } from "react";
import { 
  X, Heart, Gift, CreditCard, Banknote, ShieldCheck, 
  ExternalLink, Copy, Check, Info, AlertCircle, Loader2 
} from "lucide-react";
import { cn } from "../lib/utils";
import { LangType } from "../App";
import {
  BAKED_BANK_NAME,
  BAKED_BANK_ACCOUNT_NAME,
  BAKED_BANK_ACCOUNT_NUMBER,
  BAKED_GCASH_NUMBER,
  BAKED_GCASH_NAME,
  getApiUrl,
  isSandboxMode
} from "../config/apiKey";

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: LangType;
  theme: "dark" | "light";
}

// Map Philippine popular giving methods for presentation
const GIVING_TYPES = {
  en: [
    { id: "tithe", label: "Tithe (Ikasampung Bahagi)", description: "10% of personal increase dedicated to the Lord." },
    { id: "offering", label: "General Offering", description: "Voluntary church giving for operations and ministries." },
    { id: "love_gift", label: "Love Gift", description: "Pastoral support, speaker honorariums, and special needs." },
    { id: "missions", label: "Missions & Mercy Ministry", description: "Sponsorship of local outreach and regional evangelism." },
    { id: "building", label: "Church Building Fund", description: "Expansion of physical sanctuary and equipment." }
  ],
  fil: [
    { id: "tithe", label: "Ikapu / Ikasampung Bahagi", description: "Bahagi para sa Panginoon mula sa ating mga biyaya." },
    { id: "offering", label: "Karaniwang Handog", description: "Kusang-loob na alay para sa pagpapalago ng simbahan." },
    { id: "love_gift", label: "Kaloob ng Pagmamahal (Love Gift)", description: "Suporta para sa mga Pastor, panauhing tagapagsalita o kapatid sa pananampalataya." },
    { id: "missions", label: "Suporta sa Misyon at Kahabagan", description: "Tulong sa mga gawaing panlabas at pagkakawanggawa." },
    { id: "building", label: "Proyekto sa Pagpapatayo ng Simbahan", description: "Para sa pagbili, pagpapaayos, o pagpapalawak ng gusali." }
  ],
  ceb: [
    { id: "tithe", label: "Ikapulo / Tibuok Ikapulo", description: "Ikapulo nga bahin sa grasya nga gihalad ngadto sa Ginoo." },
    { id: "offering", label: "Kinatibuk-ang Halad", description: "Boluntaryo nga halad alang sa mga kalihokan sa simbahan." },
    { id: "love_gift", label: "Halad sa Gugma (Love Gift)", description: "Suporta alang sa mga Pastor, mamumulong ug pinasahi nga panginahanglan." },
    { id: "missions", label: "Misyon ug Gasa sa Kaluoy", description: "Sponsorship sa lokal nga outreaches ug rehiyonal nga pag-ebanghelyo." },
    { id: "building", label: "Pundo sa Pagpatayo sa Simbahan", description: "Alang sa pagpalapad sa puy-anan ug kagamitan." }
  ],
  bik: [
    { id: "tithe", label: "Ikasampulong Bahagi (Tithe)", description: "An ikasampulong porsiyento kan satuyang biyaya para sa Kagurangnan." },
    { id: "offering", label: "Banal na Alay / Handog", description: "Kusang-gibo na suporta sa operasyon kan simbahan." },
    { id: "love_gift", label: "Kaloob nin Pagkamoot (Love Gift)", description: "Suporta sa satuyang Pastor o mga nanganangaipo." },
    { id: "missions", label: "Gibo sa Misyon o Kahabagan", description: "Sponsorship sa mga lokal na outreaches asin pag-ebanghelyo." },
    { id: "building", label: "Pundo sa Pagpapatugdok kan Simbahan", description: "Para sa paggibo o pagpakarhay kan satuyang templo." }
  ],
  ilo: [
    { id: "tithe", label: "Ikapulo wenno Tithe", description: "Maysa a pagkapulo a paset ti biag nga idonasion iti Apo." },
    { id: "offering", label: "Kadawyan a Daton", description: "Naimpusoan a daton para iti iglesiatyo." },
    { id: "love_gift", label: "Sagut ti Ayat (Love Gift)", description: "Suporta para kadagiti Pastor wenno addaan nangruna a masapul." },
    { id: "missions", label: "Suporta iti Misyon ken Kaasi", description: "Tulong para kadagiti out-of-town missions ken tulong panagbasa." },
    { id: "building", label: "Pangbangon a Pundo ti Iglesia", description: "Para iti pannakapapintas wenno pangpalawa ti simbaan." }
  ],
  hil: [
    { id: "tithe", label: "Ikapulo (Tithe)", description: "Bahin nga ginalat-an para sa Ginoo gikan sa aton pagsanyog." },
    { id: "offering", label: "Kinabatasan nga Halad", description: "Kusa nga hatag para sa operasyon sang aton simbahan." },
    { id: "love_gift", label: "Gasa sang Gugma (Love Gift)", description: "Suporta para sa aton mga Pastor kag pinasahi nga kinahanglanon." },
    { id: "missions", label: "Suporta sa Misyon kag Kaluoy", description: "Bulig para sa lokal nga pagpalapnag sang Pulong sang Dios." },
    { id: "building", label: "Pundo sa Pagpatindog sang Simbahan", description: "Para sa pagmentinar kag pagpalapad sang sagrado nga templo." }
  ]
};

const BANK_DETAILS = {
  bankName: import.meta.env.VITE_BANK_NAME || BAKED_BANK_NAME || "",
  accountName: import.meta.env.VITE_BANK_ACCOUNT_NAME || BAKED_BANK_ACCOUNT_NAME || "",
  accountNumber: import.meta.env.VITE_BANK_ACCOUNT_NUMBER || BAKED_BANK_ACCOUNT_NUMBER || "",
  gcashNumber: import.meta.env.VITE_GCASH_NUMBER || BAKED_GCASH_NUMBER || "",
  gcashName: import.meta.env.VITE_GCASH_NAME || BAKED_GCASH_NAME || ""
};

export function DonationModal({ isOpen, onClose, language, theme }: DonationModalProps) {
  const [amount, setAmount] = useState<string>("500");
  const [purpose, setPurpose] = useState<string>("love_gift");
  const [contributorName, setContributorName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [mobile, setMobile] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"paymongo" | "manual">("paymongo");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const [copiedBank, setCopiedBank] = useState<boolean>(false);
  const [copiedGcash, setCopiedGcash] = useState<boolean>(false);

  const isDark = theme === "dark";

  // Handle Close & Reset variables
  const handleClose = () => {
    setAmount("500");
    setPurpose("love_gift");
    setContributorName("");
    setEmail("");
    setMobile("");
    setCheckoutUrl(null);
    setErrorMsg(null);
    onClose();
  };

  const selectedGivingType = (GIVING_TYPES[language] || GIVING_TYPES.en).find((t) => t.id === purpose);
  const purposeName = selectedGivingType ? selectedGivingType.label : purpose;

  // Handles dynamic checkout submission or sandbox demo checkout triggering
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setCheckoutUrl(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 20) {
      setErrorMsg(language === "fil" ? "Ang pinakamababang handog ay PHP 20.00." : "Minimum offering amount is PHP 20.00.");
      return;
    }

    setSubmitting(true);
    try {
      const sandbox = isSandboxMode();
      const res = await fetch(getApiUrl("/api/paymongo/create-session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numericAmount,
          purpose: purposeName,
          name: contributorName.trim() || undefined,
          email: email.trim() || undefined,
          phone: mobile.trim() || undefined,
          isSandbox: sandbox,
          isDebug: sandbox,
        }),
      });

      const text = await res.text();
      let resData: any = {};
      try {
        resData = JSON.parse(text);
      } catch (parseErr) {
        if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html") || text.trim().startsWith("<htm")) {
          throw new Error("A cached service worker or browser routing conflict intercepted the payment request. Please click 'Clear App Cache & Fix Gateway' below to repair the connection.");
        }
        throw new Error(`Invalid response format from gateway server: ${text.substring(0, 100)}`);
      }

      if (!res.ok) {
        throw new Error(resData.message || "Failed to initiate payment session.");
      }

      if (resData.checkoutUrl) {
        setCheckoutUrl(resData.checkoutUrl);
      } else {
        throw new Error("No checkout URL was returned.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Something went wrong while connecting with PayMongo gateway.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyText = (text: string, type: "bank" | "gcash") => {
    navigator.clipboard.writeText(text);
    if (type === "bank") {
      setCopiedBank(true);
      setTimeout(() => setCopiedBank(false), 2000);
    } else {
      setCopiedGcash(true);
      setTimeout(() => setCopiedGcash(false), 2000);
    }
  };

  // UI Translation Table
  const uiTexts = {
    title: {
      en: "Giving Sanctuary",
      fil: "Dakong Handugan",
      ceb: "Santuwaryo sa Halad",
      bik: "Santuwaryo kan Alay",
      ilo: "Santuaryo ti Panagdaton",
      hil: "Dapit sang Halad",
    },
    subtitle: {
      en: "Your generous contribution will help pay for the AI expenses of bible-diary. A part of your donation will be given to church missions, general ministries, and community services.",
      fil: "Ang inyong masayang pagbibigay ay makatutulong sa gastusin sa AI ng bible-diary. Ang bahagi ng inyong handog ay ibabahagi rin sa mga misyon ng simbahan, pangkalahatang ministeryo, at serbisyo sa komunidad.",
      ceb: "Ang inyong manggihatagon nga paghatag makatabang sa pagbayad sa mga AI nga gasto sa bible-diary. Ang bahin sa inyong donasyon ihalad usab sa mga misyon sa simbahan, kinatibuk-ang ministeryo, ug serbisyo sa komunidad.",
      bik: "An saimong maugmang pag-alay makakatabang sa mga gastos sa AI kan bible-diary. An parte kan saimong donasyon itatao sa mga misyon kan simbahan, pangkalahatang ministeryo, asin serbisyo sa komunidad.",
      ilo: "Ti naimpusoan a datonyo ket makatulong a mangbayad iti gastusen ti AI ti bible-diary. Ti dadduma a paset ti donasionyo ket maidaton met iti mision ti simbaan, sabsabali a ministeryo, ken tulong panagbasa.",
      hil: "Ang inyo maalwan nga paghatag makabulig sa mga gastos sa AI sang bible-diary. Ang parte sang inyo donasyon ihatag man sa misyon sang aton simbahan kag mga serbisyo sa komunidad.",
    },
    detailsHeader: {
      en: "Offering Details",
      fil: "Detalye ng Alay",
      ceb: "Detalye sa Halad",
      bik: "Detalye kan Alay",
      ilo: "Salaysay ti Daton",
      hil: "Detalye sang Halad",
    },
    amountLabel: {
      en: "Giving Amount (PHP)",
      fil: "Halaga (PHP)",
      ceb: "Bili sa Halad (PHP)",
      bik: "Halaga (PHP)",
      ilo: "Kabiligan ti Daton (PHP)",
      hil: "Bili sang Ihalad (PHP)",
    },
    purposeLabel: {
      en: "Offering Category",
      fil: "Kategorya ng Handog",
      ceb: "Kategorya sa Halad",
      bik: "Kategorya kan Handog",
      ilo: "Kita ti Daton",
      hil: "Klase sang Halad",
    },
    namePlaceholder: {
      en: "Contributor Name (Optional - to track contributions)",
      fil: "Pangalan ng Nag-alay (Opsyonal)",
      ceb: "Ngalan sa Naghalad (Opsyonal)",
      bik: "Ngaran kan Nag-alay (Opsyonal)",
      ilo: "Nagan ti Agdaton (Opsyonal)",
      hil: "Ngalan sang Naghalad (Opsyonal)",
    },
    emailPlaceholder: {
      en: "Email Address (Optional - to send official receipt)",
      fil: "Email Address (Opsyonal - para sa resibo)",
      ceb: "Email Address (Opsyonal - para sa resibo)",
      bik: "Email Address (Opsyonal - para sa resibo)",
      ilo: "Email Address (Opsyonal)",
      hil: "Email Address (Opsyonal - para sa resibo)",
    },
    phonePlaceholder: {
      en: "Mobile number (Optional)",
      fil: "Numero ng Telepono (Opsyonal)",
      ceb: "Numero sa Telepono (Opsyonal)",
      bik: "Numero kan Telepono (Opsyonal)",
      ilo: "Numero ti Selpon (Opsyonal)",
      hil: "Numero sang Telepono (Opsyonal)",
    },
    submitButton: {
      en: "Proceed with PayMongo Secure Checkout",
      fil: "Magpatuloy sa PayMongo Safe Checkout",
      ceb: "Ipadayon sa PayMongo Seguro nga Sandbox",
      bik: "Ipadagos sa PayMongo Safe Checkout",
      ilo: "Ituloy iti PayMongo Secure Checkout",
      hil: "Magpadayon sa PayMongo Secure Checkout",
    },
    tabsOnline: {
      en: "E-Wallet & Card (PayMongo)",
      fil: "E-Wallet & Card (PayMongo)",
      ceb: "E-Wallet & Card (PayMongo)",
      bik: "E-Wallet & Card (PayMongo)",
      ilo: "Online E-Wallet & Card",
      hil: "E-Wallet & Card (PayMongo)",
    },
    tabsOffline: {
      en: "GCash QR & Direct Bank Details",
      fil: "Direktang Bangko & GCash QR",
      ceb: "Direktang Bangko & GCash QR",
      bik: "Direktang Bangko & GCash QR",
      ilo: "Direktang Bangko & GCash",
      hil: "Direktang Bangko & GCash QR",
    },
    securityNotice: {
      en: "Our digital collection basket uses official PayMongo checkout sessions. Your payment is 100% secure.",
      fil: "Ang ating digital na handugan ay ligtas na gumagamit ng opisyal na PayMongo checkout sessions. Ang inyong transaksyon ay sagrado at ligtas.",
      ceb: "Kaluwasan: Ang atong digital nga koleksyon naggamit sa opisyal nga PayMongo. Sigurado ug luwas.",
      bik: "Kaluwasan: An satuyang koleksyon naggagamit kan opisyal na PayMongo. Ligtas asin sigurado.",
      ilo: "Nailawag: Sigurado ken natalged ti online panagdatonyo babaen iti PayMongo.",
      hil: "Ang aton digital nga halad nagagamit sang opisyal kag luwas nga PayMongo checkout.",
    },
    proceedRedirect: {
      en: "Open Secure Checkout Window",
      fil: "Buksan ang Secure Checkout Window",
      ceb: "Ablihan ang Secure Checkout URL",
      bik: "Buksan an Secure Checkout Window",
      ilo: "Lukatan ti Secure Checkout",
      hil: "Buksan ang Secure Checkout Window",
    },
    redirectDesc: {
      en: "Click the button below to complete your contribution securely. Your transaction will be managed directly on PayMongo's secure platform.",
      fil: "I-click ang button sa ibaba para makumpleto ang handog. Ang inyong pagbabayad ay ligtas na pamamahalaan ng opisyal na PayMongo platform.",
      ceb: "I-click ang button sa ubos alang sa pagkompleto sa halad. Pagdumalahon kini sa siguradong plataporma sa PayMongo.",
      bik: "I-click an button sa ibaba para makumpleto an alay. Ligatas ining pamamahalaan kan opisyal na PayMongo platform.",
      ilo: "I-click ti buton dita baba tapno mailpas iti daton. Maasikaso dita uneg ti PayMongo.",
      hil: "I-click ang button sa dalom agod makumpleto ang ihalad. Pagadumalahan ini sang secure nga plataporma sang PayMongo.",
    },
    manualSubtitle: {
      en: "You may also send gifts through standard mobile bank transfers or GCash.",
      fil: "Maaari mo ring ipadala ang iyong handog gamit ang mobile bank transfers o GCash.",
      ceb: "Mahimo sab nimo ipadala ang inyong halad sa bangko o GCash.",
      bik: "Pwede mo man ipadala an saimong alay sa bangko o GCash.",
      ilo: "Mabalinmo met nga ipatulod ti daton babaen ti bank transfer wenno GCash.",
      hil: "Mahimo mo man nga ipadala ang imo ihalad paagi sa bank transfer ukon GCash.",
    },
    successTitle: {
      en: "Offerings Accepted",
      fil: "Malugod na Tinanggap ang Alay",
      ceb: "Nadawat na ang Halad",
      bik: "Madinalag-on na Tinanggap an Alay",
      ilo: "Nagballigi ti Panagdaton",
      hil: "Nabaton na ang Halad",
    },
    successDesc: {
      en: "Thank you for sowing into the Kingdom! God loves a cheerful giver.",
      fil: "Maraming salamat sa iyong paghahasik sa Kaharian ng Diyos! Minamahal ng Diyos ang masayang nagbibigay.",
      ceb: "Salamat kaayo sa inyong pagpugas sa Kararian sa Ginoo! Gihigugma sa Dios ang malipayong naghatag.",
      bik: "Mabalos sa saimong pagserbi asin pagsuporta sa Kaharian kan Dios! Padaba kan Dios an maugmang para-alay.",
      ilo: "Agyamantay unay iti panagdaton dita Pagarian ti Dios! Ay-ayaten ti Dios ti naragsak nga agdatdaton.",
      hil: "Madamo nga salamat sa imo pagsuporta sa Ginharian sang Dios! Ginahigugma sang Dios ang masadya nga nagahatag.",
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300 overflow-y-auto select-text">
      <div 
        className={cn(
          "relative w-full max-w-2xl rounded-3xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-all duration-300",
          isDark 
            ? "bg-[#0E1015]/95 border-white/10 shadow-black/60 text-slate-100" 
            : "bg-white border-slate-200/80 shadow-slate-300/40 text-slate-800"
        )}
      >
        {/* Header section */}
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-600/30 border border-amber-500/20 flex items-center justify-center">
              <Gift className="w-5 h-5 text-gold-500 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold font-sans tracking-tight">
                  {uiTexts.title[language] || uiTexts.title.en}
                </h2>
                {isSandboxMode() && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    Sandbox
                  </span>
                )}
              </div>
              <p className="text-[10px] uppercase font-mono tracking-widest text-[#D4AF37] font-semibold mt-0.5">
                Donation Box
              </p>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            className={cn(
              "p-2 rounded-full border transition-all cursor-pointer",
              isDark 
                ? "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10" 
                : "bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tabs: Online vs Manual */}
        <div className="grid grid-cols-2 text-center border-b border-white/5 pt-1">
          <button
            onClick={() => { setActiveTab("paymongo"); setCheckoutUrl(null); }}
            className={cn(
              "py-3 font-sans text-xs font-semibold tracking-wider transition-all border-b-2 cursor-pointer flex items-center justify-center gap-1.5",
              activeTab === "paymongo"
                ? (isDark ? "border-gold-500 text-gold-400 font-bold bg-white/[0.02]" : "border-gold-600 text-gold-700 font-bold bg-slate-50")
                : (isDark ? "border-transparent text-slate-400 hover:text-slate-200" : "border-transparent text-slate-500 hover:text-slate-800")
            )}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>{uiTexts.tabsOnline[language] || uiTexts.tabsOnline.en}</span>
          </button>
          <button
            onClick={() => { setActiveTab("manual"); setCheckoutUrl(null); }}
            className={cn(
              "py-3 font-sans text-xs font-semibold tracking-wider transition-all border-b-2 cursor-pointer flex items-center justify-center gap-1.5",
              activeTab === "manual"
                ? (isDark ? "border-gold-500 text-gold-400 font-bold bg-white/[0.02]" : "border-gold-600 text-gold-700 font-bold bg-slate-50")
                : (isDark ? "border-transparent text-slate-400 hover:text-slate-200" : "border-transparent text-slate-500 hover:text-slate-800")
            )}
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>{uiTexts.tabsOffline[language] || uiTexts.tabsOffline.en}</span>
          </button>
        </div>

        {/* Dynamic scrollable content area */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5 custom-scrollbar">
          
          <p className="text-xs font-light text-slate-400 leading-relaxed text-justify">
            {uiTexts.subtitle[language] || uiTexts.subtitle.en}
          </p>

          {activeTab === "paymongo" ? (
            checkoutUrl ? (
              // REDIRECT STEP
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-8 h-8 animate-bounce" />
                </div>
                
                <div className="space-y-1.5 max-w-sm">
                  <h3 className="text-base font-bold">Secure Gateway Portal Created</h3>
                  <p className="text-xs font-light text-slate-400">
                    {uiTexts.redirectDesc[language] || uiTexts.redirectDesc.en}
                  </p>
                </div>

                <div className="bg-white/5 border border-white/5 p-4 rounded-2xl text-xs space-y-1 font-mono text-left max-w-md w-full">
                  <p className="text-slate-500">CATEGORY: <span className="text-gold-400 font-bold">{purposeName}</span></p>
                  <p className="text-slate-500">AMOUNT: <span className="text-white font-black">₱ {amount} PHP</span></p>
                  {contributorName && <p className="text-slate-500">CONTRIBUTOR: <span className="text-slate-300">{contributorName}</span></p>}
                </div>

                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-xs font-semibold uppercase tracking-wider border cursor-pointer active:scale-95 transition-all text-white bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20"
                  )}
                >
                  <span>{uiTexts.proceedRedirect[language] || uiTexts.proceedRedirect.en}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ) : (
              // FORM ENTRY STEP
              <form onSubmit={handleSubmit} className="space-y-5">
                <h3 className="text-xs uppercase tracking-wider text-slate-450 dark:text-slate-550 border-b border-white/5 pb-1 flex items-center gap-1.5 font-bold font-sans">
                  <span>1. {uiTexts.detailsHeader[language] || uiTexts.detailsHeader.en}</span>
                </h3>

                {/* Amount presets list */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-400">
                    {uiTexts.amountLabel[language] || uiTexts.amountLabel.en}
                  </span>
                  
                  {/* Presets Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {["100", "250", "500", "1000", "2500", "5000"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAmount(preset)}
                        className={cn(
                          "py-2 px-1 rounded-xl text-sm font-semibold transition-all border cursor-pointer active:scale-95 text-center font-mono",
                          amount === preset
                            ? (isDark 
                                ? "bg-gold-500/15 border-gold-500 text-gold-400 font-bold" 
                                : "bg-gold-50 border-gold-500 text-gold-700 font-bold")
                            : (isDark 
                                ? "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10" 
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100")
                        )}
                      >
                        ₱ {parseInt(preset).toLocaleString()}
                      </button>
                    ))}
                  </div>

                  {/* Manual input tag */}
                  <div className="relative mt-2 flex items-center">
                    <span className="absolute left-4 font-mono text-sm text-slate-500 font-bold select-none">₱</span>
                    <input
                      type="number"
                      required
                      min="20"
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter custom amount..."
                      className={cn(
                        "w-full bg-transparent border rounded-2xl pl-8 pr-12 py-3 font-mono text-sm font-semibold focus:outline-none focus:ring-1 transition-all",
                        isDark 
                          ? "border-white/10 focus:border-gold-500/50 focus:ring-gold-500/20 text-white" 
                          : "border-slate-200 focus:border-gold-500/50 focus:ring-gold-500/20 text-slate-800"
                      )}
                    />
                    <span className="absolute right-4 font-mono text-xs text-slate-500 font-semibold select-none">PHP</span>
                  </div>
                </div>

                {/* Purpose Category Selection Radio - Hidden for now, default is Love Gift */}

                {/* Contributor personal details */}
                <div className="space-y-3">
                  <h3 className="text-xs uppercase tracking-wider text-slate-450 dark:text-slate-550 border-b border-white/5 pb-1 flex items-center gap-1.5 font-bold font-sans">
                    <span>2. Contributor details (Fields optional)</span>
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={contributorName}
                      onChange={(e) => setContributorName(e.target.value)}
                      placeholder={uiTexts.namePlaceholder[language] || uiTexts.namePlaceholder.en}
                      className={cn(
                        "w-full bg-transparent border rounded-2xl px-4 py-3 text-xs focus:outline-none focus:ring-1 transition-all md:col-span-2",
                        isDark 
                          ? "border-white/10 focus:border-gold-500/50 focus:ring-gold-500/20 text-white" 
                          : "border-slate-200 focus:border-gold-500/50 focus:ring-gold-500/20 text-slate-800"
                      )}
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={uiTexts.emailPlaceholder[language] || uiTexts.emailPlaceholder.en}
                      className={cn(
                        "w-full bg-transparent border rounded-2xl px-4 py-3 text-xs focus:outline-none focus:ring-1 transition-all",
                        isDark 
                          ? "border-white/10 focus:border-gold-500/50 focus:ring-gold-500/20 text-white" 
                          : "border-slate-200 focus:border-gold-500/50 focus:ring-gold-500/20 text-slate-800"
                      )}
                    />
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder={uiTexts.phonePlaceholder[language] || uiTexts.phonePlaceholder.en}
                      className={cn(
                        "w-full bg-transparent border rounded-2xl px-4 py-3 text-xs focus:outline-none focus:ring-1 transition-all",
                        isDark 
                          ? "border-white/10 focus:border-gold-500/50 focus:ring-gold-500/20 text-white" 
                          : "border-slate-200 focus:border-gold-500/50 focus:ring-gold-500/20 text-slate-800"
                      )}
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="space-y-3">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3 text-xs items-center text-red-500">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                    {(errorMsg.includes("intercepted") || errorMsg.includes("format") || errorMsg.includes("Unexpected") || errorMsg.includes("JSON")) && (
                      <button
                        type="button"
                        onClick={async () => {
                          const win = window as any;
                          if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
                            try {
                              const regs = await navigator.serviceWorker.getRegistrations();
                              for (const reg of regs) {
                                await reg.unregister();
                              }
                            } catch (swErr) {
                              console.error(swErr);
                            }
                          }
                          if ("caches" in win) {
                            try {
                              const keys = await win.caches.keys();
                              await Promise.all(keys.map((key: string) => win.caches.delete(key)));
                            } catch (cacheErr) {
                              console.error(cacheErr);
                            }
                          }
                          try {
                            // Selectively clear cache keys but preserve user's Bible study chats, theme, and language
                            const preservedKeys = ["biblesphere_sessions", "biblesphere_lang", "biblesphere_theme", "biblesphere_active_id"];
                            const keysToKeep = preservedKeys.map(k => ({ key: k, val: localStorage.getItem(k) }));
                            localStorage.clear();
                            keysToKeep.forEach(item => {
                              if (item.val !== null) {
                                localStorage.setItem(item.key, item.val);
                              }
                            });
                            sessionStorage.clear();
                          } catch (storeErr) {
                            console.error(storeErr);
                          }
                          win.location.reload();
                        }}
                        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider cursor-pointer transition-all active:scale-95 text-center shadow-lg"
                      >
                        Clear App Cache & Fix Gateway
                      </button>
                    )}
                  </div>
                )}

                {/* Security Badge and submit buttons */}
                <div className="flex flex-col gap-4 pt-2">
                  {isSandboxMode() && (
                    <div className={cn(
                      "p-3 rounded-2xl text-[10px] space-y-1 leading-relaxed border flex flex-col",
                      isDark 
                        ? "bg-amber-500/5 border-amber-500/10 text-amber-300"
                        : "bg-amber-50 border-amber-200 text-amber-800"
                    )}>
                      <p className="font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                        <span>APK Debug / Sandbox Mode Active</span>
                      </p>
                      <p>You can test payments safely. Use PayMongo sandbox test card numbers:</p>
                      <ul className="list-disc pl-4 space-y-0.5 font-mono text-[9px]">
                        <li>Mock Visa Card: <span className="font-bold select-all">4111 1111 1111 4111</span> (Any exp. / any CVV)</li>
                        <li>Mock GCash Phone: <span className="font-bold select-all">09000000000</span> (Any OTP code like 123456)</li>
                      </ul>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-450 dark:text-slate-450 leading-relaxed bg-white/5 rounded-2xl p-3 flex gap-2 items-start">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{uiTexts.securityNotice[language] || uiTexts.securityNotice.en}</span>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={submitting}
                    className={cn(
                      "w-full py-4 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl cursor-pointer active:scale-95 focus:outline-none border select-none duration-150",
                      isDark
                        ? "bg-gradient-to-r from-amber-500 to-amber-600 border-amber-600 text-white hover:brightness-105"
                        : "bg-gradient-to-r from-amber-500 to-amber-600 border-amber-600 text-white hover:brightness-105"
                    )}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sowing Generous Gift...</span>
                      </>
                    ) : (
                      <>
                        <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" />
                        <span>{uiTexts.submitButton[language] || uiTexts.submitButton.en}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )
          ) : (
            // MANUAL OFFLINE STEP
            <div className="space-y-6">
              <p className="text-xs leading-relaxed text-slate-400">
                {uiTexts.manualSubtitle[language] || uiTexts.manualSubtitle.en}
              </p>

              {/* Box container with accounts list */}
              <div className="space-y-4">
                
                {/* Bank Account item */}
                <div className={cn(
                  "p-4 border rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-4 transition-all",
                  isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200"
                )}>
                  <div className="space-y-1.5 flex-1 select-text">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider font-mono uppercase">MOBILE BANK TRANSFER</p>
                    <h4 className={cn("text-xs font-bold capitalize", isDark ? "text-white" : "text-slate-900")}>{BANK_DETAILS.bankName}</h4>
                    <div className={cn("text-xs space-y-0.5", isDark ? "text-slate-300" : "text-slate-700")}>
                      <p>Account Name: <span className={cn("font-semibold", isDark ? "text-slate-100" : "text-slate-800")}>{BANK_DETAILS.accountName}</span></p>
                      <p className="font-mono">Account Number: <span className={cn("font-bold text-xs", isDark ? "text-gold-500" : "text-amber-700")}>{BANK_DETAILS.accountNumber}</span></p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyText(BANK_DETAILS.accountNumber, "bank")}
                    className={cn(
                      "px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer hover:scale-[1.01] active:translate-y-0.5",
                      copiedBank
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : (isDark ? "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10" : "bg-white border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50")
                    )}
                  >
                    {copiedBank ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedBank ? "Copied" : "Copy Account"}</span>
                  </button>
                </div>

                {/* GCash Transfer item */}
                <div className={cn(
                  "p-4 border rounded-2xl flex flex-col md:flex-row justify-between md:items-center gap-4 transition-all",
                  isDark ? "bg-white/[0.02] border-white/5" : "bg-slate-50 border-slate-200"
                )}>
                  <div className="space-y-1.5 flex-1 select-text">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider font-mono uppercase">GCASH ELECTRONIC WALLET</p>
                    <h4 className={cn("text-xs font-bold", isDark ? "text-white" : "text-slate-900")}>GCash / Instapay</h4>
                    <div className={cn("text-xs space-y-0.5", isDark ? "text-slate-300" : "text-slate-700")}>
                      <p>GCash Name: <span className={cn("font-semibold", isDark ? "text-slate-100" : "text-slate-800")}>{BANK_DETAILS.gcashName}</span></p>
                      <p className="font-mono">GCash Mobile: <span className={cn("font-bold text-xs", isDark ? "text-gold-500" : "text-amber-700")}>{BANK_DETAILS.gcashNumber}</span></p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyText(BANK_DETAILS.gcashNumber, "gcash")}
                    className={cn(
                      "px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer hover:scale-[1.01] active:translate-y-0.5",
                      copiedGcash
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : (isDark ? "bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10" : "bg-white border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50")
                    )}
                  >
                    {copiedGcash ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedGcash ? "Copied" : "Copy Number"}</span>
                  </button>
                </div>

                {/* Decorative information card */}
                <div className={cn(
                  "p-4 rounded-2xl text-xs space-y-1.5 leading-relaxed",
                  isDark
                    ? "bg-white/5 border border-white/5 text-slate-400"
                    : "bg-amber-500/5 border border-amber-500/10 text-slate-600"
                )}>
                  <div className={cn(
                    "flex items-center gap-2 font-bold mb-1",
                    isDark ? "text-gold-500" : "text-amber-700"
                  )}>
                    <Info className="w-4 h-4 shrink-0" />
                    <span>How to report your giving:</span>
                  </div>
                  <p>1. Send the amount to either the bank account or GCash details above.</p>
                  <p>2. Take a screenshot of your successful transaction receipt.</p>
                  <p>3. Upload or message the receipt screen directly to the chat inside this app! You can type: <code className={cn("px-1 py-0.5 rounded font-mono text-[11px]", isDark ? "bg-white/5 text-white" : "bg-slate-100 text-slate-800")}>"I have sent an offering of ₱500 via GCash, here is the receipt proof."</code></p>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
