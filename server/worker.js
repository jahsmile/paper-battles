// Сервер галереи «Бумажных боёв» для Cloudflare Workers.
// Принимает героя от игры, проверяет его и кладёт файлом в ветку gallery репозитория на GitHub.
// Настройки (Settings → Variables): GH_TOKEN (секрет), GH_REPO, например "jahsmile/paper-battles".
// Необязательные: GH_BRANCH (gallery), PER_IP_DAY (10), PER_DAY (300), MAX_ITEMS (3000).

const ROLES = ['fighter', 'shooter', 'tank', 'monster', 'fire', 'rocket', 'laser', 'healer', 'bomb'];
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' };
const json = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...CORS, ...extra } });
const b64 = s => { const b = new TextEncoder().encode(s); let o = ''; for (let i = 0; i < b.length; i += 0x8000) o += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(o); };
const unb64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0)));

function gh(env, path, init = {}) {
  return fetch('https://api.github.com/repos/' + env.GH_REPO + '/contents/' + path, {
    ...init,
    headers: { authorization: 'Bearer ' + env.GH_TOKEN, accept: 'application/vnd.github+json', 'user-agent': 'paper-battles-gallery', 'x-github-api-version': '2022-11-28', ...(init.headers || {}) },
  });
}
async function readIndex(env, branch) {
  const r = await gh(env, 'index.json?ref=' + branch);
  if (r.status === 404) return { items: [], sha: null };
  if (!r.ok) throw new Error('index ' + r.status);
  const d = await r.json();
  let items = [];
  try { items = JSON.parse(unb64(d.content)); } catch (e) {}
  return { items: Array.isArray(items) ? items : [], sha: d.sha };
}
async function ipTag(env, ip) { // короткая метка адреса: сам адрес в репозиторий не попадает
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.GH_TOKEN), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const s = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(ip)));
  return [...s.slice(0, 5)].map(x => x.toString(16).padStart(2, '0')).join('');
}
function clean(r) { // оставляем только то, что понимает игра
  if (!r || typeof r !== 'object') return null;
  const src = r.src, m = typeof src === 'string' && /^data:image\/(webp|png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(src);
  if (!m || src.length > 240000 || !ROLES.includes(r.role)) return null;
  const head = atob(m[2].slice(0, 16)), ok = head.startsWith('RIFF') || head.startsWith('\x89PNG') || head.startsWith('\xff\xd8');
  if (!ok) return null;
  const name = String(r.name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 14) || 'Hero';
  const ov = r.ov && typeof r.ov === 'object' ? r.ov : {};
  if (JSON.stringify(ov).length > 20000) return null;
  delete ov.lines; delete ov.name; // чужие реплики в общую галерею не берём
  return { v: 1, name, role: r.role, face: r.face === 1 || r.face === -1 ? r.face : 0, src, ov };
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), branch = env.GH_BRANCH || 'gallery';
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (!env.GH_TOKEN || !env.GH_REPO) return json({ error: 'not configured' }, 500);
    try {
      if (req.method === 'GET' && url.pathname === '/index') {
        const { items } = await readIndex(env, branch);
        return json({ base: 'https://raw.githubusercontent.com/' + env.GH_REPO + '/' + branch + '/heroes/', items: items.map(i => ({ id: i.id, name: i.name, role: i.role, t: i.t })) }, 200, { 'cache-control': 'public, max-age=20' });
      }
      if (req.method === 'POST' && url.pathname === '/hero') {
        const text = await req.text();
        if (text.length > 260000) return json({ error: 'too big' }, 413);
        let rec = null;
        try { rec = clean(JSON.parse(text)); } catch (e) {}
        if (!rec) return json({ error: 'bad hero' }, 400);
        const tag = await ipTag(env, req.headers.get('cf-connecting-ip') || '?'), now = Date.now(), day = now - 864e5;
        const id = now.toString(36) + Math.random().toString(36).slice(2, 6);
        for (let tryN = 0; tryN < 4; tryN++) {
          const { items, sha } = await readIndex(env, branch), recent = items.filter(i => i.t > day);
          if (recent.filter(i => i.h === tag).length >= (+env.PER_IP_DAY || 10) || recent.length >= (+env.PER_DAY || 300)) return json({ error: 'too many' }, 429);
          if (tryN === 0) {
            const put = await gh(env, 'heroes/' + id + '.json', { method: 'PUT', body: JSON.stringify({ message: 'hero ' + id, branch, content: b64(JSON.stringify(rec)) }) });
            if (!put.ok) throw new Error('put ' + put.status);
          }
          const next = [{ id, name: rec.name, role: rec.role, t: now, h: tag }, ...items].slice(0, +env.MAX_ITEMS || 3000);
          const up = await gh(env, 'index.json', { method: 'PUT', body: JSON.stringify({ message: 'index ' + id, branch, content: b64(JSON.stringify(next)), ...(sha ? { sha } : {}) }) });
          if (up.ok) return json({ id });
          if (up.status !== 409 && up.status !== 422) throw new Error('index put ' + up.status);
        }
        return json({ error: 'busy' }, 503);
      }
      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: 'github', detail: String(e.message || e) }, 502);
    }
  },
};
