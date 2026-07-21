export type Category =
  | "Heritage" | "Adventure" | "Nature" | "Trekking"
  | "Religious" | "Wildlife" | "Cultural" | "Lake" | "City";

export type Season = "Spring" | "Summer" | "Autumn" | "Winter";

export interface Coordinates { lat: number; lng: number; }

/** Structured image metadata returned by the backend for every image field. */
export interface CloudinaryImage {
  url: string;
  publicId: string | null;
  alt: string;
  width?: number;
  height?: number;
  blurDataUrl?: string;
}

export interface District {
  id: string;
  slug: string;
  name: string;
  province: string;
  description: string;
  heroImage: CloudinaryImage;
  coordinates: Coordinates;
  cityCount: number;
  destinationCount: number;
  popularFor: string[];
  rating: number;
  bestSeason?: string;
  attractionCount?: number;
}


export interface BudgetEstimate {
  budget: number;
  midRange: number;
  luxury: number;
  currency: string;
}

export interface Attraction { name: string; description: string; }
export interface Restaurant { name: string; cuisine: string; priceRange: string; }

export interface Destination {
  id: string;
  slug: string;
  cityId: string;
  districtId: string;
  name: string;
  tagline: string;
  description: string;
  category: Category;
  tags: string[];
  heroImage: CloudinaryImage;
  gallery: CloudinaryImage[];
  coordinates: Coordinates;
  rating: number;
  reviewCount: number;
  bestTimeToVisit: Season[];
  budget: BudgetEstimate;
  attractions: Attraction[];
  activities: string[];
  restaurants: Restaurant[];
  localFoods: string[];
  travelTips: string[];
  pros: string[];
  cons: string[];
  nearby: string[];
  featured: boolean;
  trending: boolean;
  difficulty?: Difficulty;
  recommendedDuration?: string;
}

export interface WeatherInsight {
  condition: "Sunny" | "Clear" | "Cloudy" | "Rain" | "Snow";
  currentTemp: number;
  isIdealSeason: boolean;
  visitAdvice: "Go now" | "Good time" | "Off-season" | "Avoid";
  message: string;
  bestMonths: string[];
}

export interface Review {
  id: string;
  destinationId: string;
  userId?: string;
  author: string;
  avatar: CloudinaryImage;
  rating: number;
  title: string;
  body: string;
  date: string;
  helpful: number;
  status: "approved" | "pending" | "rejected";
  photos?: CloudinaryImage[];
  verifiedTraveler?: boolean;
}

export interface RatingBreakdown {
  star: number;
  count: number;
  pct: number;
}

export interface WeatherDay {
  day: string;
  condition: "Sunny" | "Cloudy" | "Rain" | "Snow" | "Clear";
  high: number;
  low: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: CloudinaryImage;
  role: "user" | "admin";
  joinedAt: string;
  lastLogin: string;
  isActive: boolean;
}

export type TravelType =
  | "Adventure" | "Trekking" | "Cultural" | "Religious"
  | "Family" | "Wildlife" | "Luxury" | "Budget";

export interface TripActivity {
  id: string;
  time: string;
  title: string;
  type: "destination" | "attraction" | "trek" | "custom";
  destinationId: string;
  location?: string;
  notes: string;
  visited?: boolean;
  /** True for an auto-generated itinerary suggestion the user hasn't edited yet. */
  suggested?: boolean;
}

export interface TripDay {
  id: string;
  day: number;
  date: string;
  title: string;
  activities: TripActivity[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  category: string;
}

export interface BudgetBreakdown {
  accommodation: number;
  food: number;
  transportation: number;
  activities: number;
  other: number;
}

export interface TripPlan {
  id: string;
  title: string;
  travelType: TravelType;
  travelers: number;
  /** The single district this trip's discovery/recommendations are scoped to; "" if not chosen. */
  districtId: string;
  destinationIds: string[];
  attractionIds: string[];
  trekIds: string[];
  startDate: string;
  endDate: string;
  budget: number;
  budgetBreakdown: BudgetBreakdown;
  accommodationPreference: AccommodationType;
  transportPreference: TransportPreference;
  /** id of the Booking created from this plan, "" if not yet booked */
  bookingId: string;
  status: "draft" | "planned" | "ready" | "booked" | "ongoing" | "completed" | "cancelled";
  notes: string;
  itinerary: TripDay[];
  checklist: ChecklistItem[];
  photos: CloudinaryImage[];
}

export type Difficulty = "Easy" | "Moderate" | "Challenging" | "Strenuous";

export interface TrekDay { day: number; title: string; detail: string; altitude: number; hours: string; }

export interface Trek {
  id: string;
  slug: string;
  name: string;
  region: string;
  tagline: string;
  description: string;
  heroImage: CloudinaryImage;
  gallery: CloudinaryImage[];
  difficulty: Difficulty;
  durationDays: number;
  maxAltitude: number;
  distanceKm: number;
  bestSeasons: Season[];
  permits: string[];
  highlights: string[];
  itinerary: TrekDay[];
  coordinates: Coordinates;
  rating: number;
  priceFrom: number;
  featured: boolean;
  districtIds: string[];
}

export interface Festival {
  id: string;
  slug: string;
  name: string;
  month: string;
  season: Season;
  type: "Religious" | "Cultural" | "Harvest" | "National";
  description: string;
  image: CloudinaryImage;
  where: string;
  duration: string;
  coordinates: Coordinates;
  districtId?: string;
  isNationwide: boolean;
}

export interface TravelAlert {
  id: string;
  level: "Info" | "Advisory" | "Warning";
  text: string;
  districtId?: string;
  isActive: boolean;
}

export interface PackingChecklist {
  id: string;
  category: string;
  items: string[];
}

export type AttractionCategory =
  | "Religious Sites" | "Historical Sites" | "Natural Attractions"
  | "Lakes & Rivers" | "Mountains & Trekking Routes" | "Adventure Activities"
  | "Cultural Heritage Sites" | "Viewpoints" | "National Parks & Wildlife"
  | "Local Experiences";

export interface EntryFee { nepali: number; saarc: number; foreigner: number; currency: string; }
export interface NearbyHotel { name: string; stars: number; priceRange: string; }
export interface NearbyRestaurant { name: string; cuisine: string; priceRange: string; }

export interface TouristAttraction {
  id: string;
  slug: string;
  districtId: string;
  name: string;
  category: AttractionCategory;
  tagline: string;
  description: string;
  history: string;
  heroImage: CloudinaryImage;
  gallery: CloudinaryImage[];
  coordinates: Coordinates;
  rating: number;
  reviewCount: number;
  openingHours: string;
  entryFee: EntryFee;
  bestTimeToVisit: string[];
  activities: string[];
  localFoods: string[];
  travelTips: string[];
  nearbyAttractions: string[];
  nearbyHotels: NearbyHotel[];
  nearbyRestaurants: NearbyRestaurant[];
  featured: boolean;
  trending: boolean;
}

export interface ActivityEvent {
  type: "trip_planned" | "trip_ongoing" | "trip_completed" | "review_written";
  date: string;
  tripTitle?: string;
  destinationCount?: number;
  destinationName?: string;
  destinationSlug?: string;
  rating?: number;
}

export type AccommodationType = "Budget" | "Standard" | "Luxury";
export type TransportPreference = "Local Bus" | "Private Jeep" | "Domestic Flight";

export interface Booking {
  id: string;
  userId?: string;
  tripPlanId: string;
  destinationId: string;
  destinationIds: string[];
  travelDate: string;
  returnDate: string;
  travelers: number;
  budget: number;
  accommodationType: AccommodationType;
  transportPreference: TransportPreference;
  estimatedCost: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes: string;
  fullName: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  email: string;
  nationality: string;
  passportNumber: string;
  medicalInfo: string;
  specialRequirements: string;
  createdAt: string;
  updatedAt: string;
}

/** Response shape of GET /admin/bookings/:id — the booking joined with its
 *  owning user and destination (+ district/city names) for the Admin Panel's
 *  booking-details view. Either join can be null if the referenced doc was
 *  since deleted, even though the booking itself always survives. */
export interface BookingDetail {
  booking: Booking;
  user: User | null;
  destination: (Destination & {
    district: { id: string; name: string } | null;
    city: { id: string; name: string } | null;
  }) | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: "booking_confirmed" | "booking_cancelled" | "trip_ready" | "booking_pending" | "review_pending";
  message: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export interface GuideArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: "Tips" | "Itineraries" | "Culture" | "Food" | "Trekking";
  cover: CloudinaryImage;
  author: string;
  authorAvatar: CloudinaryImage;
  date: string;
  readMinutes: number;
  tags: string[];
  body: string[];
  featured: boolean;
  coordinates: Coordinates;
  districtId?: string;
}
