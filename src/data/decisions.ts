import type { Decision } from '../lib/types'

/**
 * ILLUSTRATIVE ESTIMATES for an Edinburgh student, per use.
 * Prices are rounded typical fares/prices; CO2 is approximated from the UK
 * Government (DESNZ/DEFRA) greenhouse gas conversion factors.
 * Verify every figure against its source before presenting it as fact.
 */
export const SOURCE_NOTE =
  'Illustrative estimates for an Edinburgh student. Prices are rounded typical fares; CO₂ is approximated from UK Government (DESNZ/DEFRA) greenhouse gas conversion factors. Real numbers vary.'

export const DECISIONS: Decision[] = [
  {
    id: 'commute',
    title: 'Getting to uni',
    emoji: '🚌',
    blurb: 'A 9am lecture, about 5 km away.',
    timesPerMonth: 20,
    usualId: 'bus',
    options: [
      { id: 'bus', name: 'Bus', emoji: '🚌', costGBP: 1.8, timeMin: 28, co2Kg: 0.6 },
      { id: 'uber', name: 'Uber', emoji: '🚕', costGBP: 7.4, timeMin: 14, co2Kg: 1.7 },
      { id: 'walk', name: 'Walk', emoji: '🚶', costGBP: 0, timeMin: 40, co2Kg: 0 },
    ],
  },
  {
    id: 'dinner',
    title: 'Dinner tonight',
    emoji: '🍝',
    blurb: 'It is 7pm and the fridge is a mystery.',
    timesPerMonth: 12,
    usualId: 'delivery',
    options: [
      { id: 'mealdeal', name: 'Meal deal dinner', emoji: '🥪', costGBP: 3.6, timeMin: 5, co2Kg: 1.1 },
      { id: 'cook', name: 'Cook from scratch', emoji: '🍳', costGBP: 1.9, timeMin: 35, co2Kg: 1.5 },
      { id: 'delivery', name: 'Delivery', emoji: '🛵', costGBP: 11.5, timeMin: 30, co2Kg: 2.6 },
    ],
  },
  {
    id: 'lunch',
    title: 'Lunch on campus',
    emoji: '🥗',
    blurb: 'Forty minutes between lectures.',
    timesPerMonth: 16,
    usualId: 'canteen',
    options: [
      { id: 'mealdeal', name: 'Supermarket meal deal', emoji: '🥪', costGBP: 3.6, timeMin: 8, co2Kg: 0.8 },
      { id: 'canteen', name: 'Campus canteen', emoji: '🍽️', costGBP: 5.8, timeMin: 15, co2Kg: 1.8 },
      { id: 'packed', name: 'Packed lunch', emoji: '🥡', costGBP: 1.6, timeMin: 12, co2Kg: 0.9 },
    ],
  },
  {
    id: 'coffee',
    title: 'Coffee',
    emoji: '☕',
    blurb: 'You need to be a person by 10am.',
    timesPerMonth: 16,
    usualId: 'cafe',
    options: [
      { id: 'cafe', name: 'Café latte', emoji: '☕', costGBP: 3.2, timeMin: 10, co2Kg: 0.4 },
      { id: 'union', name: 'Union coffee, own cup', emoji: '🥤', costGBP: 1.9, timeMin: 6, co2Kg: 0.3 },
      { id: 'home', name: 'Brew at home', emoji: '🫖', costGBP: 0.3, timeMin: 12, co2Kg: 0.1 },
    ],
  },
  {
    id: 'foodshop',
    title: 'Weekly food shop',
    emoji: '🛒',
    blurb: 'Enough to last until next Sunday.',
    timesPerMonth: 4,
    usualId: 'big',
    options: [
      { id: 'big', name: 'Big supermarket, by bus', emoji: '🛒', costGBP: 32, timeMin: 75, co2Kg: 2 },
      { id: 'local', name: 'Local shops', emoji: '🏪', costGBP: 44, timeMin: 30, co2Kg: 1.2 },
      { id: 'online', name: 'Online delivery', emoji: '📦', costGBP: 37, timeMin: 10, co2Kg: 1.8 },
    ],
  },
  {
    id: 'laundry',
    title: 'Laundry',
    emoji: '🧺',
    blurb: 'The basket has become structural.',
    timesPerMonth: 4,
    usualId: 'dryer',
    options: [
      { id: 'dryer', name: 'Hall wash + dryer', emoji: '🌀', costGBP: 5, timeMin: 80, co2Kg: 2.4 },
      { id: 'airer', name: 'Wash + air dry', emoji: '👕', costGBP: 2.5, timeMin: 50, co2Kg: 0.6 },
      { id: 'dropoff', name: 'Drop-off service', emoji: '🧼', costGBP: 12, timeMin: 10, co2Kg: 2.8 },
    ],
  },
  {
    id: 'home',
    title: 'Weekend home',
    emoji: '🏠',
    blurb: 'About 100 miles and one packed bag.',
    timesPerMonth: 2,
    usualId: 'train',
    options: [
      { id: 'train', name: 'Train', emoji: '🚆', costGBP: 26, timeMin: 100, co2Kg: 4.1 },
      { id: 'coach', name: 'Coach', emoji: '🚌', costGBP: 11, timeMin: 170, co2Kg: 2.4 },
      { id: 'carshare', name: 'Car share', emoji: '🚗', costGBP: 9, timeMin: 120, co2Kg: 7.5 },
    ],
  },
  {
    id: 'nightbus',
    title: 'Getting home at night',
    emoji: '🌙',
    blurb: 'The party is over and the street is quiet.',
    timesPerMonth: 6,
    usualId: 'nightbus',
    options: [
      { id: 'nightbus', name: 'Night bus', emoji: '🚌', costGBP: 2.5, timeMin: 35, co2Kg: 0.5 },
      { id: 'taxi', name: 'Taxi, split three ways', emoji: '🚕', costGBP: 6, timeMin: 15, co2Kg: 1.1 },
      { id: 'walk', name: 'Walk with friends', emoji: '🚶', costGBP: 0, timeMin: 50, co2Kg: 0 },
    ],
  },
  {
    id: 'airport',
    title: 'Getting to the airport',
    emoji: '✈️',
    blurb: 'Flight home for the holidays.',
    timesPerMonth: 1,
    usualId: 'taxi',
    options: [
      { id: 'tram', name: 'Tram', emoji: '🚊', costGBP: 7.5, timeMin: 35, co2Kg: 0.3 },
      { id: 'airlink', name: 'Airport bus', emoji: '🚌', costGBP: 5.5, timeMin: 40, co2Kg: 0.5 },
      { id: 'taxi', name: 'Taxi', emoji: '🚕', costGBP: 28, timeMin: 25, co2Kg: 3.2 },
    ],
  },
]

export function getDecision(id: string): Decision {
  const d = DECISIONS.find((x) => x.id === id)
  if (!d) throw new Error(`Unknown decision ${id}`)
  return d
}
