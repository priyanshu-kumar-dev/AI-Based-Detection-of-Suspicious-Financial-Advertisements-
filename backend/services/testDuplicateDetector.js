
const {
  detectDuplicate,
} = require("./duplicateDetector");

const candidate = {
  text: "Bank account available for rent. Contact 9876543210",
  phones: ["9876543210"],
  upis: ["dealer786@paytm"],
  urls: ["t.me/bankaccsell"],
};

const existingAds = [
  {
    _id: "demo-1",
    text: "BANK ACCOUNT AVAILABLE FOR RENT. Contact 9876543210",
    phones: ["9876543210"],
    upis: ["dealer786@paytm"],
    urls: ["t.me/bankaccsell"],
  },
];

const result = detectDuplicate(candidate, existingAds);

console.log(JSON.stringify(result, null, 2));
