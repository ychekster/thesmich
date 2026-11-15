/** Куда отправлять заявку. Задаётся в .env: VITE_LEAD_ENDPOINT=https://… */
const ENDPOINT = import.meta.env.VITE_LEAD_ENDPOINT as string | undefined;

export interface Lead {
  topic: string;
  name: string;
  contact: string;
  message: string;
  /** Последний выпавший бонус колеса, если крутили. */
  bonus: string | null;
}

/** Отправляет заявку POST-запросом (JSON). Без ENDPOINT — только пишет в консоль. */
export async function sendLead(lead: Lead) {
  const payload = { ...lead, submittedAt: new Date().toISOString() };
  console.log("Заявка:", payload);
  if (!ENDPOINT) return;
  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}
