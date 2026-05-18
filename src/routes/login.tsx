import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import logo from "@/assets/logo.png";
import { fetchAdminMe, isAdminUser, staffLogin } from "@/lib/auth-api";
import { clearAdminToken, getAdminToken, isRememberMeEnabled, setAdminToken } from "@/lib/auth-session";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Connexion — GoLivra" },
      { name: "description", content: "Connexion à la plateforme GoLivra." },
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
      if (!isAdminUser(me)) {
        clearAdminToken();
        setError("Ce compte n'est pas autorisé à accéder à GoLivra.");
        return;
      }

      await navigate({ to: "/admin" });
    } catch (err) {
      clearAdminToken();
      setError(err instanceof Error ? err.message : "Connexion impossible. Vérifiez vos identifiants.");
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
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Panneau gauche — desktop */}
      <div className="relative hidden bg-[#0B6B45] lg:flex lg:w-[44%] lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-3">
          <img src={logo} alt="GoLivra" className="h-12 w-12 rounded-xl bg-white/95 p-1.5 object-contain" />
          <div>
            <p className="text-xl font-bold text-white">GoLivra</p>
            <p className="text-sm text-white/80">Plateforme GoLivra</p>
          </div>
        </div>

        <div className="space-y-4 text-white/90">
          <p className="max-w-md text-base leading-relaxed">
            Accédez à votre espace sécurisé pour gérer votre activité sur GoLivra.
          </p>
          <p className="max-w-md text-sm leading-relaxed text-white/75">
            Suivez en temps réel les opérations, les commandes et les mises à jour de la plateforme.
          </p>
        </div>

        <p className="text-xs text-white/60">© GoLivra — Tous droits réservés</p>
      </div>

      {/* Formulaire */}
      <div className="flex flex-1 flex-col bg-background">
        <div className="flex flex-1 items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center lg:text-left">
              <div className="mb-4 flex justify-center lg:hidden">
                <img src={logo} alt="GoLivra" className="h-14 w-14 object-contain" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Connexion</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Accédez avec vos identifiants GoLivra.
              </p>
            </div>

            <form className="space-y-5" onSubmit={(e) => void handleSubmit(e)}>
              <div className="space-y-2">
                <Label htmlFor="email">Adresse e-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="pl-10"
                    value={email}
                    disabled={loading}
                    onChange={(ev) => setEmail(ev.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="pl-10 pr-10"
                    value={password}
                    disabled={loading}
                    onChange={(ev) => setPassword(ev.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                <Label htmlFor="remember" className="cursor-pointer text-sm font-normal text-muted-foreground">
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

        <p className="pb-6 text-center text-xs text-muted-foreground lg:hidden">
          © GoLivra — Tous droits réservés
        </p>
      </div>
    </div>
  );
}
