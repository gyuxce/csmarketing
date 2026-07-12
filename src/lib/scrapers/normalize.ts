import type { ScrapedLead } from "./index";

export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) cleaned = "62" + cleaned.slice(1);
  if (cleaned.startsWith("62")) cleaned = "+" + cleaned;
  if (!cleaned.startsWith("+")) cleaned = "+62" + cleaned;
  return cleaned;
}

export function deduplicateLeads(leads: ScrapedLead[]): ScrapedLead[] {
  const seen = new Set<string>();
  return leads.filter((lead) => {
    const key = normalizePhone(lead.phone);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeLeads(leads: ScrapedLead[]): ScrapedLead[] {
  return leads.map((lead) => ({
    ...lead,
    phone: normalizePhone(lead.phone),
  }));
}