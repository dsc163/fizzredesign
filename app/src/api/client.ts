// Typed client for the Fizz Marketplace API (Cloudflare Worker at
// darioushclapp.com/fizzredesign/api). The session token is kept on the device.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const PROD_ORIGIN = 'https://darioushclapp.com';
const BASE_PATH = '/fizzredesign/api';
const TOKEN_KEY = 'fizz.sessionToken';

// The website is served from the same origin as the API, except when it's
// opened from the GitHub Pages copy or on a phone, which call the live API.
function apiOrigin() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.endsWith('darioushclapp.com') || host.endsWith('workers.dev')) return '';
  }
  return PROD_ORIGIN;
}

export function resolveUrl(path: string | null | undefined) {
  if (!path) return null;
  return path.startsWith('/') ? `${apiOrigin() || ''}${path}` : path;
}

// ---------- types ----------

export type Prefs = { remindDay: boolean; remindHour: boolean };

export type PaymentKey = 'venmo' | 'cashapp' | 'zelle' | 'paypal' | 'applepay';
export type Payments = Partial<Record<PaymentKey, string>>;

export type User = {
  id: string;
  email: string;
  name: string;
  college: string | null;
  bio: string | null;
  photo: string | null;
  payments: Payments;
  interests: string[] | null;
  prefs: Prefs;
};

export type PostType = 'item' | 'service' | 'event' | 'wanted' | 'lost' | 'found';
export type PriceOption = { label: string; price: number };

export type Author =
  | { kind: 'profile'; userId: string; name: string; college: string | null; bio: string | null; photo: string | null; verified: boolean }
  | { kind: 'host'; name: string; verified: boolean }
  | { kind: 'anonymous'; name: string; verified: boolean };

export type EventDetails = {
  starts_at?: number;
  ends_at?: number;
  host_name?: string;
  host_verified?: number;
  area?: string;
  address?: string | null;
  location_hidden?: boolean;
  location_note?: string;
  visibility?: 'public' | 'rsvp' | 'reveal';
  reveal_at?: number | null;
  entry?: string;
  tags?: string[];
  rsvps?: number;
  my_going?: boolean;
  named_rsvps?: boolean;
};

export type Stats = { likes: number; liked: boolean; saved: boolean; comments: number };

export type Comment = {
  id: string;
  body: string;
  photo: string | null;
  createdAt: number;
  mine: boolean;
  author: string;
};

export type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: number;
};

export type EventUpdate = { id: string; body: string; createdAt: number };

export type Listing = {
  id: string;
  type: PostType;
  title: string;
  description: string;
  price: number | null;
  priceOptions: PriceOption[];
  category: string | null;
  condition: string | null;
  photos: string[];
  details: EventDetails & { needed_by?: number; last_seen?: string; found_at?: string };
  status: 'active' | 'paused' | 'sold';
  createdAt: number;
  isMine: boolean;
  author: Author;
  stats: Stats;
};

export type ThreadStatus = 'open' | 'requested' | 'accepted' | 'declined' | 'completed';

export type Counterpart = {
  id: string;
  revealed: boolean;
  name: string;
  college: string | null;
  bio: string | null;
  photo: string | null;
  payments: Payments;
};

export type Message = { id: string; body: string; system: boolean; mine: boolean; createdAt: number };

export type Thread = {
  id: string;
  role: 'buyer' | 'seller';
  status: ThreadStatus;
  listing: Pick<Listing, 'id' | 'type' | 'title' | 'photos' | 'category' | 'price' | 'priceOptions' | 'status'>;
  optionLabel: string | null;
  price: number | null;
  proposedTime: number | null;
  proposedBy: 'buyer' | 'seller' | null;
  meetupSpot: string | null;
  buyerPaid: boolean;
  sellerComplete: boolean;
  completedAt: number | null;
  updatedAt: number;
  counterpart: Counterpart;
  iShared: boolean;
  unread: number;
  lastMessage: { body: string; system: boolean; mine: boolean; createdAt: number } | null;
  messages?: Message[];
};

export type ListingResponse = {
  listing: Listing;
  myThread: { id: string; status: ThreadStatus } | null;
  updates: EventUpdate[];
  comments: Comment[];
  attendees: { name: string; photo: string | null }[] | null;
};

// ---------- transport ----------

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

let token: string | null = null;
let onUnauthorized: (() => void) | null = null;

export async function loadToken() {
  try {
    token = await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    token = null;
  }
  return token;
}

export async function setToken(value: string | null) {
  token = value;
  try {
    if (value) await AsyncStorage.setItem(TOKEN_KEY, value);
    else await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage can be unavailable (e.g. private browsing); the session still works until reload.
  }
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiOrigin()}${BASE_PATH}${path}`, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Could not reach Fizz. Check your connection and try again.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && token) onUnauthorized?.();
    throw new ApiError(response.status, (data as { error?: string }).error || 'Something went wrong.');
  }
  return data as T;
}

// ---------- endpoints ----------

export const api = {
  signup: (input: { name: string; email: string; password: string; college?: string }) =>
    request<{ token: string; user: User }>('POST', '/auth/signup', input),
  login: (input: { email: string; password: string }) =>
    request<{ token: string; user: User }>('POST', '/auth/login', input),
  logout: () => request<{ ok: true }>('POST', '/auth/logout'),
  me: () => request<{ user: User }>('GET', '/me'),
  updateMe: (input: Partial<Omit<User, 'id' | 'email' | 'prefs'>> & { prefs?: Partial<Prefs> }) =>
    request<{ user: User }>('PATCH', '/me', input),
  badges: () => request<{ notifications: number; messages: number }>('GET', '/me/badges'),
  saved: () => request<{ listings: Listing[] }>('GET', '/me/saved'),
  notifications: () => request<{ notifications: Notification[] }>('GET', '/notifications'),
  markNotificationsRead: () => request<{ ok: true }>('POST', '/notifications/read'),
  myListings: () => request<{ listings: Listing[] }>('GET', '/me/listings'),

  uploadImage: (data: string, mime: string) => request<{ url: string }>('POST', '/images', { data, mime }),

  listings: (params: { section?: string; category?: string | null; q?: string }) => {
    const query = new URLSearchParams();
    if (params.section) query.set('section', params.section);
    if (params.category) query.set('category', params.category);
    if (params.q) query.set('q', params.q);
    return request<{ listings: Listing[] }>('GET', `/listings?${query}`);
  },
  listing: (id: string) => request<ListingResponse>('GET', `/listings/${id}`),
  rsvp: (id: string, going: boolean) => request<ListingResponse>('POST', `/listings/${id}/rsvp`, { going }),
  like: (id: string, liked: boolean) => request<ListingResponse>('POST', `/listings/${id}/like`, { liked }),
  save: (id: string, saved: boolean) => request<ListingResponse>('POST', `/listings/${id}/save`, { saved }),
  comment: (id: string, body: string, photo?: string | null) =>
    request<ListingResponse>('POST', `/listings/${id}/comments`, { body, photo }),
  deleteComment: (id: string, commentId: string) =>
    request<ListingResponse>('DELETE', `/listings/${id}/comments/${commentId}`),
  postUpdate: (id: string, body: string) => request<ListingResponse>('POST', `/listings/${id}/updates`, { body }),
  myEvents: () => request<{ listings: Listing[] }>('GET', '/me/events'),
  createListing: (input: Record<string, unknown>) => request<{ listing: Listing }>('POST', '/listings', input),
  removeListing: (id: string) => request<{ ok: true }>('DELETE', `/listings/${id}`),
  setListingStatus: (id: string, status: Listing['status']) =>
    request<{ listing: Listing }>('PATCH', `/listings/${id}`, { status }),

  threads: () => request<{ threads: Thread[] }>('GET', '/threads'),
  startThread: (listingId: string) => request<{ thread: { id: string } }>('POST', '/threads', { listingId }),
  thread: (id: string) => request<{ thread: Thread }>('GET', `/threads/${id}`),
  shareContact: (id: string) => request<{ thread: Thread }>('POST', `/threads/${id}/share`),
  sendMessage: (id: string, body: string) => request<{ thread: Thread }>('POST', `/threads/${id}/messages`, { body }),
  requestThread: (id: string, input: { proposedTime: number | null; optionLabel?: string | null; note?: string }) =>
    request<{ thread: Thread }>('POST', `/threads/${id}/request`, input),
  respond: (id: string, action: 'accept' | 'decline' | 'suggest', proposedTime?: number) =>
    request<{ thread: Thread }>('POST', `/threads/${id}/respond`, { action, proposedTime }),
  setMeetup: (id: string, spot: string) => request<{ thread: Thread }>('POST', `/threads/${id}/meetup`, { spot }),
  markPaid: (id: string) => request<{ thread: Thread }>('POST', `/threads/${id}/paid`),
  markComplete: (id: string) => request<{ thread: Thread }>('POST', `/threads/${id}/complete`),

  report: (input: { threadId?: string; listingId?: string; reason: string; details?: string; block: boolean }) =>
    request<{ ok: true; blocked: boolean }>('POST', '/reports', input),
};
