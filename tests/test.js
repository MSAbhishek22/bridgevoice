/* BridgeVoice engine tests — run: node tests/test.js */
"use strict";
const assert = require("assert");
const E = require("../engine.js");

let passed = 0;
function t(name, fn) {
  fn();
  passed++;
  console.log("  ok - " + name);
}

console.log("BridgeVoice engine tests");

// ---------- Simplification: English officialese ----------
t("hereby informed -> plain telling", () => {
  const out = E.simplifyText("You are hereby informed that your KYC is pending.");
  assert.ok(out.includes("We are telling you:"), out);
  assert.ok(!/hereby/i.test(out), out);
});
t("requested to + submit + at the earliest", () => {
  const out = E.simplifyText("You are requested to submit the documents at the earliest.");
  assert.ok(out.includes("Please give the documents"), out);
  assert.ok(out.includes("as soon as you can"), out);
});
t("penalty / levied -> extra charge / charged", () => {
  const out = E.simplifyText("A penalty of Rs. 500 will be levied.");
  assert.ok(out.includes("extra charge"), out);
  assert.ok(out.includes("charged"), out);
  assert.ok(!/penalty|levied/i.test(out), out);
});
t("in the event of + prior to", () => {
  const out = E.simplifyText("In the event of non-payment prior to the due date, action will be taken.");
  assert.ok(/^If/.test(out), out);
  assert.ok(out.includes("before the due date"), out);
});
t("unknown plain sentence passes through unchanged", () => {
  assert.strictEqual(E.simplifyText("The cat sat on the mat."), "The cat sat on the mat.");
});
t("empty input simplifies to empty", () => {
  assert.strictEqual(E.simplifyText(""), "");
  assert.strictEqual(E.simplifyText("   "), "");
});

// ---------- Simplification: Hindi officialese ----------
t("Hindi: suchit kiya jata hai -> aapko bata rahe hain", () => {
  const out = E.simplifyText("सूचित किया जाता है कि आपका भुगतान बाकी है।");
  assert.ok(out.includes("आपको बता रहे हैं कि"), out);
});
t("Hindi: antim tithi -> aakhiri taareekh", () => {
  const out = E.simplifyText("कृपया ध्यान दें: अंतिम तिथि 15 दिसंबर है।");
  assert.ok(out.includes("ध्यान दें:"), out);
  assert.ok(out.includes("आखिरी तारीख"), out);
});

// ---------- Sentence splitting / language ----------
t("splitSentences counts . ! ?", () => {
  assert.strictEqual(E.splitSentences("One. Two! Three?").length, 3);
});
t("splitSentences handles Hindi danda", () => {
  assert.strictEqual(E.splitSentences("पहला वाक्य। दूसरा वाक्य।").length, 2);
});
t("splitSentences does not split on Rs. abbreviation", () => {
  assert.strictEqual(E.splitSentences("The amount of Rs. 2,350 is due. Pay it.").length, 2);
  const out = E.simplifyText("The total amount of Rs. 2,350 is to be paid.");
  assert.ok(!out.includes(" Is "), out);
});
t("a penalty -> an extra charge (article kept correct)", () => {
  const out = E.simplifyText("You will pay a penalty.");
  assert.ok(out.includes("an extra charge"), out);
});
t("detectLang", () => {
  assert.strictEqual(E.detectLang("Pay your bill"), "en");
  assert.strictEqual(E.detectLang("अपना बिल भरें"), "hi");
});

// ---------- Dates ----------
t("date DD/MM/YYYY normalised", () => {
  assert.deepStrictEqual(E.extractDates("Pay on or before 15/12/2026."), ["15 December 2026"]);
});
t("date with ordinal month name", () => {
  assert.deepStrictEqual(E.extractDates("Your appointment is on 3rd January 2027."), ["3 January 2027"]);
});
t("date Month D, YYYY", () => {
  assert.deepStrictEqual(E.extractDates("Offer ends December 5, 2026."), ["5 December 2026"]);
});
t("duplicate dates deduped", () => {
  assert.strictEqual(E.extractDates("Due 15/12/2026, again 15/12/2026.").length, 1);
});
t("no false date from a bare year", () => {
  assert.deepStrictEqual(E.extractDates("Room 45 on floor 3 in 2026."), []);
});

// ---------- Amounts ----------
t("amount with rupee symbol", () => {
  assert.deepStrictEqual(E.extractAmounts("Pay ₹1,840 now."), ["₹1,840"]);
});
t("amount with Rs. normalised to symbol", () => {
  assert.deepStrictEqual(E.extractAmounts("Fine of Rs. 500 applies."), ["₹500"]);
});
t("amount with rupees word", () => {
  assert.deepStrictEqual(E.extractAmounts("Pay 750 rupees only."), ["₹750"]);
});
t("multiple amounts keep text order", () => {
  assert.deepStrictEqual(E.extractAmounts("₹1,840 and later Rs. 500"), ["₹1,840", "₹500"]);
});

// ---------- Phones ----------
t("phone +91 spaced mobile normalised", () => {
  assert.deepStrictEqual(E.extractPhones("Call +91 98110 12345 today."), ["+919811012345"]);
});
t("phone plain 10-digit mobile", () => {
  assert.deepStrictEqual(E.extractPhones("Mobile 9811012345."), ["9811012345"]);
});
t("phone toll-free 1800", () => {
  assert.deepStrictEqual(E.extractPhones("Toll free 1800-123-4567."), ["18001234567"]);
});
t("helpline 108 only when framed as helpline", () => {
  assert.ok(E.extractPhones("Emergency helpline 108.").includes("108"));
  assert.deepStrictEqual(E.extractPhones("Room 108 is ready."), []);
});
t("no phone from a year", () => {
  assert.deepStrictEqual(E.extractPhones("In 2026 the fee is due."), []);
});

// ---------- Deadlines ----------
t("deadline: on or before + date", () => {
  const d = E.extractDeadlines("Pay the bill on or before 15/12/2026 to avoid charges.");
  assert.strictEqual(d.length, 1);
  assert.strictEqual(d[0].date, "15 December 2026");
});
t("deadline: within X days note", () => {
  const d = E.extractDeadlines("Your report will be ready within 7 days.");
  assert.strictEqual(d.length, 1);
  assert.strictEqual(d[0].note, "Within 7 days");
});
t("plain date is not a deadline", () => {
  assert.deepStrictEqual(E.extractDeadlines("The festival is on 25/12/2026."), []);
});

// ---------- Action cards ----------
const BILL = "Your electricity bill of ₹1,840 is pending. Pay on or before 15/12/2026, failing which your supply will be disconnected. For any queries, call 1800-123-4567.";
t("action cards: deadline + amount + phone from a bill notice", () => {
  const cards = E.buildActionCards(BILL);
  const types = cards.map((c) => c.type);
  assert.ok(types.includes("deadline"), types.join(","));
  assert.ok(types.includes("amount"), types.join(","));
  assert.ok(types.includes("phone"), types.join(","));
  const amt = cards.find((c) => c.type === "amount");
  assert.strictEqual(amt.value, "₹1,840");
  const dl = cards.find((c) => c.type === "deadline");
  assert.strictEqual(dl.value, "15 December 2026");
});
t("action cards: empty input -> no cards", () => {
  assert.deepStrictEqual(E.buildActionCards(""), []);
});
t("action cards: phone card detail finds its sentence", () => {
  const cards = E.buildActionCards(BILL);
  const ph = cards.find((c) => c.type === "phone");
  assert.ok(ph.detail.includes("call"), ph.detail);
});

console.log("\nAll " + passed + " tests passed.");
