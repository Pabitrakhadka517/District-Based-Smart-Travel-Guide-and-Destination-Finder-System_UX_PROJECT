"use client";
import { useState, useEffect } from "react";
import { Bell, Lock, Palette, Globe, Shield, Loader2, CheckCircle2, Monitor, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useChangePassword, useLogout, useLogoutAll } from "@/hooks/use-content";
import { useSettings, type Theme } from "@/store/settings-store";

const tabs = [
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "theme", label: "Theme", icon: Palette },
  { id: "language", label: "Language", icon: Globe },
  { id: "security", label: "Security", icon: Lock },
] as const;

type TabId = (typeof tabs)[number]["id"];

function Toggle({
  label,
  checked,
  onChange,
  id,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <label htmlFor={id} className="text-sm text-foreground">{label}</label>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn("relative h-6 w-11 rounded-full transition", checked ? "bg-success" : "bg-muted")}
      >
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", checked ? "left-[22px]" : "left-0.5")} />
        <span className="sr-only">{label}</span>
      </button>
    </div>
  );
}

function SecurityTab() {
  const changePassword = useChangePassword();
  const logout = useLogout();
  const logoutAll = useLogoutAll();

  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const handleChangePassword = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPw.length < 8) return setError("New password must be at least 8 characters.");
    if (newPw !== confirm) return setError("Passwords do not match.");
    try {
      await changePassword.mutateAsync({ currentPassword: current, newPassword: newPw });
      setSuccess(true);
      setCurrent(""); setNewPw(""); setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    }
  };

  return (
    <div role="tabpanel" id="tabpanel-security" aria-labelledby="tab-security">
      <h2 className="font-display font-semibold text-brand-600">Security</h2>
      <form onSubmit={handleChangePassword} className="mt-4 max-w-sm space-y-4">
        <div>
          <Label htmlFor="cur-pw">Current password</Label>
          <Input id="cur-pw" type="password" className="mt-1" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="new-pw">New password</Label>
          <Input id="new-pw" type="password" className="mt-1" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="confirm-pw">Confirm new password</Label>
          <Input id="confirm-pw" type="password" className="mt-1" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {success && (
          <p className="flex items-center gap-1.5 text-xs text-success">
            <CheckCircle2 size={14} /> Password updated. You have been logged out of other devices.
          </p>
        )}
        <Button
          type="submit"
          variant="accent"
          disabled={changePassword.isPending || !current || !newPw || !confirm}
        >
          {changePassword.isPending ? <><Loader2 size={14} className="animate-spin" /> Updating…</> : "Update password"}
        </Button>
      </form>

      <div className="mt-8 border-t border-border pt-6">
        <h3 className="text-sm font-semibold text-brand-600">Sessions</h3>
        <p className="mt-1 text-xs text-muted-foreground">Manage your active login sessions across all devices.</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={() => logout.mutate()} disabled={logout.isPending}>
            {logout.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            Log out this device
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:border-destructive/40"
            onClick={() => logoutAll.mutate()}
            disabled={logoutAll.isPending}
          >
            {logoutAll.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
            Log out all devices
          </Button>
        </div>
      </div>
    </div>
  );
}

const THEMES: { id: Theme; label: string; icon: React.ElementType }[] = [
  { id: "light",  label: "Light",  icon: Sun     },
  { id: "dark",   label: "Dark",   icon: Moon    },
  { id: "system", label: "System", icon: Monitor },
];

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  root.classList.toggle("dark", dark);
}

export function SettingsClient() {
  const [tab, setTab] = useState<TabId>("notifications");
  const { notifications, privacy, theme, setNotification, setPrivacy, setTheme } = useSettings();

  /* Apply persisted theme on mount */
  useEffect(() => { applyTheme(theme); }, [theme]);

  return (
    <div>
      <h1 className="h2 text-brand-600">Settings</h1>
      <p className="lead mt-1">Manage your preferences and account.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-4">
        <nav role="tablist" aria-label="Settings sections" className="flex gap-2 overflow-x-auto lg:flex-col">
          {tabs.map((t) => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`tabpanel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition",
                tab === t.id ? "bg-brand-50 text-brand-600" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <t.icon size={16} aria-hidden="true" /> {t.label}
            </button>
          ))}
        </nav>

        <div className="rounded-2xl border border-border bg-white p-6 shadow-soft lg:col-span-3">
          {tab === "notifications" && (
            <div role="tabpanel" id="tabpanel-notifications" aria-labelledby="tab-notifications">
              <h2 className="font-display font-semibold text-brand-600">Notification preferences</h2>
              <div className="mt-3 divide-y divide-border">
                <Toggle
                  id="notif-email-reminders"
                  label="Email — trip reminders"
                  checked={notifications.emailTripReminders}
                  onChange={(v) => setNotification("emailTripReminders", v)}
                />
                <Toggle
                  id="notif-email-content"
                  label="Email — new destinations & guides"
                  checked={notifications.emailNewContent}
                  onChange={(v) => setNotification("emailNewContent", v)}
                />
                <Toggle
                  id="notif-push-price"
                  label="Push — price alerts"
                  checked={notifications.pushPriceAlerts}
                  onChange={(v) => setNotification("pushPriceAlerts", v)}
                />
                <Toggle
                  id="notif-push-weather"
                  label="Push — weather alerts for saved places"
                  checked={notifications.pushWeatherAlerts}
                  onChange={(v) => setNotification("pushWeatherAlerts", v)}
                />
              </div>
            </div>
          )}

          {tab === "privacy" && (
            <div role="tabpanel" id="tabpanel-privacy" aria-labelledby="tab-privacy">
              <h2 className="font-display font-semibold text-brand-600">Privacy</h2>
              <div className="mt-3 divide-y divide-border">
                <Toggle
                  id="privacy-public-profile"
                  label="Make my profile public"
                  checked={privacy.publicProfile}
                  onChange={(v) => setPrivacy("publicProfile", v)}
                />
                <Toggle
                  id="privacy-public-reviews"
                  label="Show my reviews publicly"
                  checked={privacy.publicReviews}
                  onChange={(v) => setPrivacy("publicReviews", v)}
                />
                <Toggle
                  id="privacy-personalized"
                  label="Allow personalised recommendations"
                  checked={privacy.personalizedRecommendations}
                  onChange={(v) => setPrivacy("personalizedRecommendations", v)}
                />
              </div>
            </div>
          )}

          {tab === "theme" && (
            <div role="tabpanel" id="tabpanel-theme" aria-labelledby="tab-theme">
              <h2 className="font-display font-semibold text-brand-600">Appearance</h2>
              <p className="mt-1 text-sm text-muted-foreground">Choose how NepaYatra looks for you.</p>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {THEMES.map(({ id, label, icon: Icon }) => {
                  const selected = theme === id;
                  return (
                    <button
                      key={id}
                      onClick={() => { setTheme(id); applyTheme(id); }}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border p-5 text-sm font-medium transition",
                        selected
                          ? "border-secondary bg-secondary/5 text-secondary ring-2 ring-secondary ring-offset-1"
                          : "border-border text-muted-foreground hover:border-secondary hover:text-foreground"
                      )}
                    >
                      <Icon size={24} />
                      {label}
                      {selected && <CheckCircle2 size={14} className="text-success" />}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {theme === "system" ? "Following your device preference." : `Currently using ${theme} mode.`}
              </p>
            </div>
          )}

          {tab === "language" && (
            <div role="tabpanel" id="tabpanel-language" aria-labelledby="tab-language">
              <h2 className="font-display font-semibold text-brand-600">Language & region</h2>
              <div className="mt-4 max-w-xs">
                <Label htmlFor="lang-select">Language</Label>
                <select
                  id="lang-select"
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option>English</option>
                  <option>नेपाली (Nepali)</option>
                  <option>中文</option>
                  <option>Deutsch</option>
                </select>
              </div>
            </div>
          )}

          {tab === "security" && <SecurityTab />}
        </div>
      </div>
    </div>
  );
}
