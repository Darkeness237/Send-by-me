// Tâche planifiée Netlify : fait avancer le suivi des colis en transit toutes les 15 minutes.
export default async () => {
  const site = process.env.URL ?? "https://www.send-by-me.com";
  const res = await fetch(`${site}/api/cron/transit`, { cache: "no-store" });
  console.log("transit", res.status, await res.text());
};

export const config = { schedule: "*/15 * * * *" };
