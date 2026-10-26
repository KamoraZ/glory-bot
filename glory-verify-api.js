// Glory bot: mã xác thực 6 ký tự cho launcher (hiệu lực 5 phút, dùng một lần).
// Cách dùng trong bot (Express + discord.js), xem hướng dẫn ở cuối file.
const crypto = require('crypto');

const TTL_MS = 5 * 60 * 1000;                                  // mỗi mã sống 5 phút
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';            // bỏ O/0, I/1 cho khỏi nhầm
const CODES = new Map();                                       // mã -> { discordId, discordTag, exp }
setInterval(() => { const t = Date.now(); for (const [c, v] of CODES) if (v.exp < t) CODES.delete(c); }, 60_000).unref();

// Gọi trong lệnh /verify: trả { code, expiresAt }. Mỗi người chỉ có 1 mã còn hiệu lực (mã mới thay mã cũ).
function createCode(user) {
  for (const [c, v] of CODES) if (v.discordId === user.id) CODES.delete(c);
  let code; do { code = Array.from(crypto.randomBytes(6), (b) => ALPHABET[b % ALPHABET.length]).join(''); } while (CODES.has(code));
  const expiresAt = Date.now() + TTL_MS;
  CODES.set(code, { discordId: user.id, discordTag: user.tag || user.username, exp: expiresAt });
  return { code, expiresAt };
}

// Chống dò mã: tối đa 10 lần thử mỗi phút cho mỗi địa chỉ IP
const tries = new Map();
setInterval(() => tries.clear(), 60_000).unref();

// Gắn vào app Express của bot. onLinked(entry, body) chạy khi liên kết thành công (gán role, lưu DB...).
function attach(app, { onLinked } = {}) {
  app.post('/api/client/verify', require('express').json({ limit: '10kb' }), async (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip, n = (tries.get(ip) || 0) + 1; tries.set(ip, n);
    if (n > 10) return res.status(429).json({ error: 'rate_limited' });
    const code = String((req.body && req.body.code) || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) return res.status(400).json({ error: 'bad_code' });
    const e = CODES.get(code);
    if (!e) return res.status(404).json({ error: 'invalid_code' });
    if (e.exp < Date.now()) { CODES.delete(code); return res.status(410).json({ error: 'expired' }); }
    CODES.delete(code);                                         // dùng một lần
    try { if (onLinked) await onLinked(e, req.body || {}); } catch (err) { console.error('onLinked', err); }
    res.json({ ok: true, discordId: e.discordId, discordTag: e.discordTag });
  });
}
module.exports = { createCode, attach, TTL_MS };

/* ===== CÁCH GẮN VÀO BOT =====
1) Lưu file này cạnh file chính của bot, rồi trong file chính:
     const { createCode, attach } = require('./glory-verify-api');
     attach(app, { onLinked: async (entry, info) => {
       // entry.discordId / entry.discordTag ; info.mcUsername, info.accountType, info.hasGloryKey, info.roleTitle
       // chỗ này: gán role, lưu vào DB giống đoạn code cũ của /api/client/link
     }});
2) Trong lệnh /verify, thay đoạn tạo mã cũ bằng:
     const { code, expiresAt } = createCode(interaction.user);
     // đưa mã vào embed, ví dụ:  `${code}`  và dòng "Hết hạn <t:${Math.floor(expiresAt/1000)}:R>"
     // nên trả lời kiểu ephemeral (chỉ người gõ lệnh thấy): interaction.reply({ embeds:[embed], ephemeral:true })
3) Deploy lại bot trên Render. Kiểm tra: gõ /verify, lấy mã, rồi gọi thử
     curl -X POST https://glory-bot-1.onrender.com/api/client/verify -H "Content-Type: application/json" -d '{"code":"MÃ_VỪA_LẤY"}'
   -> {"ok":true,"discordId":"...","discordTag":"..."}  (gọi lần 2 sẽ báo 404 vì mã dùng một lần)
*/
