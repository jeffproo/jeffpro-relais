/* JEFF PRO — Relais des captures vers ton Telegram
   - Demande VIP gratuit : 2 captures (inscription + recharge)
   - Paiement VIP Premium : 1 capture (preuve de paiement)
   Secrets Cloudflare : BOT_TOKEN, CHAT_ID, SITE (une ou plusieurs adresses séparées par des virgules) */

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    /* SITE peut contenir plusieurs adresses séparées par des virgules */
    const sites = (env.SITE || "").split(",").map(x => x.trim().replace(/\/$/, "")).filter(Boolean);
    const allowed = sites.length ? sites.includes(origin) : true;
    const cors = {
      "Access-Control-Allow-Origin": allowed ? origin || "*" : "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST" || !allowed) return new Response("Interdit", { status: 403, headers: cors });

    let form;
    try { form = await request.formData(); } catch { return new Response("Formulaire invalide", { status: 400, headers: cors }); }

    const t = k => String(form.get(k) || "").slice(0, 120);
    const ok = f => f && typeof f === "object" && /^image\//.test(f.type) && f.size > 0 && f.size <= 10e6;
    const heure = new Date().toLocaleString("fr-FR", { timeZone: "Africa/Porto-Novo" });
    const api = `https://api.telegram.org/bot${env.BOT_TOKEN}`;

    /* ---- Paiement Premium : une seule capture ---- */
    if (t("type") === "paiement") {
      const c1 = form.get("capture1");
      if (!ok(c1)) return new Response("Capture invalide", { status: 400, headers: cors });
      const legende =
        "💎 PAIEMENT VIP PREMIUM\n" +
        "👤 Nom : " + t("nom") + "\n" +
        "📧 Compte : " + (t("email") || "pas de compte") + "\n" +
        "📱 WhatsApp : " + t("tel") + "\n" +
        "🌍 Pays : " + t("pays") + "\n" +
        "⏱ Formule : " + t("formule") + "\n" +
        "💰 Montant : " + t("montant") + "\n" +
        "🕒 " + heure + "\n\n" +
        "👉 Vérifie ton Mobile Money, puis active le Premium dans ton espace admin.";
      const tg = new FormData();
      tg.append("chat_id", env.CHAT_ID);
      tg.append("caption", legende);
      tg.append("photo", c1, "paiement.jpg");
      const r = await fetch(`${api}/sendPhoto`, { method: "POST", body: tg });
      if (!r.ok) return new Response("Erreur Telegram", { status: 502, headers: cors });
      return new Response("OK", { headers: cors });
    }

    /* ---- Demande VIP gratuit : 2 captures ---- */
    const c1 = form.get("capture1"), c2 = form.get("capture2");
    if (!ok(c1) || !ok(c2)) return new Response("Captures invalides", { status: 400, headers: cors });

    const legende =
      "🆕 NOUVELLE DEMANDE VIP\n" +
      "👤 Nom : " + t("nom") + "\n" +
      "📧 Compte : " + (t("email") || "pas de compte") + "\n" +
      "📱 WhatsApp : " + t("tel") + "\n" +
      "🏦 Bookmaker : " + t("bookmaker") + "\n" +
      "🆔 Identifiant : " + (t("identifiant") || "—") + "\n" +
      "🎟️ Code : " + t("code") + "\n" +
      "🕒 " + heure;

    const tg = new FormData();
    tg.append("chat_id", env.CHAT_ID);
    tg.append("media", JSON.stringify([
      { type: "photo", media: "attach://c1", caption: legende },
      { type: "photo", media: "attach://c2" }
    ]));
    tg.append("c1", c1, "inscription.jpg");
    tg.append("c2", c2, "recharge.jpg");

    const r = await fetch(`${api}/sendMediaGroup`, { method: "POST", body: tg });
    if (!r.ok) return new Response("Erreur Telegram", { status: 502, headers: cors });
    return new Response("OK", { headers: cors });
  }
};
