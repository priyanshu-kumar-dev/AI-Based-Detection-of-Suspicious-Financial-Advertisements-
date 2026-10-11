const dns = require("node:dns/promises");
const net = require("node:net");
const cheerio = require("cheerio");

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 10000;

function isPrivateIPv4(ip) {
  const p = ip.split(".").map(Number);

  if (
    p.length !== 4 ||
    p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
  ) {
    return true;
  }

  return (
    p[0] === 0 ||
    p[0] === 10 ||
    p[0] === 127 ||
    (p[0] === 169 && p[1] === 254) ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168) ||
    (p[0] === 100 && p[1] >= 64 && p[1] <= 127) ||
    p[0] >= 224
  );
}

function isPrivateIPv6(ip) {
  const address = ip.toLowerCase().split("%")[0];

  if (
    address === "::" ||
    address === "::1" ||
    address.startsWith("fc") ||
    address.startsWith("fd") ||
    /^fe[89ab]/.test(address) ||
    address.startsWith("ff")
  ) {
    return true;
  }

  // IPv4-mapped IPv6 addresses
  if (address.startsWith("::ffff:")) {
    const ipv4 = address.slice("::ffff:".length);

    if (net.isIP(ipv4) === 4) {
      return isPrivateIPv4(ipv4);
    }

    return true;
  }

  // Reject other IPv6 forms unless explicitly validated.
  return true;
}

function isPrivateIP(ip) {
  const version = net.isIP(ip);

  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);

  return true;
}

function getAllowedHosts() {
  return (process.env.ALLOWED_SOURCE_HOSTS || "")
    .split(",")
    .map((host) => host.trim().toLowerCase().replace(/\.$/, ""))
    .filter(Boolean);
}

function hostIsAllowed(hostname, allowedHosts) {
  return allowedHosts.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`)
  );
}

async function validateSourceUrl(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    const error = new Error("Please provide a valid webpage URL.");
    error.status = 400;
    throw error;
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    const error = new Error("Only HTTP and HTTPS URLs are supported.");
    error.status = 400;
    throw error;
  }

  if (url.username || url.password) {
    const error = new Error("URLs containing credentials are not allowed.");
    error.status = 400;
    throw error;
  }

  if (url.port && !["80", "443"].includes(url.port)) {
    const error = new Error("Only standard HTTP/HTTPS ports are allowed.");
    error.status = 400;
    throw error;
  }

  const hostname = url.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");

  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    net.isIP(hostname)
  ) {
    const error = new Error("IP addresses and local hosts are not allowed.");
    error.status = 400;
    throw error;
  }

  const allowedHosts = getAllowedHosts();

  // FIX: Only enforce allowlist when ALLOWED_SOURCE_HOSTS is set.
  // If env is empty → allow all public hosts (good for development).
  if (allowedHosts.length > 0 && !hostIsAllowed(hostname, allowedHosts)) {
    const error = new Error(
      "This source is not approved. Add its domain to ALLOWED_SOURCE_HOSTS."
    );
    error.status = 403;
    throw error;
  }

  let addresses;

  try {
    addresses = await dns.lookup(hostname, {
      all: true,
      verbatim: true,
    });
  } catch {
    const error = new Error("Could not resolve the source hostname.");
    error.status = 400;
    throw error;
  }

  if (
    !addresses.length ||
    addresses.some(({ address }) => isPrivateIP(address))
  ) {
    const error = new Error("The source resolves to a restricted IP address.");
    error.status = 403;
    throw error;
  }

  return url;
}

async function readLimitedBody(response) {
  const declaredLength = Number(
    response.headers.get("content-length") || 0
  );

  if (declaredLength > MAX_BODY_BYTES) {
    throw new Error("The source is too large to process (maximum 2 MB).");
  }

  if (!response.body) {
    throw new Error("The source returned an empty response.");
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      totalBytes += value.byteLength;

      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error("The source is too large to process (maximum 2 MB).");
      }

      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function fetchSourceText(inputUrl) {
  let currentUrl = inputUrl;
  let response;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    // Every redirect is validated again.
    const url = await validateSourceUrl(currentUrl);

    response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent": "FinShieldAI-ResearchPrototype/1.0",
        Accept: "text/html, text/plain",
      },
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      break;
    }

    const location = response.headers.get("location");

    if (!location) {
      throw new Error("The source returned an invalid redirect.");
    }

    if (redirects === MAX_REDIRECTS) {
      throw new Error("Too many redirects from the source.");
    }

    currentUrl = new URL(location, url).href;
  }

  if (!response) {
    throw new Error("Could not retrieve the source.");
  }

  if (!response.ok) {
    const error = new Error(`Source returned HTTP ${response.status}.`);
    error.status = response.status;
    throw error;
  }

  const contentType = (
    response.headers.get("content-type") || ""
  ).toLowerCase();

  const isHtml = /^text\/html(?:\s*;|$)/i.test(contentType);
  const isPlainText = /^text\/plain(?:\s*;|$)/i.test(contentType);

  if (!isHtml && !isPlainText) {
    throw new Error("This source must return HTML or plain text.");
  }

  const body = await readLimitedBody(response);

  if (isPlainText) {
    const text = body.trim();

    if (!text) {
      throw new Error("No readable text was found at this URL.");
    }

    return { text, sourceUrl: currentUrl };
  }

  const $ = cheerio.load(body);

  $("script, style, noscript, nav, footer, header, iframe, form").remove();

  const title = $("title").text().trim();
  const text = $("body").text().replace(/\s+/g, " ").trim();

  if (!text) {
    throw new Error("No readable webpage text was found.");
  }

  return {
    text: [title, text].filter(Boolean).join("\n"),
    sourceUrl: currentUrl,
  };
}

module.exports = { fetchSourceText };