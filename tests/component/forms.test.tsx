import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const signIn = vi.fn();
vi.mock("@/features/auth/actions", () => ({
  signInAction: (...args: unknown[]) => signIn(...args),
}));

import { SignInForm } from "@/features/auth/components/sign-in-form";

describe("SignInForm", () => {
  it("validates on the client before calling the server", async () => {
    render(<SignInForm />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("shows the server's generic error without revealing which field was wrong", async () => {
    signIn.mockResolvedValueOnce({ ok: false, error: "The email or password is incorrect." });
    render(<SignInForm />);
    await userEvent.type(screen.getByLabelText(/Email/), "someone@example.com");
    await userEvent.type(screen.getByLabelText(/Password/), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The email or password is incorrect.");
    expect(signIn).toHaveBeenCalledWith(expect.objectContaining({ email: "someone@example.com" }));
  });
});
