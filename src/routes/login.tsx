import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
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
      { title: "Connexion â€” GoLivra Admin" },
      { name: "description", content: "AccÃ¨s sÃ©curisÃ© au tableau de bord administrateur GoLivra." },
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
      setError("Indiquez une adresse e-mail valide et un mot de passe (6 caractÃ¨res minimum).");
      return;
    }

    setLoading(true);
    try {
      const session = await staffLogin(normalizedEmail, password);
      setAdminToken(session.token, remember);

      const me = await fetchAdminMe(session.token);
      if (!isAdminUser(me)) {
        clearAdminToken();
        setError("Ce compte nâ€™est pas autorisÃ© Ã  accÃ©der au back-office GoLivra.");
        return;
      }

      await navigate({ to: "/admin" });
    } catch (err) {
      clearAdminToken();
      setError(err instanceof Error ? err.message : "Connexion impossible. VÃ©rifiez vos identifiants.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">VÃ©rification de la sessionâ€¦</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Panneau branding â€” desktop */}
      <div className="relative hidden w-[44%] overflow-hidden bg-[#0B6B45] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_50%)]" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-black/10 blur-2xl" />

        <div className="relative z-10 flex items-center gap-3">
          <img src={logo} alt="GoLivra" className="h-12 w-12 rounded-xl bg-white/95 p-1.5 object-contain shadow-lg" />
          <div>
            <p className="text-lg font-bold text-white">GoLivra</p>
            <p className="text-xs text-white/75">Back-office administrateur</p>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="max-w-md text-3xl font-bold leading-tight tracking-tight text-white">
            Pilotez la marketplace Brazzaville
          </h1>
          <ul className="space-y-3 text-sm text-white/85">
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              Validez restaurants et boutiques avant publication
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              Supervisez commandes, livraisons et commissions
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              Connexion sÃ©curisÃ©e via lâ€™API GoLivra (Render)
            </li>
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/60">Â© GoLivra â€” AccÃ¨s rÃ©servÃ© au personnel autorisÃ©</p>
      </div>

      {/* Formulaire */}
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-sm lg:hidden">
              <img src={logo} alt="GoLivra" className="h-10 w-10 object-contain" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Connexion admin</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Utilisez votre e-mail administrateur et votre mot de passe GoLivra.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <form className="space-y-5" onSubmit={(e) => void handleSubmit(e)}>
              <div className="space-y-2">
                <Label htmlFor="email">Adresse e-mail</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="golivra@gmail.com"
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
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
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
                  Rester connectÃ© sur cet appareil
                </Label>
              </div>

              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connexion en coursâ€¦
                  </>
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}


