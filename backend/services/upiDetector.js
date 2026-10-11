
const detectUPI = (text = "") => {
  if (typeof text !== "string" || !text.trim()) {
    return [];
  }

  // Common UPI handles. Extend this list as needed.
  const upiRegex =
    /\b[a-zA-Z0-9][a-zA-Z0-9._-]{1,}[a-zA-Z0-9]@(paytm|ybl|ibl|okicici|okaxis|okhdfcbank|oksbi|axl|upi|apl|icici|sbi|hdfcbank|kotak|freecharge|slice|yesbank|federal|indus|jupiter|ikwik)\b/gi;

  const matches = text.match(upiRegex) || [];

  return [...new Set(matches.map((upi) => upi.toLowerCase()))];
};

module.exports = detectUPI;
