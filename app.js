/* BridgeVoice UI wiring — samples, render, read-aloud. Engine lives in engine.js. */
(function () {
  "use strict";
  var E = window.BridgeVoiceEngine;

  var SAMPLES = [
    {
      title: "Bank KYC letter",
      text: "Dear Customer, You are hereby informed that the verification of your savings account is pending. You are requested to submit your Aadhaar card and PAN card at the nearest branch at the earliest. Kindly note that a minimum balance of ₹5,000 is required to be maintained in the account. In the event of non-compliance on or before 30/11/2026, the account shall be liable to a penalty and transactions may be discontinued. For any queries, kindly contact our helpline 1800-270-1234 or call +91 98110 12345."
    },
    {
      title: "Hospital discharge note",
      text: "Discharge Summary. The patient is advised to take the prescribed medicines for 5 days and maintain complete rest. A follow-up visit is required on 5th December 2026 at the OPD desk. In case of any discrepancy in the report, kindly contact the hospital at the earliest. In the event of high fever or breathlessness, immediately call the emergency helpline 108. The total amount of Rs. 2,350 is to be paid prior to discharge."
    },
    {
      title: "बिजली बिल चेतावनी",
      text: "प्रिय उपभोक्ता, सूचित किया जाता है कि आपका बिजली बिल बकाया है। देय राशि ₹1,840 है। कृपया ध्यान दें: अंतिम तिथि 15/12/2026 है। विफल रहने पर आपकी बिजली काट दी जाएगी। किसी भी सहायता के लिए 1800-123-4567 पर संपर्क करें।"
    }
  ];

  var input = document.getElementById("noticeInput");
  var simpleOut = document.getElementById("simpleOut");
  var cardsEl = document.getElementById("cards");
  var cardsEmpty = document.getElementById("cardsEmpty");
  var currentSimple = "";

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function render() {
    var raw = input.value;
    if (!raw.trim()) {
      simpleOut.innerHTML = '<p class="placeholder">Paste a notice on the left, then press <strong>Simplify</strong>. The same words, made simple, will appear here — big and clear.</p>';
      cardsEl.innerHTML = "";
      cardsEmpty.style.display = "";
      currentSimple = "";
      return;
    }
    var sentences = E.splitSentences(raw).map(E.simplifySentence);
    currentSimple = sentences.join(" ");
    simpleOut.innerHTML = sentences.map(function (s) { return "<p>" + esc(s) + "</p>"; }).join("");
    var cards = E.buildActionCards(raw);
    cardsEmpty.style.display = cards.length ? "none" : "";
    cardsEl.innerHTML = cards.map(function (c, i) {
      return '<article class="card ' + esc(c.type) + '" style="--d:' + (i * 0.07).toFixed(2) + 's">' +
        '<div class="card-icon" aria-hidden="true">' + c.icon + "</div>" +
        '<p class="card-title">' + esc(c.title) + "</p>" +
        '<div class="card-value">' + esc(c.value) + "</div>" +
        (c.detail ? '<p class="card-detail">' + esc(c.detail) + "</p>" : "") +
        "</article>";
    }).join("");
  }

  // Sample chips
  Array.prototype.forEach.call(document.querySelectorAll("[data-sample]"), function (chip) {
    chip.addEventListener("click", function () {
      var s = SAMPLES[+chip.getAttribute("data-sample")];
      input.value = s.text;
      stopSpeaking();
      render();
      input.focus();
    });
  });

  document.getElementById("simplifyBtn").addEventListener("click", render);
  document.getElementById("clearBtn").addEventListener("click", function () {
    input.value = ""; stopSpeaking(); render(); input.focus();
  });
  document.getElementById("bigToggle").addEventListener("change", function (ev) {
    document.body.classList.toggle("big", ev.target.checked);
  });
  document.getElementById("copyBtn").addEventListener("click", function () {
    if (!currentSimple) return;
    var btn = this;
    function done() { btn.textContent = "Copied ✓"; setTimeout(function () { btn.textContent = "Copy"; }, 1600); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentSimple).then(done, done);
    } else {
      var ta = document.createElement("textarea");
      ta.value = currentSimple; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) { /* clipboard unavailable */ }
      document.body.removeChild(ta); done();
    }
  });

  // ---------- Read aloud (Web Speech API, built into the browser) ----------
  function pickVoice(lang) {
    var voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    var want = lang === "hi" ? ["hi"] : ["en-IN", "en_IN", "en"];
    for (var w = 0; w < want.length; w++) {
      for (var i = 0; i < voices.length; i++) {
        if (voices[i].lang && voices[i].lang.replace("_", "-").toLowerCase().indexOf(want[w].toLowerCase()) === 0) return voices[i];
      }
    }
    return null;
  }
  function speak() {
    if (!("speechSynthesis" in window)) {
      simpleOut.insertAdjacentHTML("beforeend", '<p class="placeholder">Sorry — this browser cannot read aloud. Try Chrome or Edge.</p>');
      return;
    }
    if (!currentSimple) render();
    if (!currentSimple) return;
    window.speechSynthesis.cancel();
    var lang = E.detectLang(currentSimple);
    var utter = new SpeechSynthesisUtterance(currentSimple);
    utter.lang = lang === "hi" ? "hi-IN" : "en-IN";
    utter.rate = 0.92;
    var voice = pickVoice(lang);
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  }
  function stopSpeaking() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }
  document.getElementById("speakBtn").addEventListener("click", speak);
  document.getElementById("stopBtn").addEventListener("click", stopSpeaking);
  if ("speechSynthesis" in window) window.speechSynthesis.onvoiceschanged = function () { /* voices warm-up */ };

  // First screen should already show the magic: load sample 1 and simplify.
  input.value = SAMPLES[0].text;
  render();
})();
