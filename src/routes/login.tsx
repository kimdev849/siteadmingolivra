import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import logo from "@/assets/logo.png";
import {
  fetchAdminMe,
  isAdminUser,
  isCommerceOwner,
  isLogisticsManager,
  isStaffUser,
  staffLogin,
} from "@/lib/auth-api";
import {
  clearAdminToken,
  getAdminToken,
  isRememberMeEnabled,
  setAdminToken,
} from "@/lib/auth-session";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Connexion — GoLivra" },
      { name: "description", content: "Connectez-vous à votre espace GoLivra." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(isRememberMeEnabled());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const token = getAdminToken();
      if (!token) {
        if (alive) setCheckingSession(false);
        return;
      }
      try {
        const me = await fetchAdminMe(token);
        if (!alive) return;
        if (isAdminUser(me)) {
          await navigate({ to: "/admin" });
          return;
        }
        if (isLogisticsManager(me) || isCommerceOwner(me)) {
          await navigate({ to: "/entreprise" });
          return;
        }
        clearAdminToken();
      } catch {
        clearAdminToken();
      }
      if (alive) setCheckingSession(false);
    })();
    return () => {
      alive = false;
    };
  }, [navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@") || password.length < 6) {
      setError("Adresse e-mail ou mot de passe invalide.");
      return;
    }

    setLoading(true);
    try {
      const session = await staffLogin(normalizedEmail, password);
      setAdminToken(session.token, remember);

      const me = await fetchAdminMe(session.token);
      if (!isStaffUser(me) && !isCommerceOwner(me)) {
        clearAdminToken();
        setError(
          "Ce compte n'est pas autorisé.",
        );
        return;
      }

      if (isCommerceOwner(me)) {
        await navigate({ to: "/entreprise" });
      } else if (isLogisticsManager(me)) {
        await navigate({ to: "/entreprise" });
      } else {
        await navigate({ to: "/admin" });
      }
    } catch (err) {
      clearAdminToken();
      setError(
        err instanceof Error ? err.message : "Connexion impossible. Vérifiez vos identifiants.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Zone centrale : logo + formulaire */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Logo GoLivra */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <img src={logo} alt="GoLivra" className="h-16 w-16 object-contain" />
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">GoLivra</h1>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">Connexion</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Connectez-vous à votre espace GoLivra.
            </p>
          </div>

          <form className="space-y-5" onSubmit={(e) => void handleSubmit(e)}>
            <div className="space-y-2">
              <Label htmlFor="email">Adresse e-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="vous@exemple.com"
                  className="h-11 pl-11 text-base"
                  value={email}
                  disabled={loading}
                  onChange={(ev) => setEmail(ev.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-11 pl-11 pr-11 text-base"
                  value={password}
                  disabled={loading}
                  onChange={(ev) => setPassword(ev.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={remember}
                disabled={loading}
                onCheckedChange={(v) => setRemember(v === true)}
              />
              <Label
                htmlFor="remember"
                className="cursor-pointer text-sm font-normal text-muted-foreground"
              >
                Rester connecté
              </Label>
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connexion…
                </>
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Pied de page */}
      <p className="pb-8 text-center text-xs text-muted-foreground">
        GoLivra — by Synex
      </p>
    </div>
  );
}
