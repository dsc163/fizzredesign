-- Core schema for Fizz Marketplace. Times are Unix milliseconds.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT,
  salt TEXT,
  college TEXT,
  bio TEXT,
  photo TEXT,
  venmo TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE images (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  mime TEXT NOT NULL,
  data BLOB NOT NULL,
  created_at INTEGER NOT NULL
);

-- type: item | service | event | wanted | lost | found
-- price: item price, service "from" price, wanted offer, or lost tip
-- price_options: JSON [{label, price}] for services
-- photos: JSON [url]
-- details: JSON with type-specific fields (event time/area, needed-by, etc.)
-- status: active | paused | sold
CREATE TABLE listings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price REAL,
  price_options TEXT NOT NULL DEFAULT '[]',
  category TEXT,
  condition TEXT,
  photos TEXT NOT NULL DEFAULT '[]',
  details TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL
);
CREATE INDEX listings_status_created ON listings(status, created_at DESC);
CREATE INDEX listings_user ON listings(user_id);

-- One conversation between a buyer and a seller about a listing, carrying the
-- request/booking and the exchange.
-- status: open | requested | accepted | declined | completed
-- proposed_by: buyer | seller (who proposed the current time)
CREATE TABLE threads (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id),
  buyer_id TEXT NOT NULL REFERENCES users(id),
  seller_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'open',
  option_label TEXT,
  price REAL,
  proposed_time INTEGER,
  proposed_by TEXT,
  meetup_spot TEXT,
  buyer_paid INTEGER NOT NULL DEFAULT 0,
  seller_complete INTEGER NOT NULL DEFAULT 0,
  requested_at INTEGER,
  accepted_at INTEGER,
  paid_at INTEGER,
  completed_at INTEGER,
  buyer_read_at INTEGER NOT NULL DEFAULT 0,
  seller_read_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX threads_buyer ON threads(buyer_id, updated_at DESC);
CREATE INDEX threads_seller ON threads(seller_id, updated_at DESC);
CREATE INDEX threads_listing ON threads(listing_id);

-- sender_id NULL means a system message (e.g. "Request accepted").
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES threads(id),
  sender_id TEXT,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX messages_thread ON messages(thread_id, created_at);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  reported_user_id TEXT,
  thread_id TEXT,
  listing_id TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE blocks (
  blocker_id TEXT NOT NULL REFERENCES users(id),
  blocked_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (blocker_id, blocked_id)
);
