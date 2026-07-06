import type { Metadata } from "next";
import { BookingClient } from "./booking-client";

export const metadata: Metadata = { title: "Booking", description: "Book your trip — pick a destination, travel date, and get an instant cost estimate." };

export default function BookingPage() {
  return <BookingClient />;
}
