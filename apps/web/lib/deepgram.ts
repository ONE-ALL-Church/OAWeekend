/**
 * Grants a short-lived Deepgram JWT for browser-side WebSocket auth.
 *
 * This avoids exposing the long-lived API key and does not require project
 * management scopes like project key creation does.
 */
export async function createTemporaryDeepgramKey(): Promise<string> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY not configured");

  const res = await fetch("https://api.deepgram.com/v1/auth/grant", {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ttl_seconds: 60,
    }),
  });

  if (!res.ok) {
    throw new Error(
      `[deepgram] Failed to grant temp token (${res.status}). Check DEEPGRAM_API_KEY permissions.`
    );
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error("[deepgram] Missing access_token in auth grant response.");
  }

  return data.access_token;
}
