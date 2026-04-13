import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";

const config: NextAuthConfig = {
  providers: [
    {
      id: "rock",
      name: "ONE&ALL",
      type: "oauth",
      clientId: process.env.ROCK_CLIENT_ID,
      clientSecret: process.env.ROCK_CLIENT_SECRET,
      authorization: {
        url: "https://www.oneandall.church/Auth/Authorize",
        params: {
          scope: "openid email profile",
          response_type: "code",
        },
      },
      token: {
        url: "https://www.oneandall.church/Auth/Token",
      },
      userinfo: {
        url: "https://www.oneandall.church/Auth/UserInfo",
      },
      profile(profile) {
        return {
          id: profile.sub ?? profile.preferred_username ?? "unknown",
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
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
