// Defensa SSRF: nunca enviar solicitudes a destinos elegidos arbitrariamente.
export function validateDiscordWebhook(input) {
  if (typeof input !== 'string' || input.length > 250) return false;
  if (!/^https:\/\/discord[.]com\/api\/webhooks\/[0-9]{15,25}\/[A-Za-z0-9_-]{30,}$/.test(input)) return false;
  try {
    const u = new URL(input);
    return u.protocol === 'https:' && u.hostname === 'discord.com'
      && !u.username && !u.password && !u.search && !u.hash && !u.port;
  } catch { return false; }
}
