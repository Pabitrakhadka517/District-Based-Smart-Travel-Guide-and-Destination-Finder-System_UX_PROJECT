import { BookingsAdmin } from "./bookings-admin";

// No SSR prefetch — bookings are fetched client-side with the admin's auth token.
export default function Page() {
  return <BookingsAdmin />;
}
