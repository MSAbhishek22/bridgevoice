/* BridgeVoice engine — deterministic notice simplifier + extractors.
   Built fresh on 18 Nov 2026 for Bridge The Gap Hacks.
   No AI, no API, no network: a written phrase map + regex extractors.
   Runs in the browser (window.BridgeVoiceEngine) and in Node (tests). */
(function (global) {
  "use strict";

  /* Phrase map: [complex phrase, simple equivalent].
     Latin entries match case-insensitively on word boundaries.
     Devanagari entries match as plain substrings (JS \b is ASCII-only).
     Applied longest-first so longer phrases win over their own parts. */
  var PHRASE_MAP = [
    // ---- English officialese -> plain English ----
    ["it is to inform you that", "we are telling you:"],
    ["this is to inform you that", "we are telling you:"],
    ["we wish to inform you that", "we are telling you:"],
    ["you are hereby informed that", "we are telling you:"],
    ["in case of any discrepancy", "if anything looks wrong"],
    ["due to the fact that", "because"],
    ["in accordance with", "according to the rule"],
    ["with effect from", "from"],
    ["with reference to", "about"],
    ["in connection with", "about"],
    ["in respect of", "about"],
    ["kindly note that", "please note:"],
    ["please note that", "note:"],
    ["you are requested to", "please"],
    ["you are advised to", "you should"],
    ["are required to", "must"],
    ["is required to", "must"],
    ["are advised to", "should"],
    ["is advised to", "should"],
    ["outstanding amount", "amount still to pay"],
    ["a minimum of", "at least"],
    ["a maximum of", "at most"],
    ["no later than", "before"],
    ["on or before", "before"],
    ["at the earliest", "as soon as you can"],
    ["at your convenience", "when it suits you"],
    ["failing to do so", "if you do not do this"],
    ["in the event of", "if"],
    ["in order to", "to"],
    ["in lieu of", "instead of"],
    ["on behalf of", "for"],
    ["prior to", "before"],
    ["subsequent to", "after"],
    ["will be liable to", "may have to"],
    ["will result in", "will cause"],
    ["may result in", "may cause"],
    ["for any queries", "for any questions"],
    ["do the needful", "do what is needed"],
    ["the undersigned", "I"],
    ["aforementioned", "this"],
    ["notwithstanding", "even if"],
    ["nevertheless", "but"],
    ["consequently", "so"],
    ["in case of", "if"],
    ["failing which", "if you do not do this,"],
    ["hereinafter", ""],
    ["therefore", "so"],
    ["regarding", "about"],
    ["concerning", "about"],
    ["assistance", "help"],
    ["queries", "questions"],
    ["approximately", "about"],
    ["sufficient", "enough"],
    ["insufficient", "not enough"],
    ["immediately", "right away"],
    ["commence", "start"],
    ["terminate", "end"],
    ["discontinue", "stop"],
    ["maintain", "keep"],
    ["furnish", "give"],
    ["submit", "give"],
    ["avail", "use"],
    ["facility", "service"],
    ["premises", "building"],
    ["residence", "home"],
    ["occupation", "work"],
    ["remittance", "money sent"],
    ["defaulter", "person who has not paid"],
    ["disconnection", "cutting the supply"],
    ["arrears", "unpaid bills"],
    ["outstanding", "still to pay"],
    ["verification", "checking"],
    ["authenticate", "prove it is you"],
    ["validity", "last date it works"],
    ["expiry", "last date"],
    ["expire", "stop working"],
    ["a penalty of", "an extra charge of"],
    ["a penalty", "an extra charge"],
    ["penalty", "extra charge"],
    ["levied", "charged"],
    ["per annum", "per year"],
    ["kindly", "please"],
    ["hereby", "now"],
    ["shall", "will"],
    // ---- Hindi officialese -> simple Hindi ----
    ["सूचित किया जाता है कि", "आपको बता रहे हैं कि"],
    ["कृपया ध्यान दें", "ध्यान दें:"],
    ["विफल रहने पर", "अगर आप नहीं कर पाए तो"],
    ["अति आवश्यक", "बहुत ज़रूरी"],
    ["अंतिम तिथि", "आखिरी तारीख"],
    ["अनुरोध है कि", "कृपया"],
    ["देय राशि", "देने वाले पैसे"],
    ["बकाया राशि", "बचे हुए पैसे"],
    ["सत्यापन", "जांच"],
    ["अन्यथा", "नहीं तो"],
    ["शीघ्र", "जल्दी"]
  ];

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function hasDevanagari(s) {
    return /[\u0900-\u097F]/.test(s);
  }

  function detectLang(text) {
    return hasDevanagari(text || "") ? "hi" : "en";
  }

  // Sorted once, longest phrase first.
  var SORTED_MAP = PHRASE_MAP.slice().sort(function (a, b) {
    return b[0].length - a[0].length;
  });

  function applyPhraseMap(sentence) {
    var out = sentence;
    for (var i = 0; i < SORTED_MAP.length; i++) {
      var from = SORTED_MAP[i][0], to = SORTED_MAP[i][1];
      if (hasDevanagari(from)) {
        if (out.indexOf(from) !== -1) out = out.split(from).join(to);
      } else {
        var re = new RegExp("\\b" + escapeRegExp(from) + "\\b", "gi");
        out = out.replace(re, function (match) {
          // Keep a capital first letter when the match started the sentence.
          return to;
        });
      }
    }
    return out;
  }

  function tidy(s) {
    return s
      .replace(/\s+/g, " ")
      .replace(/\s+([,.;:!?।])/g, "$1")
      .replace(/:\s*:/g, ":")
      .trim();
  }

  function capitalise(s) {
    var m = s.match(/[A-Za-z\u0900-\u097F]/);
    if (!m) return s;
    var idx = s.indexOf(m[0]);
    return s.slice(0, idx) + s.charAt(idx).toUpperCase() + s.slice(idx + 1);
  }

  function splitSentences(text) {
    if (!text) return [];
    // Protect abbreviation dots (Rs., Dr.) and decimals (2.5) from the splitter.
    var clean = String(text).replace(/\r\n/g, "\n")
      .replace(/\b(Rs|Dr|Mr|Mrs|Ms|St|No|approx)\./gi, "$1\u0001")
      .replace(/(\d)\.(\d)/g, "$1\u0001$2");
    var parts = clean.match(/[^.!?।\n]+[.!?।]*/g) || [];
    return parts.map(function (p) { return p.replace(/\u0001/g, ".").trim(); }).filter(Boolean);
  }

  function simplifySentence(sentence) {
    return capitalise(tidy(applyPhraseMap(sentence)));
  }

  function simplifyText(text) {
    if (!text || !String(text).trim()) return "";
    return splitSentences(text).map(simplifySentence).join(" ");
  }

  /* ---------------- Extractors (regex, deterministic) ---------------- */

  var MONTHS = {
    january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
    may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8,
    september: 9, sep: 9, sept: 9, october: 10, oct: 10,
    november: 11, nov: 11, december: 12, dec: 12
  };
  var MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  function validDate(d, m, y) {
    return m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2100;
  }
  function fmtDate(d, m, y) { return d + " " + MONTH_NAMES[m] + " " + y; }

  function extractDates(text) {
    if (!text) return [];
    var found = []; // {index, value}
    var m;
    var reNum = /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/g;
    while ((m = reNum.exec(text)) !== null) {
      var d = +m[1], mo = +m[2], y = +m[3];
      if (validDate(d, mo, y)) found.push({ index: m.index, value: fmtDate(d, mo, y) });
    }
    var monthAlt = Object.keys(MONTHS).join("|");
    var reDMY = new RegExp("\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(" + monthAlt + ")\\s*,?\\s+(\\d{4})\\b", "gi");
    while ((m = reDMY.exec(text)) !== null) {
      d = +m[1]; mo = MONTHS[m[2].toLowerCase()]; y = +m[3];
      if (validDate(d, mo, y)) found.push({ index: m.index, value: fmtDate(d, mo, y) });
    }
    var reMDY = new RegExp("\\b(" + monthAlt + ")\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*,?\\s+(\\d{4})\\b", "gi");
    while ((m = reMDY.exec(text)) !== null) {
      mo = MONTHS[m[1].toLowerCase()]; d = +m[2]; y = +m[3];
      if (validDate(d, mo, y)) found.push({ index: m.index, value: fmtDate(d, mo, y) });
    }
    found.sort(function (a, b) { return a.index - b.index; });
    var seen = {}, out = [];
    found.forEach(function (f) { if (!seen[f.value]) { seen[f.value] = 1; out.push(f.value); } });
    return out;
  }

  function extractAmounts(text) {
    if (!text) return [];
    var found = [], m;
    function pushAmt(index, numStr) {
      var num = numStr.replace(/,/g, "");
      if (!/^\d+(\.\d{1,2})?$/.test(num)) return;
      var pretty = Number(num).toLocaleString("en-IN", { maximumFractionDigits: 2 });
      found.push({ index: index, value: "₹" + pretty });
    }
    var reSym = /₹\s?([\d,]+(?:\.\d{1,2})?)/g;
    while ((m = reSym.exec(text)) !== null) pushAmt(m.index, m[1]);
    var reRs = /\b(?:Rs\.?|INR)\s?([\d,]+(?:\.\d{1,2})?)/gi;
    while ((m = reRs.exec(text)) !== null) pushAmt(m.index, m[1]);
    var reWord = /\b([\d,]+(?:\.\d{1,2})?)\s?(?:rupees|रुपये|रुपया)/gi;
    while ((m = reWord.exec(text)) !== null) pushAmt(m.index, m[1]);
    found.sort(function (a, b) { return a.index - b.index; });
    var seen = {}, out = [];
    found.forEach(function (f) { if (!seen[f.value]) { seen[f.value] = 1; out.push(f.value); } });
    return out;
  }

  function extractPhones(text) {
    if (!text) return [];
    var found = [], m;
    function pushPhone(index, raw, keepPlus) {
      var digits = raw.replace(/[^\d]/g, "");
      var value;
      if (digits.length === 12 && digits.indexOf("91") === 0) value = "+91" + digits.slice(2);
      else value = digits;
      if (value.length >= 10 || value === "108" || value === "112") {
        found.push({ index: index, value: value });
      }
    }
    var reMobile = /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/g;
    while ((m = reMobile.exec(text)) !== null) pushPhone(m.index, m[0]);
    var reToll = /\b1800[\s-]?\d{3}[\s-]?\d{4}\b/g;
    while ((m = reToll.exec(text)) !== null) pushPhone(m.index, m[0]);
    // Emergency short numbers count only when the text frames them as a helpline.
    if (/helpline|emergency|आपात|हेल्पलाइन/i.test(text)) {
      var reEm = /\b(108|112|100)\b/g;
      while ((m = reEm.exec(text)) !== null) pushPhone(m.index, m[1]);
    }
    found.sort(function (a, b) { return a.index - b.index; });
    var seen = {}, out = [];
    found.forEach(function (f) { if (!seen[f.value]) { seen[f.value] = 1; out.push(f.value); } });
    return out;
  }

  var DEADLINE_KEYWORDS = /(before|\bby\b|last date|deadline|no later than|within|अंतिम तिथि|आखिरी तारीख|के पहले|तक जमा|तक भर|तक भुगतान)/i;

  function extractDeadlines(text) {
    if (!text) return [];
    var out = [];
    splitSentences(text).forEach(function (sentence) {
      var within = sentence.match(/within\s+(\d+)\s+days/i);
      var dates = extractDates(sentence);
      if (dates.length && DEADLINE_KEYWORDS.test(sentence)) {
        out.push({ date: dates[0], note: null, sentence: sentence });
      } else if (within) {
        out.push({ date: null, note: "Within " + within[1] + " days", sentence: sentence });
      }
    });
    return out;
  }

  function findSentence(sentences, needle) {
    for (var i = 0; i < sentences.length; i++) {
      if (sentences[i].indexOf(needle) !== -1) return sentences[i];
    }
    return "";
  }

  /* Action cards: Kab (when) · Kitna (how much) · Kisko call karein (who to call) */
  function buildActionCards(text) {
    if (!text || !String(text).trim()) return [];
    var sentences = splitSentences(text);
    var cards = [];
    var deadlines = extractDeadlines(text);
    var deadlineDates = {};
    deadlines.forEach(function (dl) {
      if (dl.date) deadlineDates[dl.date] = 1;
      cards.push({
        type: "deadline", icon: "📅",
        title: "Kab tak? · Last date",
        value: dl.date || dl.note,
        detail: simplifySentence(dl.sentence)
      });
    });
    extractDates(text).forEach(function (date) {
      if (!deadlineDates[date]) {
        cards.push({
          type: "date", icon: "🗓️",
          title: "Kab? · Date",
          value: date,
          detail: simplifySentence(findSentence(sentences, date.split(" ")[0]) || sentences[0] || "")
        });
      }
    });
    extractAmounts(text).slice(0, 3).forEach(function (amt) {
      cards.push({
        type: "amount", icon: "💰",
        title: "Kitna? · Amount",
        value: amt,
        detail: simplifySentence(findSentence(sentences, amt.replace("₹", "")) || findSentence(sentences, "₹") || "")
      });
    });
    extractPhones(text).slice(0, 3).forEach(function (phone) {
      var digits = phone.replace(/\D/g, "");
      var match = "";
      for (var i = 0; i < sentences.length; i++) {
        if (sentences[i].replace(/\D/g, "").indexOf(digits) !== -1) { match = sentences[i]; break; }
      }
      cards.push({
        type: "phone", icon: "📞",
        title: "Kisko call karein? · Call",
        value: phone,
        detail: match ? simplifySentence(match) : ""
      });
    });
    return cards;
  }

  var api = {
    PHRASE_MAP: PHRASE_MAP,
    detectLang: detectLang,
    splitSentences: splitSentences,
    simplifySentence: simplifySentence,
    simplifyText: simplifyText,
    extractDates: extractDates,
    extractAmounts: extractAmounts,
    extractPhones: extractPhones,
    extractDeadlines: extractDeadlines,
    buildActionCards: buildActionCards
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.BridgeVoiceEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
