// Draws sheet.svg: my site's deploy blueprint, filled with live numbers from GitHub.
// Runs in a scheduled Action. If GitHub is unreachable it exits without touching the old image.
import { writeFileSync } from 'node:fs';

const OWNER = 'patelaryandev';
const headers = { 'User-Agent': 'profile-sheet', Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
const get = async (path) => { const r = await fetch(`https://api.github.com${path}`, { headers }); return r.ok ? r.json() : null; };

const commit = await get(`/repos/${OWNER}/portfolio/commits/main`);
const runs = await get(`/repos/${OWNER}/portfolio/actions/workflows/deploy.yml/runs?branch=main&event=push&per_page=10`);
if (!commit) { console.log('GitHub unreachable, keeping the old sheet.svg'); process.exit(0); }

const done = (runs?.workflow_runs ?? []).filter((r) => r.status === 'completed');
const ok = done.filter((r) => r.conclusion === 'success');
const secs = ok.map((r) => (Date.parse(r.updated_at) - Date.parse(r.run_started_at)) / 1000).sort((a, b) => a - b);
const median = secs.length ? Math.round(secs[Math.floor(secs.length / 2)]) : null;
const last = done[0];
const when = (iso) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(new Date(iso)).replace(',', '') + ' IST';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const cells = [
  ['REVISION', commit.sha.slice(0, 7)],
  ['LAST DEPLOY', last ? when(last.updated_at) : 'n/a'],
  ['PUSH TO LIVE', median ? `~${median} s` : 'n/a'],
  ['CI', last ? (last.conclusion === 'success' ? 'passing' : last.conclusion) : 'n/a'],
];

const INK = '#1C1B18', PAPER = '#F3F0E8', ACC = '#B23A0A', MUTED = '#5E5A51';
const serif = "Georgia, 'Times New Roman', serif", mono = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace", sans = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const boxes = [['git push', 'main'], ['GitHub Actions', 'tests + build'], ['Cloudflare', 'Worker + files'], ['Your browser', 'you are here']];
const BX = [50, 270, 490, 710], BW = 120, BY = 150, BH = 54;
const labels = ['on every push', median ? `~${median} s to live` : 'deploys', 'round trip'];

let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="880" height="340" viewBox="0 0 880 340" role="img" aria-label="Aryan Patel. I build web apps and ship them. Deploy path of patelaryan.dev: git push, GitHub Actions, Cloudflare, your browser.">
<defs><pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#24272A" stroke-opacity=".07"/></pattern>
<marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="${INK}" stroke-width="1.5"/></marker></defs>
<rect width="880" height="340" fill="${PAPER}"/><rect width="880" height="340" fill="url(#g)"/>
<rect x="10" y="10" width="860" height="320" fill="none" stroke="${INK}" stroke-width="2.5"/>
<g font-family="${mono}" font-size="10" fill="${MUTED}" text-anchor="middle">`;
['1', '2', '3', '4'].forEach((n, i) => { svg += `<text x="${130 + i * 207}" y="8">${n}</text>`; });
['A', 'B', 'C'].forEach((n, i) => { svg += `<text x="5" y="${70 + i * 105}">${n}</text>`; });
svg += `</g>
<text x="50" y="72" font-family="${serif}" font-size="38" fill="${INK}">Aryan Patel.</text>
<text x="50" y="112" font-family="${serif}" font-size="26" fill="${INK}">I build web apps and <tspan font-style="italic" fill="${ACC}">ship them</tspan>.</text>
<text x="830" y="60" text-anchor="end" font-family="${sans}" font-size="14" fill="${INK}">Full-Stack &amp; DevOps Engineer</text>
<text x="830" y="80" text-anchor="end" font-family="${sans}" font-size="13" fill="${MUTED}">VP, GFG Campus Body RKGIT</text>`;
boxes.forEach(([t, s], i) => {
  const last = i === 3;
  svg += `<rect x="${BX[i]}" y="${BY}" width="${BW}" height="${BH}" fill="${PAPER}" stroke="${INK}" stroke-width="${last ? 3 : 1.8}"/>
<text x="${BX[i] + 12}" y="${BY + 23}" font-family="${sans}" font-size="14" fill="${INK}">${esc(t)}</text>
<text x="${BX[i] + 12}" y="${BY + 41}" font-family="${mono}" font-size="10.5" fill="${MUTED}">${esc(s)}</text>`;
});
for (let i = 0; i < 3; i++) {
  const x0 = BX[i] + BW, x1 = BX[i + 1], y = BY + BH / 2;
  svg += `<path d="M${x0} ${y}H${x1 - 2}" stroke="${INK}" stroke-width="1.8" fill="none" marker-end="url(#a)"/>
<text x="${(x0 + x1) / 2}" y="${y - 8}" text-anchor="middle" font-family="${mono}" font-size="10.5" fill="${ACC}">${esc(labels[i])}</text>`;
  const a = (i * 0.28).toFixed(2), b = (i * 0.28 + 0.2).toFixed(2), c = (i * 0.28 + 0.21).toFixed(2);
  svg += `<circle r="4.5" cy="${y}" fill="${ACC}" cx="${x0}"><animate attributeName="cx" dur="6s" repeatCount="indefinite" values="${x0};${x0};${x1 - 4};${x1 - 4}" keyTimes="0;${a};${b};1"/><animate attributeName="opacity" dur="6s" repeatCount="indefinite" values="0;1;1;0;0" keyTimes="0;${a};${b};${c};1"/></circle>`;
}
const cw = 170, cx0 = 880 - 10 - cw * cells.length;
svg += `<rect x="${cx0}" y="252" width="${cw * cells.length}" height="78" fill="${PAPER}" stroke="${INK}" stroke-width="1.5"/>`;
cells.forEach(([k, v], i) => {
  const x = cx0 + i * cw;
  if (i) svg += `<path d="M${x} 252V330" stroke="${INK}"/>`;
  svg += `<text x="${x + 12}" y="276" font-family="${mono}" font-size="10" letter-spacing="1" fill="${MUTED}">${k}</text><text x="${x + 12}" y="306" font-family="${mono}" font-size="14" font-weight="600" fill="${INK}">${esc(v)}</text>`;
});
const stamp = when(new Date().toISOString()).toUpperCase();
['PATELARYAN.DEV', 'SHEET 1 OF 1', 'REDRAWN', stamp].forEach((t, k) => { svg += `<text x="28" y="${268 + k * 17}" font-family="${mono}" font-size="10" letter-spacing="1" fill="${MUTED}">${esc(t)}</text>`; });
svg += '</svg>\n';
writeFileSync('sheet.svg', svg);
console.log('sheet.svg written', cells.map((c) => c.join('=')).join(' | '));
