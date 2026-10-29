// Garde le serveur du site « réveillé » : sans visite pendant quelques minutes, la première page
// peut mettre plusieurs secondes à s'afficher (démarrage à froid). Un passage toutes les 5 minutes l'évite.
const PAGES = ["/fr", "/fr/recherche", "/fr/comment-ca-marche"];

export default async () => {
  const base = process.env.URL ?? "https://www.send-by-me.com";
  await Promise.allSettled(PAGES.map((p) => fetch(base + p, { headers: { "User-Agent": "SendByMe-KeepWarm" } })));
  return new Response("ok");
};

export const config = { schedule: "*/5 * * * *" };
