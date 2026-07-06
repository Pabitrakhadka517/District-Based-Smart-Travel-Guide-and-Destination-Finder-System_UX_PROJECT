import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BookingClient } from "@/app/(user)/booking/booking-client";

const mockMutateAsync = vi.fn().mockResolvedValue({});

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

// This route requires auth via middleware.ts, so BookingClient no longer
// checks login state itself — nothing to mock for @/store/auth-store here.

vi.mock("@/hooks/use-content", () => ({
  useDestinations: () => ({
    data: [
      {
        id: "d1",
        name: "Pokhara",
        tagline: "City of lakes",
        districtId: "district-1",
        heroImage: { url: "", publicId: null, alt: "" },
      },
    ],
  }),
  useGuides: () => ({ data: [] }),
  useBookings: () => ({ data: [] }),
  useCreateBooking: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
    isError: false,
    error: null,
  }),
  useCancelBooking: () => ({ mutate: vi.fn(), isPending: false }),
}));

describe("BookingClient", () => {
  beforeEach(() => {
    mockMutateAsync.mockClear();
  });

  it("keeps Save booking disabled until a destination and travel date are chosen", () => {
    render(<BookingClient />);
    expect(screen.getByRole("button", { name: /save booking/i })).toBeDisabled();
  });

  it("enables Save booking and submits the right payload once the form is filled in", async () => {
    const user = userEvent.setup();
    render(<BookingClient />);

    await user.selectOptions(screen.getByRole("combobox"), "d1");
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2027-01-01" } });

    const saveButton = screen.getByRole("button", { name: /save booking/i });
    expect(saveButton).toBeEnabled();

    await user.click(saveButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          destinationId: "d1",
          travelDate: "2027-01-01",
          travelers: 2,
          accommodationType: "Standard",
          transportPreference: "Local Bus",
        })
      );
    });
  });

  it("shows the Your bookings section once mounted (this route is always authenticated)", async () => {
    render(<BookingClient />);
    expect(await screen.findByText(/your bookings/i)).toBeInTheDocument();
  });
});
