import { NextResponse } from "next/server";
import { z } from "zod";

const PCO_BASE_URL =
  process.env.PLANNING_CENTER_BASE_URL?.replace(/\/+$/, "") ??
  "https://api.planningcenteronline.com";
const PCO_CLIENT_ID = process.env.PLANNING_CENTER_CLIENT_ID;
const PCO_CLIENT_SECRET = process.env.PLANNING_CENTER_CLIENT_SECRET;

const emailSchema = z.object({
  attributes: z.object({
    address: z.string(),
    location: z.string().nullable().optional(),
    primary: z.boolean().optional(),
  }),
});

const phoneSchema = z.object({
  attributes: z.object({
    number: z.string(),
    location: z.string().nullable().optional(),
    primary: z.boolean().optional(),
  }),
});

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === "1") {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return raw;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ pcoPersonId: string }> },
) {
  try {
    if (!PCO_CLIENT_ID || !PCO_CLIENT_SECRET) {
      return NextResponse.json({ error: "PCO not configured" }, { status: 500 });
    }

    const { pcoPersonId } = await context.params;

    if (!/^\d+$/.test(pcoPersonId)) {
      return NextResponse.json({ error: "Invalid person ID" }, { status: 400 });
    }

    const auth = Buffer.from(`${PCO_CLIENT_ID}:${PCO_CLIENT_SECRET}`).toString("base64");
    const headers = { Authorization: `Basic ${auth}`, Accept: "application/json" };

    const [emailsRes, phonesRes] = await Promise.all([
      fetch(`${PCO_BASE_URL}/people/v2/people/${pcoPersonId}/emails`, {
        headers,
        next: { revalidate: 3600 },
      }),
      fetch(`${PCO_BASE_URL}/people/v2/people/${pcoPersonId}/phone_numbers`, {
        headers,
        next: { revalidate: 3600 },
      }),
    ]);

    const allEmails: Array<{ address: string; location: string | null; primary: boolean }> = [];
    const allPhones: Array<{ number: string; location: string | null; primary: boolean }> = [];

    if (emailsRes.ok) {
      const data = await emailsRes.json();
      for (const item of data.data ?? []) {
        const parsed = emailSchema.safeParse(item);
        if (parsed.success) {
          allEmails.push({
            address: parsed.data.attributes.address,
            location: parsed.data.attributes.location ?? null,
            primary: parsed.data.attributes.primary ?? false,
          });
        }
      }
    }

    if (phonesRes.ok) {
      const data = await phonesRes.json();
      for (const item of data.data ?? []) {
        const parsed = phoneSchema.safeParse(item);
        if (parsed.success) {
          allPhones.push({
            number: formatPhone(parsed.data.attributes.number),
            location: parsed.data.attributes.location ?? null,
            primary: parsed.data.attributes.primary ?? false,
          });
        }
      }
    }

    // Deduplicate emails by lowercase address, prefer primary
    const seenEmails = new Set<string>();
    const emails = allEmails
      .sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0))
      .filter((e) => {
        const key = e.address.toLowerCase();
        if (seenEmails.has(key)) return false;
        seenEmails.add(key);
        return true;
      });

    // Deduplicate phones by digits, prefer primary
    const seenPhones = new Set<string>();
    const phones = allPhones
      .sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0))
      .filter((p) => {
        const key = p.number.replace(/\D/g, "");
        if (seenPhones.has(key)) return false;
        seenPhones.add(key);
        return true;
      });

    return NextResponse.json({ emails, phones });
  } catch (error) {
    console.error("Person details error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch person details" },
      { status: 500 },
    );
  }
}
