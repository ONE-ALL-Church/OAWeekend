import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "OA Weekend",
  description: "ONE&ALL Church weekend services platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-oa-sand-100 text-oa-black-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
