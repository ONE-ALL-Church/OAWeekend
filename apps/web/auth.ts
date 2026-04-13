import NextAuth from "next-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    {
      id: "rock",
      name: "ONE&ALL",
      type: "oauth",
      clientId: process.env.ROCK_CLIENT_ID,
      clientSecret: process.env.ROCK_CLIENT_SECRET,
      authorization:
        "https://www.oneandall.church/Auth/Authorize?scope=openid+email+profile",
      token: "https://www.oneandall.church/Auth/Token",
      userinfo: "https://www.oneandall.church/Auth/UserInfo",
    },
  ],
  trustHost: true,
});
