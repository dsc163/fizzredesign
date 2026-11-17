// Fizz Marketplace API + static site.
// Everything lives under /fizzredesign: the Expo web build is served from
// ./public/fizzredesign and the JSON API from /fizzredesign/api.

export interface Env {
  DB: D1Database;
  // Where the static web build lives (GitHub Pages, built with the same /fizzredesign base path).
  SITE_ORIGIN: string;
}

const BASE = '/fizzredesign';
const API = `${BASE}/api`;
const SESSION_DAYS = 30;
const DEMO_DELAY_MS = 4000;
const MAX_IMAGE_BYTES = 1_500_000;

const SERVICE_CATEGORIES = ['Haircuts', 'Tutoring', 'Photography', 'DJ and Music', 'Rentals', 'Rides', 'Other'];
const ITEM_CATEGORIES = ['Textbooks', 'Electronics', 'Dorm', 'Furniture', 'Clothing', 'Bikes', 'Tickets', 'Other'];
const CONDITIONS = ['New', 'Like new', 'Good', 'Fair'];

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

function parse<T>(text: string | null, fallback: T): T {
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
  is_demo: number;
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
  author_is_demo: number;
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

// ---------- serialization ----------

function publicUser(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    college: u.college,
    bio: u.bio,
    photo: u.photo,
    venmo: u.venmo,
  };
}

// Seeded events and Wanted posts move forward in time so the demo never goes stale.
function rollDemoDetails(row: ListingWithAuthor, details: Record<string, unknown>) {
  if (!row.author_is_demo) return details;
  const now = Date.now();
  if (row.type === 'event' && typeof details.starts_at === 'number' && typeof details.ends_at === 'number') {
    const week = 7 * 86400000;
    if (details.ends_at < now) {
      const shift = Math.ceil((now - details.ends_at) / week) * week;
      return { ...details, starts_at: details.starts_at + shift, ends_at: details.ends_at + shift };
    }
  }
  if (row.type === 'wanted' && typeof details.needed_by === 'number' && details.needed_by < now) {
    const step = 2 * 86400000;
    const shift = Math.ceil((now - details.needed_by) / step) * step;
    return { ...details, needed_by: details.needed_by + shift };
  }
  return details;
}

function serializeListing(row: ListingWithAuthor, viewerId: string | null) {
  const details = rollDemoDetails(row, parse<Record<string, unknown>>(row.details, {}));
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
    author = {
      kind: 'host',
      name: (details.host_name as string) || 'Anonymous',
      verified: Boolean(details.host_verified),
    };
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
  };
}

const LISTING_SELECT = `
  SELECT l.*, u.name AS author_name, u.college AS author_college, u.bio AS author_bio,
         u.photo AS author_photo, u.is_demo AS author_is_demo
  FROM listings l JOIN users u ON u.id = l.user_id`;

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
  const college = str(body.college, 40) || null;
  await env.DB.prepare(
    `INSERT INTO users (id, email, name, password_hash, salt, college, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, email, name, hash, salt, college, Date.now())
    .run();
  const user = (await env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(id).first<UserRow>())!;
  return json({ token: await createSession(env, id), user: publicUser(user) });
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
  await env.DB.prepare(`UPDATE users SET name = ?, college = ?, bio = ?, photo = ?, venmo = ? WHERE id = ?`)
    .bind(
      name,
      pick('college', 40, user.college),
      pick('bio', 300, user.bio),
      pick('photo', 200, user.photo),
      pick('venmo', 40, user.venmo),
      user.id
    )
    .run();
  const updated = (await env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(user.id).first<UserRow>())!;
  return json({ user: publicUser(updated) });
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

const SECTION_TYPES: Record<string, string[]> = {
  events: ['event'],
  goods: ['item'],
  services: ['service'],
  wanted: ['wanted'],
  lostfound: ['lost', 'found'],
};

async function listListings(url: URL, env: Env, viewer: UserRow | null) {
  const section = url.searchParams.get('section') || 'all';
  const category = url.searchParams.get('category');
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const where = [`l.status = 'active'`];
  const binds: unknown[] = [];
  const types = SECTION_TYPES[section];
  if (types) {
    where.push(`l.type IN (${types.map(() => '?').join(',')})`);
    binds.push(...types);
  }
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
    where.push(`l.user_id NOT IN (${blocked.map(() => '?').join(',')})`);
    binds.push(...blocked);
  }
  const { results } = await env.DB.prepare(
    `${LISTING_SELECT} WHERE ${where.join(' AND ')} ORDER BY l.created_at DESC LIMIT 100`
  )
    .bind(...binds)
    .all<ListingWithAuthor>();
  return json({ listings: results.map((r) => serializeListing(r, viewer?.id ?? null)) });
}

async function loadListing(env: Env, id: string) {
  return env.DB.prepare(`${LISTING_SELECT} WHERE l.id = ?`).bind(id).first<ListingWithAuthor>();
}

async function getListing(env: Env, id: string, viewer: UserRow | null) {
  const row = await loadListing(env, id);
  if (!row) throw new HttpError(404, 'This listing no longer exists.');
  const listing = serializeListing(row, viewer?.id ?? null);
  let myThread = null;
  if (viewer && viewer.id !== row.user_id) {
    myThread = await env.DB.prepare(
      `SELECT id, status FROM threads WHERE listing_id = ? AND buyer_id = ? AND status != 'completed'
       ORDER BY created_at DESC LIMIT 1`
    )
      .bind(id, viewer.id)
      .first();
  }
  return json({ listing, myThread });
}

async function createListing(request: Request, env: Env, user: UserRow) {
  const body = await readJson(request);
  const type = str(body.type, 20);
  const title = str(body.title, 80);
  const description = str(body.description, 1000);
  const category = str(body.category, 40);
  const photos = Array.isArray(body.photos)
    ? body.photos.filter((p): p is string => typeof p === 'string' && p.startsWith(`${API}/images/`)).slice(0, 5)
    : [];
  if (title.length < 3) bad('Add a title (at least 3 characters).');

  let price: number | null = null;
  let priceOptions: { label: string; price: number }[] = [];
  let condition: string | null = null;

  if (type === 'item') {
    if (!ITEM_CATEGORIES.includes(category)) bad('Pick a category.');
    condition = str(body.condition, 20);
    if (!CONDITIONS.includes(condition)) bad('Pick a condition.');
    price = num(body.price);
    if (price === null || price < 0 || price > 100000) bad('Enter a price.');
    if (photos.length === 0) bad('Add at least one photo.');
  } else if (type === 'service') {
    if (!user.bio || !user.photo) bad('Add a profile photo and a short bio before posting a service.');
    if (!SERVICE_CATEGORIES.includes(category)) bad('Pick a service category.');
    const raw = Array.isArray(body.priceOptions) ? body.priceOptions : [];
    priceOptions = raw
      .map((o: { label?: unknown; price?: unknown }) => ({ label: str(o?.label, 60), price: num(o?.price) }))
      .filter((o): o is { label: string; price: number } => o.label.length > 0 && o.price !== null && o.price >= 0)
      .slice(0, 5);
    if (priceOptions.length === 0) bad('Add at least one service with a price.');
    price = Math.min(...priceOptions.map((o) => o.price));
  } else {
    bad('You can post an item or a service.');
  }

  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO listings (id, user_id, type, title, description, price, price_options, category, condition, photos, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, user.id, type, title, description, price, JSON.stringify(priceOptions), category, condition,
      JSON.stringify(photos), Date.now())
    .run();
  const row = (await loadListing(env, id))!;
  return json({ listing: serializeListing(row, user.id) });
}

async function updateListing(request: Request, env: Env, user: UserRow, id: string) {
  const row = await loadListing(env, id);
  if (!row) throw new HttpError(404, 'This listing no longer exists.');
  if (row.user_id !== user.id) throw new HttpError(403, 'Only the seller can change this listing.');
  const body = await readJson(request);
  const status = str(body.status, 10);
  if (!['active', 'paused', 'sold'].includes(status)) bad('Unknown status.');
  await env.DB.prepare(`UPDATE listings SET status = ? WHERE id = ?`).bind(status, id).run();
  if (status !== 'active') {
    // Story 2.3: let anyone waiting on this listing know.
    const { results } = await env.DB.prepare(
      `SELECT * FROM threads WHERE listing_id = ? AND status IN ('open', 'requested')`
    )
      .bind(id)
      .all<ThreadRow>();
    const now = Date.now();
    for (const t of results) {
      await addMessage(env, t.id, null, `The seller marked this listing ${status === 'sold' ? 'sold' : 'paused'}.`, now);
      if (t.status === 'requested') {
        await env.DB.prepare(`UPDATE threads SET status = 'declined', updated_at = ? WHERE id = ?`).bind(now, t.id).run();
      }
    }
  }
  const updated = (await loadListing(env, id))!;
  return json({ listing: serializeListing(updated, user.id) });
}

async function myListings(env: Env, user: UserRow) {
  const { results } = await env.DB.prepare(`${LISTING_SELECT} WHERE l.user_id = ? ORDER BY l.created_at DESC`)
    .bind(user.id)
    .all<ListingWithAuthor>();
  return json({ listings: results.map((r) => serializeListing(r, user.id)) });
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

async function finishIfDone(env: Env, thread: ThreadRow, now: number) {
  const t = (await loadThread(env, thread.id))!;
  if (t.status !== 'accepted' || !t.buyer_paid || !t.seller_complete) return;
  await env.DB.prepare(`UPDATE threads SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?`)
    .bind(now, now, t.id)
    .run();
  await addMessage(env, t.id, null, 'Exchange complete. Thanks for trading on Fizz Marketplace!', now);
  const seller = await env.DB.prepare(`SELECT is_demo FROM users WHERE id = ?`).bind(t.seller_id).first<{ is_demo: number }>();
  const listing = await env.DB.prepare(`SELECT type FROM listings WHERE id = ?`).bind(t.listing_id).first<{ type: string }>();
  // Items close after one sale; services stay open. Demo listings stay up so every tester can try the flow.
  if (listing?.type === 'item' && !seller?.is_demo) {
    await env.DB.prepare(`UPDATE listings SET status = 'sold' WHERE id = ?`).bind(t.listing_id).run();
  }
}

// Demo sellers can't use the app, so the API answers for them a few seconds
// after the buyer acts. This runs whenever the conversation is read.
async function runDemoSeller(env: Env, thread: ThreadRow) {
  const seller = await env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(thread.seller_id).first<UserRow>();
  if (!seller?.is_demo) return;
  const now = Date.now();
  const first = firstName(seller.name);

  if (thread.status === 'requested' && thread.proposed_by === 'buyer' && (thread.requested_at ?? now) + DEMO_DELAY_MS <= now) {
    await env.DB.prepare(`UPDATE threads SET status = 'accepted', accepted_at = ?, updated_at = ? WHERE id = ?`)
      .bind(now, now, thread.id)
      .run();
    await addMessage(env, thread.id, null, `${first} accepted your request. You can now see each other's names.`, now);
    await addMessage(env, thread.id, seller.id, 'Sounds good! Pick a meetup spot and I will see you there.', now + 1);
    return;
  }

  if (thread.status === 'accepted' && thread.buyer_paid && !thread.seller_complete && (thread.paid_at ?? now) + DEMO_DELAY_MS <= now) {
    await env.DB.prepare(`UPDATE threads SET seller_complete = 1, updated_at = ? WHERE id = ?`).bind(now, thread.id).run();
    await addMessage(env, thread.id, null, `${first} marked the exchange complete.`, now);
    await finishIfDone(env, thread, now + 1);
    return;
  }

  const last = await env.DB.prepare(`SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at DESC LIMIT 1`)
    .bind(thread.id)
    .first<MessageRow>();
  if (last && last.sender_id === thread.buyer_id && last.created_at + 2500 <= now) {
    const replies: Record<string, string> = {
      open: 'Hi! Yes, still available. Tap Request to pick a time that works for you.',
      requested: 'Got your request, confirming in a sec.',
      declined: 'Sorry about that. Feel free to send another request with a different time.',
      accepted: 'Sounds good, see you then!',
      completed: 'Thanks again!',
    };
    await addMessage(env, thread.id, seller.id, replies[thread.status] ?? 'Sounds good!', now);
  }
}

async function counterpartFor(env: Env, thread: ThreadRow, viewer: UserRow, listingType: string) {
  const otherId = thread.buyer_id === viewer.id ? thread.seller_id : thread.buyer_id;
  const other = (await env.DB.prepare(`SELECT * FROM users WHERE id = ?`).bind(otherId).first<UserRow>())!;
  const revealed = thread.status === 'accepted' || thread.status === 'completed';
  if (revealed) {
    return { id: other.id, revealed: true, name: other.name, college: other.college, bio: other.bio, photo: other.photo, venmo: other.venmo };
  }
  // Service providers are public before acceptance; everyone else stays anonymous.
  if (other.id === thread.seller_id && listingType === 'service') {
    return { id: other.id, revealed: false, name: other.name, college: other.college, bio: other.bio, photo: other.photo, venmo: null };
  }
  return { id: other.id, revealed: false, name: 'Verified Rice student', college: null, bio: null, photo: null, venmo: null };
}

async function serializeThread(env: Env, thread: ThreadRow, viewer: UserRow, withMessages: boolean) {
  const listingRow = (await loadListing(env, thread.listing_id))!;
  const listing = serializeListing(listingRow, viewer.id);
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
    lastMessage: last ? { body: last.body, system: last.sender_id === null, mine: last.sender_id === viewer.id, createdAt: last.created_at } : null,
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
  const visible = results.filter((t) => !blocked.includes(t.buyer_id === user.id ? t.seller_id : t.buyer_id));
  for (const t of visible) await runDemoSeller(env, t);
  const fresh = await Promise.all(visible.map(async (t) => (await loadThread(env, t.id))!));
  const threads = await Promise.all(fresh.map((t) => serializeThread(env, t, user, false)));
  threads.sort((a, b) => (b.updatedAt as number) - (a.updatedAt as number));
  return json({ threads });
}

async function getThread(env: Env, user: UserRow, id: string) {
  let thread = await threadForUser(env, id, user);
  await runDemoSeller(env, thread);
  thread = (await loadThread(env, id))!;
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
  return getThread(env, user, id);
}

async function requestThread(request: Request, env: Env, user: UserRow, id: string) {
  const thread = await threadForUser(env, id, user);
  if (thread.buyer_id !== user.id) bad('Only the buyer can send a request.');
  if (!['open', 'declined'].includes(thread.status)) bad('A request is already in progress.');
  const listing = (await loadListing(env, thread.listing_id))!;
  if (listing.status !== 'active') bad('This listing is no longer available.');
  const body = await readJson(request);
  const time = num(body.proposedTime);
  if (time === null || time < Date.now() - 3600000) bad('Pick a time that has not passed.');
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
  const note = str(body.note, 500);
  await addMessage(env, id, null, listing.type === 'service' ? 'Booking request sent.' : 'Purchase request sent.', now);
  if (note) await addMessage(env, id, user.id, note, now + 1);
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
  if (action === 'accept') {
    await env.DB.prepare(`UPDATE threads SET status = 'accepted', accepted_at = ?, updated_at = ? WHERE id = ?`)
      .bind(now, now, id)
      .run();
    await addMessage(env, id, null, `${firstName(user.name)} accepted. You can now see each other's names.`, now);
  } else if (action === 'decline') {
    await env.DB.prepare(`UPDATE threads SET status = 'declined', updated_at = ? WHERE id = ?`).bind(now, id).run();
    await addMessage(env, id, null, 'The request was declined.', now);
  } else if (action === 'suggest') {
    const time = num(body.proposedTime);
    if (time === null || time < now - 3600000) bad('Pick a time that has not passed.');
    await env.DB.prepare(`UPDATE threads SET proposed_time = ?, proposed_by = ?, requested_at = ?, updated_at = ? WHERE id = ?`)
      .bind(time, role, now, now, id)
      .run();
    await addMessage(env, id, null, `A new time was suggested.`, now);
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
    await finishIfDone(env, thread, now + 1);
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
    await finishIfDone(env, thread, now + 1);
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
    reportedUserId = thread.buyer_id === user.id ? thread.seller_id : thread.buyer_id;
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
  if (body.block === true && reportedUserId && reportedUserId !== user.id) {
    await env.DB.prepare(`INSERT OR IGNORE INTO blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)`)
      .bind(user.id, reportedUserId, now)
      .run();
  }
  return json({ ok: true, blocked: body.block === true && Boolean(reportedUserId) });
}

// ---------- router ----------

type Handler = (request: Request, env: Env, url: URL, id: string) => Promise<Response>;

const ROUTES: [string, RegExp, Handler][] = [
  ['POST', /^\/auth\/signup$/, (r, e) => signup(r, e)],
  ['POST', /^\/auth\/login$/, (r, e) => login(r, e)],
  ['POST', /^\/auth\/logout$/, (r, e) => logout(r, e)],
  ['GET', /^\/me$/, async (r, e) => json({ user: publicUser(await requireUser(r, e)) })],
  ['PATCH', /^\/me$/, async (r, e) => updateMe(r, e, await requireUser(r, e))],
  ['GET', /^\/me\/listings$/, async (r, e) => myListings(e, await requireUser(r, e))],
  ['POST', /^\/images$/, async (r, e) => uploadImage(r, e, await requireUser(r, e))],
  ['GET', /^\/images\/([\w-]+)$/, (_r, e, _u, id) => getImage(e, id)],
  ['GET', /^\/listings$/, async (r, e, u) => listListings(u, e, await currentUser(r, e))],
  ['POST', /^\/listings$/, async (r, e) => createListing(r, e, await requireUser(r, e))],
  ['GET', /^\/listings\/([\w-]+)$/, async (r, e, _u, id) => getListing(e, id, await currentUser(r, e))],
  ['PATCH', /^\/listings\/([\w-]+)$/, async (r, e, _u, id) => updateListing(r, e, await requireUser(r, e), id)],
  ['GET', /^\/threads$/, async (r, e) => listThreads(e, await requireUser(r, e))],
  ['POST', /^\/threads$/, async (r, e) => startThread(r, e, await requireUser(r, e))],
  ['GET', /^\/threads\/([\w-]+)$/, async (r, e, _u, id) => getThread(e, await requireUser(r, e), id)],
  ['POST', /^\/threads\/([\w-]+)\/messages$/, async (r, e, _u, id) => sendMessage(r, e, await requireUser(r, e), id)],
  ['POST', /^\/threads\/([\w-]+)\/request$/, async (r, e, _u, id) => requestThread(r, e, await requireUser(r, e), id)],
  ['POST', /^\/threads\/([\w-]+)\/respond$/, async (r, e, _u, id) => respondThread(r, e, await requireUser(r, e), id)],
  ['POST', /^\/threads\/([\w-]+)\/meetup$/, async (r, e, _u, id) => setMeetup(r, e, await requireUser(r, e), id)],
  ['POST', /^\/threads\/([\w-]+)\/paid$/, async (r, e, _u, id) => markPaid(e, await requireUser(r, e), id)],
  ['POST', /^\/threads\/([\w-]+)\/complete$/, async (r, e, _u, id) => markComplete(e, await requireUser(r, e), id)],
  ['POST', /^\/reports$/, async (r, e) => report(r, e, await requireUser(r, e))],
];

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.slice(API.length).replace(/\/+$/, '') || '/';
  for (const [method, pattern, handler] of ROUTES) {
    if (method !== request.method) continue;
    const match = path.match(pattern);
    if (match) return handler(request, env, url, match[1] ?? '');
  }
  return json({ error: 'Not found.' }, 404);
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
    return new Response(response.body, { status: response.status, headers });
  },
} satisfies ExportedHandler<Env>;
