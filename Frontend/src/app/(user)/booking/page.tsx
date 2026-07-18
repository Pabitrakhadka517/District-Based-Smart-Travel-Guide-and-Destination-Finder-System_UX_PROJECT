import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingClient } from "./booking-client";

export const metadata: Metadata = { title: "Booking", description: "Book a trip you've already planned — pick a ready trip plan, confirm traveller details, and get an instant cost estimate." };

export default function BookingPage() {
  return (
    <Suspense>
      <BookingClient />
    </Suspense>
  );
}
