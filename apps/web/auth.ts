import NextAuth from "next-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    {
      id: "rock",
      name: "ONE&ALL",
      type: "oidc",
      issuer: "https://www.oneandall.church",
      clientId: process.env.ROCK_CLIENT_ID!,
      clientSecret: process.env.ROCK_CLIENT_SECRET!,
      authorization: { params: { scope: "openid email profile" } },
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
  debug: true,
});
