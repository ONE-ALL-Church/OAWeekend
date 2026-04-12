import { z } from "zod";

const DeepgramKeyResponse = z.object({
  api_key: z.string(),
});

/**
 * Creates a short-lived Deepgram API key for browser-side WebSocket connections.
 * The key is scoped and expires quickly, keeping the main API key server-side only.
 */
export async function createTemporaryDeepgramKey(): Promise<string> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY not configured");

  const res = await fetch("https://api.deepgram.com/v1/keys", {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      comment: "Temporary browser key",
      scopes: ["usage:write"],
      time_to_live_in_seconds: 30,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Deepgram key creation failed: ${res.status} ${text}`);
  }

  const data = DeepgramKeyResponse.parse(await res.json());
  return data.api_key;
}
