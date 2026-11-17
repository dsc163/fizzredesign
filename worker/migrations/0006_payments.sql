-- Payment handles for several apps (venmo, cashapp, zelle, paypal, applepay), as JSON.
ALTER TABLE users ADD COLUMN payments TEXT;
UPDATE users SET payments = json_object('venmo', venmo) WHERE venmo IS NOT NULL AND venmo != '';
