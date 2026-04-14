/**
 * Creates a temporary Deepgram API key scoped to usage only.
 *
 * Requires both DEEPGRAM_API_KEY and DEEPGRAM_PROJECT_ID to be set.
 * Never falls back to the main API key — that would expose a permanent,
 * fully-privileged key to the browser.
 */
export async function createTemporaryDeepgramKey(): Promise<string> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY not configured");

  const projectId = process.env.DEEPGRAM_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      "DEEPGRAM_PROJECT_ID is required. Set it to enable short-lived scoped keys."
    );
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
    throw new Error(
      `[deepgram] Failed to create temp key (${res.status}). Check DEEPGRAM_API_KEY and DEEPGRAM_PROJECT_ID.`
    );
  }

  const data = await res.json();
  return data.key;
}
