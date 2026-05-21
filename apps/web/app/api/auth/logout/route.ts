import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("instant_token");
  response.cookies.delete("user_name");
  response.cookies.delete("user_sub");
  return response;
}
