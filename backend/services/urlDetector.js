
const detectURL = (text = "") => {
  if (typeof text !== "string" || !text.trim()) {
    return [];
  }

  // Detect full URLs and common domain-style links.
  const urlRegex =
    /(?:https?:\/\/|www\.)[^\s<>"']+|(?<![@\w])(?:t\.me|wa\.me|bit\.ly|tinyurl\.com)\/[^\s<>"']+|(?<![@\w])(?:[a-zA-Z0-9-]+\.)+(?:com|in|net|org|io|co|app|xyz|site|info|online|biz|me|ly)(?:\/[^\s<>"']*)?/gi;

  const matches = text.match(urlRegex) || [];

  // Remove punctuation accidentally captured at the end.
  const cleaned = matches.map((url) =>
    url.replace(/[.,!?;:)\]}]+$/g, "")
  );

  return [...new Set(cleaned)];
};

module.exports = detectURL;
