-- Messaging-only flow: each side can choose to share their name and payment info.
ALTER TABLE threads ADD COLUMN buyer_shared INTEGER NOT NULL DEFAULT 0;
ALTER TABLE threads ADD COLUMN seller_shared INTEGER NOT NULL DEFAULT 0;
