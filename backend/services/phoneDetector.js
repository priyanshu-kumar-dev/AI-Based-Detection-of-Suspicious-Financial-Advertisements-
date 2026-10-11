
const detectPhone = (text = "") => {
  if (typeof text !== "string" || !text.trim()) {
    return [];
  }

  // Indian mobile numbers:
  // 9876543210
  // +91 98765 43210
  // 98765-43210
  // 91-9876543210
  const phoneRegex =
    /(?:\+?91[\s.-]?)?[6-9]\d{4}[\s.-]?\d{5}\b/g;

  const matches = text.match(phoneRegex) || [];

  // Normalize numbers and remove duplicates.
  const phones = matches
    .map((phone) => phone.replace(/\D/g, ""))
    .map((phone) => {
      if (phone.length === 12 && phone.startsWith("91")) {
        return phone.slice(2);
      }
      return phone;
    })
    .filter((phone) => /^[6-9]\d{9}$/.test(phone));

  return [...new Set(phones)];
};

module.exports = detectPhone;
