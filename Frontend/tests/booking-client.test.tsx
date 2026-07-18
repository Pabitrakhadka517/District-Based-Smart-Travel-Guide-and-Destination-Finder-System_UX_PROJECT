import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BookingClient } from "@/app/(user)/booking/booking-client";

const mockMutateAsync = vi.fn().mockResolvedValue({ id: "bk_new" });
const mockPush = vi.fn();
const mockReplace = vi.fn();

// Booking always starts from an existing, Ready trip plan — the URL's
// `planId` query param drives which one is selected. Tests flip this to
// exercise the picker view vs. the traveller-info form view.
let mockPlanId: string | null = null;

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => ({
    get: (key: string) => (key === "planId" ? mockPlanId : null),
  }),
}));

vi.mock("@/store/auth-store", () => ({
  useAuth: () => ({ user: { id: "u1", name: "Traveller", email: "traveller@example.com" } }),
}));

const mockPlan = {
  id: "p1",
  title: "Pokhara Getaway",
  status: "ready",
  bookingId: "",
  destinationIds: ["d1"],
  startDate: "2027-01-01",
  endDate: "2027-01-05",
  travelers: 2,
  budget: 50000,
  accommodationPreference: "Standard",
  transportPreference: "Local Bus",
};

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
  usePlans: () => ({ data: [mockPlan] }),
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
    mockPush.mockClear();
    mockReplace.mockClear();
    mockPlanId = null;
  });

  it("shows a plan picker (not a destination form) when no trip plan is selected", () => {
    render(<BookingClient />);
    expect(screen.getByText(/pokhara getaway/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirm booking/i })).not.toBeInTheDocument();
  });

  it("keeps Confirm booking disabled until required traveller fields are filled", () => {
    mockPlanId = "p1";
    render(<BookingClient />);
    expect(screen.getByRole("button", { name: /confirm booking/i })).toBeDisabled();
  });

  it("enables Confirm booking and submits tripPlanId + traveller info once required fields are filled", async () => {
    mockPlanId = "p1";
    const user = userEvent.setup();
    render(<BookingClient />);

    await user.type(screen.getByLabelText(/full name/i), "Aayushma Acharya");
    await user.type(screen.getByLabelText(/phone number/i), "9800000000");
    await user.type(screen.getByLabelText(/emergency contact name/i), "Rita Acharya");
    await user.type(screen.getByLabelText(/emergency contact number/i), "9811111111");

    const saveButton = screen.getByRole("button", { name: /confirm booking/i });
    expect(saveButton).toBeEnabled();

    await user.click(saveButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          tripPlanId: "p1",
          fullName: "Aayushma Acharya",
          phone: "9800000000",
          emergencyContactName: "Rita Acharya",
          emergencyContactNumber: "9811111111",
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
