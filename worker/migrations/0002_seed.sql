-- Seed content so the marketplace isn't empty. Demo users (is_demo = 1) have
-- no password and can't sign in; the API auto-responds on their behalf so a
-- tester can complete an exchange alone.

INSERT INTO users (id, email, name, college, bio, venmo, is_demo, created_at) VALUES
  ('u_gavin',  'gavin.thompson@rice.edu', 'Gavin Thompson', 'Duncan',      'Junior barber cutting on campus since freshman year. Fades, tapers, beard trims. I come to your college commons.', '@gavin-cuts', 1, unixepoch()*1000),
  ('u_jordan', 'jordan.lee@rice.edu',     'Jordan Lee',     'Wiess',       'Junior in ECE. Clearing out my room before winter break.', '@jordan-lee-24', 1, unixepoch()*1000),
  ('u_priya',  'priya.raman@rice.edu',    'Priya Raman',    'Martel',      'Senior chem major and former CHEM 211 TA. Patient, exam-focused tutoring.', '@priya-raman', 1, unixepoch()*1000),
  ('u_marcus', 'marcus.bell@rice.edu',    'Marcus Bell',    'Lovett',      'Shooting portraits and grad photos around campus for 3 years. Edited photos in 48 hours.', '@marcusbellphoto', 1, unixepoch()*1000),
  ('u_dev',    'dev.shah@rice.edu',       'Dev Shah',       'Baker',       'DJ for college parties and club socials. Own speakers and lights.', '@dev-shah-dj', 1, unixepoch()*1000),
  ('u_ethan',  'ethan.park@rice.edu',     'Ethan Park',     'Hanszen',     'Sophomore, moving off campus next semester.', '@ethan-park', 1, unixepoch()*1000),
  ('u_maya',   'maya.okafor@rice.edu',    'Maya Okafor',    'Jones',       'English major. Selling books from past classes.', '@maya-okafor', 1, unixepoch()*1000),
  ('u_sam',    'sam.rivera@rice.edu',     'Sam Rivera',     'Sid Richardson', 'Have a car this semester and drive to the airports most weekends.', '@sam-rivera', 1, unixepoch()*1000),
  ('u_lena',   'lena.fischer@rice.edu',   'Lena Fischer',   'Brown',       'Freshman at Brown.', '@lena-fischer', 1, unixepoch()*1000),
  ('u_nico',   'nico.alvarez@rice.edu',   'Nico Alvarez',   'Baker',       'Social chair for Club Sailing.', '@nico-alvarez', 1, unixepoch()*1000);

-- Services
INSERT INTO listings (id, user_id, type, title, description, price, price_options, category, created_at) VALUES
  ('l_gavin_cuts', 'u_gavin', 'service', 'Fresh Cuts by Gavin',
   'Fades, tapers, and beard trims. About 40 minutes per cut. I bring clippers and a cape and can meet in your college commons or at Duncan.',
   25, '[{"label":"Haircut","price":25},{"label":"Haircut + beard trim","price":35}]', 'Haircuts', unixepoch()*1000 - 3*3600000),
  ('l_priya_tutor', 'u_priya', 'service', 'Orgo and Gen Chem Tutoring',
   'One-on-one help for CHEM 121, 122, 211, and 212. Practice problems from old exams included. Meet at Fondren or online.',
   30, '[{"label":"1-hour session","price":30},{"label":"2-hour exam review","price":55}]', 'Tutoring', unixepoch()*1000 - 9*3600000),
  ('l_marcus_photo', 'u_marcus', 'service', 'Headshots and Grad Photos',
   'Natural-light portraits around campus: the Sallyport, Lovett Hall, and the academic quad. 10 edited photos per session.',
   40, '[{"label":"Headshots (20 min)","price":40},{"label":"Grad photos (1 hour)","price":90}]', 'Photography', unixepoch()*1000 - 26*3600000),
  ('l_dev_dj', 'u_dev', 'service', 'DJ for Your Party or Club Social',
   'Hip-hop, house, and throwbacks. Includes two speakers and lights. Send me the vibe and I will build the set.',
   120, '[{"label":"2-hour set","price":120},{"label":"Speaker rental only (one night)","price":40}]', 'DJ and Music', unixepoch()*1000 - 40*3600000),
  ('l_sam_rides', 'u_sam', 'service', 'Rides to Hobby and IAH',
   'Airport drop-offs for breaks and weekends. Pickup from any college. Up to 3 people with luggage.',
   25, '[{"label":"Hobby (HOU)","price":25},{"label":"Bush (IAH)","price":40}]', 'Rides', unixepoch()*1000 - 30*3600000),
  ('l_ethan_dolly', 'u_ethan', 'service', 'Moving Dolly and Cart Rental',
   'Folding hand truck plus a flat cart for move-out. Pick up from Hanszen, return the next day.',
   10, '[{"label":"One-day rental","price":10}]', 'Rentals', unixepoch()*1000 - 60*3600000);

-- Goods
INSERT INTO listings (id, user_id, type, title, description, price, category, condition, created_at) VALUES
  ('l_ti84', 'u_jordan', 'item', 'TI-84 Plus CE', 'Teal, with the charging cable. Used for MATH 101 and 102. No scratches on the screen.', 60, 'Electronics', 'Like new', unixepoch()*1000 - 1*3600000),
  ('l_fridge', 'u_ethan', 'item', 'Mini Fridge (3.1 cu ft)', 'Has a small freezer section. Works perfectly. You pick up from Hanszen, I can help carry it down.', 70, 'Dorm', 'Good', unixepoch()*1000 - 5*3600000),
  ('l_rug', 'u_lena', 'item', 'Gray Area Rug, 5x7', 'Soft and low-pile, fits a standard double. Washed and rolled up.', 35, 'Dorm', 'Like new', unixepoch()*1000 - 7*3600000),
  ('l_norton', 'u_maya', 'item', 'Norton Anthology of English Literature, Vol. 1 (10th ed.)', 'The required edition for ENGL 200. Light pencil notes in the margins.', 25, 'Textbooks', 'Good', unixepoch()*1000 - 12*3600000),
  ('l_calc', 'u_jordan', 'item', 'Calculus: Early Transcendentals (9th ed.)', 'Stewart. Some highlighting in chapters 1 to 4. No missing pages.', 40, 'Textbooks', 'Good', unixepoch()*1000 - 20*3600000),
  ('l_bike', 'u_ethan', 'item', 'Trek FX 2 Hybrid Bike', 'Medium frame. New tires this semester. U-lock included.', 220, 'Bikes', 'Good', unixepoch()*1000 - 28*3600000),
  ('l_toolkit', 'u_sam', 'item', 'Hammer and Basic Toolkit', 'Hammer, screwdrivers, Allen keys, tape measure. Great for putting up shelves and furniture.', 15, 'Dorm', 'Good', unixepoch()*1000 - 33*3600000),
  ('l_headphones', 'u_jordan', 'item', 'Sony WH-1000XM4 Headphones', 'Noise canceling works perfectly. Case and cable included.', 140, 'Electronics', 'Good', unixepoch()*1000 - 45*3600000),
  ('l_puffer', 'u_lena', 'item', 'North Face Puffer Jacket (M)', 'Black, size medium. Warm, no tears.', 70, 'Clothing', 'Good', unixepoch()*1000 - 50*3600000),
  ('l_lamp', 'u_maya', 'item', 'Desk Lamp with USB Port', 'White adjustable arm lamp. Bulb included.', 10, 'Dorm', 'Like new', unixepoch()*1000 - 55*3600000);

-- Events, Wanted, Lost and Found (viewable, not transactable in this prototype)
INSERT INTO listings (id, user_id, type, title, description, price, category, details, created_at) VALUES
  ('l_sailing_party', 'u_nico', 'event', 'Club Sailing Kickoff Party',
   'Kicking off the season with music, food, and the new team. Everyone is welcome. Bring your Rice ID.',
   NULL, 'Parties',
   json_object('starts_at', (unixepoch() + 6*3600)*1000, 'ends_at', (unixepoch() + 10*3600)*1000,
               'host_name', 'Sailing Club', 'host_verified', 1,
               'area', 'Off campus, near Rice Village', 'location_note', 'Exact address revealed to RSVPs at 6 PM',
               'entry', '$5 at the door, or Venmo @sailing-club', 'tags', json('["Parties","Clubs"]'), 'rsvps', 84),
   unixepoch()*1000 - 2*3600000),
  ('l_open_mic', 'u_maya', 'event', 'Acoustic Open Mic',
   'Sign up at the door for a 10-minute slot or just come listen. Free coffee while it lasts.',
   NULL, 'Performances',
   json_object('starts_at', (unixepoch() + 30*3600)*1000, 'ends_at', (unixepoch() + 33*3600)*1000,
               'host_name', 'Anonymous', 'host_verified', 0,
               'area', 'Brochstein Pavilion', 'location_note', 'Public location',
               'entry', 'Free', 'tags', json('["Performances","Food"]'), 'rsvps', 37),
   unixepoch()*1000 - 10*3600000),
  ('l_soccer', 'u_ethan', 'event', 'Sunday Pickup Soccer',
   'Casual 7v7, all skill levels. We bring pinnies and goals.',
   NULL, 'Sports',
   json_object('starts_at', (unixepoch() + 52*3600)*1000, 'ends_at', (unixepoch() + 54*3600)*1000,
               'host_name', 'Sunday Soccer', 'host_verified', 0,
               'area', 'Rec Center fields', 'location_note', 'Public location',
               'entry', 'Free', 'tags', json('["Sports"]'), 'rsvps', 22),
   unixepoch()*1000 - 22*3600000),
  ('l_stamps', 'u_lena', 'wanted', 'Need 2 stamps tonight',
   'Mailing a form that is due tomorrow. Can meet anywhere on campus.',
   5, NULL, json_object('needed_by', (unixepoch() + 5*3600)*1000), unixepoch()*1000 - 1*3600000),
  ('l_hammer', 'u_maya', 'wanted', 'Borrow a hammer for 10 minutes',
   'Putting up a shelf in my room at Jones. Will return it right away.',
   5, NULL, json_object('needed_by', (unixepoch() + 26*3600)*1000), unixepoch()*1000 - 4*3600000),
  ('l_airpods', 'u_jordan', 'lost', 'AirPods Pro case',
   'White case with a small scratch on the lid. Probably fell out of my backpack.',
   20, NULL, json_object('last_seen', 'Near Fondren, Tuesday afternoon'), unixepoch()*1000 - 8*3600000),
  ('l_id_card', 'u_priya', 'found', 'Rice ID card',
   'Found on a table. Describe the name on it to claim.',
   NULL, NULL, json_object('found_at', 'Brochstein Pavilion, Tuesday around 2 PM'), unixepoch()*1000 - 3*3600000),
  ('l_bottle', 'u_sam', 'found', 'Blue Hydro Flask',
   'Has a few stickers on it. Left at the Rec Center front desk area.',
   NULL, NULL, json_object('found_at', 'Rec Center, Monday evening'), unixepoch()*1000 - 30*3600000);
