/**
 * Creates a temporary Deepgram API key scoped to usage only.
 *
 * Requires DEEPGRAM_API_KEY and DEEPGRAM_PROJECT_ID to be set.
 * If DEEPGRAM_PROJECT_ID is not configured, falls back to the main key
 * (acceptable when the endpoint is auth-gated by middleware).
 */
export async function createTemporaryDeepgramKey(): Promise<string> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY not configured");

  const projectId = process.env.DEEPGRAM_PROJECT_ID;
  if (!projectId) {
    console.warn(
      "[deepgram] DEEPGRAM_PROJECT_ID not set — returning main API key. " +
        "Set DEEPGRAM_PROJECT_ID to enable short-lived scoped keys."
    );
    return apiKey.trim();
  }

  const res = await fetch(
    `https://api.deepgram.com/v1/projects/${projectId}/keys`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        comment: `temp-key-${Date.now()}`,
        scopes: ["usage:write"],
        time_to_live_in_seconds: 60,
      }),
    }
  );

  if (!res.ok) {
    console.error(
      `[deepgram] Failed to create temp key (${res.status}), falling back to main key`
    );
    return apiKey.trim();
  }

  const data = await res.json();
  return data.key;
}
