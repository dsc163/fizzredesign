// Mock database. Seed listings live in listings.json until there is a
// backend; listings posted in the app are kept in memory and are lost when
// the app reloads. Screens should only read and write data through these
// functions so the source can be swapped later without touching the UI.

import { useSyncExternalStore } from 'react';

import listingsData from './listings.json';

export type Category =
  | 'Textbooks'
  | 'Furniture'
  | 'Electronics'
  | 'Clothing'
  | 'Bikes'
  | 'Tickets'
  | 'Dorm';

export type Condition = 'New' | 'Like new' | 'Good' | 'Fair';

export type Listing = {
  id: string;
  title: string;
  price: number;
  category?: Category;
  condition?: Condition;
  description: string;
  seller: string;
  postedAt: string; // ISO 8601
  images: string[];
};

export type NewListing = Pick<Listing, 'title' | 'price' | 'description' | 'images'>;

let listings = sortNewestFirst(listingsData as Listing[]);
const listeners = new Set<() => void>();

function sortNewestFirst(items: Listing[]) {
  return [...items].sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getListings(): Listing[] {
  return listings;
}

export function getListing(id: string): Listing | undefined {
  return listings.find((listing) => listing.id === id);
}

export function addListing(input: NewListing): Listing {
  const listing: Listing = {
    ...input,
    id: `local-${Date.now()}`,
    seller: 'You',
    postedAt: new Date().toISOString(),
  };
  listings = sortNewestFirst([listing, ...listings]);
  listeners.forEach((listener) => listener());
  return listing;
}

// Re-renders the caller whenever a listing is added.
export function useListings(): Listing[] {
  return useSyncExternalStore(subscribe, getListings, getListings);
}
