import NextAuth from "next-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    {
      id: "rock",
      name: "ONE&ALL",
      type: "oauth",
      clientId: process.env.ROCK_CLIENT_ID,
      clientSecret: process.env.ROCK_CLIENT_SECRET,
      authorization: {
        url: "https://www.oneandall.church/Auth/Authorize",
        params: { scope: "openid email profile" },
      },
      token: "https://www.oneandall.church/Auth/Token",
      userinfo: "https://www.oneandall.church/Auth/UserInfo",
      checks: ["state"],
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name ?? profile.preferred_username,
          email: profile.email,
          image: profile.picture,
        };
      },
    },
  ],
  callbacks: {
    authorized({ auth: session, request }) {
      const { pathname } = request.nextUrl;
      const isProtected =
        pathname.startsWith("/operator") ||
        pathname.startsWith("/capture") ||
        pathname === "/api/deepgram-token";

      if (!isProtected) return true;
      return !!session?.user;
    },
  },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  debug: process.env.NODE_ENV !== "production",
});
