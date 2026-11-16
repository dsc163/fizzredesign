-- Put seeded events and Wanted deadlines at realistic times of day (Houston time).
-- The API keeps rolling them forward by whole weeks (events) or two days (Wanted).
UPDATE listings SET details = json_set(details, '$.starts_at', 1794970800000, '$.ends_at', 1794985200000) WHERE id = 'l_sailing_party'; -- Tue Nov 17, 9 PM to 1 AM
UPDATE listings SET details = json_set(details, '$.starts_at', 1795050000000, '$.ends_at', 1795057200000) WHERE id = 'l_open_mic'; -- Wed Nov 18, 7 PM to 9 PM
UPDATE listings SET details = json_set(details, '$.starts_at', 1795377600000, '$.ends_at', 1795384800000) WHERE id = 'l_soccer'; -- Sun Nov 22, 2 PM to 4 PM
UPDATE listings SET details = json_set(details, '$.needed_by', 1794967200000) WHERE id = 'l_stamps'; -- Tue Nov 17, 8 PM
UPDATE listings SET details = json_set(details, '$.needed_by', 1795046400000) WHERE id = 'l_hammer'; -- Wed Nov 18, 6 PM
