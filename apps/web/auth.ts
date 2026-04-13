import NextAuth from "next-auth";

const clientId = process.env.ROCK_CLIENT_ID;
const clientSecret = process.env.ROCK_CLIENT_SECRET;

// Debug: log at module init time
console.log("[auth] init - clientId:", clientId?.slice(0, 8), "clientSecret length:", clientSecret?.length);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    {
      id: "rock",
      name: "ONE&ALL",
      type: "oauth",
      clientId,
      clientSecret,
      authorization:
        "https://www.oneandall.church/Auth/Authorize?scope=openid+email+profile&response_type=code",
      token: {
        url: "https://www.oneandall.church/Auth/Token",
      },
      userinfo: {
        url: "https://www.oneandall.church/Auth/UserInfo",
      },
    },
  ],
  trustHost: true,
  logger: {
    error(error) {
      console.error("[auth] error:", error);
    },
    warn(code) {
      console.warn("[auth] warn:", code);
    },
    debug(message, metadata) {
      console.log("[auth] debug:", message, metadata);
    },
  },
});
