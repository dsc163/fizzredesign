-- Remove all seeded demo content; the marketplace now holds only real posts.
DELETE FROM messages WHERE thread_id IN (
  SELECT id FROM threads WHERE buyer_id IN (SELECT id FROM users WHERE is_demo = 1)
     OR seller_id IN (SELECT id FROM users WHERE is_demo = 1)
     OR listing_id IN (SELECT id FROM listings WHERE user_id IN (SELECT id FROM users WHERE is_demo = 1)));
DELETE FROM threads WHERE buyer_id IN (SELECT id FROM users WHERE is_demo = 1)
   OR seller_id IN (SELECT id FROM users WHERE is_demo = 1)
   OR listing_id IN (SELECT id FROM listings WHERE user_id IN (SELECT id FROM users WHERE is_demo = 1));
DELETE FROM rsvps WHERE listing_id IN (SELECT id FROM listings WHERE user_id IN (SELECT id FROM users WHERE is_demo = 1));
DELETE FROM event_updates WHERE listing_id IN (SELECT id FROM listings WHERE user_id IN (SELECT id FROM users WHERE is_demo = 1));
DELETE FROM reports WHERE listing_id IN (SELECT id FROM listings WHERE user_id IN (SELECT id FROM users WHERE is_demo = 1))
   OR reported_user_id IN (SELECT id FROM users WHERE is_demo = 1);
DELETE FROM blocks WHERE blocked_id IN (SELECT id FROM users WHERE is_demo = 1);
DELETE FROM listings WHERE user_id IN (SELECT id FROM users WHERE is_demo = 1);
DELETE FROM users WHERE is_demo = 1;

-- Event interests (JSON array of tags) and notification preferences (JSON).
ALTER TABLE users ADD COLUMN interests TEXT;
ALTER TABLE users ADD COLUMN prefs TEXT;

CREATE TABLE likes (
  listing_id TEXT NOT NULL REFERENCES listings(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (listing_id, user_id)
);

-- Saved posts of any type (replaces rsvps.saved).
CREATE TABLE saves (
  listing_id TEXT NOT NULL REFERENCES listings(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (listing_id, user_id)
);
CREATE INDEX saves_user ON saves(user_id, created_at DESC);
INSERT OR IGNORE INTO saves (listing_id, user_id, created_at)
  SELECT listing_id, user_id, created_at FROM rsvps WHERE saved = 1;

-- Comments are shown anonymously; photo is an optional image URL.
CREATE TABLE comments (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  photo TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX comments_listing ON comments(listing_id, created_at);

-- dedupe_key prevents repeats (e.g. one "starts in 1 hour" per event per user).
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  link TEXT,
  dedupe_key TEXT,
  read_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX notifications_user ON notifications(user_id, created_at DESC);
CREATE UNIQUE INDEX notifications_dedupe ON notifications(user_id, dedupe_key);
