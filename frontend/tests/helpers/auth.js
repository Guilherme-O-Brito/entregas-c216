export const SESSION_KEY = "movie-list.session";

export function accessToken(expiresAt) {
  const payload = btoa(JSON.stringify({ sub: "1", exp: expiresAt }))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
  return `header.${payload}.signature`;
}

export function tokens(expiresAt = Math.floor(Date.now() / 1000) + 3600) {
  return {
    access_token: accessToken(expiresAt),
    refresh_token: "example-refresh-token",
  };
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
