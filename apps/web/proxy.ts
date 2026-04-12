export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    "/operator/:path*",
    "/capture/:path*",
    "/api/deepgram-token",
  ],
};
