/**
 * Security regression tests.
 *
 * These tests statically analyse source files to ensure security invariants
 * hold. They catch regressions like:
 *   - API routes missing auth middleware coverage
 *   - Secrets/API keys falling back to browser exposure
 *   - Missing security headers
 *   - Timing-unsafe string comparisons
 *   - Stale .gitignore entries
 *
 * Run: pnpm vitest run apps/web/__tests__/security.test.ts
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "../../..");
const WEB = resolve(__dirname, "..");

function read(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), "utf-8");
}

function readWeb(relPath: string): string {
  return readFileSync(resolve(WEB, relPath), "utf-8");
}

// ---------------------------------------------------------------------------
// 1. Proxy / middleware auth coverage
// ---------------------------------------------------------------------------
describe("proxy auth coverage", () => {
  const proxy = readWeb("proxy.ts");

  it("protects all /api/rock/* routes", () => {
    // The proxy must use a prefix match, not individual route names
    expect(proxy).toMatch(/pathname\.startsWith\(["']\/api\/rock\//);
    // Matcher must include the wildcard pattern
    expect(proxy).toMatch(/["']\/api\/rock\/:path\*["']/);
  });

  it("protects /api/deepgram-token", () => {
    expect(proxy).toContain("/api/deepgram-token");
  });

  it("protects /operator and /capture routes", () => {
    expect(proxy).toMatch(/pathname\.startsWith\(["']\/operator["']\)/);
    expect(proxy).toMatch(/pathname\.startsWith\(["']\/capture["']\)/);
  });

  it("does not contain an unused redirect query param", () => {
    // The redirect param was removed because it was dead code and a future
    // open-redirect risk. Ensure it doesn't come back without validation.
    const hasRedirectParam = /searchParams\.set\(["']redirect["']/.test(proxy);
    if (hasRedirectParam) {
      // If someone re-adds redirect, they MUST validate it's a relative path
      expect(proxy).toMatch(/new URL\(redirect.*request\.url\)|^\/[^\/]/);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Deepgram key safety
// ---------------------------------------------------------------------------
describe("deepgram key safety", () => {
  const deepgram = readWeb("lib/deepgram.ts");

  it("never falls back to returning the main API key", () => {
    // The function must throw when DEEPGRAM_PROJECT_ID is missing, never
    // return apiKey directly. Check that there's no `return apiKey` or
    // `return apiKey.trim()` pattern.
    const lines = deepgram.split("\n");
    const returnLines = lines.filter(
      (l) => /return\s+apiKey/.test(l) && !l.trim().startsWith("//"),
    );
    expect(returnLines).toHaveLength(0);
  });

  it("throws when DEEPGRAM_PROJECT_ID is not set", () => {
    // The throw and the string may be on separate lines
    expect(deepgram).toMatch(/throw new Error[\s\S]*?DEEPGRAM_PROJECT_ID/);
  });

  it("throws on failed temp key creation instead of falling back", () => {
    // After the API call, there must be a throw on !res.ok, not a fallback
    const afterFetch = deepgram.slice(deepgram.indexOf("if (!res.ok)"));
    expect(afterFetch).toMatch(/throw new Error/);
    // Must NOT contain a return apiKey pattern after the fetch
    const returnApiKeyAfterFetch = /return\s+apiKey/.test(afterFetch);
    expect(returnApiKeyAfterFetch).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Security headers
// ---------------------------------------------------------------------------
describe("security headers", () => {
  const config = readWeb("next.config.ts");

  it("includes Content-Security-Policy", () => {
    expect(config).toContain("Content-Security-Policy");
  });

  it("CSP blocks object embeds", () => {
    expect(config).toMatch(/object-src\s+'none'/);
  });

  it("CSP restricts frame-ancestors", () => {
    expect(config).toMatch(/frame-ancestors\s+'none'/);
  });

  it("includes X-Frame-Options DENY", () => {
    expect(config).toContain("X-Frame-Options");
    expect(config).toContain("DENY");
  });

  it("includes HSTS", () => {
    expect(config).toContain("Strict-Transport-Security");
  });

  it("includes X-Content-Type-Options nosniff", () => {
    expect(config).toContain("nosniff");
  });
});

// ---------------------------------------------------------------------------
// 4. timingSafeEqual correctness
// ---------------------------------------------------------------------------
describe("timingSafeEqual", () => {
  const callback = readWeb("app/api/auth/callback/route.ts");

  it("does not early-return false on length mismatch without dummy comparison", () => {
    // The function must perform a dummy timingSafeEqual even when lengths
    // differ, to avoid leaking length information via timing.
    const fnMatch = callback.match(
      /function timingSafeEqual[\s\S]*?^}/m,
    );
    expect(fnMatch).toBeTruthy();
    const fnBody = fnMatch![0];

    // If there is a length check, it must NOT immediately return false
    // without calling crypto.timingSafeEqual first
    if (fnBody.includes("length")) {
      // There should be a timingSafeEqual call inside or near the length branch
      const lengthBranch = fnBody.slice(
        fnBody.indexOf("length"),
        fnBody.indexOf("return false") > -1
          ? fnBody.indexOf("return false") + 20
          : undefined,
      );
      // The dummy comparison must exist before the false return
      expect(fnBody).toMatch(/timingSafeEqual\(bufA,\s*bufA\)/);
    }
  });

  it("uses crypto.timingSafeEqual (not === or ==)", () => {
    // The state comparison must use constant-time comparison
    expect(callback).toContain("crypto.timingSafeEqual");
    // There should be no direct === comparison of state values
    const stateCheck = callback.match(
      /state\s*===\s*storedState|storedState\s*===\s*state/,
    );
    expect(stateCheck).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 5. .gitignore completeness
// ---------------------------------------------------------------------------
describe(".gitignore", () => {
  const gitignore = read(".gitignore");

  it("ignores .env files", () => {
    expect(gitignore).toContain(".env");
    expect(gitignore).toContain(".env.local");
  });

  it("ignores .claude/settings.local.json", () => {
    expect(gitignore).toContain(".claude/settings.local.json");
  });

  it("ignores .vercel", () => {
    expect(gitignore).toMatch(/\.vercel/);
  });

  it("ignores node_modules", () => {
    expect(gitignore).toContain("node_modules");
  });
});

// ---------------------------------------------------------------------------
// 6. No hardcoded secrets in source
// ---------------------------------------------------------------------------
describe("no hardcoded secrets", () => {
  const sourceFiles = [
    "lib/deepgram.ts",
    "lib/rock.ts",
    "lib/instant.ts",
    "lib/instant-admin.ts",
    "proxy.ts",
    "next.config.ts",
    "app/api/auth/callback/route.ts",
    "app/api/deepgram-token/route.ts",
    "app/api/rock/campuses/route.ts",
    "app/api/rock/events/route.ts",
    "app/api/rock/services/route.ts",
    "app/api/rock/image/route.ts",
  ];

  for (const file of sourceFiles) {
    it(`${file} has no hardcoded API keys or tokens`, () => {
      const content = readWeb(file);

      // Should not contain patterns like: apiKey = "sk-..." or token = "..."
      // that look like real secrets (long alphanumeric strings)
      const secretPatterns = [
        // Generic API key patterns (32+ char hex/base64)
        /(?:api[_-]?key|token|secret|password)\s*[:=]\s*["'][a-zA-Z0-9+/]{32,}["']/i,
        // Specific provider patterns
        /sk-[a-zA-Z0-9]{20,}/, // OpenAI-style
        /ghp_[a-zA-Z0-9]{36}/, // GitHub PAT
        /xoxb-[a-zA-Z0-9-]+/, // Slack bot token
      ];

      for (const pattern of secretPatterns) {
        expect(content).not.toMatch(pattern);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// 7. Rock API image route validates ID
// ---------------------------------------------------------------------------
describe("rock image proxy", () => {
  const imageRoute = readWeb("app/api/rock/image/route.ts");

  it("validates image id as numeric only", () => {
    // Must contain a numeric-only regex check to prevent SSRF
    // The source contains /^\d+$/ which when read as a string is /^\\d+$/
    expect(imageRoute).toContain("^\\d+$");
  });
});

// ---------------------------------------------------------------------------
// 8. Auth callback does not expose secrets in error responses
// ---------------------------------------------------------------------------
describe("auth callback error handling", () => {
  const callback = readWeb("app/api/auth/callback/route.ts");

  it("does not include secret values in redirect URLs", () => {
    // Error redirects must only contain generic error codes, not secret values
    const redirects = callback.match(/redirect\([\s\S]*?\)/g) ?? [];
    for (const redirect of redirects) {
      expect(redirect).not.toMatch(/clientSecret|ROCK_CLIENT_SECRET/);
      expect(redirect).not.toMatch(/access_token/);
    }
  });

  it("logs env var presence as booleans, not values", () => {
    // When logging missing config, use !!var (boolean), never the raw value
    expect(callback).toMatch(/clientId:\s*!!clientId/);
    expect(callback).toMatch(/clientSecret:\s*!!clientSecret/);
  });
});
