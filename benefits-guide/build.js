// Builds the "Beyond Insurance: Yours to Keep" benefits-guide pages for one
// Refresh / REACH grantee from a config file.
//
//   node build.js config/sample-goodwill-ne-texas.json
//
// Writes out/<slug>/pages/*.html, out/<slug>/index.html, the combined PDF,
// one PDF per page, and 150 dpi PNG previews. Any config value that is
// [BRACKETED] or contains CONFIRM shows as a yellow highlight in preview mode
// and is hidden in print mode (?print). The PDFs are printed in print mode.

const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { chromium } = require('playwright-core');

const cfgPath = process.argv[2];
if (!cfgPath) { console.error('Usage: node build.js config/<grantee>.json'); process.exit(1); }
const C = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const SLUG = C.slug || path.basename(cfgPath, '.json');
const OUT = path.join(__dirname, 'out', SLUG);

// Brand art comes from the Somerset brief, the same way the other briefs get
// it, so the wordmark and painted strokes stay identical.
const brief = fs.readFileSync(path.join(__dirname, '..', 'somerset.html'), 'utf8');
const MARK = (brief.match(/<img class="mark mark-lt cover-mark" src="([^"]+)"/) || [])[1];
const K = [...brief.matchAll(/<img class="k(\d)" src="([^"]+)"/g)].map((m) => m[2]);
if (!MARK || K.length !== 5) throw new Error('brand art not found in ../somerset.html');

// ------------------------------------------------------------- placeholders

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const isPh = (v) => typeof v === 'string' && (/^\s*\[[\s\S]*\]\s*$/.test(v) || /CONFIRM/.test(v));
const has = (v) => v !== null && v !== undefined && v !== '';
// A config value: placeholders render highlighted (and hidden in print).
const f = (v) => (!has(v) ? '' : isPh(v) ? `<span class="ph">${esc(v)}</span>` : esc(v));
// A statement we haven't confirmed at its source: same treatment as CONFIRM.
const confirm = (html, why = 'CONFIRM against the source') => `<span class="ph" title="${esc(why)}">${html}</span>`;

// Facts in the copy that were checked against the publisher's own page.
// Set ok:false to print one as a CONFIRM placeholder instead.
const FACTS = require('./facts.json');
const fact = (key, html) => (FACTS[key] && FACTS[key].ok ? html : confirm(html, FACTS[key] ? FACTS[key].note : 'CONFIRM'));

// ------------------------------------------------------------- icons

const ICON = {
  food: '<path d="M4 11h16a8 8 0 0 1-16 0zM8 7c0-1.4 1-2 1-3M12 7c0-1.4 1-2 1-3M16 7c0-1.4 1-2 1-3"/>',
  home: '<path d="M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6"/>',
  goods: '<path d="M6 8h12l-1 12H7L6 8zM9 8a3 3 0 0 1 6 0"/>',
  transit: '<path d="M6 4h12a2 2 0 0 1 2 2v10H4V6a2 2 0 0 1 2-2zM4 11h16M7 19v2M17 19v2"/><circle cx="7.5" cy="14" r=".6"/><circle cx="16.5" cy="14" r=".6"/>',
  health: '<path d="M12 20s-8-4.6-8-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8 2.8C20 15.4 12 20 12 20z"/><path d="M7 12h3l1.2-2 1.6 4 1.2-2H17"/>',
  money: '<circle cx="12" cy="12" r="9"/><path d="M15 9c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2.1 0 3 6 1.6 6 4.6 0 1.3-1.3 2.3-3 2.3-1.5 0-2.7-.6-3.2-1.7M12 6v1.5M12 16.5V18"/>',
  care: '<path d="M3 14h3l3 3h4a2 2 0 0 0 0-4h-3M6 14v6"/><path d="M12 8.6a2.4 2.4 0 0 1 4.4-1.4 2.4 2.4 0 0 1 4.4 1.4c0 2.5-4.4 5-4.4 5S12 11.1 12 8.6z"/>',
  education: '<path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"/>',
  work: '<path d="M4 8h16v11H4zM9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M4 13h16"/>',
  legal: '<path d="M12 4v16M8 20h8M5 8h14M5 8l-2.5 6a2.8 2.8 0 0 0 5 0zM19 8l-2.5 6a2.8 2.8 0 0 0 5 0z"/>',
  rx: '<path d="M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7z"/><path d="M7 10l7 7"/>',
  mind: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.8 10.6c.5.5.8 1.2.8 1.9V16h6v-.5c0-.7.3-1.4.8-1.9A6 6 0 0 0 12 3z"/>',
  family: '<circle cx="8" cy="8" r="2.6"/><circle cx="16" cy="8" r="2.6"/><path d="M3 20c0-3 2.2-5.2 5-5.2s5 2.2 5 5.2M11 20c0-3 2.2-5.2 5-5.2s5 2.2 5 5.2"/>',
  career: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  language: '<path d="M3 5h11v7H8l-5 3.5z"/><path d="M14 9h7v7.5L17 14h-5v-2"/>',
  gift: '<path d="M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-2-4-6.5-3-5 0M12 7c2-4 6.5-3 5 0"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.3 10.8l7.4-3.6M8.3 13.2l7.4 3.6"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  pace: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.5 7.5L20 18M8.5 16.5L20 6"/>',
  move: '<circle cx="14" cy="4.5" r="2"/><path d="M7 21l3-6 3 2.2V21M9.5 10.5l4-2 3 4 3 .8M10 15l1.2-5"/>',
  eat: '<path d="M12 7.5c-4-2-8 1-7 6s4 8 7 6c3 2 6-1 7-6s-3-8-7-6zM12 7.5c0-2 1-3.2 3-4"/>',
  rest: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5z"/>',
  check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
  pin: '<path d="M12 21s-6.5-6.2-6.5-11A6.5 6.5 0 0 1 18.5 10c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  coach: '<circle cx="12" cy="7" r="3.3"/><path d="M5 20c.6-3.8 3.4-6 7-6s6.4 2.2 7 6"/>',
};
const icon = (k, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;

// ------------------------------------------------------------- shared parts

const B = C.badges || {};
const BADGE = {
  free: ['tag', 'Free', 'free'],
  day_one: ['calendar', 'From day one', 'day_one'],
  ytk: ['key', 'Yours to keep', 'yours_to_keep'],
  always: ['clock', '24/7', 'always_on'],
  bilingual: ['language', 'English &amp; Español', 'bilingual'],
};
// Core badges follow the config switches; page-specific badges always show.
const badge = (k, { label, ph } = {}) => {
  if (BADGE[k] && B[BADGE[k][2]] === false) return '';
  if (k === 'day_one' && C.day_one === false) return '';
  const [ic, text] = BADGE[k] || [k.icon, k.text];
  const el = `<span class="badge${k === 'ytk' ? ' keep' : ''}">${icon(ic)}${label || text}</span>`;
  return ph ? `<span class="ph ph-block">${el}</span>` : el;
};
const extra = (ic, text) => `<span class="badge">${icon(ic)}${text}</span>`;
const badgeRow = (items) => `<div class="badges">${items.join('')}</div>`;

let QR_SVG = null;
const qr = (size = 'sm') => (QR_SVG
  ? `<span class="qr ${size}">${QR_SVG}</span>`
  : `<span class="qr ${size} qr-ph"><span class="ph">QR</span></span>`);

const lockup = () => `<div class="lockup"><img class="mark" src="${MARK}" alt="Refresh"><span class="x">×</span>${C.logo_paths && C.logo_paths.lockup
  ? `<img class="org-logo" src="${esc(C.logo_paths.lockup)}" alt="${esc(C.org_short)}">`
  : `<span class="org-ph">${f(C.org_short)}</span>`}</div>`;

const strokes = () => `<div class="strokes">${K.map((k, i) => `<img class="k${i + 1}" src="${k}" alt="">`).join('')}</div>`;

const hero = ({ kicker, h1, sub, calm }) => `
<header class="hero${calm ? ' calm' : ''}">
  <div class="hero-top">${kicker ? `<div class="kicker">${kicker}</div>` : '<span></span>'}${lockup()}</div>
  <h1>${h1}</h1>
  ${sub ? `<p class="sub">${sub}</p>` : ''}
  ${strokes()}
</header>`;

const howTo = (steps) => `<div class="howto"><div class="howto-h">How to start</div><ol>${steps.map((s) => `<li>${s}</li>`).join('')}</ol></div>`;

const quote = (q) => {
  if (!q) return '';
  const allPh = ['text', 'first_name', 'role', 'location'].every((k) => isPh(q[k]));
  return `<figure class="quote${allPh ? ' ph-block' : ''}"><div class="photo-ph"><span class="ph-label">Photo: a real team member</span></div><div><blockquote>“${f(q.text)}”</blockquote><figcaption>${f(q.first_name)}, ${f(q.role)}, ${f(q.location)}</figcaption></div></figure>`;
};

// A photo slot that fills the space left on the page. With a photo in
// config.photos it shows the photo; otherwise it is a labeled placeholder,
// hidden in print mode and hidden when too little room is left.
const photo = (id, label) => {
  const src = C.photos && C.photos[id];
  return src && !isPh(src)
    ? `<div class="photo-fill"><img src="${esc(src)}" alt=""></div>`
    : `<div class="photo-fill ph-block"><span class="ph-label">Photo: ${label}</span></div>`;
};

const findBar = (p) => `<div class="find"><div><span class="find-h">Find it in Refresh</span>${phrase(`<span class="find-h"> →</span> <span class="find-p">${esc(p)}</span>`, p)}</div>${qr('sm')}</div>`;

// ------------------------------------------------------------- pages

const P = {}; // page id -> printed page number (filled in below)
const pnum = (id) => (P[id] === undefined ? '' : P[id]);
const seePage = (id) => (isPh(String(pnum(id))) || pnum(id) === '' ? `<span class="ph">XX</span>` : pnum(id));

// Wraps a phrase so it disappears in print when any of its values is a placeholder.
const phrase = (html, ...vals) => (vals.some((v) => !has(v) || isPh(v)) ? `<span class="ph">${html}</span>` : html);
const factOk = (key) => FACTS[key] && FACTS[key].ok;
const goTo = (p) => (isPh(p) ? `Open Refresh<span class="ph"> and go to ${esc(p)}</span>.` : `Open Refresh and go to ${esc(p)}.`);

const pages = [];

pages.push({ id: 'opener', file: '00-beyond-insurance', title: 'Beyond Insurance', numbered: false, html: () => `
${hero({ kicker: 'Beyond insurance', h1: 'Help that stays with you.' })}
<main class="body">
  <p class="lead">Your insurance covers you while you work here. ${f(C.org_name)} also gives you something more: free help with food, rent, bills, prescriptions, money, your mind and your career. Most of it needs no enrollment. Much of it is yours to keep, even if your path takes you somewhere else someday. ${f(C.mission_line)}</p>
  <div class="promises">
    <div class="promise">${icon('tag')}<div><b>Free.</b> No premiums, no paycheck deductions.</div></div>
    <div class="promise">${icon('calendar')}<div><b>From day one.</b> ${f(C.eligibility_line)}</div></div>
    <div class="promise keep">${icon('key')}<div><b>Yours to keep.</b> Look for the badge; that help goes with you.</div></div>
  </div>
  <h2 class="h2">I need help with…</h2>
  <div class="index">
    ${[
      ['food', 'Food, rent or utilities', 'p3'],
      ['rx', 'Paying for prescriptions or a doctor', 'p4'],
      ['money', 'Debt, credit or a budget', 'p5'],
      ['legal', 'A legal question', 'p5'],
      ['mind', 'Stress, a crisis, or caring for family', 'p6'],
      ['career', 'A better job or new skills', 'p7'],
      ['work', `Pay, my health plan, or what's happening at ${f(C.org_short)}`, 'p1'],
      ['star', 'Feeling appreciated (and some gift cards)', 'p2'],
    ].map(([ic, t, id]) => `<div class="tile">${icon(ic)}<span class="t">${t}</span><span class="pg">p.${seePage(id)}</span></div>`).join('')}
  </div>
  ${howTo(['Scan the code or open the link in your welcome text or email.', 'Sign in and pick your language.', 'Choose a wellness focus.'])}
  <p class="sources">Sources: <a href="${FACTS.src_metlife.url}">MetLife 2026 Employee Benefit Trends Study</a> · <a href="${FACTS.src_shrm.url}">SHRM 2026 Employee Benefits Survey</a> · <a href="${FACTS.src_bswift.url}">bswift benefits communication research</a> · <a href="${FACTS.src_shortlister.url}">Shortlister: Is 2026 the Year of Portable Benefits?</a></p>
</main>
<div class="find"><div><span class="find-h">Everything here is in one app.</span> <span class="find-p">Scan the code to get started.</span></div>${qr('sm')}</div>` });

pages.push({ id: 'p1', file: '01-meet-refresh', title: 'Meet Refresh', html: () => `
${hero({ kicker: 'Meet Refresh', h1: `Everything ${f(C.org_short)} offers you, in one app.`, sub: "Refresh is your benefits app. It's on your phone or computer, 24/7, in the language you choose." })}
${badgeRow([badge('free'), badge('day_one'), has(C.yours_to_keep_app_text) ? badge('ytk', { ph: isPh(C.yours_to_keep_app_text) }) : ''])}
<main class="body">
  <p>You shouldn't need ten logins and a stack of flyers to get help. Refresh puts your pay, your benefits, free support services and ${f(C.org_short)} news in one place, shaped around what matters to you.</p>
  <div class="tiles6 wide">
      ${[
        ['chat', 'Stay in the know', 'News, the weekly focus, and events you can sign up for in the app.'],
        ['search', 'Find what you need', `Your pay${phrase(`, your ${esc(C.health_plan)}`, C.health_plan)}${phrase(`, ${esc(C.telehealth)}`, C.telehealth)} and the employee portal.`],
        ['star', 'Get involved', 'Short weekly challenges, guided quests and quick check-ins.'],
        ['gift', 'Earn &amp; celebrate', 'Points, gift cards, prize drawings and shoutouts for teammates.'],
        ['care', 'Explore resources', 'Free help with food, rent, prescriptions, money, legal questions, mental health and careers.'],
        ['rx', 'Save &amp; discover', 'A free prescription discount card and member discounts.'],
      ].map(([ic, h, p]) => `<div class="card mini">${icon(ic)}<h3>${h}</h3><p>${p}</p></div>`).join('')}
  </div>
  <div class="split">
    ${C.photos && C.photos.phone_mockup && !isPh(C.photos.phone_mockup)
      ? `<div class="phone-ph"><img src="${esc(C.photos.phone_mockup)}" alt="The ${esc(C.org_short)} Refresh home screen"></div>`
      : `<div class="phone-ph ph-block"><span class="ph-label">Phone mockup: the ${f(C.org_short)} Refresh home screen</span></div>`}
    <div class="stack">
      <div class="callout">Most wellness apps give you articles about money and stress. <b>Refresh connects you to real help:</b> a financial coach, a pharmacy discount, a food pantry near you.</div>
      <div class="row2">
        <div class="card"><h3>Made for you</h3><p>Choose a wellness focus when you sign up, and Refresh shows the resources and challenges that fit.</p></div>
        ${has(C.yours_to_keep_app_text) ? `<div class="keepband${isPh(C.yours_to_keep_app_text) ? ' ph-block' : ''}">${icon('key')}<p><b>Yours to keep.</b> ${f(C.yours_to_keep_app_text)}</p></div>` : ''}
      </div>
    </div>
  </div>
  ${quote(C.quotes && C.quotes.page1)}
  ${howTo(['Scan the code or open the link in your welcome text or email.', 'Sign in and pick your language.', 'Choose a wellness focus.'])}
</main>
${findBar(C.menu_paths.refresh_home)}` });

const pts = C.points_examples || {};
pages.push({ id: 'p2', file: '02-earn-and-celebrate', title: 'Earn & Celebrate', html: () => `
${hero({ kicker: 'Earn &amp; celebrate', h1: 'Do good stuff. Get rewarded.' })}
${badgeRow([badge('free'), badge('day_one')])}
<main class="body">
  <p>Small steps add up. Take a walk, share what you're grateful for, check a money goal off your list, and earn points that turn into gift cards. Along the way, cheer on the people who make your day better.</p>
  <div class="steps3">
    <div class="step"><span class="n">1</span><p><b>Join a challenge.</b> New ones every week, tied to a monthly theme.</p></div>
    <div class="step"><span class="n">2</span><p><b>Earn points</b> from challenges, quests and shoutouts.</p></div>
    <div class="step"><span class="n">3</span><p><b>Trade points</b> for gift cards${phrase(` (${esc(C.reward_examples)})`, C.reward_examples)} and enter monthly prize drawings.</p></div>
  </div>
  <div class="row2">
    <table class="pts${Object.values(pts).every((v) => !has(v) || isPh(v)) ? ' ph-block' : ''}"><thead><tr><th scope="col">Sample challenge</th><th scope="col">Points</th></tr></thead><tbody>
      ${[['Steps', pts.steps], ['Annual wellness visit', pts.wellness_visit], ['Weekly reflection', pts.reflection], ['Money step', pts.money], ['Shoutout', pts.shoutout]].map(([a, b]) => `<tr><td>${a}</td><td>${f(b)}</td></tr>`).join('')}
    </tbody></table>
    <div class="stack">
      <div class="card"><h3>${icon('star', 'inline')}Celebrate your people</h3><p>Send a shoutout to a teammate who lives ${f(C.org_short)}'s values.</p></div>
      <div class="callout"><b>Better together.</b> People join because their coworkers do. Bring a teammate along this month.</div>
    </div>
  </div>
  <p class="tiein">${icon('health', 'inline')}Your annual wellness visit is covered as preventive care${phrase(` under ${esc(C.health_plan)}`, C.health_plan)}, and it earns points too.</p>
  ${C.optional_pages && C.optional_pages.everyday_savings ? `<div class="savings"><h3>${icon('tag', 'inline')}Everyday savings</h3><p>Member discounts on phones, tech, travel, tickets and pets, in the app.</p><div class="pills">${['Phones', 'Tech', 'Travel', 'Tickets', 'Pets'].map((x) => `<span class="pill">${x}</span>`).join('')}</div></div>` : ''}
  ${quote(C.quotes && C.quotes.page2)}
  ${photo('p2', 'teammates celebrating a shoutout or finishing a challenge together')}
  ${howTo([goTo(C.menu_paths.refresh_home), 'Join this week\'s challenge.', 'Send your first shoutout.'])}
</main>
${findBar(C.menu_paths.refresh_home)}` });

pages.push({ id: 'p3', file: '03-find-help-near-you', title: 'Find Help Near You', html: () => `
${hero({ kicker: 'Find help near you', h1: 'Help is available in your neighborhood.', sub: 'A free, private search for local programs, for you, your family or a neighbor.' })}
${badgeRow([badge('free'), badge('ytk'), extra('share', 'Share it with anyone')])}
<main class="body">
  <p>When money is tight, the hardest part is often knowing where to start. Findhelp lists food pantries, meal programs, housing and rent help, utility assistance, transportation, health care and more near you. Enter your ZIP code and see programs with their hours, eligibility and contact details.</p>
  <div class="iconrow">${[['food', 'Food'], ['home', 'Housing'], ['goods', 'Goods'], ['transit', 'Transit'], ['health', 'Health'], ['money', 'Money'], ['care', 'Care'], ['education', 'Education'], ['work', 'Work'], ['legal', 'Legal']].map(([ic, t]) => `<div>${icon(ic)}<span>${t}</span></div>`).join('')}</div>
  <div class="cards3">
    <div class="card">${icon('food')}<h3>Food benefits (SNAP)</h3><p>Apply in ${f(C.state)} at ${C.state_snap_url && !isPh(C.state_snap_site) ? `<a href="${esc(C.state_snap_url)}">${f(C.state_snap_site)}</a>` : f(C.state_snap_site)}.</p></div>
    <div class="card">${icon('home')}<h3>Help with rent or housing</h3><p>Search Findhelp for rent, utility and housing programs near you.</p></div>
    <div class="card">${icon('pin')}<h3>Emergency shelter</h3><p>Use the <a href="${FACTS.redcross_shelter.url}">American Red Cross shelter finder</a>.</p></div>
  </div>
  ${quote(C.quotes && C.quotes.page3)}
  ${photo('p3', 'a team member, or a local partner such as a food pantry')}
  ${howTo([goTo(C.menu_paths.local_services), 'Enter your ZIP code.', 'Or go to findhelp.org on any device.'])}
</main>
${findBar(C.menu_paths.local_services)}` });

pages.push({ id: 'p4', file: '04-save-on-prescriptions', title: 'Save on Prescriptions & Care', html: () => `
${hero({ kicker: 'Save on prescriptions &amp; care', h1: 'Pay less for medicine and care, with or without insurance.' })}
${badgeRow([badge('free'), badge('ytk', { label: 'Yours to keep · the card never expires' }), extra('share', 'Share it with family')])}
<main class="body">
  <p>${fact('stat_skip_care', `Half of employees often avoid seeking medical care because of out-of-pocket costs (<a href="${FACTS.src_metlife_news.url}">MetLife, 2026</a>).`)} You don't have to. Your free Refresh prescription card and NeedyMeds can lower what you pay, whether or not you're on ${f(C.org_short)}'s health plan.</p>
  <div class="row2 rx">
    <div class="rxcard">
      <span class="cut">${icon('scissors')}</span>
      <div class="rx-top"><img class="mark dark" src="${MARK}" alt="Refresh"><span>${fact('nm_card_name', 'NEEDYMEDS DRUG DISCOUNT CARD')}</span></div>
      <dl>
        ${[['BIN', 'nm_bin', '020750'], ['PCN', 'nm_pcn', 'NMeds'], ['GRP', 'nm_grp', 'REFRESH']].map(([k, key, val]) => `<div class="${factOk(key) ? '' : 'ph-block'}"><dt>${k}</dt><dd>${fact(key, val)}</dd></div>`).join('')}
        <div><dt>ID</dt><dd>${has(C.rx_member_id) ? f(C.rx_member_id) : 'See your card in the app'}</dd></div>
      </dl>
      <div class="rx-help${factOk('nm_phone') ? '' : ' ph-block'}">Pharmacy help desk ${fact('nm_phone', '1-800-401-1031')}</div>
      <div class="rx-note">This is a drug discount program, not insurance.</div>
    </div>
    <ul class="checks">
      <li>${icon('check')}${fact('nm_save', 'Save up to 80%')}</li>
      <li>${icon('check')}${fact('nm_pharmacies', 'More than 65,000 pharmacies, including all major chains')}</li>
      <li>${icon('check')}Free, no fees or registration</li>
      <li>${icon('check')}Use it as often as you need</li>
      <li>${icon('check')}${fact('nm_expires', 'Never expires')}</li>
      <li>${icon('check')}Share it with friends and family</li>
    </ul>
  </div>
  <div class="callout"><b>Have insurance?</b> ${fact('nm_insurance', 'Use the card instead of insurance when the card price is lower than your copay, or when a drug isn\'t covered. You can\'t combine the two on the same purchase.')} ${fact('nm_deductible', 'Discount purchases don\'t count toward your deductible.')}</div>
  <div class="card"><h3>More ways NeedyMeds helps</h3><div class="pills">${['Free or low-cost medical care', 'Affordable dental', 'Mental health support', 'Help paying for medications', 'Community clinics'].map((x) => `<span class="pill">${x}</span>`).join('')}</div><p>"Find low-cost prescriptions" in the app compares pharmacy prices nearby.</p></div>
  ${photo('p4', 'a team member at a pharmacy counter')}
  ${howTo([goTo(C.menu_paths.rx_card), 'Show the card at the pharmacy counter.', 'Ask for the lower price: card or insurance.'])}
</main>
${findBar(C.menu_paths.rx_card)}` });

const ytkMoney = C.confirmed && C.confirmed.money_yours_to_keep;
pages.push({ id: 'p5', file: '05-money-and-legal-help', title: 'Money & Legal Help', html: () => `
${hero({ kicker: 'Money &amp; legal help', h1: 'Free money coaching. Real people. No judgment.' })}
${badgeRow([badge('free'), badge('bilingual'), badge('ytk', { ph: !ytkMoney, label: ytkMoney ? 'Yours to keep' : 'Yours to keep (CONFIRM)' })])}
<main class="body">
  <p>${fact('stat_cost_stress', `83% of employees say rising living expenses and medical costs are their top stressors (<a href="${FACTS.src_metlife_news.url}">MetLife, 2026</a>).`)} A KOFE money coach can help you make a plan, one-on-one, in English or Spanish, at no cost.</p>
  <div class="row2">
    <div class="card"><h3>${icon('coach', 'inline')}A coach can help you</h3><ul class="dots">${['Check your credit score', 'Review your credit report', 'Build a budget that works on your pay schedule', 'Pay down debt', 'Reach a goal like an emergency fund or a first home'].map((x) => `<li>${x}</li>`).join('')}</ul><span class="btn">Talk to a money coach</span></div>
    <div class="stack">
      <div class="tools">${['Credit score calculator', 'KOFEtime lessons', fact('kofe_enrich', 'Enrich courses and money quiz'), 'Retirement, student loan and home affordability tools', 'Rent and housing guidance'].map((x) => `<span class="tool">${x}</span>`).join('')}</div>
      <div class="card legal"><h3>${icon('legal', 'inline')}Legal help</h3><p>LawHelp gives free legal information, tools and referrals so you understand your rights.</p></div>
    </div>
  </div>
  <div class="moneysteps"><span>Set one small money goal</span><i>→</i><span>Know what's coming in</span><i>→</i><span>Track what's left over</span></div>
  ${photo('p5', 'a team member on a call with a money coach')}
  ${howTo([goTo(C.menu_paths.money_legal), 'Tap “Talk to a money coach.”', 'Book a time that works for you.'])}
</main>
${findBar(C.menu_paths.money_legal)}` });

pages.push({ id: 'p6', file: '06-mind-crisis-and-family', title: 'Mind, Crisis & Family Support', calm: true, html: () => `
${hero({ kicker: 'Mind, crisis &amp; family support', h1: "You don't have to handle it alone.", calm: true })}
${badgeRow([badge('free'), badge('always'), extra('shield', 'Confidential'), badge('ytk')])}
<main class="body">
  <p>${has(C.eap_name) ? phrase(`Your ${esc(C.eap_name)} is a great first call. `, C.eap_name) : ''}Refresh adds support any time of day or night, for you and the people you love.</p>
  <div class="crisis">
    <table><thead><tr><th scope="col">If you're facing…</th><th scope="col">Reach out to</th><th scope="col">How</th></tr></thead><tbody>
      <tr><td>A mental health or suicidal crisis</td><td>988 Suicide &amp; Crisis Lifeline</td><td>${fact('h_988', 'Call or text 988, or chat')}</td></tr>
      <tr><td>Abuse at home</td><td>National Domestic Violence Hotline</td><td>${fact('h_ndvh', '1-800-799-7233')}</td></tr>
      <tr><td>Sexual assault</td><td>RAINN</td><td>${fact('h_rainn', '1-800-656-4673')}</td></tr>
      <tr><td>Nowhere safe to stay tonight</td><td>Red Cross shelter finder</td><td>In the app</td></tr>
    </tbody></table>
    <p class="danger">In immediate danger? Call 911.</p>
  </div>
  <div class="tiles4">${[['family', 'Parenting and family stress', fact('h_parent', 'National Parent &amp; Youth Helpline, 855-427-2736')], ['care', 'Caring for an aging parent', ''], ['home', 'Growing your family', 'Fertility and family planning'], ['search', 'Find a therapist near you', '']].map(([ic, h, p]) => `<div class="card mini">${icon(ic)}<h3>${h}</h3>${p ? `<p>${p}</p>` : ''}</div>`).join('')}</div>
  <div class="calmrow"><span class="calm-h">Everyday calm</span>${['Calm', 'Headspace', 'Guided meditation videos', 'NAMI support groups', 'I Am Sober', 'A.A. Meeting Guide'].map((x) => `<span class="pill">${x}</span>`).join('')}</div>
  ${photo('p6', 'a calm, quiet moment: a team member outdoors or at home')}
  ${howTo([goTo(C.menu_paths.health_wellness), 'Pick what you need right now.', 'Reach out by call, text or chat.'])}
</main>
${findBar(C.menu_paths.health_wellness)}` });

pages.push({ id: 'p7', file: '07-grow-your-skills', title: 'Grow Your Skills & Career', html: () => `
${hero({ kicker: 'Grow your skills &amp; career', h1: 'Grow your skills. Grow your career. Free.' })}
${badgeRow([badge('free'), extra('pace', 'At your own pace'), badge('ytk')])}
<main class="body">
  <p>Wherever you want to go next, at ${f(C.org_short)} or beyond, Refresh puts free courses, career tools and job-skills training in your pocket.</p>
  <div class="row2">
    <div class="card"><h3>${icon('career', 'inline')}Find your path</h3><p><b>Career quiz:</b> MyNextMove</p><p><b>Digital skills check:</b> Northstar Digital Literacy</p></div>
    <div class="card org${isPh(C.growth_programs) ? ' ph-block' : ''}"><h3>At ${f(C.org_short)}</h3><p>${f(C.growth_programs)}</p></div>
  </div>
  <div class="tiles6 wide">${[['Khan Academy', ''], ['LearnFree', 'Formerly GCFLearnFree'], ['Skills to Succeed Academy', ''], ['edX &amp; Coursera', fact('learn_audit', 'edX courses are free to audit; Coursera offers a free first module')], ['Udemy &amp; ed2go', 'Free Udemy courses and ed2go tutorials'], ['Duolingo &amp; Mango', fact('mango_library', 'Mango is free through many public libraries')]].map(([h, p]) => `<div class="card mini">${icon('education')}<h3>${h}</h3>${p ? `<p>${p}</p>` : ''}</div>`).join('')}</div>
  ${quote(C.quotes && C.quotes.page7)}
  <p class="closing">Try the 3-minute “What's next for you?” quest.</p>
  ${photo('p7', 'a team member learning a new skill')}
  ${howTo([goTo(C.menu_paths.work_life), 'Take the career quiz.', 'Start a free course.'])}
</main>
${findBar(C.menu_paths.work_life)}` });

if (C.optional_pages && C.optional_pages.move_eat_rest) pages.push({ id: 'move', file: '08-move-eat-rest', title: 'Move, Eat & Rest', html: () => `
${hero({ kicker: 'Move, eat &amp; rest', h1: 'Feel better, one small habit at a time.' })}
${badgeRow([badge('free'), badge('day_one')])}
<main class="body">
  <p>Free apps for fitness, nutrition and sleep are in Refresh, alongside step challenges you can join with your team.</p>
  <div class="cards3">
    <div class="card">${icon('move')}<h3>Move</h3><p>Join a step challenge and free fitness apps in the app.</p></div>
    <div class="card">${icon('eat')}<h3>Eat</h3><p>Free nutrition apps to help you eat well.</p></div>
    <div class="card">${icon('rest')}<h3>Rest</h3><p>Free sleep and wind-down apps for better nights.</p></div>
  </div>
  ${photo('move', 'a team member out for a walk')}
  ${howTo([goTo(C.menu_paths.health_wellness), 'Pick one habit to start.', 'Join this month\'s step challenge.'])}
</main>
${findBar(C.menu_paths.health_wellness)}` });

if (C.optional_pages && C.optional_pages.share_with_family) pages.push({ id: 'family', file: '09-share-with-family', title: 'Share With Your Family & Community', html: () => `
${hero({ kicker: 'Share with your family &amp; community', h1: 'Some help is for everyone you love.' })}
${badgeRow([badge('free'), extra('share', 'Share it with anyone')])}
<main class="body">
  <p>Family members and neighbors can use these without signing in to Refresh.</p>
  <div class="cards3">
    <div class="card">${icon('search')}<h3>Local help</h3><p>Anyone can search findhelp.org by ZIP code.</p></div>
    <div class="card">${icon('rx')}<h3>Prescription card</h3><p>Share your free card with family and friends.</p></div>
    <div class="card">${icon('clock')}<h3>Crisis support</h3><p>988 and the other hotlines on page ${seePage('p6')} are open to anyone.</p></div>
    <div class="card">${icon('legal')}<h3>Legal information</h3><p>LawHelp is free for anyone.</p></div>
    <div class="card">${icon('food')}<h3>Food benefits</h3><p>Anyone can apply for SNAP at ${f(C.state_snap_site)}.</p></div>
    <div class="card">${icon('education')}<h3>Free learning</h3><p>Khan Academy and LearnFree are free for anyone.</p></div>
  </div>
  ${photo('family', 'a team member with family or neighbors')}
  ${howTo(['Share this page.', 'Point them to findhelp.org and their pharmacy.', 'Call 911 in an emergency.'])}
</main>
${findBar(C.menu_paths.local_services)}` });

// Numbering: page_number_start numbers "Meet Refresh"; the opener is the page before it.
{
  const start = C.page_number_start;
  const numbered = pages.filter((p) => p.id !== 'opener');
  if (typeof start === 'number') {
    numbered.forEach((p, i) => { P[p.id] = start + i; });
    if (start > 1) P.opener = start - 1;
  } else {
    pages.forEach((p) => { P[p.id] = start || '[XX]'; });
  }
}

const strips = () => `
<section class="page strips-page" data-id="strips">
  <div class="strips-h">Callout strips · trim on the dashed lines · about 7.5 × 1.25 in each</div>
  ${[
    ['health', 'Medical', 'Your annual wellness visit is covered, and it earns Refresh points.'],
    ['phone', 'Telehealth', `${f(C.telehealth)}: also in the Refresh app.`],
    ['mind', has(C.eap_name) ? `EAP · ${f(C.eap_name)}` : 'Support', `Need more support, any time? See page ${seePage('p6')}.`],
    ['rx', 'Prescription savings', `Start with your free Refresh prescription card. See page ${seePage('p4')}.`],
  ].map(([ic, k, t]) => `<div class="strip">${icon(ic)}<div><span class="k">${k}</span><p>${t}</p></div>${qr('xs')}</div>`).join('')}
  <div class="strip contacts">${icon('chat')}<div><span class="k">Contacts</span><p>${phrase(`<b>Refresh:</b> ${esc(C.support_contact)}`, C.support_contact)}${phrase(' &nbsp;·&nbsp; ', C.support_contact)}${factOk('nm_phone') ? '' : '<span class="ph">'}<b>Rx help desk:</b> ${fact('nm_phone', '1-800-401-1031')}${factOk('nm_phone') ? '' : '</span>'}</p></div>${qr('xs')}</div>
</section>`;

const back = () => `
<section class="page back" data-id="back">
  ${hero({ kicker: 'All year long', h1: `Your ${f(C.org_short)} benefits, all year.` })}
  <main class="body center">
    <div class="bigqr">${qr('lg')}<p>Scan to open Refresh.</p></div>
    <h2 class="h2">This year's monthly themes</h2>
    <div class="badges center">${[badge('free'), badge('day_one'), badge('ytk')].join('')}</div>
    <div class="months">${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => `<div><b>${m}</b><span>${f((C.monthly_themes || [])[i] || '[THEME]')}</span></div>`).join('')}</div>
    <div class="contactcard"><h3>Questions?</h3><p class="${isPh(C.support_contact) ? 'ph-block' : ''}"><b>Refresh support:</b> ${f(C.support_contact)}</p><p class="${factOk('nm_phone') ? '' : 'ph-block'}"><b>Prescription card help desk:</b> ${fact('nm_phone', '1-800-401-1031')}</p><p class="fine-c">In immediate danger? Call 911. In a mental health crisis, call or text 988.</p></div>
  </main>
  ${footer('back')}
</section>`;

function footer(id, note) {
  const n = pnum(id);
  const wm = C.logo_paths && C.logo_paths.wordmark
    ? `<img class="gw" src="${esc(C.logo_paths.wordmark)}" alt="${esc(C.org_name)}">`
    : `<span class="gw-ph">${f(C.org_name)}</span>`;
  return `<footer class="foot">${n === '' ? '<span></span>' : `<span class="pnum">${f(String(n))}</span>`}${has(note) ? `<span class="fine">${f(note)}</span>` : ''}${wm}</footer>`;
}

const pageHtml = (p) => `<section class="page${p.calm ? ' calm-page' : ''}" data-id="${p.id}">${p.html()}${footer(p.id, p.id === 'p1' ? C.privacy_line : null)}</section>`;

// ------------------------------------------------------------- CSS

const CSS = `
:root{--cream:#F8F7F0;--panel:#ECE9D6;--ink:#252427;--ink2:#373536;--muted:#6E6B62;--green:#4BDF52;--greenText:#127a1d;--greenSoft:#E4F7E5;--cyan:#2EC5EA;--pink:#F293F7;--yellow:#F6EE6B;--blue:#1F8FE5;--hair:rgba(37,36,39,.14);
  --calmBg:#EEF3F2;--calmHero:#DCE8E6;--calmInk:#2F4A4A;}
@page{size:8.5in 11in;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:Arial,"Helvetica Neue",Helvetica,sans-serif;color:var(--ink2);background:#9b9a93}
a{color:var(--greenText);text-decoration:none;border-bottom:1px solid var(--green)}
.page{width:8.5in;height:11in;background:var(--cream);position:relative;overflow:hidden;display:flex;flex-direction:column;margin:0 auto .35in;box-shadow:0 6px 24px rgba(0,0,0,.25);page-break-after:always;break-after:page}
@media print{body{background:none}.page{margin:0;box-shadow:none}.page:last-of-type{break-after:auto;page-break-after:auto}.toolbar{display:none}}
.ic{width:20px;height:20px;flex-shrink:0;color:var(--greenText)}
.ic.inline{width:16px;height:16px;vertical-align:-3px;margin-right:6px}

/* Hero */
.hero{position:relative;background:var(--ink);color:#fff;padding:.36in .5in .74in;overflow:hidden;flex-shrink:0}
.hero-top{display:flex;justify-content:space-between;align-items:center;gap:.25in}
.lockup{display:flex;align-items:center;gap:8px;flex-shrink:0;max-width:3.4in}
.lockup .mark{height:22px;filter:invert(1) brightness(1.9)}
.lockup .x{color:rgba(255,255,255,.7);font-size:14pt}
.org-ph{font-weight:700;font-size:11pt;line-height:1.2;color:#fff;border:1.5px dashed rgba(255,255,255,.5);border-radius:6px;padding:2px 8px;text-align:right}
.org-logo{height:24px}
.kicker{font-weight:700;font-size:9.5pt;letter-spacing:.18em;text-transform:uppercase;color:rgba(242,241,234,.75)}
.hero h1{font-size:31pt;line-height:1.05;letter-spacing:-.02em;font-weight:700;margin-top:8px;max-width:7.2in}
.hero .sub{font-size:13pt;line-height:1.35;color:rgba(242,241,234,.85);margin-top:8px;max-width:6.4in}
.strokes{position:absolute;left:0;right:0;bottom:0;height:.72in;pointer-events:none}
.strokes img{position:absolute;width:auto}
.strokes .k1{left:-4%;height:58px;bottom:-6px;transform:rotate(-4deg)}
.strokes .k2{left:16%;height:48px;bottom:22px;transform:rotate(3deg);opacity:.9}
.strokes .k3{left:30%;height:32px;bottom:-2px;transform:rotate(-2deg)}
.strokes .k4{left:50%;height:50px;bottom:8px;transform:rotate(2deg)}
.strokes .k5{left:74%;height:54px;bottom:-8px;transform:rotate(-5deg)}
.hero.calm{background:var(--calmHero);color:var(--calmInk)}
.hero.calm .kicker{color:var(--calmInk)}
.hero.calm .lockup .mark{filter:none}
.hero.calm .lockup .x{color:var(--calmInk)}
.hero.calm .org-ph{color:var(--calmInk);border-color:rgba(47,74,74,.4)}
.hero.calm .strokes{opacity:.38}
.calm-page{background:var(--calmBg)}

/* Badges */
.badges{display:flex;flex-wrap:wrap;gap:6px;padding:.14in .5in 0;flex-shrink:0}
.badge{display:inline-flex;align-items:center;gap:5px;background:#fff;border:1.5px solid var(--green);border-radius:999px;padding:3px 10px;font-weight:700;font-size:9.5pt;color:var(--ink)}
.badge .ic{width:14px;height:14px}
.badge.keep{background:var(--ink);border-color:var(--ink);color:#fff}
.badge.keep .ic{color:var(--green)}

/* Body */
.body{flex:1;padding:.12in .5in 0;display:flex;flex-direction:column;gap:8px;overflow:hidden;min-height:0}
.body p,.body li,.body td,.body dd{font-size:10.5pt;line-height:1.38}
.lead{font-size:12pt !important;line-height:1.45 !important;color:var(--ink)}
.h2{font-size:15pt;color:var(--ink);letter-spacing:-.01em;margin-top:2px}
h3{font-size:11pt;color:var(--ink);margin-bottom:3px}
b{color:var(--ink)}
.card{background:#fff;border-radius:16px;border-top:4px solid var(--green);padding:.09in .14in;box-shadow:0 3px 12px rgba(37,36,39,.06)}
.card.mini{display:grid;grid-template-columns:20px 1fr;column-gap:8px;align-content:start}
.card.mini .ic{grid-row:span 2;margin-top:1px}
.card.mini h3,.card.mini p{grid-column:2}
.callout{background:var(--greenSoft);border-left:5px solid var(--green);border-radius:12px;padding:.09in .15in;font-size:10.5pt;line-height:1.38;color:var(--ink)}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:9px;align-items:start}
.stack{display:flex;flex-direction:column;gap:9px}
.split{display:grid;grid-template-columns:1.2in 1fr;gap:10px}
.tiles6{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.tiles6.wide{grid-template-columns:repeat(3,1fr)}
.tiles6 .card p{font-size:10.5pt}
.tiles4{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
.cards3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.phone-ph{border:2px solid var(--ink);border-radius:22px;background:var(--panel);display:flex;align-items:center;justify-content:center;padding:10px;text-align:center}
.photo-ph{width:.7in;height:.7in;border-radius:50%;background:var(--panel);display:flex;align-items:center;justify-content:center;text-align:center;flex-shrink:0;padding:6px}
.ph-label{font-size:9pt;color:var(--muted);font-weight:700}
.keepband{display:flex;gap:8px;align-items:flex-start;background:var(--ink);color:#fff;border-radius:14px;padding:.1in .15in}
.keepband p,.keepband b{color:#fff}
.keepband .ic{color:var(--green)}
.quote{display:flex;gap:12px;align-items:center;background:#fff;border-radius:16px;padding:.08in .14in;border-left:5px solid var(--pink)}
.quote blockquote{font-size:11pt;line-height:1.35;color:var(--ink);font-style:italic}
.quote figcaption{font-size:10pt;color:var(--muted);margin-top:3px;font-weight:700}
.howto{margin-top:auto;display:flex;gap:10px;align-items:center;background:#fff;border:1.5px dashed var(--green);border-radius:14px;padding:.08in .14in}
.howto-h{font-weight:700;font-size:10pt;letter-spacing:.08em;text-transform:uppercase;color:var(--greenText);white-space:nowrap}
.howto ol{display:grid;grid-template-columns:1.45fr 1fr 1fr;gap:8px;list-style:none;counter-reset:s}
.howto li{counter-increment:s;position:relative;padding-left:22px;font-size:10.5pt;line-height:1.3}
.howto li::before{content:counter(s);position:absolute;left:0;top:0;width:17px;height:17px;border-radius:50%;background:var(--ink);color:var(--green);font-weight:700;font-size:9pt;display:flex;align-items:center;justify-content:center}
.photo-fill{flex:1 1 0;min-height:0;border-radius:16px;background:var(--panel);display:flex;align-items:center;justify-content:center;overflow:hidden}
.photo-fill img{width:100%;height:100%;object-fit:cover}
.calm-page .photo-fill{background:#DCE8E6}
.fine{font-size:10.5pt;color:var(--muted);flex:1;padding:0 .2in;line-height:1.3}
.sources{font-size:9pt !important;color:var(--muted);margin-top:auto}
.sources a{color:var(--muted)}
.pills{display:flex;flex-wrap:wrap;gap:5px;margin:3px 0}
.pill{background:var(--panel);border-radius:999px;padding:2px 9px;font-size:10pt;font-weight:700;color:var(--ink2)}
.iconrow{display:grid;grid-template-columns:repeat(10,1fr);gap:4px;text-align:center}
.iconrow div{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:9.5pt;font-weight:700;color:var(--ink)}
.iconrow .ic{width:26px;height:26px;background:#fff;border-radius:50%;padding:5px;box-sizing:content-box;box-shadow:0 2px 6px rgba(0,0,0,.06)}

/* Opener */
.promises{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
.promise{display:flex;gap:9px;background:#fff;border-radius:16px;border-top:4px solid var(--green);padding:.11in .14in;font-size:10.5pt;line-height:1.35}
.promise.keep{background:var(--ink);color:#fff;border-top-color:var(--yellow)}
.promise.keep b{color:var(--green)}
.promise.keep .ic{color:var(--yellow)}
.promise .ic{width:24px;height:24px}
.index{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.tile{display:flex;align-items:center;gap:10px;background:#fff;border-radius:14px;padding:.09in .14in;box-shadow:0 3px 10px rgba(37,36,39,.06)}
.tile .ic{width:26px;height:26px}
.tile .t{flex:1;font-weight:700;font-size:11pt;color:var(--ink);line-height:1.25}
.tile .pg{font-weight:700;font-size:12pt;color:var(--ink);background:var(--green);border-radius:8px;padding:2px 8px}

/* Earn */
.steps3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.step{background:#fff;border-radius:16px;border-top:4px solid var(--green);padding:.1in .14in;display:flex;gap:8px}
.step .n{width:24px;height:24px;border-radius:7px;background:var(--ink);color:var(--green);font-weight:700;font-size:12pt;display:flex;align-items:center;justify-content:center;flex-shrink:0}
table.pts{width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden}
table.pts th{background:var(--ink);color:#fff;text-align:left;font-size:9.5pt;letter-spacing:.08em;text-transform:uppercase;padding:6px 10px}
table.pts td{padding:5px 10px;border-top:1px solid var(--hair)}
table.pts td:last-child{font-weight:700;color:var(--ink)}
.tiein{display:block}
.savings{background:#fff;border-radius:16px;border-top:4px solid var(--yellow);padding:.1in .15in}

/* Rx */
.rxcard{position:relative;border:2px dashed var(--ink);border-radius:16px;background:#fff;padding:.12in .16in}
.rxcard .cut{position:absolute;top:-12px;left:14px;background:var(--cream);padding:0 4px}
.rxcard .cut .ic{color:var(--ink)}
.rx-top{display:flex;align-items:center;gap:10px;font-weight:700;font-size:10pt;letter-spacing:.06em;color:var(--ink);border-bottom:1px solid var(--hair);padding-bottom:6px;margin-bottom:6px}
.mark.dark{height:18px}
.rxcard dl{display:grid;grid-template-columns:auto 1fr;gap:2px 12px}
.rxcard dl > div{display:contents}
.rxcard dt{font-weight:700;font-size:10pt;color:var(--muted)}
.rxcard dd{font-weight:700;color:var(--ink);font-family:"Courier New",monospace}
.rx-help{font-size:10pt;font-weight:700;color:var(--ink);margin-top:6px}
.rx-note{font-size:9.5pt;color:var(--muted);margin-top:2px}
ul.checks{list-style:none;display:flex;flex-direction:column;gap:6px;background:#fff;border-radius:16px;padding:.12in .15in}
ul.checks li{display:flex;gap:7px;align-items:flex-start}
ul.checks .ic{width:17px;height:17px}

/* Money */
ul.dots{list-style:none}
ul.dots li{padding-left:14px;position:relative;margin-bottom:3px}
ul.dots li::before{content:"";position:absolute;left:0;top:7px;width:7px;height:7px;border-radius:50%;background:var(--green)}
.btn{display:inline-block;margin-top:6px;background:var(--ink);color:var(--green);font-weight:700;font-size:10.5pt;letter-spacing:.08em;text-transform:uppercase;border-radius:999px;padding:6px 14px}
.tools{display:flex;flex-wrap:wrap;gap:5px}
.tool{background:#fff;border:1px solid var(--hair);border-radius:10px;padding:5px 9px;font-size:10.5pt;font-weight:700;color:var(--ink)}
.moneysteps{display:flex;align-items:center;gap:8px;justify-content:center;background:var(--panel);border-radius:14px;padding:.08in .14in}
.moneysteps span{font-weight:700;font-size:10.5pt;color:var(--ink)}
.moneysteps i{font-style:normal;color:var(--ink);font-weight:700}

/* Calm page */
.calm-page .card{border-top-color:#9CC9C2}
.calm-page .ic{color:#3E7D75}
.calm-page .badge{border-color:#9CC9C2}
.calm-page .badge.keep{background:var(--calmInk);border-color:var(--calmInk)}
.calm-page .badge.keep .ic{color:#BFEBE4}
.calm-page .howto{border-color:#9CC9C2}
.calm-page .howto-h{color:#2F6B63}
.calm-page .howto li::before{background:var(--calmInk);color:#BFEBE4}
.calm-page .find{background:var(--calmInk)}
.calm-page .find-h{color:#BFEBE4}
.crisis{background:var(--ink);color:#fff;border-radius:16px;padding:.1in .16in}
.crisis table{width:100%;border-collapse:collapse}
.crisis th{text-align:left;font-size:9.5pt;letter-spacing:.08em;text-transform:uppercase;color:var(--yellow);padding:4px 6px;border-bottom:1px solid rgba(255,255,255,.25)}
.crisis td{color:#fff;padding:5px 6px;border-bottom:1px solid rgba(255,255,255,.12)}
.crisis td:last-child{font-weight:700;color:var(--yellow)}
.crisis .danger{font-weight:700;color:#fff;margin-top:6px;font-size:11pt}
.calmrow{display:flex;flex-wrap:wrap;gap:5px;align-items:center}
.calm-h{font-weight:700;font-size:10pt;letter-spacing:.08em;text-transform:uppercase;color:#2F6B63;margin-right:4px}
.calm-page .pill{background:#DCE8E6;color:var(--calmInk)}

/* Grow */
.card.org{border-top-color:var(--yellow)}
.closing{font-weight:700;color:var(--ink)}

/* Find bar and footer */
.find{flex-shrink:0;margin:.12in .5in 0;background:var(--ink);color:#fff;border-radius:14px;padding:.08in .16in;display:flex;align-items:center;justify-content:space-between;gap:12px}
.find-h{font-weight:700;font-size:11pt;color:var(--green)}
.find-p{font-weight:700;font-size:11pt;color:#fff}
.foot{flex-shrink:0;min-height:.62in;padding:.08in .5in .14in;display:flex;align-items:center;justify-content:space-between;gap:.15in}
.foot .gw-ph{text-align:right;max-width:3.2in}
.pnum{background:var(--green);color:var(--ink);font-weight:700;font-size:10pt;border-radius:999px;padding:2px 11px}
.gw-ph{font-weight:700;font-size:10pt;color:var(--muted)}
.gw{height:22px}

/* QR */
.qr{display:inline-flex;align-items:center;justify-content:center;background:#fff;border-radius:6px;flex-shrink:0}
.qr svg{width:100%;height:100%}
.qr.sm{width:.62in;height:.62in;padding:3px}
.qr.xs{width:.85in;height:.85in;padding:3px}
.qr.lg{width:2in;height:2in;padding:8px}
.qr-ph{background:repeating-linear-gradient(45deg,#fff 0 4px,#E4E1CF 4px 8px);border:1.5px solid var(--ink)}

/* Strips sheet */
.strips-page{padding:.5in;gap:.12in;justify-content:flex-start}
.strips-h{font-size:10pt;color:var(--muted);font-weight:700}
.strip{width:7.5in;height:1.25in;border:1.5px dashed var(--muted);background:#fff;border-radius:4px;display:flex;align-items:center;gap:.18in;padding:0 .22in}
.strip .ic{width:34px;height:34px}
.strip > div{flex:1}
.strip .k{font-weight:700;font-size:9.5pt;letter-spacing:.14em;text-transform:uppercase;color:var(--greenText)}
.strip p{font-size:13pt;line-height:1.3;color:var(--ink);font-weight:700;margin-top:3px}
.strip.contacts p{font-size:11.5pt}

/* Back cover */
.body.center{align-items:center;text-align:center;justify-content:flex-start;gap:14px}
.bigqr p{font-weight:700;font-size:12pt;color:var(--ink);margin-top:8px}
.badges.center{justify-content:center;padding:0}
.contactcard{background:#fff;border-radius:16px;border-top:4px solid var(--green);padding:.14in .2in;width:100%;text-align:left}
.contactcard p{margin-top:3px}
.fine-c{color:var(--muted)}
.months{display:grid;grid-template-columns:repeat(6,1fr);gap:7px;width:100%}
.months div{background:#fff;border-radius:12px;border-top:4px solid var(--green);padding:.08in .06in;display:flex;flex-direction:column;gap:3px}
.months b{font-size:11pt}
.months span{font-size:10.5pt}

/* Tight: applied automatically when a page would overflow. Spacing only; text sizes stay the same. */
.page.tight .hero{padding-top:.3in;padding-bottom:.6in}
.page.tight .strokes{height:.58in}
.page.tight .badges{padding-top:.08in}
.page.tight .body{gap:5px;padding-top:.08in}
.page.tight .card,.page.tight .promise,.page.tight .step{padding:.06in .12in}
.page.tight .quote{padding:.05in .12in}
.page.tight .photo-ph{width:.55in;height:.55in}
.page.tight .photo-ph .ph-label{font-size:0}
.page.tight .photo-ph .ph-label::after{content:"Photo";font-size:9pt}
.page.tight .howto{padding:.05in .12in}
.page.tight .find{margin-top:.08in;padding:.06in .14in}
.page.tight .foot{min-height:.5in}

/* Placeholders: highlighted in preview, hidden in print mode (?print) */
.ph{background:var(--yellow);outline:1px dashed #A99A00;border-radius:3px;padding:0 2px;color:var(--ink)}
.hero .ph{color:var(--ink)}
html.print .ph,html.print .ph-block{display:none !important}
html.print .ph-label{visibility:hidden}
html.print .qr-ph{visibility:hidden}
html.print .org-ph{border-color:transparent}
html.print .split:has(.phone-ph.ph-block){grid-template-columns:1fr}
.phone-ph img{width:100%;height:100%;object-fit:cover;border-radius:18px}

/* Review toolbar (index only) */
.toolbar{position:sticky;top:0;z-index:5;background:var(--ink);color:#fff;padding:10px 16px;margin-bottom:.3in;font-size:13px;display:flex;gap:16px;align-items:center}
.toolbar a{color:var(--green);border:0;font-weight:700}
@media print{.toolbar{display:none !important}}
html.print .toolbar{display:none}
`;

const PRINT_SNIFF = `<script>if(/[?&]print\\b/.test(location.search))document.documentElement.classList.add('print');addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('.page').forEach(pg=>{const b=pg.querySelector('.body');if(b&&b.scrollHeight>b.clientHeight+1)pg.classList.add('tight')});document.querySelectorAll('.photo-fill').forEach(e=>{if(e.getBoundingClientRect().height<72)e.style.display='none'})})</script>`;
const doc = (title, inner, toolbar = '') => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>${PRINT_SNIFF}<style>${CSS}</style></head>
<body>${toolbar}${inner}</body></html>`;

// ------------------------------------------------------------- build

(async () => {
  if (has(C.qr_url) && !isPh(C.qr_url)) QR_SVG = await QRCode.toString(C.qr_url, { type: 'svg', margin: 0 });
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'pages'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'previews'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'pdf-pages'), { recursive: true });

  const all = pages.map((p) => ({ file: p.file, title: p.title, html: pageHtml(p) }));
  all.push({ file: '90-callout-strips', title: 'Callout strips', html: strips() });
  if (C.optional_pages && C.optional_pages.back_cover) all.push({ file: '99-back-cover', title: 'Back cover', html: back() });

  for (const p of all) fs.writeFileSync(path.join(OUT, 'pages', `${p.file}.html`), doc(`${p.title} · ${C.org_short}`, p.html));
  const toolbar = `<div class="toolbar"><b>${esc(C.org_name)} · Beyond Insurance</b><span>Preview mode: yellow = still to fill in or confirm.</span><a href="?print">Print mode</a><a href="?">Preview mode</a></div>`;
  fs.writeFileSync(path.join(OUT, 'index.html'), doc(`Beyond Insurance · ${C.org_short}`, all.map((p) => p.html).join('\n'), toolbar));

  const browser = await chromium.launch({ channel: 'chrome' });
  const url = (rel, print) => 'file:///' + path.join(OUT, rel).replace(/\\/g, '/') + (print ? '?print' : '');
  const problems = [];

  // Previews at 150 dpi, in preview mode, plus an overflow check per page.
  const ctx = await browser.newContext({ viewport: { width: 816, height: 1056 }, deviceScaleFactor: 150 / 96 });
  const page = await ctx.newPage();
  for (const p of all) {
    for (const mode of [false, true]) {
      await page.goto(url(`pages/${p.file}.html`, mode));
      const r = await page.evaluate(() => {
        const pg = document.querySelector('.page');
        const body = pg.querySelector('.body');
        const over = [];
        if (pg.scrollHeight > pg.clientHeight + 1) over.push('page');
        if (body && body.scrollHeight > body.clientHeight + 1) over.push(`body +${body.scrollHeight - body.clientHeight}px`);
        pg.querySelectorAll('*').forEach((e) => { if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible' && !e.closest('svg')) over.push('x:' + e.className); });
        const small = [...pg.querySelectorAll('p,li,td,dd')].filter((e) => !e.closest('.sources') && parseFloat(getComputedStyle(e).fontSize) < 13.99).map((e) => e.className || e.tagName);
        return { over, small: [...new Set(small)] };
      });
      if (r.over.length || r.small.length) problems.push(`${p.file}${mode ? ' (print)' : ''}: ${[...r.over, ...r.small.map((s) => 'small text: ' + s)].join(', ')}`);
      if (!mode) await page.locator('.page').screenshot({ path: path.join(OUT, 'previews', `${p.file}.png`) });
    }
  }
  await ctx.close();

  // PDFs in print mode: the combined guide and one per page.
  const pp = await browser.newPage();
  await pp.goto(url('index.html', true));
  await pp.pdf({ path: path.join(OUT, `${SLUG}-beyond-insurance.pdf`), preferCSSPageSize: true, printBackground: true, format: 'Letter' });
  for (const p of all) {
    await pp.goto(url(`pages/${p.file}.html`, true));
    await pp.pdf({ path: path.join(OUT, 'pdf-pages', `${p.file}.pdf`), preferCSSPageSize: true, printBackground: true, format: 'Letter' });
  }
  await browser.close();

  console.log(`Built ${all.length} pages for ${C.org_name} in ${path.relative(__dirname, OUT)}`);
  if (problems.length) { console.log('Layout problems:\n  ' + problems.join('\n  ')); process.exitCode = 2; } else console.log('Every page fits on one Letter sheet.');
})();
