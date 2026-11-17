# Fizz Marketplace

A campus marketplace app built with Expo (React Native) and Expo Router. A single codebase runs on iOS, Android, and the web. The mobile layout is the main target. On web, the app currently renders as a phone-width column.

## Live site

https://darioushclapp.com/fizzredesign/

- **Web build:** GitHub Pages builds the web app on every push (`.github/workflows/deploy-web.yml`).
- **Cloudflare Worker:** the Worker in `../worker` serves that build at the path above, plus the API at `/fizzredesign/api`.
- **Data:** stored in Cloudflare D1.

The build note for testers and graders is in [`../docs/BUILD_NOTE.md`](../docs/BUILD_NOTE.md).

## Run it

```bash
cd app
npm install
npm start          # then press i (iOS), a (Android), or w (web)
```

- **Phone:** scan the QR code with the Expo Go app.
- **Web only:** `npm run web`, then open the `/fizzredesign/` path it prints. The app is served under that path to match GitHub Pages.
- **Typecheck:** `npm run typecheck`

## Structure

```
src/
  app/                    # Routes (every file is a screen)
    _layout.tsx           # Root stack, sign-in gate, web phone-width frame
    welcome.tsx           # Create account / sign in
    (tabs)/
      index.tsx           # Browse: search, sections, categories, events by date
      post.tsx            # Post an item, service, or event
      messages.tsx        # Conversations with status and unread counts
      profile.tsx         # Profile, my events, my posts
    listing/[id].tsx      # Listing detail: book/request, event RSVP
    thread/[id].tsx       # Conversation + exchange (accept, meetup, paid, complete)
    profile/edit.tsx      # Photo, bio, college, Venmo
    report.tsx            # Report or block
  api/client.ts           # Typed API client
  auth/AuthProvider.tsx   # Session handling
  components/             # Shared UI (cards, time picker, buttons, chips)
  lib/                    # Formatting (Houston time), photo upload, polling
  constants/theme.ts      # Colors, spacing, type sizes
```

## Backend (`../worker`)

- **Cloudflare Worker + D1:** schema and seed data live in `worker/migrations/`.
- **Deploy:** `cd worker && npx wrangler deploy`.
- **Apply migrations:** `npx wrangler d1 migrations apply fizz-marketplace --remote`.
