/**
 * Returns the Deepgram API key for browser-side WebSocket connections.
 *
 * This endpoint is protected by the auth proxy, so only logged-in operators
 * can access it. For production, create a Deepgram key with `keys:write` scope
 * to enable temporary scoped keys instead.
 */
export function getDeepgramKey(): string {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY not configured");
  return apiKey.trim();
}
