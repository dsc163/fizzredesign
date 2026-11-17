// Fizz Marketplace API + site.
// Everything lives under /fizzredesign: the Expo web build is proxied from
// GitHub Pages and the JSON API is served from /fizzredesign/api.

export interface Env {
  DB: D1Database;
  // Where the static web build lives (GitHub Pages, built with the same /fizzredesign base path).
  SITE_ORIGIN: string;
}

const BASE = '/fizzredesign';
const API = `${BASE}/api`;
const PUBLIC_ORIGIN = 'https://darioushclapp.com';
const SESSION_DAYS = 30;
const MAX_IMAGE_BYTES = 1_500_000;
const HOUR = 3600000;

const SERVICE_CATEGORIES = ['Haircuts', 'Tutoring', 'Photography', 'DJ and Music', 'Rentals', 'Rides', 'Other'];
const ITEM_CATEGORIES = ['Textbooks', 'Electronics', 'Dorm', 'Furniture', 'Clothing', 'Bikes', 'Tickets', 'Other'];
const CONDITIONS = ['New', 'Like new', 'Good', 'Fair'];
const EVENT_TAGS = ['Parties', 'Sports', 'Clubs', 'Performances', 'Food', 'Study', 'Pop-ups'];
const VISIBILITIES = ['public', 'rsvp', 'reveal'];
const PAYMENT_KEYS = ['venmo', 'cashapp', 'zelle', 'paypal', 'applepay'] as const;
type Payments = Partial<Record<(typeof PAYMENT_KEYS)[number], string>>;

// ---------- helpers ----------

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS },
  });
}

function bad(message: string): never {
  throw new HttpError(400, message);
}

async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    bad('Invalid request body.');
  }
}

function str(value: unknown, max = 2000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function num(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

function parse<T>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

function hex(bytes: ArrayBuffer | Uint8Array) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomToken(bytes = 32) {
  return hex(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function hashPassword(password: string, saltHex: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 10000 }, key, 256);
  return hex(bits);
}

function firstName(name: string) {
  return name.split(' ')[0];
}

function marks(n: number) {
  return Array.from({ length: n }, () => '?').join(',');
}

function imageUrl(value: unknown) {
  return typeof value === 'string' && value.startsWith(`${API}/images/`) ? value : null;
}

// Houston wall-clock time for notification text ("Tue 9 PM").
function houstonLabel(ms: number) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(ms));
  return parts.replace(':00', '');
}

// ---------- types ----------

type UserRow = {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
  salt: string | null;
  college: string | null;
  bio: string | null;
  photo: string | null;
  venmo: string | null;
  interests: string | null;
  prefs: string | null;
  payments: string | null;
  created_at: number;
};

type ListingRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  price: number | null;
  price_options: string;
  category: string | null;
  condition: string | null;
  photos: string;
  details: string;
  status: string;
  created_at: number;
};

type ListingWithAuthor = ListingRow & {
  author_name: string;
  author_college: string | null;
  author_bio: string | null;
  author_photo: string | null;
};

type ThreadRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status: string;
  option_label: string | null;
  price: number | null;
  proposed_time: number | null;
  proposed_by: string | null;
  meetup_spot: string | null;
  buyer_paid: number;
  seller_complete: number;
  requested_at: number | null;
  accepted_at: number | null;
  paid_at: number | null;
  completed_at: number | null;
  buyer_read_at: number;
  seller_read_at: number;
  created_at: number;
  updated_at: number;
};

type MessageRow = { id: string; thread_id: string; sender_id: string | null; body: string; created_at: number };

type Prefs = { remindDay: boolean; remindHour: boolean };

function prefsOf(user: UserRow): Prefs {
  return { remindDay: true, remindHour: true, ...parse<Partial<Prefs>>(user.prefs, {}) };
}

// ---------- serialization ----------

function paymentsOf(u: UserRow): Payments {
  const stored = parse<Payments>(u.payments, {});
  if (!stored.venmo && u.venmo) stored.venmo = u.venmo;
  return Object.fromEntries(PAYMENT_KEYS.filter((k) => stored[k]).map((k) => [k, stored[k]])) as Payments;
}

function publicUser(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    college: u.college,
    bio: u.bio,
    photo: u.photo,
    payments: paymentsOf(u),
    interests: parse<string[] | null>(u.interests, null),
    prefs: prefsOf(u),
  };
}

type ListingContext = {
  likes: number;
  liked: boolean;
  saved: boolean;
  comments: number;
  going: number;
  myGoing: boolean;
};

// Hide an event's exact address unless the host's visibility rule allows this viewer to see it.
function eventDetails(row: ListingRow, details: Record<string, unknown>, viewerId: string | null, ctx: ListingContext) {
  const visibility = (details.visibility as string) || 'public';
  const revealAt = typeof details.reveal_at === 'number' ? details.reveal_at : null;
  const isHost = viewerId === row.user_id;
  const visible =
    isHost ||
    visibility === 'public' ||
    (ctx.myGoing && (visibility === 'rsvp' || (revealAt !== null && Date.now() >= revealAt)));
  return {
    ...details,
    address: visible ? details.address ?? null : null,
    location_hidden: !visible && Boolean(details.address),
    rsvps: ctx.going,
    my_going: ctx.myGoing,
    named_rsvps: Boolean(details.named_rsvps),
  };
}

function serializeListing(row: ListingWithAuthor, viewerId: string | null, ctx: ListingContext) {
  let details = parse<Record<string, unknown>>(row.details, {});
  if (row.type === 'event') details = eventDetails(row, details, viewerId, ctx);
  let author;
  if (row.type === 'service') {
    author = {
      kind: 'profile',
      userId: row.user_id,
      name: row.author_name,
      college: row.author_college,
      bio: row.author_bio,
      photo: row.author_photo,
      verified: true,
    };
  } else if (row.type === 'event') {
    author = { kind: 'host', name: (details.host_name as string) || 'Anonymous', verified: Boolean(details.host_verified) };
  } else {
    author = { kind: 'anonymous', name: 'Verified Rice student', verified: true };
  }
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    price: row.price,
    priceOptions: parse<{ label: string; price: number }[]>(row.price_options, []),
    category: row.category,
    condition: row.condition,
    photos: parse<string[]>(row.photos, []),
    details,
    status: row.status,
    createdAt: row.created_at,
    isMine: viewerId === row.user_id,
    author,
    stats: { likes: ctx.likes, liked: ctx.liked, saved: ctx.saved, comments: ctx.comments },
  };
}

type Listing = ReturnType<typeof serializeListing>;

const LISTING_SELECT = `
  SELECT l.*, u.name AS author_name, u.college AS author_college, u.bio AS author_bio, u.photo AS author_photo
  FROM listings l JOIN users u ON u.id = l.user_id`;

// Likes, comments, saves, and RSVPs for a batch of listings in a few queries.
async function contexts(env: Env, ids: string[], viewerId: string | null) {
  const map = new Map<string, ListingContext>();
  for (const id of ids) map.set(id, { likes: 0, liked: false, saved: false, comments: 0, going: 0, myGoing: false });
  if (ids.length === 0) return map;
  const m = marks(ids.length);
  const counts = (sql: string) => env.DB.prepare(sql).bind(...ids).all<{ id: string; n: number }>();
  const mine = (sql: string) =>
    viewerId ? env.DB.prepare(sql).bind(viewerId, ...ids).all<{ id: string }>() : Promise.resolve({ results: [] as { id: string }[] });
  const [likes, comments, going, myLikes, mySaves, myGoing] = await Promise.all([
    counts(`SELECT listing_id AS id, count(*) AS n FROM likes WHERE listing_id IN (${m}) GROUP BY listing_id`),
    counts(`SELECT listing_id AS id, count(*) AS n FROM comments WHERE listing_id IN (${m}) GROUP BY listing_id`),
    counts(`SELECT listing_id AS id, count(*) AS n FROM rsvps WHERE going = 1 AND listing_id IN (${m}) GROUP BY listing_id`),
    mine(`SELECT listing_id AS id FROM likes WHERE user_id = ? AND listing_id IN (${m})`),
    mine(`SELECT listing_id AS id FROM saves WHERE user_id = ? AND listing_id IN (${m})`),
    mine(`SELECT listing_id AS id FROM rsvps WHERE going = 1 AND user_id = ? AND listing_id IN (${m})`),
  ]);
  for (const r of likes.results) map.get(r.id)!.likes = r.n;
  for (const r of comments.results) map.get(r.id)!.comments = r.n;
  for (const r of going.results) map.get(r.id)!.going = r.n;
  for (const r of myLikes.results) map.get(r.id)!.liked = true;
  for (const r of mySaves.results) map.get(r.id)!.saved = true;
  for (const r of myGoing.results) map.get(r.id)!.myGoing = true;
  return map;
}

async function serializeMany(env: Env, rows: ListingWithAuthor[], viewerId: string | null) {
  const ctx = await contexts(env, rows.map((r) => r.id), viewerId);
  return rows.map((r) => serializeListing(r, viewerId, ctx.get(r.id)!));
}

// ---------- notifications ----------

async function notify(
  env: Env,
  userId: string,
  kind: string,
  title: string,
  body: string,
  link: string | null,
  dedupeKey: string | null = null
) {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO notifications (id, user_id, kind, title, body, link, dedupe_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(crypto.randomUUID(), userId, kind, title, body, link, dedupeKey, Date.now())
    .run();
}

// Time-based notifications (event reminders and location reveals) are created
// when the user next checks, since there is no scheduler.
async function generateTimedNotifications(env: Env, user: UserRow) {
  const now = Date.now();
  const prefs = prefsOf(user);
  const { results } = await env.DB.prepare(
    `SELECT l.* FROM listings l JOIN rsvps r ON r.listing_id = l.id
     WHERE r.user_id = ? AND r.going = 1 AND l.type = 'event' AND l.status = 'active'`
  )
    .bind(user.id)
    .all<ListingRow>();
  for (const event of results) {
    const d = parse<Record<string, unknown>>(event.details, {});
    const starts = d.starts_at as number;
    if (typeof starts !== 'number' || starts < now - HOUR) continue;
    const link = `/listing/${event.id}`;
    if (d.visibility === 'reveal' && typeof d.reveal_at === 'number' && now >= d.reveal_at) {
      await notify(env, user.id, 'reveal', 'Location revealed', `${event.title}: ${d.address ?? 'see the event'}`, link, `reveal:${event.id}`);
    }
    if (prefs.remindHour && now >= starts - HOUR && now < starts) {
      await notify(env, user.id, 'reminder', 'Starting in 1 hour', event.title, link, `remind1h:${event.id}`);
    } else if (prefs.remindDay && now >= starts - 24 * HOUR && now < starts - HOUR) {
      await notify(env, user.id, 'reminder', 'Tomorrow', `${event.title} · ${houstonLabel(starts)}`, link, `remind1d:${event.id}`);
    }
  }
}

async function listNotifications(env: Env, user: UserRow) {
  await generateTimedNotifications(env, user);
  const { results } = await env.DB.prepare(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 60`
  )
    .bind(user.id)
    .all<{ id: string; kind: string; title: string; body: string; link: string | null; read_at: number | null; created_at: number }>();
  return json({
    notifications: results.map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      link: n.link,
      read: n.read_at !== null,
      createdAt: n.created_at,
    })),
  });
}

async function markNotificationsRead(env: Env, user: UserRow) {
  await env.DB.prepare(`UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL`)
    .bind(Date.now(), user.id)
    .run();
  return json({ ok: true });
}

// Unread counts for the tab badges.
async function badges(env: Env, user: UserRow) {
  await generateTimedNotifications(env, user);
  const notifications = await env.DB.prepare(`SELECT count(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL`)
    .bind(user.id)
    .first<{ n: number }>();
  const messages = await env.DB.prepare(
    `SELECT count(*) AS n FROM messages m JOIN threads t ON t.id = m.thread_id
     WHERE (m.sender_id IS NULL OR m.sender_id != ?1)
       AND ((t.buyer_id = ?1 AND m.created_at > t.buyer_read_at) OR (t.seller_id = ?1 AND m.created_at > t.seller_read_at))`
  )
    .bind(user.id)
    .first<{ n: number }>();
  return json({ notifications: notifications?.n ?? 0, messages: messages?.n ?? 0 });
}

// ---------- auth ----------

async function currentUser(request: Request, env: Env): Promise<UserRow | null> {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return null;
  return env.DB.prepare(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?`
  )
    .bind(token, Date.now())
    .first<UserRow>();
}

async function requireUser(request: Request, env: Env) {
  const user = await currentUser(request, env);
  if (!user) throw new HttpError(401, 'Please sign in.');
  return user;
}

async function createSession(env: Env, userId: string) {
  const token = randomToken();
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`)
    .bind(token, userId, now, now + SESSION_DAYS * 86400000)
    .run();
  return token;
}

async function loadUser(env: Env, id: string) {
  return (await env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(id).first<UserRow>())!;
}

async function signup(request: Request, env: Env) {
  const body = await readJson(request);
  const name = str(body.name, 60);
  const email = str(body.email, 120).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  if (name.length < 2) bad('Enter your full name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) bad('Enter a valid email address.');
  if (password.length < 6) bad('Password must be at least 6 characters.');
  const existing = await env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first();
  if (existing) bad('An account with that email already exists. Try signing in.');
  const salt = randomToken(16);
  const hash = await hashPassword(password, salt);
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO users (id, email, name, password_hash, salt, college, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, email, name, hash, salt, str(body.college, 40) || null, Date.now())
    .run();
  return json({ token: await createSession(env, id), user: publicUser(await loadUser(env, id)) });
}

async function login(request: Request, env: Env) {
  const body = await readJson(request);
  const email = str(body.email, 120).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const user = await env.DB.prepare(`SELECT * FROM users WHERE email = ?`).bind(email).first<UserRow>();
  if (!user || !user.password_hash || !user.salt || (await hashPassword(password, user.salt)) !== user.password_hash) {
    throw new HttpError(401, 'Email or password is incorrect.');
  }
  return json({ token: await createSession(env, user.id), user: publicUser(user) });
}

async function logout(request: Request, env: Env) {
  const header = request.headers.get('Authorization') || '';
  if (header.startsWith('Bearer ')) {
    await env.DB.prepare(`DELETE FROM sessions WHERE token = ?`).bind(header.slice(7)).run();
  }
  return json({ ok: true });
}

async function updateMe(request: Request, env: Env, user: UserRow) {
  const body = await readJson(request);
  const name = body.name !== undefined ? str(body.name, 60) : user.name;
  if (name.length < 2) bad('Enter your full name.');
  const pick = (key: string, max: number, current: string | null) =>
    body[key] !== undefined ? str(body[key], max) || null : current;
  const interests = Array.isArray(body.interests)
    ? JSON.stringify(body.interests.filter((t): t is string => EVENT_TAGS.includes(t as string)))
    : user.interests;
  let payments = user.payments;
  if (body.payments && typeof body.payments === 'object') {
    const input = body.payments as Record<string, unknown>;
    payments = JSON.stringify(
      Object.fromEntries(PAYMENT_KEYS.map((k) => [k, str(input[k], 60)]).filter(([, v]) => v))
    );
  }
  const prefs =
    body.prefs && typeof body.prefs === 'object'
      ? JSON.stringify({ ...prefsOf(user), ...(body.prefs as Partial<Prefs>) })
      : user.prefs;
  await env.DB.prepare(
    `UPDATE users SET name = ?, college = ?, bio = ?, photo = ?, venmo = ?, interests = ?, prefs = ?, payments = ? WHERE id = ?`
  )
    .bind(
      name,
      pick('college', 40, user.college),
      pick('bio', 300, user.bio),
      body.photo !== undefined ? imageUrl(body.photo) : user.photo,
      payments ? parse<Payments>(payments, {}).venmo ?? null : user.venmo,
      interests,
      prefs,
      payments,
      user.id
    )
    .run();
  return json({ user: publicUser(await loadUser(env, user.id)) });
}

// ---------- images ----------

async function uploadImage(request: Request, env: Env, user: UserRow) {
  const body = await readJson(request);
  const mime = str(body.mime, 40) || 'image/jpeg';
  if (!/^image\/(jpeg|png|webp|gif)$/.test(mime)) bad('Only JPEG, PNG, WebP, or GIF images are supported.');
  const base64 = str(body.data, 3_000_000).replace(/^data:[^,]+,/, '');
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  } catch {
    bad('That image could not be read.');
  }
  if (bytes.length === 0) bad('That image is empty.');
  if (bytes.length > MAX_IMAGE_BYTES) bad('That image is too large. Try a smaller photo.');
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO images (id, user_id, mime, data, created_at) VALUES (?, ?, ?, ?, ?)`)
    .bind(id, user.id, mime, bytes, Date.now())
    .run();
  return json({ url: `${API}/images/${id}` });
}

async function getImage(env: Env, id: string) {
  const row = await env.DB.prepare(`SELECT mime, data FROM images WHERE id = ?`)
    .bind(id)
    .first<{ mime: string; data: ArrayBuffer | number[] }>();
  if (!row) return new Response('Not found', { status: 404 });
  const data = Array.isArray(row.data) ? new Uint8Array(row.data) : new Uint8Array(row.data);
  return new Response(data, {
    headers: { 'Content-Type': row.mime, 'Cache-Control': 'public, max-age=31536000, immutable', ...CORS },
  });
}

// ---------- listings ----------

async function blockedIds(env: Env, userId: string | null): Promise<string[]> {
  if (!userId) return [];
  const { results } = await env.DB.prepare(
    `SELECT blocked_id AS id FROM blocks WHERE blocker_id = ?1 UNION SELECT blocker_id AS id FROM blocks WHERE blocked_id = ?1`
  )
    .bind(userId)
    .all<{ id: string }>();
  return results.map((r) => r.id);
}

// Browse "all" covers the marketplace; events have their own tab.
const SECTION_TYPES: Record<string, string[]> = {
  all: ['item', 'service', 'wanted', 'lost', 'found'],
  events: ['event'],
  goods: ['item'],
  services: ['service'],
  wanted: ['wanted'],
  lostfound: ['lost', 'found'],
};

function upcoming(l: Listing) {
  return l.type !== 'event' || (typeof l.details.ends_at === 'number' && l.details.ends_at > Date.now());
}

async function listListings(url: URL, env: Env, viewer: UserRow | null) {
  const section = url.searchParams.get('section') || 'all';
  const category = url.searchParams.get('category');
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const types = SECTION_TYPES[section] ?? SECTION_TYPES.all;
  const where = [`l.status = 'active'`, `l.type IN (${marks(types.length)})`];
  const binds: unknown[] = [...types];
  if (category) {
    where.push(`l.category = ?`);
    binds.push(category);
  }
  if (q) {
    where.push(`(lower(l.title) LIKE ? OR lower(l.description) LIKE ? OR lower(coalesce(l.category, '')) LIKE ?)`);
    binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const blocked = await blockedIds(env, viewer?.id ?? null);
  if (blocked.length) {
    where.push(`l.user_id NOT IN (${marks(blocked.length)})`);
    binds.push(...blocked);
  }
  const { results } = await env.DB.prepare(
    `${LISTING_SELECT} WHERE ${where.join(' AND ')} ORDER BY l.created_at DESC LIMIT 100`
  )
    .bind(...binds)
    .all<ListingWithAuthor>();
  let listings = (await serializeMany(env, results, viewer?.id ?? null)).filter(upcoming);
  if (section === 'events') {
    listings = listings.sort((a, b) => (a.details.starts_at as number) - (b.details.starts_at as number));
  }
  return json({ listings });
}

async function loadListing(env: Env, id: string) {
  return env.DB.prepare(`${LISTING_SELECT} WHERE l.id = ?`).bind(id).first<ListingWithAuthor>();
}

async function requireListing(env: Env, id: string) {
  const row = await loadListing(env, id);
  if (!row) throw new HttpError(404, 'This post no longer exists.');
  return row;
}

async function getListing(env: Env, id: string, viewer: UserRow | null) {
  const row = await requireListing(env, id);
  const [listing] = await serializeMany(env, [row], viewer?.id ?? null);

  const { results: commentRows } = await env.DB.prepare(
    `SELECT * FROM comments WHERE listing_id = ? ORDER BY created_at`
  )
    .bind(id)
    .all<{ id: string; user_id: string; body: string; photo: string | null; created_at: number }>();
  const ownerLabel = row.type === 'event' ? 'Host' : row.type === 'service' ? 'Provider' : row.type === 'item' ? 'Seller' : 'Poster';
  const comments = commentRows.map((c) => ({
    id: c.id,
    body: c.body,
    photo: c.photo,
    createdAt: c.created_at,
    mine: c.user_id === viewer?.id,
    author: c.user_id === row.user_id ? ownerLabel : 'Verified Rice student',
  }));

  let updates: { id: string; body: string; createdAt: number }[] = [];
  let attendees: { name: string; photo: string | null }[] | null = null;
  if (row.type === 'event') {
    const { results } = await env.DB.prepare(`SELECT * FROM event_updates WHERE listing_id = ? ORDER BY created_at DESC`)
      .bind(id)
      .all<{ id: string; body: string; created_at: number }>();
    updates = results.map((u) => ({ id: u.id, body: u.body, createdAt: u.created_at }));
    // Story 7.7: the host sees names only when Named RSVPs is on.
    if (viewer?.id === row.user_id && listing.details.named_rsvps) {
      const { results: people } = await env.DB.prepare(
        `SELECT u.name, u.photo FROM rsvps r JOIN users u ON u.id = r.user_id WHERE r.listing_id = ? AND r.going = 1 ORDER BY r.created_at`
      )
        .bind(id)
        .all<{ name: string; photo: string | null }>();
      attendees = people;
    }
  }

  let myThread = null;
  if (viewer && viewer.id !== row.user_id) {
    myThread = await env.DB.prepare(
      `SELECT id, status FROM threads WHERE listing_id = ? AND buyer_id = ? AND status != 'completed'
       ORDER BY created_at DESC LIMIT 1`
    )
      .bind(id, viewer.id)
      .first();
  }
  return json({ listing, myThread, updates, comments, attendees });
}

async function createListing(request: Request, env: Env, user: UserRow) {
  const body = await readJson(request);
  const type = str(body.type, 20);
  const title = str(body.title, 80);
  const description = str(body.description, 1000);
  const category = str(body.category, 40);
  const photos = Array.isArray(body.photos) ? body.photos.map(imageUrl).filter((p): p is string => p !== null).slice(0, 5) : [];
  if (title.length < 2) bad('Add a title.');

  const id = crypto.randomUUID();
  const now = Date.now();

  if (type === 'event') {
    const startsAt = num(body.startsAt);
    const hours = num(body.durationHours) ?? 2;
    if (startsAt === null || startsAt < now - HOUR) bad('Pick a start time that has not passed.');
    if (hours <= 0 || hours > 24) bad('Pick how long the event runs.');
    const area = str(body.area, 80);
    if (!area) bad('Add where it is, like "Baker commons" or "Near Rice Village".');
    const visibility = VISIBILITIES.includes(str(body.visibility, 10)) ? str(body.visibility, 10) : 'public';
    const address = str(body.address, 120) || null;
    const hostMode = str(body.hostAs, 20);
    const hostName = hostMode === 'me' ? user.name : (hostMode === 'custom' && str(body.hostName, 40)) || 'Anonymous';
    const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => EVENT_TAGS.includes(t as string)) : [];
    const details = {
      starts_at: startsAt,
      ends_at: startsAt + hours * HOUR,
      host_name: hostName,
      host_verified: 0,
      area,
      address: address ?? area,
      visibility,
      reveal_at: visibility === 'reveal' ? startsAt - 3 * HOUR : null,
      entry: str(body.entry, 120) || 'Free',
      tags,
      named_rsvps: body.namedRsvps === true,
    };
    await env.DB.prepare(
      `INSERT INTO listings (id, user_id, type, title, description, category, photos, details, created_at)
       VALUES (?, ?, 'event', ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, user.id, title, description, tags[0] ?? 'Other', JSON.stringify(photos), JSON.stringify(details), now)
      .run();
  } else {
    let price: number | null = null;
    let priceOptions: { label: string; price: number }[] = [];
    let condition: string | null = null;
    if (type === 'item') {
      condition = CONDITIONS.includes(str(body.condition, 20)) ? str(body.condition, 20) : null;
      price = num(body.price);
      if (price === null || price < 0 || price > 100000) bad('Enter a price.');
    } else if (type === 'service') {
      // One cost is enough; extra options (e.g. "Haircut + beard trim") are optional.
      const raw = Array.isArray(body.priceOptions) ? body.priceOptions : [];
      priceOptions = raw
        .map((o: { label?: unknown; price?: unknown }) => ({ label: str(o?.label, 60), price: num(o?.price) }))
        .filter((o): o is { label: string; price: number } => o.label.length > 0 && o.price !== null && o.price >= 0)
        .slice(0, 5);
      const base = num(body.price);
      if (base !== null && base >= 0) priceOptions = [{ label: title, price: base }, ...priceOptions].slice(0, 5);
      if (priceOptions.length === 0) bad('Enter a cost.');
      price = Math.min(...priceOptions.map((o) => o.price));
    } else {
      bad('You can post an item, a service, or an event.');
    }
    await env.DB.prepare(
      `INSERT INTO listings (id, user_id, type, title, description, price, price_options, category, condition, photos, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        user.id,
        type,
        title,
        description,
        price,
        JSON.stringify(priceOptions),
        (type === 'item' ? ITEM_CATEGORIES : SERVICE_CATEGORIES).includes(category) ? category : 'Other',
        condition,
        JSON.stringify(photos),
        now
      )
      .run();
  }
  const [listing] = await serializeMany(env, [(await loadListing(env, id))!], user.id);
  return json({ listing });
}

async function updateListing(request: Request, env: Env, user: UserRow, id: string) {
  const row = await requireListing(env, id);
  if (row.user_id !== user.id) throw new HttpError(403, 'Only the person who posted this can change it.');
  const body = await readJson(request);
  const status = str(body.status, 10);
  if (!['active', 'paused', 'sold'].includes(status)) bad('Unknown status.');
  await env.DB.prepare(`UPDATE listings SET status = ? WHERE id = ?`).bind(status, id).run();
  if (status !== 'active') {
    // Story 2.3: let anyone waiting on this listing know.
    const { results } = await env.DB.prepare(`SELECT * FROM threads WHERE listing_id = ? AND status IN ('open', 'requested')`)
      .bind(id)
      .all<ThreadRow>();
    const now = Date.now();
    const word = status === 'sold' ? 'sold' : 'paused';
    for (const t of results) {
      await addMessage(env, t.id, null, `The seller marked this listing ${word}.`, now);
      if (t.status === 'requested') {
        await env.DB.prepare(`UPDATE threads SET status = 'declined', updated_at = ? WHERE id = ?`).bind(now, t.id).run();
      }
      await notify(env, t.buyer_id, 'listing', `Listing ${word}`, row.title, `/thread/${t.id}`);
    }
  }
  return getListing(env, id, user);
}

async function myListings(env: Env, user: UserRow) {
  const { results } = await env.DB.prepare(`${LISTING_SELECT} WHERE l.user_id = ? ORDER BY l.created_at DESC`)
    .bind(user.id)
    .all<ListingWithAuthor>();
  return json({ listings: await serializeMany(env, results, user.id) });
}

async function mySaved(env: Env, user: UserRow) {
  const { results } = await env.DB.prepare(
    `${LISTING_SELECT} JOIN saves s ON s.listing_id = l.id AND s.user_id = ? WHERE l.status = 'active' ORDER BY s.created_at DESC`
  )
    .bind(user.id)
    .all<ListingWithAuthor>();
  return json({ listings: (await serializeMany(env, results, user.id)).filter(upcoming) });
}

async function myEvents(env: Env, user: UserRow) {
  const { results } = await env.DB.prepare(
    `${LISTING_SELECT} JOIN rsvps r ON r.listing_id = l.id AND r.user_id = ? AND r.going = 1
     WHERE l.type = 'event' AND l.status = 'active'`
  )
    .bind(user.id)
    .all<ListingWithAuthor>();
  const listings = (await serializeMany(env, results, user.id))
    .filter(upcoming)
    .sort((a, b) => (a.details.starts_at as number) - (b.details.starts_at as number));
  return json({ listings });
}

// ---------- likes, saves, comments, RSVPs, host updates ----------

async function setLike(request: Request, env: Env, user: UserRow, id: string) {
  const row = await requireListing(env, id);
  const body = await readJson(request);
  if (body.liked === false) {
    await env.DB.prepare(`DELETE FROM likes WHERE listing_id = ? AND user_id = ?`).bind(id, user.id).run();
  } else {
    await env.DB.prepare(`INSERT OR IGNORE INTO likes (listing_id, user_id, created_at) VALUES (?, ?, ?)`)
      .bind(id, user.id, Date.now())
      .run();
    if (row.user_id !== user.id) {
      await notify(env, row.user_id, 'like', 'Someone liked your post', row.title, `/listing/${id}`, `like:${id}:${user.id}`);
    }
  }
  return getListing(env, id, user);
}

async function setSave(request: Request, env: Env, user: UserRow, id: string) {
  await requireListing(env, id);
  const body = await readJson(request);
  if (body.saved === false) {
    await env.DB.prepare(`DELETE FROM saves WHERE listing_id = ? AND user_id = ?`).bind(id, user.id).run();
  } else {
    await env.DB.prepare(`INSERT OR IGNORE INTO saves (listing_id, user_id, created_at) VALUES (?, ?, ?)`)
      .bind(id, user.id, Date.now())
      .run();
  }
  return getListing(env, id, user);
}

async function addComment(request: Request, env: Env, user: UserRow, id: string) {
  const row = await requireListing(env, id);
  const blocked = await blockedIds(env, user.id);
  if (blocked.includes(row.user_id)) throw new HttpError(403, 'You can no longer interact with this post.');
  const body = await readJson(request);
  const text = str(body.body, 500);
  const photo = imageUrl(body.photo);
  if (!text && !photo) bad('Write a comment or add a photo.');
  await env.DB.prepare(`INSERT INTO comments (id, listing_id, user_id, body, photo, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), id, user.id, text, photo, Date.now())
    .run();
  if (row.user_id !== user.id) {
    await notify(env, row.user_id, 'comment', 'New comment on your post', `${row.title}: "${text || 'Photo'}"`, `/listing/${id}`);
  }
  return getListing(env, id, user);
}

async function deleteComment(env: Env, user: UserRow, listingId: string, commentId: string) {
  await env.DB.prepare(`DELETE FROM comments WHERE id = ? AND listing_id = ? AND user_id = ?`)
    .bind(commentId, listingId, user.id)
    .run();
  return getListing(env, listingId, user);
}

async function rsvp(request: Request, env: Env, user: UserRow, id: string) {
  const row = await requireListing(env, id);
  if (row.type !== 'event') bad('Only events take RSVPs.');
  const body = await readJson(request);
  const going = body.going === true;
  await env.DB.prepare(
    `INSERT INTO rsvps (listing_id, user_id, going, saved, created_at) VALUES (?, ?, ?, 0, ?)
     ON CONFLICT (listing_id, user_id) DO UPDATE SET going = excluded.going`
  )
    .bind(id, user.id, going ? 1 : 0, Date.now())
    .run();
  if (going && row.user_id !== user.id) {
    const d = parse<Record<string, unknown>>(row.details, {});
    const who = d.named_rsvps ? user.name : 'Someone';
    await notify(env, row.user_id, 'rsvp', `${who} is going`, row.title, `/listing/${id}`, `rsvp:${id}:${user.id}`);
  }
  return getListing(env, id, user);
}

async function postUpdate(request: Request, env: Env, user: UserRow, id: string) {
  const row = await requireListing(env, id);
  if (row.type !== 'event') bad('Only events have updates.');
  if (row.user_id !== user.id) throw new HttpError(403, 'Only the host can post updates.');
  const body = await readJson(request);
  const text = str(body.body, 500);
  if (!text) bad('Write an update first.');
  await env.DB.prepare(`INSERT INTO event_updates (id, listing_id, body, created_at) VALUES (?, ?, ?, ?)`)
    .bind(crypto.randomUUID(), id, text, Date.now())
    .run();
  // Story 7.6: RSVPs (and people who saved it) are notified.
  const { results } = await env.DB.prepare(
    `SELECT user_id FROM rsvps WHERE listing_id = ?1 AND going = 1 UNION SELECT user_id FROM saves WHERE listing_id = ?1`
  )
    .bind(id)
    .all<{ user_id: string }>();
  const host = (parse<Record<string, unknown>>(row.details, {}).host_name as string) || 'the host';
  for (const r of results) {
    if (r.user_id !== user.id) await notify(env, r.user_id, 'update', `Update from ${host}`, `${row.title}: ${text}`, `/listing/${id}`);
  }
  return getListing(env, id, user);
}

// ---------- threads (conversations + exchanges) ----------

async function addMessage(env: Env, threadId: string, senderId: string | null, body: string, at = Date.now()) {
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO messages (id, thread_id, sender_id, body, created_at) VALUES (?, ?, ?, ?, ?)`).bind(
      crypto.randomUUID(), threadId, senderId, body, at
    ),
    env.DB.prepare(`UPDATE threads SET updated_at = ? WHERE id = ?`).bind(at, threadId),
  ]);
}

async function loadThread(env: Env, id: string) {
  return env.DB.prepare(`SELECT * FROM threads WHERE id = ?`).bind(id).first<ThreadRow>();
}

async function threadForUser(env: Env, id: string, user: UserRow) {
  const thread = await loadThread(env, id);
  if (!thread || (thread.buyer_id !== user.id && thread.seller_id !== user.id)) {
    throw new HttpError(404, 'Conversation not found.');
  }
  return thread;
}

function otherParty(thread: ThreadRow, userId: string) {
  return thread.buyer_id === userId ? thread.seller_id : thread.buyer_id;
}

async function listingTitle(env: Env, id: string) {
  return (await env.DB.prepare(`SELECT title FROM listings WHERE id = ?`).bind(id).first<{ title: string }>())?.title ?? 'your listing';
}

async function finishIfDone(env: Env, threadId: string, now: number) {
  const t = (await loadThread(env, threadId))!;
  if (t.status !== 'accepted' || !t.buyer_paid || !t.seller_complete) return;
  await env.DB.prepare(`UPDATE threads SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?`)
    .bind(now, now, t.id)
    .run();
  await addMessage(env, t.id, null, 'Exchange complete. Thanks for trading on Fizz Marketplace!', now);
  const listing = await env.DB.prepare(`SELECT type, title FROM listings WHERE id = ?`).bind(t.listing_id).first<{ type: string; title: string }>();
  // Items close after one sale; services stay open for new bookings.
  if (listing?.type === 'item') {
    await env.DB.prepare(`UPDATE listings SET status = 'sold' WHERE id = ?`).bind(t.listing_id).run();
  }
  for (const uid of [t.buyer_id, t.seller_id]) {
    await notify(env, uid, 'exchange', 'Exchange complete', listing?.title ?? '', `/thread/${t.id}`);
  }
}

async function counterpartFor(env: Env, thread: ThreadRow, viewer: UserRow, listingType: string) {
  const other = await loadUser(env, otherParty(thread, viewer.id));
  const revealed = thread.status === 'accepted' || thread.status === 'completed';
  if (revealed) {
    return { id: other.id, revealed: true, name: other.name, college: other.college, bio: other.bio, photo: other.photo, payments: paymentsOf(other) };
  }
  // Service providers are public before acceptance; everyone else stays anonymous.
  if (other.id === thread.seller_id && listingType === 'service') {
    return { id: other.id, revealed: false, name: other.name, college: other.college, bio: other.bio, photo: other.photo, payments: {} };
  }
  return { id: other.id, revealed: false, name: 'Verified Rice student', college: null, bio: null, photo: null, payments: {} };
}

async function serializeThread(env: Env, thread: ThreadRow, viewer: UserRow, withMessages: boolean) {
  const listingRow = (await loadListing(env, thread.listing_id))!;
  const [listing] = await serializeMany(env, [listingRow], viewer.id);
  const role = thread.buyer_id === viewer.id ? 'buyer' : 'seller';
  const readAt = role === 'buyer' ? thread.buyer_read_at : thread.seller_read_at;
  const unread = await env.DB.prepare(
    `SELECT count(*) AS n FROM messages WHERE thread_id = ? AND created_at > ? AND (sender_id IS NULL OR sender_id != ?)`
  )
    .bind(thread.id, readAt, viewer.id)
    .first<{ n: number }>();
  const last = await env.DB.prepare(`SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at DESC LIMIT 1`)
    .bind(thread.id)
    .first<MessageRow>();
  const result: Record<string, unknown> = {
    id: thread.id,
    role,
    status: thread.status,
    listing: {
      id: listing.id,
      type: listing.type,
      title: listing.title,
      photos: listing.photos,
      category: listing.category,
      price: listing.price,
      priceOptions: listing.priceOptions,
      status: listing.status,
    },
    optionLabel: thread.option_label,
    price: thread.price,
    proposedTime: thread.proposed_time,
    proposedBy: thread.proposed_by,
    meetupSpot: thread.meetup_spot,
    buyerPaid: Boolean(thread.buyer_paid),
    sellerComplete: Boolean(thread.seller_complete),
    completedAt: thread.completed_at,
    updatedAt: thread.updated_at,
    counterpart: await counterpartFor(env, thread, viewer, listing.type),
    unread: unread?.n ?? 0,
    lastMessage: last
      ? { body: last.body, system: last.sender_id === null, mine: last.sender_id === viewer.id, createdAt: last.created_at }
      : null,
  };
  if (withMessages) {
    const { results } = await env.DB.prepare(`SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at`)
      .bind(thread.id)
      .all<MessageRow>();
    result.messages = results.map((m) => ({
      id: m.id,
      body: m.body,
      system: m.sender_id === null,
      mine: m.sender_id === viewer.id,
      createdAt: m.created_at,
    }));
  }
  return result;
}

async function listThreads(env: Env, user: UserRow) {
  const blocked = await blockedIds(env, user.id);
  const { results } = await env.DB.prepare(
    `SELECT t.* FROM threads t
     WHERE (t.buyer_id = ?1 OR t.seller_id = ?1)
       AND (t.status != 'open' OR EXISTS (SELECT 1 FROM messages m WHERE m.thread_id = t.id))
     ORDER BY t.updated_at DESC LIMIT 50`
  )
    .bind(user.id)
    .all<ThreadRow>();
  const visible = results.filter((t) => !blocked.includes(otherParty(t, user.id)));
  const threads = await Promise.all(visible.map((t) => serializeThread(env, t, user, false)));
  return json({ threads });
}

async function getThread(env: Env, user: UserRow, id: string) {
  const thread = await threadForUser(env, id, user);
  const column = thread.buyer_id === user.id ? 'buyer_read_at' : 'seller_read_at';
  await env.DB.prepare(`UPDATE threads SET ${column} = ? WHERE id = ?`).bind(Date.now(), id).run();
  return json({ thread: await serializeThread(env, thread, user, true) });
}

async function ensureNotBlocked(env: Env, a: string, b: string) {
  const row = await env.DB.prepare(
    `SELECT 1 FROM blocks WHERE (blocker_id = ?1 AND blocked_id = ?2) OR (blocker_id = ?2 AND blocked_id = ?1)`
  )
    .bind(a, b)
    .first();
  if (row) throw new HttpError(403, 'You can no longer message this person.');
}

// Open (or reuse) the buyer's conversation about a listing.
async function startThread(request: Request, env: Env, user: UserRow) {
  const body = await readJson(request);
  const listingId = str(body.listingId, 60);
  const listing = await loadListing(env, listingId);
  if (!listing || listing.status !== 'active') bad('This listing is no longer available.');
  if (!['item', 'service'].includes(listing.type)) bad('You can message sellers about items and services.');
  if (listing.user_id === user.id) bad('This is your own listing.');
  await ensureNotBlocked(env, user.id, listing.user_id);
  const existing = await env.DB.prepare(
    `SELECT * FROM threads WHERE listing_id = ? AND buyer_id = ? AND status != 'completed' ORDER BY created_at DESC LIMIT 1`
  )
    .bind(listingId, user.id)
    .first<ThreadRow>();
  if (existing) return json({ thread: { id: existing.id } });
  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO threads (id, listing_id, buyer_id, seller_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'open', ?, ?)`
  )
    .bind(id, listingId, user.id, listing.user_id, now, now)
    .run();
  return json({ thread: { id } });
}

async function sendMessage(request: Request, env: Env, user: UserRow, id: string) {
  const thread = await threadForUser(env, id, user);
  await ensureNotBlocked(env, thread.buyer_id, thread.seller_id);
  const body = await readJson(request);
  const text = str(body.body, 1000);
  if (!text) bad('Type a message first.');
  await addMessage(env, id, user.id, text);
  // One notification per batch of unread messages: the key changes once the other person reads the thread.
  const otherId = otherParty(thread, user.id);
  const otherReadAt = thread.buyer_id === otherId ? thread.buyer_read_at : thread.seller_read_at;
  const sender = thread.status === 'accepted' || thread.status === 'completed' ? firstName(user.name) : 'A Rice student';
  await notify(env, otherId, 'message', `New message from ${sender}`, text, `/thread/${id}`, `msg:${id}:${otherReadAt}`);
  return getThread(env, user, id);
}

async function requestThread(request: Request, env: Env, user: UserRow, id: string) {
  const thread = await threadForUser(env, id, user);
  if (thread.buyer_id !== user.id) bad('Only the buyer can send a request.');
  if (!['open', 'declined'].includes(thread.status)) bad('A request is already in progress.');
  const listing = (await loadListing(env, thread.listing_id))!;
  if (listing.status !== 'active') bad('This listing is no longer available.');
  const body = await readJson(request);
  // A time is optional; without one the two sides arrange it in chat.
  const time = num(body.proposedTime);
  if (time !== null && time < Date.now() - HOUR) bad('Pick a time that has not passed.');
  let optionLabel: string | null = null;
  let price = listing.price;
  if (listing.type === 'service') {
    const options = parse<{ label: string; price: number }[]>(listing.price_options, []);
    const chosen = options.find((o) => o.label === body.optionLabel) ?? options[0];
    optionLabel = chosen?.label ?? null;
    price = chosen?.price ?? listing.price;
  }
  const now = Date.now();
  await env.DB.prepare(
    `UPDATE threads SET status = 'requested', option_label = ?, price = ?, proposed_time = ?, proposed_by = 'buyer',
       requested_at = ?, updated_at = ? WHERE id = ?`
  )
    .bind(optionLabel, price, time, now, now, id)
    .run();
  const isService = listing.type === 'service';
  await addMessage(env, id, null, isService ? 'Booking request sent.' : 'Purchase request sent.', now);
  const note = str(body.note, 500);
  if (note) await addMessage(env, id, user.id, note, now + 1);
  await notify(
    env,
    thread.seller_id,
    'request',
    isService ? 'New booking request' : 'New purchase request',
    `${optionLabel ?? listing.title}${time ? ` · ${houstonLabel(time)}` : ' · time to arrange in chat'}`,
    `/thread/${id}`
  );
  return getThread(env, user, id);
}

async function respondThread(request: Request, env: Env, user: UserRow, id: string) {
  const thread = await threadForUser(env, id, user);
  if (thread.status !== 'requested') bad('There is no request waiting for a response.');
  const role = thread.buyer_id === user.id ? 'buyer' : 'seller';
  if (thread.proposed_by === role) bad('Waiting for the other person to respond.');
  const body = await readJson(request);
  const action = str(body.action, 10);
  const now = Date.now();
  const otherId = otherParty(thread, user.id);
  const title = await listingTitle(env, thread.listing_id);
  if (action === 'accept') {
    await env.DB.prepare(`UPDATE threads SET status = 'accepted', accepted_at = ?, updated_at = ? WHERE id = ?`)
      .bind(now, now, id)
      .run();
    await addMessage(env, id, null, `${firstName(user.name)} accepted. You can now see each other's names.`, now);
    await notify(env, otherId, 'accepted', `${firstName(user.name)} accepted your request`, `${title}. See who you're meeting.`, `/thread/${id}`);
  } else if (action === 'decline') {
    await env.DB.prepare(`UPDATE threads SET status = 'declined', updated_at = ? WHERE id = ?`).bind(now, id).run();
    await addMessage(env, id, null, 'The request was declined.', now);
    await notify(env, otherId, 'declined', 'Request declined', title, `/thread/${id}`);
  } else if (action === 'suggest') {
    const time = num(body.proposedTime);
    if (time === null || time < now - HOUR) bad('Pick a time that has not passed.');
    await env.DB.prepare(`UPDATE threads SET proposed_time = ?, proposed_by = ?, requested_at = ?, updated_at = ? WHERE id = ?`)
      .bind(time, role, now, now, id)
      .run();
    await addMessage(env, id, null, `A new time was suggested.`, now);
    await notify(env, otherId, 'suggested', 'New time suggested', `${title} · ${houstonLabel(time)}`, `/thread/${id}`);
  } else {
    bad('Unknown action.');
  }
  return getThread(env, user, id);
}

async function setMeetup(request: Request, env: Env, user: UserRow, id: string) {
  const thread = await threadForUser(env, id, user);
  if (thread.status !== 'accepted') bad('Pick a meetup spot after the request is accepted.');
  const body = await readJson(request);
  const spot = str(body.spot, 80);
  if (!spot) bad('Pick a meetup spot.');
  const now = Date.now();
  await env.DB.prepare(`UPDATE threads SET meetup_spot = ?, updated_at = ? WHERE id = ?`).bind(spot, now, id).run();
  await addMessage(env, id, null, `Meetup spot set: ${spot}.`, now);
  await notify(env, otherParty(thread, user.id), 'meetup', 'Meetup spot set', spot, `/thread/${id}`);
  return getThread(env, user, id);
}

async function markPaid(env: Env, user: UserRow, id: string) {
  const thread = await threadForUser(env, id, user);
  if (thread.buyer_id !== user.id) bad('Only the buyer marks the exchange paid.');
  if (thread.status !== 'accepted') bad('The request has to be accepted first.');
  if (!thread.buyer_paid) {
    const now = Date.now();
    await env.DB.prepare(`UPDATE threads SET buyer_paid = 1, paid_at = ?, updated_at = ? WHERE id = ?`).bind(now, now, id).run();
    await addMessage(env, id, null, `${firstName(user.name)} marked it paid.`, now);
    if (!thread.seller_complete) {
      await notify(env, thread.seller_id, 'paid', `${firstName(user.name)} marked it paid`, 'Mark the exchange complete when you are done.', `/thread/${id}`);
    }
    await finishIfDone(env, id, now + 1);
  }
  return getThread(env, user, id);
}

async function markComplete(env: Env, user: UserRow, id: string) {
  const thread = await threadForUser(env, id, user);
  if (thread.seller_id !== user.id) bad('Only the seller marks the exchange complete.');
  if (thread.status !== 'accepted') bad('The request has to be accepted first.');
  if (!thread.seller_complete) {
    const now = Date.now();
    await env.DB.prepare(`UPDATE threads SET seller_complete = 1, updated_at = ? WHERE id = ?`).bind(now, id).run();
    await addMessage(env, id, null, `${firstName(user.name)} marked the exchange complete.`, now);
    if (!thread.buyer_paid) {
      await notify(env, thread.buyer_id, 'complete', `${firstName(user.name)} marked it complete`, 'Tap I paid once you have paid.', `/thread/${id}`);
    }
    await finishIfDone(env, id, now + 1);
  }
  return getThread(env, user, id);
}

// ---------- reports and blocks ----------

async function report(request: Request, env: Env, user: UserRow) {
  const body = await readJson(request);
  const reason = str(body.reason, 60);
  if (!reason) bad('Pick a reason.');
  let reportedUserId = str(body.userId, 60) || null;
  const threadId = str(body.threadId, 60) || null;
  const listingId = str(body.listingId, 60) || null;
  if (threadId) {
    const thread = await threadForUser(env, threadId, user);
    reportedUserId = otherParty(thread, user.id);
  } else if (listingId) {
    const listing = await loadListing(env, listingId);
    reportedUserId = listing?.user_id ?? null;
  }
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO reports (id, reporter_id, reported_user_id, thread_id, listing_id, reason, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(crypto.randomUUID(), user.id, reportedUserId, threadId, listingId, reason, str(body.details, 1000) || null, now)
    .run();
  const block = body.block === true && Boolean(reportedUserId) && reportedUserId !== user.id;
  if (block) {
    await env.DB.prepare(`INSERT OR IGNORE INTO blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)`)
      .bind(user.id, reportedUserId, now)
      .run();
  }
  return json({ ok: true, blocked: block });
}

// ---------- router ----------

type Handler = (request: Request, env: Env, url: URL, params: string[]) => Promise<Response>;
const authed =
  (fn: (r: Request, e: Env, user: UserRow, p: string[], u: URL) => Promise<Response>): Handler =>
  async (r, e, u, p) =>
    fn(r, e, await requireUser(r, e), p, u);

const ROUTES: [string, RegExp, Handler][] = [
  ['POST', /^\/auth\/signup$/, (r, e) => signup(r, e)],
  ['POST', /^\/auth\/login$/, (r, e) => login(r, e)],
  ['POST', /^\/auth\/logout$/, (r, e) => logout(r, e)],
  ['GET', /^\/me$/, authed(async (_r, _e, u) => json({ user: publicUser(u) }))],
  ['PATCH', /^\/me$/, authed((r, e, u) => updateMe(r, e, u))],
  ['GET', /^\/me\/listings$/, authed((_r, e, u) => myListings(e, u))],
  ['GET', /^\/me\/events$/, authed((_r, e, u) => myEvents(e, u))],
  ['GET', /^\/me\/saved$/, authed((_r, e, u) => mySaved(e, u))],
  ['GET', /^\/me\/badges$/, authed((_r, e, u) => badges(e, u))],
  ['GET', /^\/notifications$/, authed((_r, e, u) => listNotifications(e, u))],
  ['POST', /^\/notifications\/read$/, authed((_r, e, u) => markNotificationsRead(e, u))],
  ['POST', /^\/images$/, authed((r, e, u) => uploadImage(r, e, u))],
  ['GET', /^\/images\/([\w-]+)$/, (_r, e, _u, p) => getImage(e, p[0])],
  ['GET', /^\/listings$/, async (r, e, u) => listListings(u, e, await currentUser(r, e))],
  ['POST', /^\/listings$/, authed((r, e, u) => createListing(r, e, u))],
  ['GET', /^\/listings\/([\w-]+)$/, async (r, e, _u, p) => getListing(e, p[0], await currentUser(r, e))],
  ['PATCH', /^\/listings\/([\w-]+)$/, authed((r, e, u, p) => updateListing(r, e, u, p[0]))],
  ['POST', /^\/listings\/([\w-]+)\/like$/, authed((r, e, u, p) => setLike(r, e, u, p[0]))],
  ['POST', /^\/listings\/([\w-]+)\/save$/, authed((r, e, u, p) => setSave(r, e, u, p[0]))],
  ['POST', /^\/listings\/([\w-]+)\/comments$/, authed((r, e, u, p) => addComment(r, e, u, p[0]))],
  ['DELETE', /^\/listings\/([\w-]+)\/comments\/([\w-]+)$/, authed((_r, e, u, p) => deleteComment(e, u, p[0], p[1]))],
  ['POST', /^\/listings\/([\w-]+)\/rsvp$/, authed((r, e, u, p) => rsvp(r, e, u, p[0]))],
  ['POST', /^\/listings\/([\w-]+)\/updates$/, authed((r, e, u, p) => postUpdate(r, e, u, p[0]))],
  ['GET', /^\/threads$/, authed((_r, e, u) => listThreads(e, u))],
  ['POST', /^\/threads$/, authed((r, e, u) => startThread(r, e, u))],
  ['GET', /^\/threads\/([\w-]+)$/, authed((_r, e, u, p) => getThread(e, u, p[0]))],
  ['POST', /^\/threads\/([\w-]+)\/messages$/, authed((r, e, u, p) => sendMessage(r, e, u, p[0]))],
  ['POST', /^\/threads\/([\w-]+)\/request$/, authed((r, e, u, p) => requestThread(r, e, u, p[0]))],
  ['POST', /^\/threads\/([\w-]+)\/respond$/, authed((r, e, u, p) => respondThread(r, e, u, p[0]))],
  ['POST', /^\/threads\/([\w-]+)\/meetup$/, authed((r, e, u, p) => setMeetup(r, e, u, p[0]))],
  ['POST', /^\/threads\/([\w-]+)\/paid$/, authed((_r, e, u, p) => markPaid(e, u, p[0]))],
  ['POST', /^\/threads\/([\w-]+)\/complete$/, authed((_r, e, u, p) => markComplete(e, u, p[0]))],
  ['POST', /^\/reports$/, authed((r, e, u) => report(r, e, u))],
];

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.slice(API.length).replace(/\/+$/, '') || '/';
  for (const [method, pattern, handler] of ROUTES) {
    if (method !== request.method) continue;
    const match = path.match(pattern);
    if (match) return handler(request, env, url, match.slice(1));
  }
  return json({ error: 'Not found.' }, 404);
}

// ---------- link previews ----------

function escapeAttr(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// Shared post links get a title, description, and image in iMessage, GroupMe, etc.
async function withPreview(response: Response, env: Env, url: URL) {
  const match = url.pathname.match(new RegExp(`^${BASE}/listing/([\\w-]+)/?$`));
  if (!match) return response;
  const row = await loadListing(env, match[1]);
  if (!row || row.status !== 'active') return response;
  const photo = parse<string[]>(row.photos, [])[0];
  const kind = { item: 'For sale', service: 'Service', event: 'Event', wanted: 'Wanted', lost: 'Lost', found: 'Found' }[row.type] ?? 'Post';
  const price = row.type === 'item' && row.price !== null ? ` · $${row.price}` : row.type === 'service' && row.price !== null ? ` · from $${row.price}` : '';
  const title = `${row.title}${price}`;
  const description = `${kind} on Fizz Marketplace${row.description ? `: ${row.description.slice(0, 140)}` : ''}`;
  const tags = [
    `<meta property="og:title" content="${escapeAttr(title)}">`,
    `<meta property="og:description" content="${escapeAttr(description)}">`,
    `<meta property="og:url" content="${escapeAttr(`${PUBLIC_ORIGIN}${url.pathname}`)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Fizz Marketplace">`,
    photo ? `<meta property="og:image" content="${escapeAttr(`${PUBLIC_ORIGIN}${photo}`)}">` : '',
    `<meta name="twitter:card" content="${photo ? 'summary_large_image' : 'summary'}">`,
  ].join('');
  return new HTMLRewriter()
    .on('title', {
      element: (el) => {
        el.setInnerContent(`${title} | Fizz Marketplace`);
      },
    })
    .on('head', {
      element: (el) => {
        el.append(tags, { html: true });
      },
    })
    .transform(response);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === BASE) {
      return Response.redirect(`${url.origin}${BASE}/`, 301);
    }

    if (url.pathname.startsWith(`${API}/`) || url.pathname === API) {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
      try {
        return await handleApi(request, env, url);
      } catch (error) {
        if (error instanceof HttpError) return json({ error: error.message }, error.status);
        console.error(error);
        return json({ error: 'Something went wrong. Please try again.' }, 500);
      }
    }

    if (!url.pathname.startsWith(`${BASE}/`)) {
      return new Response('Not found', { status: 404 });
    }

    // Static app, served from the GitHub Pages build. Unknown paths fall back to
    // the single-page app shell so deep links like /fizzredesign/listing/x work.
    const upstream = `${env.SITE_ORIGIN}${url.pathname}${url.search}`;
    let response = await fetch(upstream, { cf: { cacheTtl: 60, cacheEverything: true } });
    if (response.status === 404) {
      response = await fetch(`${env.SITE_ORIGIN}${BASE}/`, { cf: { cacheTtl: 60, cacheEverything: true } });
      response = new Response(response.body, { status: 200, headers: response.headers });
    }
    // Hashed bundles never change; pages must be re-checked so new deploys show up right away.
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', url.pathname.includes('/_expo/static/') ? 'public, max-age=31536000, immutable' : 'no-cache');
    const out = new Response(response.body, { status: response.status, headers });
    return (headers.get('Content-Type') || '').includes('text/html') ? withPreview(out, env, url) : out;
  },
} satisfies ExportedHandler<Env>;
