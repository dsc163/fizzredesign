# Fizz Marketplace: Prototype Build Note

**Group 8:** Jessica Lee, Juan Subero-Bellizzio, Darioush Clapp, Gabriel Porras

- **Live prototype:** https://darioushclapp.com/fizzredesign/
- **Code:** https://github.com/dsc163/fizzredesign (web/mobile app in `app/`, backend in `worker/`)

## Core user flow

**Find something from another Rice student and work it out in messages.** This leads to the PRD's north-star action, a completed peer-to-peer exchange.

1. Someone posts a service or item with just a name and a price. A photo and description are optional.
2. A buyer finds it on **Browse** (no account needed to look around), types a message in the box on the post, and taps **Send message**. If they aren't signed in yet, they sign up and come right back.
3. The two chat in **Messages** to settle the time, the place, and the price. The other person gets an in-app notification for each new message.
4. When they're ready to meet, either person taps **Share my name & payment info**. The other person then sees their verified name and payment apps (Venmo, Cash App, Zelle, PayPal, Apple Pay), with tap-to-pay links where the app has one. Both stay anonymous until they share (service providers are public).
5. The person who posted can **Mark as sold** or **Take down** the post at any time, from the post itself or from Profile.

**Events** have their own tab. Students host an event (anonymously, as themselves, or as a club), and others RSVP, get the location when the host allows, get reminders, and follow live updates.

## What is real and what is faked

**Real** (live database on Cloudflare D1, shared by every tester; the marketplace contains only posts that real people made):
- Accounts with email and password.
- Posting items, services, and events with photos.
- Search and categories.
- Messaging between people.
- Messaging between buyers and sellers, with names and payment handles (Venmo, Cash App, Zelle, PayPal, Apple Pay) shared only when a person chooses to.
- Taking down any post (items, services, events) in one tap.
- Browse, Events, and post pages are open without an account; posting, booking, messaging, likes, comments, and RSVPs ask you to sign in first.
- Meetup spot, then paid and complete.
- Notifications: requests, replies, comments, likes, RSVPs, host updates, location reveals, and event reminders.
- Likes, anonymous comments, saving posts, and shareable post links with previews.
- Events: RSVP, Named RSVPs, a location hidden until the host's rule allows, live updates, and an attendee comment thread with photos.
- Report and block.

**Faked or stubbed:**
- **Rice verification:** any email works, and every account is shown as a "verified Rice student".
- **Payments:** no money moves. The app only shows the other person's payment handles.
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
3. The core flow needs two people. To test alone, use two browsers (or a normal and a private window) with two accounts:
   - **Seller:** Post → Service or Item → enter a name and price → Post.
   - **Buyer:** Browse → open the post → type a message → Send message.
   - **Seller:** Messages (or the bell) → reply → Share my name & payment info.
4. **Events:** open the Events tab, pick your interests, then tap **Host an event**, or RSVP to an existing one.
