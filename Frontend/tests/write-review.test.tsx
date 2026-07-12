import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { WriteReview } from "@/app/(public)/destinations/[slug]/write-review";

const mockMutateAsync = vi.fn().mockResolvedValue({});
let mockUser: { id: string } | null = { id: "u1" };
let mockPlans: { destinationIds: string[] }[] = [{ destinationIds: ["d1"] }];

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock("@/store/auth-store", () => ({
  useAuth: () => ({ user: mockUser, hasHydrated: true }),
}));

vi.mock("@/hooks/use-content", () => ({
  useCreateReview: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
  usePlans: () => ({ data: mockPlans, isLoading: false }),
}));

vi.mock("@/components/dashboard/image-uploader", () => ({
  GalleryUploader: () => <div data-testid="gallery-uploader" />,
}));

describe("WriteReview", () => {
  beforeEach(() => {
    mockMutateAsync.mockClear();
    mockUser = { id: "u1" };
    mockPlans = [{ destinationIds: ["d1"] }];
  });

  it("prompts sign-in when the user is logged out", () => {
    mockUser = null;
    render(<WriteReview destinationId="d1" destinationName="Pokhara" />);
    expect(screen.getByText(/sign in to share your experience/i)).toBeInTheDocument();
  });

  it("prompts adding a trip plan when logged in but this destination isn't in one", () => {
    mockPlans = [{ destinationIds: ["some-other-destination"] }];
    render(<WriteReview destinationId="d1" destinationName="Pokhara" />);
    expect(screen.getByText(/add pokhara to a trip plan/i)).toBeInTheDocument();
  });

  it("keeps Submit review disabled when the review body is under 20 characters", async () => {
    const user = userEvent.setup();
    render(<WriteReview destinationId="d1" destinationName="Pokhara" />);

    await user.click(screen.getByRole("button", { name: /write a review for pokhara/i }));
    await user.type(screen.getByLabelText(/your experience/i), "too short");

    expect(screen.getByRole("button", { name: /submit review/i })).toBeDisabled();
    expect(screen.getByText(/at least 20 characters required/i)).toBeInTheDocument();
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it("submits a valid review with the chosen rating and body", async () => {
    const user = userEvent.setup();
    render(<WriteReview destinationId="d1" destinationName="Pokhara" />);

    await user.click(screen.getByRole("button", { name: /write a review for pokhara/i }));
    await user.click(screen.getByRole("button", { name: /rate 4 stars/i }));
    await user.type(
      screen.getByLabelText(/your experience/i),
      "Absolutely stunning views and a very peaceful atmosphere."
    );
    await user.click(screen.getByRole("button", { name: /submit review/i }));

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        destinationId: "d1",
        rating: 4,
        body: "Absolutely stunning views and a very peaceful atmosphere.",
      })
    );
    expect(await screen.findByText(/review submitted/i)).toBeInTheDocument();
  });
});
