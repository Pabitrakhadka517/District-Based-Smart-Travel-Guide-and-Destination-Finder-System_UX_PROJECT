"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Lock, AlertCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { apiPost } from "@/services/api-client";
import { useAuth } from "@/store/auth-store";
import type { User } from "@/types";

const schema = z.object({
  email:      z.string().email("Enter a valid email address"),
  password:   z.string().min(1, "Enter your password"),
  rememberMe: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

function mapError(raw: string): string {
  if (!raw) return "Something went wrong. Please try again.";
  if (/invalid|incorrect|wrong|credential|password|email/i.test(raw))
    return "Incorrect email or password. Please try again.";
  if (/locked|too many|rate.?limit/i.test(raw))
    return "Too many failed attempts. Please wait a moment and try again.";
  if (/network|fetch|connect/i.test(raw))
    return "Connection error. Check your internet connection and try again.";
  return raw;
}

export function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { setAuth }  = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPw,   setShowPw]   = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rememberMe: false },
  });

  const onSubmit = async (data: FormValues) => {
    setApiError(null);
    try {
      const { user } = await apiPost<{ user: User }>(
        "/auth/login",
        { email: data.email, password: data.password, rememberMe: data.rememberMe ?? false }
      );
      setAuth(user, data.rememberMe ?? false);
      const raw = searchParams.get("redirect") ?? "";
      const safeRedirect = raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
      router.push(safeRedirect ?? (user.role === "admin" ? "/admin" : "/dashboard"));
    } catch (err) {
      setApiError(mapError(err instanceof Error ? err.message : "Login failed"));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

      {/* API-level error */}
      {apiError && <Alert variant="error">{apiError}</Alert>}

      {/* Email */}
      <div>
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@email.com"
          className="mt-1.5"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive">
            <AlertCircle size={11} aria-hidden="true" /> {errors.email.message}
          </p>
        )}
      </div>

      {/* Password — with show/hide toggle and inline forgot link */}
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-brand-500 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative mt-1.5">
          <Input
            id="password"
            type={showPw ? "text" : "password"}
            placeholder="••••••••"
            className="pr-11"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            autoComplete="current-password"
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
        {errors.password && (
          <p id="password-error" role="alert" className="mt-1 flex items-center gap-1 text-xs text-destructive">
            <AlertCircle size={11} aria-hidden="true" /> {errors.password.message}
          </p>
        )}
      </div>

      {/* Remember me */}
      <label className="flex cursor-pointer items-center gap-2.5 text-sm select-none">
        <input
          type="checkbox"
          className="h-4 w-4 accent-secondary"
          aria-label="Stay signed in for 30 days"
          {...register("rememberMe")}
        />
        <span className="text-muted-foreground">
          Remember me{" "}
          <span className="text-xs text-muted-foreground/70">for 30 days</span>
        </span>
      </label>

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
            Signing in…
          </>
        ) : "Log in"}
      </Button>

      {/* Security note */}
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock size={11} aria-hidden="true" />
        Secured with encrypted authentication
      </p>

    </form>
  );
}
