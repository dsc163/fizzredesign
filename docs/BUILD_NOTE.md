# Fizz Marketplace: Prototype Build Note

**Group 8:** Jessica Lee, Juan Subero-Bellizzio, Darioush Clapp, Gabriel Porras

- **Live prototype:** https://darioushclapp.com/fizzredesign/
- **Code:** https://github.com/dsc163/fizzredesign (web/mobile app in `app/`, backend in `worker/`)

## Core user flow

**Book a service from another Rice student and complete the exchange.** This is the PRD's north-star action, a completed peer-to-peer exchange.

1. A provider posts a service, for example "Box braids, $60". They need a profile photo and a bio first.
2. A buyer finds it on **Browse**, picks an option, a day, and a time, and taps **Book**.
3. The provider gets a notification and taps **Accept**.
4. Both sides now see each other's verified name and photo, and the buyer sees the provider's Venmo.
5. They pick a public meetup spot (Fondren entrance, RMC, a college commons).
6. The buyer taps **I paid**, and the provider taps **Mark complete**. The app shows **Exchange complete**.

Buying an item uses the same flow with **Send request**.

**Events** have their own tab. Students host an event (anonymously, as themselves, or as a club), and others RSVP, get the location when the host allows, get reminders, and follow live updates.

## What is real and what is faked

**Real** (live database on Cloudflare D1, shared by every tester; the marketplace contains only posts that real people made):
- Accounts with email and password.
- Posting items, services, and events with photos.
- Search and categories.
- Messaging between people.
- Requests and bookings: accept, decline, or suggest another time.
- Names and Venmo revealed only after acceptance.
- Meetup spot, then paid and complete.
- Notifications: requests, replies, comments, likes, RSVPs, host updates, location reveals, and event reminders.
- Likes, anonymous comments, saving posts, and shareable post links with previews.
- Events: RSVP, Named RSVPs, a location hidden until the host's rule allows, live updates, and an attendee comment thread with photos.
- Report and block.

**Faked or stubbed:**
- **Rice verification:** any email works, and every account is shown as a "verified Rice student".
- **Payments:** no money moves. The app only shows the other person's Venmo handle.
- **Notifications are in-app only:** they appear under the bell. There are no phone push notifications, and reminders show up the next time you open the app.
- **Wanted and Lost & Found:** these sections exist, but posting to them isn't built yet.
- **Organization verification:** an event can be posted under a club or persona name, but the "verified organization" badge isn't granted to anyone.

## AI tools

**Claude Code** was the primary tool. It planned the build from our PRD, wrote the React Native (Expo) app and the Cloudflare Worker API, and tested the flow end to end in a headless browser.

- **What worked:** Building straight from the PRD's stories and mockups, with the identity rules enforced on the server.
- **What fought us:** Deployment and access setup: GitHub app permissions, and Cloudflare's static-file upload. The site ended up served from GitHub Pages behind a Cloudflare Worker.

*AI chat transcripts:* (add links here)

## How to start

1. Open **https://darioushclapp.com/fizzredesign/** in any browser, on a phone or laptop.
2. Tap **Create account** and enter any name, email, and password.
3. The core flow needs two people, a provider and a buyer. To test alone, use two browsers (or a normal and a private window) with two accounts:
   - **Provider:** Profile → Edit profile → add a photo and bio, then Post → Service.
   - **Buyer:** Browse → open the service → pick a time → Book.
   - **Provider:** tap the bell → New booking request → Accept.
   - **Buyer:** pick a meetup spot → I paid. **Provider:** Mark complete.
4. **Events:** open the Events tab, pick your interests, then tap **Host an event**, or RSVP to an existing one.
