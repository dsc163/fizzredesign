-- RSVPs and saves for events, plus host updates ("live updates").
CREATE TABLE rsvps (
  listing_id TEXT NOT NULL REFERENCES listings(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  going INTEGER NOT NULL DEFAULT 0,
  saved INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (listing_id, user_id)
);
CREATE INDEX rsvps_user ON rsvps(user_id);

CREATE TABLE event_updates (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES listings(id),
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX event_updates_listing ON event_updates(listing_id, created_at);

-- Location visibility for seeded events: public, rsvp (RSVPs only), or reveal
-- (RSVPs see it starting at reveal_at). rsvps in details is a baseline count.
UPDATE listings SET details = json_set(details,
  '$.visibility', 'reveal',
  '$.address', '2415 Rice Blvd, back patio',
  '$.reveal_at', json_extract(details, '$.starts_at') - 3*3600000,
  '$.location_note', NULL)
WHERE id = 'l_sailing_party';
UPDATE listings SET details = json_set(details, '$.visibility', 'public', '$.address', 'Brochstein Pavilion, south lawn', '$.location_note', NULL) WHERE id = 'l_open_mic';
UPDATE listings SET details = json_set(details, '$.visibility', 'public', '$.address', 'Rec Center fields, behind the Tudor Fieldhouse', '$.location_note', NULL) WHERE id = 'l_soccer';
UPDATE listings SET details = json_remove(details, '$.location_note') WHERE type = 'event';

-- A couple more events so the Events page has a full week.
INSERT INTO listings (id, user_id, type, title, description, price, category, details, created_at) VALUES
  ('l_study_pizza', 'u_priya', 'event', 'Finals Study Night + Free Pizza',
   'Quiet study tables, whiteboards, and pizza at 9. Chem and math tutors floating around to answer questions.',
   NULL, 'Study',
   json_object('starts_at', 1795143600000, 'ends_at', 1795154400000, 'host_name', 'Martel Academic Committee', 'host_verified', 1,
               'area', 'Martel College commons', 'address', 'Martel College commons', 'visibility', 'public',
               'entry', 'Free', 'tags', json('["Study","Food"]'), 'rsvps', 41),
   unixepoch()*1000 - 5*3600000),
  ('l_popup_thrift', 'u_lena', 'event', 'Thrift Pop-Up: Winter Clothes',
   'Jackets, sweaters, and boots from students clearing out before break. Cash or Venmo, everything under $25.',
   NULL, 'Pop-ups',
   json_object('starts_at', 1795204800000, 'ends_at', 1795219200000, 'host_name', 'Anonymous', 'host_verified', 0,
               'area', 'Near the RMC', 'address', 'RMC Grand Hall entrance', 'visibility', 'public',
               'entry', 'Free to browse', 'tags', json('["Pop-ups"]'), 'rsvps', 18),
   unixepoch()*1000 - 12*3600000);
