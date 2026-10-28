# Fizz Marketplace

A campus marketplace app built with Expo (React Native) and Expo Router. A single codebase runs on iOS, Android, and the web. The mobile layout is the main target. On web, the app currently renders as a phone-width column.

## Run it

```bash
cd app
npm install
npm start          # then press i (iOS), a (Android), or w (web)
```

- **Phone:** scan the QR code with the Expo Go app.
- **Web only:** `npm run web`
- **Typecheck:** `npm run typecheck`

## Structure

```
src/
  app/                    # Routes (every file is a screen)
    _layout.tsx           # Root stack and web phone-width frame
    (tabs)/
      _layout.tsx         # Bottom tab bar
      index.tsx           # Browse   (/)
      post.tsx            # Post     (/post)
      messages.tsx        # Messages (/messages)
      profile.tsx         # Profile / My Listings (/profile)
    listing/
      [id].tsx            # Listing detail (/listing/:id)
  components/             # Shared UI (Screen, EmptyState)
  constants/theme.ts      # Colors, spacing, radius, type sizes
```

## Status

This is the framework only. Every screen is an empty placeholder. Not built yet:

- Mock listings
- Listing detail page design
- Post page design
- Messaging
- Desktop web layout
- Backend
