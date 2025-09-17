export async function notifyAll(message: string, options?: {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
}) {
  // --- Telegram ---
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: "Markdown",
          }),
        }
      );
      const data = await res.json();
      console.log("✅ Sent to Telegram:", data);
    } catch (err) {
      console.error("❌ Telegram send error:", err);
    }
  } else {
    console.warn("⚠️ Telegram credentials missing, skip sending.");
  }

  // --- Discord ---
  if (process.env.DISCORD_WEBHOOK_URL) {
    try {
      const body = {
        username: "Somtod Monitor",
        embeds: [
          {
            title: options?.title || "Notification",
            description: options?.description || message,
            color: options?.color || 0x2f3136, // default dark grey
            fields: options?.fields,
            timestamp: options?.timestamp || new Date().toISOString(),
          },
        ],
      };

      const res = await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      console.log("✅ Sent to Discord:", data);
    } catch (err) {
      console.error("❌ Discord send error:", err);
    }
  } else {
    console.warn("⚠️ Discord webhook missing, skip sending.");
  }
}
