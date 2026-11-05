# Fizz Marketplace: Release 1 (MVP) Build Plan

This is the build outline for the Release 1 scope in the Group 8 PRD (November 2026). It covers the order of work and the checkpoints. Each checkpoint ends with something you can demo. Story numbers (for example 2.1) refer to the PRD.

Release 2 items and anything the PRD lists as out of scope are not in this plan.

## Where the app is today

The Expo (React Native) app in `app/` already has:

- **Tabs:** Browse, Post, Messages, and Profile.
- **Browse:** a 2-column grid showing 12 mock item listings from `src/database/listings.json`.
- **Post:** a form with photo, title, price, and description. Posted items are kept in memory only.
- **Placeholders:** the listing detail page, Messages, and Profile are empty.
- **Website:** published to GitHub Pages on every push.

## Ground rules for the prototype

The PRD depends on Fizz systems we don't have: rice.edu verification, Fizz messaging, push notifications, the moderation queue, and the main Fizz feed. Until there is a backend, the prototype simulates them:

| PRD dependency | Prototype stand-in |
|---|---|
| Verified rice.edu sign-in | A seeded "current user" who is always verified. |
| Other students on the other side of a deal | Seeded mock users, plus a **demo user switcher** so one person can play buyer and seller to show two-sided flows. |
| Fizz backend / database | A local data layer saved on the device (AsyncStorage). All reads and writes go through `src/database`, so a real backend can replace it later. |
| Fizz messaging | In-app chat threads stored locally. |
| Push notifications | An in-app notifications list. Event reminders use local device notifications where Expo supports them, and the in-app list everywhere else (including web). |
| Moderation queue | Reports are saved to a local list that a demo "moderator" view can read. |
| Main Fizz feed (Epic 8) | A mock "Fizz feed" screen that holds the "Happening at Rice" card. |

## Checkpoints

Each checkpoint ends with a review: you try it on the website (and on a phone through Expo Go), approve or ask for changes, and then the next one starts.

### Checkpoint 0: Foundations (no visible features)

Everything else builds on this.

- **One post model with a type:** Item, Service, Wanted, Lost, Found, and Event. Shared fields are author, created time, photos, status, likes, and comments, plus fields for each type.
- **Users and profiles:** verified name, photo, bio, Venmo/Zelle handles, owned personas and organizations, and an org verified badge.
- **Anonymity rules in one place:** a single helper decides what name to show (anonymous, "Verified Rice student", persona, org, or real name), based on post type and transaction state, following the PRD's Identity and Anonymity table.
- **Local persistence,** so posted items survive a reload. This replaces the current memory-only store.
- **Seed data** for every post type, a few mock users, and the demo user switcher.

**Done when:** the existing Browse and Post still work, posts survive a refresh, and you can switch the demo user.

### Checkpoint 1: Discover (Epic 5)

- **5.1:** Browse section tabs: All, Events, Goods, Services, Wanted, Lost and Found. All shows the newest posts across sections.
- **5.2:** category filter inside Goods and Services, newest first.
- **5.3:** keyword search across every section. With fewer than 3 results, it offers a "Post a Wanted for this" shortcut.
- A card design for each post type, matching mockup Screen 1, including the event card's RSVP button and location status.

**Done when:** every seeded post shows up in the right section, filters and search work, and the search shortcut appears with fewer than 3 results.

### Checkpoint 2: Post everything (Epic 2 posting, Wanted, Lost and Found, Event)

One Post form that branches by type, as in mockup Screen 2:

- **2.1 Item:** title, category, condition, fixed price, and at least 1 photo. The post shows "Verified Rice student" with no name.
- **2.2 and 1.2 Service:** a preset category (Haircuts, Tutoring, Photography, DJ and Music, Rentals, Rides, Other), price, and photos. The first service post requires a profile photo, a bio, and a confirmed name before it goes live.
- **3.1 Wanted:** what's needed, a needed-by date, and an optional offer. It expires at the deadline, or after 7 days if there's no deadline.
- **4.1 Lost:** what it is, last seen where and when, an optional photo, and an optional tip.
- **4.2 Found:** a photo with a blur step for names, ID numbers, and faces (draw boxes to blur), and a required found location.
- **7.1 to 7.3 Event:** post as Anonymous, a persona, or an organization. Location visibility is Public, RSVPs only, or Reveal at a set time. There's an optional free-text Entry field for cover or payment details, plus tags.

**Done when:** each type can be posted with its required fields enforced, it lands in the right Browse section, and it shows the right name for its anonymity rule.

### Checkpoint 3: Detail pages

- Detail pages for Item, Service, Wanted, Lost, Found, and Event, replacing today's placeholder.
- **Service:** the provider's profile (name, college, bio) and a Book button, as in mockup Screen 4.
- **Event:** a hidden or revealed location, entry details, RSVP / Save / Add to calendar, and an updates area, as in mockup Screen 3.
- **2.3:** the owner can mark their own posts Sold or Paused, which removes them from Browse and search.

**Done when:** every card opens a detail page that matches its type, and Sold or Paused posts disappear from Browse.

### Checkpoint 4: Student Events (Epic 7)

Events are the PRD's main reason to come back each week, so they come before transactions.

- **7.2:** the location reveal logic: who sees the general area versus the exact spot, and when. RSVPs are notified when it's revealed.
- **7.4:** an interest picker the first time someone opens Events. Today and This Week sections show matching tags first, with tag filters.
- **7.5:** RSVP and Save, reminders the day before and 1 hour before (each can be turned off), and one-tap add to calendar (the phone's calendar on mobile, an .ics download on web).
- **7.6:** host live updates pinned with timestamps, RSVPs notified, and anonymous attendee comments and photos in the event thread.
- **7.7:** an optional Named RSVPs mode, with a warning before RSVPing and a name list for the host. The total RSVP count is always public.

**Done when:** you can act as a host (post an event, set the location to "reveal day-of", post a live update) and then switch to an attendee (pick interests, RSVP, get the reminder and the location reveal, comment anonymously).

### Checkpoint 5: Messaging and transactions (Epic 6)

- **Messages tab:** a list of conversations and a chat screen, replacing the placeholder.
- **6.2:** one-tap template messages, such as "Is this still available?" and "Are you free on [day]?".
- **6.1:** Request (items) or Book (services) with a proposed time. The seller can accept, decline, or suggest another time.
- **6.3 and 1.3:** on accept, both sides see each other's verified name and photo, plus linked Venmo/Zelle handles. None of this shows before acceptance.
- **6.4:** meetup picker with suggested public spots (RMC, Fondren Library entrance, a residential college commons) or a custom spot.
- **6.5:** the buyer marks it paid and the seller marks it complete, which counts as a completed exchange. Items close; services stay open for new bookings.
- The accepted transaction screen, matching mockup Screen 5.

**Done when:** you can play buyer and seller through the full flow (request, accept, reveal, meetup, paid, complete) with the demo user switcher, and the listing closes or stays open correctly.

### Checkpoint 6: Wanted and Lost and Found flows (Epics 3 and 4)

These reuse the Checkpoint 5 chat and transaction pieces.

- **3.2:** "I can help" opens a chat with a prefilled message. If the poster accepts, both identities are revealed and the exchange follows the Checkpoint 5 flow.
- **4.3:** "This is mine" asks the claimer to describe a hidden detail. The finder approves or declines before a handoff chat opens (mockup Screen 6).
- **4.4:** mark Returned, which closes the post and reminds the owner to send any promised tip to the finder's payment handle.

**Done when:** a Wanted post and a Lost/Found post can each be taken from posting to closed.

### Checkpoint 7: Trust and safety (Epic 1)

- **1.4:** Report from a listing, profile, event, or chat, with a reason. Block is offered in the same step. A blocked user can't message you, and their posts are hidden from you.
- **1.3:** settings for Venmo and Zelle handles. They show only to the other party in an accepted transaction (already used in Checkpoint 5).
- **1.1:** check that every action (browse, post, message, RSVP) works for the verified user with no extra sign-up.
- A demo moderator view that lists reports.

**Done when:** reporting and blocking work everywhere, and a blocked user's content disappears for the person who blocked them.

### Checkpoint 8: Community feed and social (Epic 8)

- **8.1:** a mock Fizz feed with a "Happening at Rice" card for trending events and new posts, linking to each one.
- **8.2:** likes and anonymous comments on listings and events, working like normal Fizz posts.

**Done when:** the feed card shows current trending events and new posts, and likes and comments work on every post type.

### Checkpoint 9: MVP polish and handoff

- **Metrics logging:** a local event log for the PRD's success metrics, so they're ready to wire to real analytics. Logged events include completed exchanges, weekly opens, new listings, listing-to-exchange time, repeat providers, RSVPs, returns, and reports.
- Empty states, error states, and accessibility labels on every screen.
- A full pass on phone and web, plus Profile showing your posts, bookings, RSVPs, and saved events.
- A README update and a demo script for the team that walks through each persona (Aubrey, Gavin, Maya, Nico).

**Done when:** every Release 1 acceptance criterion in the PRD can be shown on the website and in Expo Go.

## Story coverage

| Epic | Stories | Checkpoint |
|---|---|---|
| 1 Verify and Onboard | 1.1, 1.2, 1.3, 1.4 | 0, 2, 5, 7 |
| 2 Listings | 2.1, 2.2, 2.3 | 2, 3 |
| 3 Wanted | 3.1, 3.2 | 2, 6 |
| 4 Lost and Found | 4.1, 4.2, 4.3, 4.4 | 2, 6 |
| 5 Discover | 5.1, 5.2, 5.3 | 1 |
| 6 Book and Transact | 6.1 to 6.5 | 5 |
| 7 Student Events | 7.1 to 7.7 | 2, 3, 4 |
| 8 Community Feed | 8.1, 8.2 | 8 |

## Risks and notes

- **Photo blur (4.2)** is the hardest single piece to do well on both phone and web. The plan is manual blur boxes, not automatic face or text detection.
- **Reminders on web:** browsers can't send scheduled reminders reliably without a backend. On web they show in the in-app list only.
- **Data is per device** until there's a backend. Two people on two phones won't see each other's posts. The demo user switcher covers two-sided demos.
- **Current Post form:** Checkpoint 2 replaces today's simple Post form, adding category and condition for items as Story 2.1 requires.
