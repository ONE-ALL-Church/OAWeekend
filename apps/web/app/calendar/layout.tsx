import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Strategic Calendar — OA Weekend",
  description: "Plan weekend services across all campuses and channels",
};

export default function CalendarLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
