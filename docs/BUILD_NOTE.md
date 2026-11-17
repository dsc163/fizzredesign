# Fizz Marketplace: Prototype Build Note

**Group 8:** Jessica Lee, Juan Subero-Bellizzio, Darioush Clapp, Gabriel Porras

- **Live prototype:** https://darioushclapp.com/fizzredesign/
- **Code:** https://github.com/dsc163/fizzredesign (web/mobile app in `app/`, backend in `worker/`)

## Core user flow

**Book a service from another Rice student and complete the exchange.** This is the PRD's north-star action, a completed peer-to-peer exchange:

1. Create an account and browse the marketplace.
2. Open a service, for example **Fresh Cuts by Gavin**.
3. Pick an option (Haircut + beard trim, $35), a day, and a time, then tap **Book**.
4. The provider accepts.
5. Both sides now see each other's verified name and photo, and the buyer sees the provider's Venmo.
6. Pick a public meetup spot (Fondren entrance, RMC, a college commons).
7. Tap **I paid**. The provider marks it complete, and the app shows **Exchange complete**.

Buying an item (for example the TI-84, $60) uses the same flow with **Send request**.

## What is real and what is faked

**Real** (live database on Cloudflare D1, shared by every tester):
- Accounts with email and password.
- Listings and search, plus posting items, services, and events with photo upload.
- Messaging between people, which refreshes every few seconds.
- Requests and bookings: accept, decline, or suggest another time.
- Names and Venmo revealed only after a request is accepted.
- Meetup spot, then paid and complete.
- Report and block.
- Events: RSVP and save, with an exact location hidden until the host's rule allows. The host can post live updates.

**Faked or stubbed:**
- **Rice verification:** any email works, and every account is shown as a "verified Rice student".
- **Demo sellers:** the seeded people (Gavin, Priya, Jordan, and others) are demo accounts. They automatically accept a request and confirm payment about 4 seconds later, so one tester can finish the flow alone. Two real testers can also trade with each other: one posts an item, the other requests it.
- **Demo listings stay up:** seeded listings stay active after a sale so every tester can try them.
- **Payments:** no money moves. The app only shows the other person's Venmo handle.
- **Reminders:** there are no push notifications or reminders. The **Cal** button on an event opens Google Calendar.
- **Wanted and Lost & Found:** these posts are view-only.
- **Personas and organizations:** an event can be posted under a club or persona name, but organization verification is seeded only.

## AI tools

**Claude Code** was the primary tool. It planned the build from our PRD, wrote the React Native (Expo) app and the Cloudflare Worker API, and tested the flow end to end in a headless browser.

- **What worked:** Building straight from the PRD's stories and mockups, with the identity rules enforced on the server.
- **What fought us:** Deployment and access setup: GitHub app permissions, and Cloudflare's static-file upload. The site ended up served from GitHub Pages behind a Cloudflare Worker.

*AI chat transcripts:* (add links here)

## How to start

1. Open **https://darioushclapp.com/fizzredesign/** in any browser, on a phone or laptop.
2. Tap **Create account** and enter any name, email, and password.
3. On Browse, tap **Show me Fresh Cuts by Gavin** in the blue tip, or tap **Services**, then **Fresh Cuts by Gavin**.
4. Pick a time, tap **Book**, and follow the steps on screen.
