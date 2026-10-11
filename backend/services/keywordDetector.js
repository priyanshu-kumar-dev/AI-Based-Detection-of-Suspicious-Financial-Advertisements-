const { high = [], medium = [] } = require("../config/keywords");

const normalize = (text = "") =>
  String(text)
    .toLowerCase()
    .replace(/[\s_-]+/g, " ")
    .trim();

const detectKeywords = (text = "") => {
  if (typeof text !== "string" || !text.trim()) {
    return [];
  }

  const normalizedText = normalize(text);
  const allKeywords = [...new Set([...high, ...medium])];

  return allKeywords.filter((keyword) => {
    const normalizedKeyword = normalize(keyword);

    if (!normalizedKeyword) {
      return false;
    }

    // Escape regex special characters safely.
    const escaped = normalizedKeyword.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    // Match complete words and phrases, not partial words.
    const pattern = new RegExp(
      `(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`,
      "i"
    );

    return pattern.test(normalizedText);
  });
};

module.exports = detectKeywords;