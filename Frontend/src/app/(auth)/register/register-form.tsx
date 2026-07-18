"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Lock, AlertCircle, CheckCircle2, Circle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { apiPost } from "@/services/api-client";
import { useAuth } from "@/store/auth-store";
import type { User } from "@/types";

/* ── Password scoring ─────────────────────────────────────────── */
function strength(pw: string): number {
  let s = 0;
  if (pw.length >= 8)           s++;
  if (/[A-Z]/.test(pw))         s++;
  if (/[0-9]/.test(pw))         s++;
  if (/[^A-Za-z0-9]/.test(pw))  s++;
  return s;
}
const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong"] as const;
const STRENGTH_BAR   = ["", "bg-destructive", "bg-warning", "bg-forest", "bg-success"] as const;
const STRENGTH_TEXT  = ["", "text-destructive", "text-warning-foreground", "text-forest", "text-success"] as const;

const PW_REQUIREMENTS = [
  { label: "Minimum 8 characters",  test: (pw: string) => pw.length >= 8 },
  { label: "One uppercase letter",  test: (pw: string) => /[A-Z]/.test(pw) },
  { label: "One number",            test: (pw: string) => /[0-9]/.test(pw) },
  { label: "One special character", test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
] as const;

/* ── Zod schema ───────────────────────────────────────────────── */
const schema = z.object({
  name:     z.string().min(2, "Enter your full name"),
  email:    z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Minimum 8 characters")
    .refine((pw) => strength(pw) >= 2, "Password is too weak — use uppercase, numbers, or symbols"),
  terms: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms of Service" }),
  }),
});
type FormValues = z.infer<typeof schema>;

/* ── Register form ────────────────────────────────────────────── */
export function RegisterForm() {
  const router      = useRouter();
  const { setAuth } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPw,   setShowPw]   = useState(false);

  const {
    register, handleSubmit, watch,
    formState: { errors, isSubmitting, touchedFields },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const nameValue  = watch("name")     ?? "";
  const emailValue = watch("email")    ?? "";
  const pw         = watch("password") ?? "";
  const s          = strength(pw);

  const nameOk  = touchedFields.name  && nameValue.trim().length >= 2;
  const emailOk = touchedFields.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);

  const onSubmit = async (data: FormValues) => {
    setApiError(null);
    try {
      const { user } = await apiPost<{ user: User }>("/auth/register", {
        name:     data.name,
        email:    data.email,
        password: data.password,
      });
      setAuth(user);
      router.push("/dashboard");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

      {/* API-level error */}
      {apiError && <Alert variant="error">{apiError}</Alert>}

      {/* Full name */}
      <div>
        <Label htmlFor="name">Full name</Label>
        <div className="relative mt-1.5">
          <Input
            id="name"
            placeholder="Aarav Shrestha"
            className={cn("pr-9", nameOk && "border-success/60 focus-visible:ring-success/30")}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
            autoComplete="name"
            {...register("name")}
          />
          {nameOk && (
            <CheckCircle2
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-success"
              aria-hidden="true"
            />
          )}
        </div>
        {errors.name && (
          <p id="name-error" role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive">
            <AlertCircle size={11} aria-hidden="true" /> {errors.name.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <Label htmlFor="reg-email">Email address</Label>
        <div className="relative mt-1.5">
          <Input
            id="reg-email"
            type="email"
            placeholder="you@email.com"
            className={cn("pr-9", emailOk && "border-success/60 focus-visible:ring-success/30")}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "reg-email-error" : undefined}
            autoComplete="email"
            {...register("email")}
          />
          {emailOk && (
            <CheckCircle2
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-success"
              aria-hidden="true"
            />
          )}
        </div>
        {errors.email && (
          <p id="reg-email-error" role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive">
            <AlertCircle size={11} aria-hidden="true" /> {errors.email.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <Label htmlFor="reg-password">Password</Label>
        <div className="relative mt-1.5">
          <Input
            id="reg-password"
            type={showPw ? "text" : "password"}
            placeholder="••••••••"
            className="pr-11"
            aria-invalid={!!errors.password}
            aria-describedby={[
              pw ? "pw-strength" : undefined,
              pw ? "pw-requirements" : undefined,
              errors.password ? "pw-error" : undefined,
            ].filter(Boolean).join(" ") || undefined}
            autoComplete="new-password"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {showPw
              ? <EyeOff size={16} aria-hidden="true" />
              : <Eye    size={16} aria-hidden="true" />
            }
          </button>
        </div>

        {/* Strength meter */}
        {pw && (
          <div id="pw-strength" aria-live="polite" aria-atomic="true" className="mt-2">
            <div className="flex gap-1" aria-hidden="true">
              {[1, 2, 3, 4].map((n) => (
                <span
                  key={n}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors duration-200",
                    n <= s ? STRENGTH_BAR[s] : "bg-muted"
                  )}
                />
              ))}
            </div>
            {s > 0 && (
              <p className={cn("mt-1 text-xs font-medium", STRENGTH_TEXT[s])}>
                {STRENGTH_LABEL[s]}
              </p>
            )}
          </div>
        )}

        {/* Requirements list */}
        {pw && (
          <ul id="pw-requirements" className="mt-2.5 space-y-1" aria-label="Password requirements">
            {PW_REQUIREMENTS.map(({ label, test }) => {
              const met = test(pw);
              return (
                <li key={label} className={cn("flex items-center gap-1.5 text-xs", met ? "text-success" : "text-muted-foreground")}>
                  {met
                    ? <CheckCircle2 size={11} aria-hidden="true" />
                    : <Circle       size={11} aria-hidden="true" />
                  }
                  {label}
                </li>
              );
            })}
          </ul>
        )}

        {errors.password && (
          <p id="pw-error" role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive">
            <AlertCircle size={11} aria-hidden="true" /> {errors.password.message}
          </p>
        )}
      </div>

      {/* Terms — card-style */}
      <div
        className={cn(
          "rounded-xl border p-3.5 transition-colors",
          errors.terms ? "border-destructive/20 bg-destructive/5" : "border-border bg-muted/30"
        )}
      >
        <label className="flex cursor-pointer items-start gap-2.5 text-sm select-none">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-secondary"
            aria-invalid={!!errors.terms}
            aria-describedby={errors.terms ? "terms-error" : undefined}
            {...register("terms")}
          />
          <span className="text-muted-foreground leading-relaxed">
            By creating an account, you agree to our{" "}
            <Link
              href="/terms"
              className="font-medium text-brand-500 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="font-medium text-brand-500 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.terms && (
          <p id="terms-error" role="alert" className="mt-2 flex items-center gap-1 text-xs text-destructive">
            <AlertCircle size={11} aria-hidden="true" /> {errors.terms.message}
          </p>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        variant="accent"
        className="w-full"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            Creating account…
          </>
        ) : "Create account"}
      </Button>

      {/* Security note */}
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock size={11} aria-hidden="true" />
        Your data is protected with encrypted authentication
      </p>

    </form>
  );
}
