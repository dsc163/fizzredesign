// Mock database. Listings live in listings.json until there is a backend;
// screens should only read data through these functions so the source can
// be swapped later without touching the UI.

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
  category: Category;
  condition: Condition;
  description: string;
  seller: string;
  postedAt: string; // ISO 8601
  images: string[];
};

const listings = listingsData as Listing[];

export function getListings(): Listing[] {
  return [...listings].sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}

export function getListing(id: string): Listing | undefined {
  return listings.find((listing) => listing.id === id);
}
