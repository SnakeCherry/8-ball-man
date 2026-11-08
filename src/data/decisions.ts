import type { Decision } from '../lib/types'

/**
 * ILLUSTRATIVE ESTIMATES for an Edinburgh student, per use.
 * Prices are rounded typical fares/prices; health is our own rough 1-10 judgement
 * of movement, nutrition and stress.
 * Verify every figure against its source before presenting it as fact.
 */
export const SOURCE_NOTE =
  'Illustrative estimates for an Edinburgh student. Prices are rounded typical fares; the health score out of 10 is our own rough judgement of movement, nutrition and stress. Real numbers vary.'

export const DECISIONS: Decision[] = [
  {
    id: 'commute',
    title: 'Getting to uni',
    icon: 'bus',
    blurb: 'A 9am lecture, about 5 km away.',
    timesPerMonth: 20,
    usualId: 'bus',
    options: [
      { id: 'bus', name: 'Bus', icon: 'bus', costGBP: 1.8, timeMin: 28, health: 5 },
      { id: 'uber', name: 'Uber', icon: 'car', costGBP: 7.4, timeMin: 14, health: 2 },
      { id: 'walk', name: 'Walk', icon: 'walk', costGBP: 0, timeMin: 40, health: 9 },
    ],
  },
  {
    id: 'dinner',
    title: 'Dinner tonight',
    icon: 'plate',
    blurb: 'It is 7pm and the fridge is a mystery.',
    timesPerMonth: 12,
    usualId: 'delivery',
    options: [
      { id: 'mealdeal', name: 'Meal deal dinner', icon: 'sandwich', costGBP: 3.6, timeMin: 5, health: 4 },
      { id: 'cook', name: 'Cook from scratch', icon: 'cook', costGBP: 1.9, timeMin: 35, health: 8 },
      { id: 'delivery', name: 'Delivery', icon: 'bag', costGBP: 11.5, timeMin: 30, health: 2 },
    ],
  },
  {
    id: 'lunch',
    title: 'Lunch on campus',
    icon: 'sandwich',
    blurb: 'Forty minutes between lectures.',
    timesPerMonth: 16,
    usualId: 'canteen',
    options: [
      { id: 'mealdeal', name: 'Supermarket meal deal', icon: 'sandwich', costGBP: 3.6, timeMin: 8, health: 5 },
      { id: 'canteen', name: 'Campus canteen', icon: 'plate', costGBP: 5.8, timeMin: 15, health: 5 },
      { id: 'packed', name: 'Packed lunch', icon: 'lunchbox', costGBP: 1.6, timeMin: 12, health: 7 },
    ],
  },
  {
    id: 'coffee',
    title: 'Coffee',
    icon: 'coffee',
    blurb: 'You need to be a person by 10am.',
    timesPerMonth: 16,
    usualId: 'cafe',
    options: [
      { id: 'cafe', name: 'Café latte', icon: 'coffee', costGBP: 3.2, timeMin: 10, health: 3 },
      { id: 'union', name: 'Union coffee, own cup', icon: 'coffee', costGBP: 1.9, timeMin: 6, health: 4 },
      { id: 'home', name: 'Brew at home', icon: 'mug', costGBP: 0.3, timeMin: 12, health: 5 },
    ],
  },
  {
    id: 'foodshop',
    title: 'Weekly food shop',
    icon: 'cart',
    blurb: 'Enough to last until next Sunday.',
    timesPerMonth: 4,
    usualId: 'big',
    options: [
      { id: 'big', name: 'Big supermarket, by bus', icon: 'cart', costGBP: 32, timeMin: 75, health: 6 },
      { id: 'local', name: 'Local shops', icon: 'store', costGBP: 44, timeMin: 30, health: 8 },
      { id: 'online', name: 'Online delivery', icon: 'parcel', costGBP: 37, timeMin: 10, health: 5 },
    ],
  },
  {
    id: 'laundry',
    title: 'Laundry',
    icon: 'shirt',
    blurb: 'The basket has become structural.',
    timesPerMonth: 4,
    usualId: 'dryer',
    options: [
      { id: 'dryer', name: 'Hall wash + dryer', icon: 'washer', costGBP: 5, timeMin: 80, health: 4 },
      { id: 'airer', name: 'Wash + air dry', icon: 'shirt', costGBP: 2.5, timeMin: 50, health: 6 },
      { id: 'dropoff', name: 'Drop-off service', icon: 'bag', costGBP: 12, timeMin: 10, health: 3 },
    ],
  },
  {
    id: 'home',
    title: 'Weekend home',
    icon: 'home',
    blurb: 'About 100 miles and one packed bag.',
    timesPerMonth: 2,
    usualId: 'train',
    options: [
      { id: 'train', name: 'Train', icon: 'train', costGBP: 26, timeMin: 100, health: 6 },
      { id: 'coach', name: 'Coach', icon: 'bus', costGBP: 11, timeMin: 170, health: 4 },
      { id: 'carshare', name: 'Car share', icon: 'car', costGBP: 9, timeMin: 120, health: 4 },
    ],
  },
  {
    id: 'nightbus',
    title: 'Getting home at night',
    icon: 'moon',
    blurb: 'The party is over and the street is quiet.',
    timesPerMonth: 6,
    usualId: 'nightbus',
    options: [
      { id: 'nightbus', name: 'Night bus', icon: 'bus', costGBP: 2.5, timeMin: 35, health: 5 },
      { id: 'taxi', name: 'Taxi, split three ways', icon: 'car', costGBP: 6, timeMin: 15, health: 5 },
      { id: 'walk', name: 'Walk with friends', icon: 'walk', costGBP: 0, timeMin: 50, health: 8 },
    ],
  },
  {
    id: 'airport',
    title: 'Getting to the airport',
    icon: 'plane',
    blurb: 'Flight home for the holidays.',
    timesPerMonth: 1,
    usualId: 'taxi',
    options: [
      { id: 'tram', name: 'Tram', icon: 'tram', costGBP: 7.5, timeMin: 35, health: 6 },
      { id: 'airlink', name: 'Airport bus', icon: 'bus', costGBP: 5.5, timeMin: 40, health: 5 },
      { id: 'taxi', name: 'Taxi', icon: 'car', costGBP: 28, timeMin: 25, health: 4 },
    ],
  },
]

/** Decisions made from what someone said (see src/lib/estimate.ts). Kept apart from the presets. */
const custom = new Map<string, Decision>()
export function registerDecision(d: Decision): void {
  custom.set(d.id, d)
}

export function getDecision(id: string): Decision {
  const d = DECISIONS.find((x) => x.id === id) ?? custom.get(id)
  if (!d) throw new Error(`Unknown decision ${id}`)
  return d
}
