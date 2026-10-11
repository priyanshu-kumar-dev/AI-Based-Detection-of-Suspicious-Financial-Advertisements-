
const { scoreAd } = require("./riskScorer");

const testCases = [
  {
    name: "Suspicious account rental",
    text: "Earn commission by renting your account. WhatsApp 9876543210. UPI: dealer786@paytm.",
    indicators: {
      phones: ["9876543210"],
      upiIds: ["dealer786@paytm"],
      urls: [],
    },
  },
  {
    name: "Explicit account rental offer",
    text: "Bank account available for rent. Contact 9876543210. UPI: dealer786@paytm.",
    indicators: {
      phones: ["9876543210"],
      upiIds: ["dealer786@paytm"],
      urls: [],
    },
  },
  {
    name: "Awareness message",
    text: "Never sell or rent your bank account. Report suspicious messages to your bank.",
    indicators: {
      phones: [],
      upiIds: [],
      urls: [],
    },
  },
  {
    name: "Benign example webpage",
    text: "This domain is for use in documentation examples.",
    indicators: {
      phones: [],
      upiIds: [],
      urls: [],
    },
  },
];

for (const test of testCases) {
  const result = scoreAd(
    { text: test.text, ocrText: "" },
    test.indicators
  );

  console.log("\n-----------------------------");
  console.log(test.name);
  console.log("Score:", result.score);
  console.log("Risk:", result.level);
  console.log("Awareness:", result.awarenessPost);
  console.log("Matched:", result.matched);
  console.log("Reasons:", result.reasons);
}
