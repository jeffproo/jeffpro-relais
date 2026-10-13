/* =========================================================
   JEFF PRO — Relais des captures vers ton Telegram
   À coller dans un "Worker" Cloudflare (gratuit).
   Variables à créer dans Cloudflare (Settings > Variables, en "Secret") :
     BOT_TOKEN : le token de ton bot (donné par @BotFather)
     CHAT_ID   : ton identifiant Telegram (donné par @userinfobot)
     SITE      : l'adresse de ton site, ex : https://tonnom.github.io
   Le token reste caché ici : il n'apparaît jamais dans ton site GitHub.
   ========================================================= */

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = env.SITE ? origin === env.SITE.replace(/\/$/, "") : true;
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
    const c1 = form.get("capture1"), c2 = form.get("capture2");
    const ok = f => f && typeof f === "object" && /^image\//.test(f.type) && f.size > 0 && f.size <= 10e6;
    if (!ok(c1) || !ok(c2)) return new Response("Captures invalides", { status: 400, headers: cors });

    const legende =
      "🆕 NOUVELLE DEMANDE VIP\n" +
      "👤 Nom : " + t("nom") + "\n" +
      "📧 Compte : " + (t("email") || "pas de compte") + "\n" +
      "📱 WhatsApp : " + t("tel") + "\n" +
      "🏦 Bookmaker : " + t("bookmaker") + "\n" +
      "🆔 Identifiant : " + (t("identifiant") || "—") + "\n" +
      "🎟️ Code : " + t("code") + "\n" +
      "🕒 " + new Date().toLocaleString("fr-FR", { timeZone: "Africa/Porto-Novo" });

    const tg = new FormData();
    tg.append("chat_id", env.CHAT_ID);
    tg.append("media", JSON.stringify([
      { type: "photo", media: "attach://c1", caption: legende },
      { type: "photo", media: "attach://c2" }
    ]));
    tg.append("c1", c1, "inscription.jpg");
    tg.append("c2", c2, "recharge.jpg");

    const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMediaGroup`, { method: "POST", body: tg });
    if (!r.ok) return new Response("Erreur Telegram", { status: 502, headers: cors });
    return new Response("OK", { headers: cors });
  }
};
