
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

async function request(endpoint, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "Backend se connection nahi ho raha. Check karo ki server port 5000 par chal raha hai."
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null
        ? data.message || data.error
        : data;

    throw new Error(message || `Request failed (${response.status})`);
  }

  return data;
}

// Advertisement APIs
export function getAdvertisements() {
  return request("/ads");
}

export function getCampaigns() {
  return request("/ads/campaigns");
}

export function getDuplicateIndicators() {
  return request("/ads/duplicates");
}

export function getAdvertisementById(id) {
  return request(`/ads/${encodeURIComponent(id)}`);
}

// Investigation dashboard APIs
export function getInvestigations(status = "") {
  const query = status
    ? `?status=${encodeURIComponent(status)}`
    : "";

  return request(`/investigations${query}`);
}

export function getInvestigationByAdId(adId) {
  return request(`/investigations/${encodeURIComponent(adId)}`);
}

export function updateInvestigation(adId, updates) {
  return request(`/investigations/${encodeURIComponent(adId)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}
