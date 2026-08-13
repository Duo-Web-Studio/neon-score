import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import nextLogo from "@/assets/next-logo.jpg";


// ===== Branding side (shared) =====
const BrandingSide = () => (
  <div className="relative h-full overflow-hidden gradient-yellow-orange p-8 md:p-12 flex flex-col items-center justify-center min-h-[200px]">
    {/* Decorative blurs */}
    <div className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-black/20 blur-3xl" />

    {/* Mobile: logo compacta no topo */}
    <div className="relative flex md:hidden items-center gap-3 self-start">
      <img
        src={nextLogo}
        alt="Next Marketing"
        className="h-12 w-12 rounded-2xl object-cover shadow-xl ring-1 ring-black/20"
      />
      <div className="leading-tight">
        <div className="text-xl font-bold text-primary-foreground">Next</div>
        <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-primary-foreground/70">
          Marketing
        </div>
      </div>
    </div>

    {/* Desktop: logo gigante centralizada */}
    <div className="relative hidden md:flex flex-col items-center text-center">
      <img
        src={nextLogo}
        alt="Next Marketing"
        className="h-28 w-28 lg:h-32 lg:w-32 rounded-3xl object-cover shadow-2xl ring-1 ring-black/20"
      />
      <div className="mt-8 text-3xl lg:text-4xl font-bold tracking-tight text-primary-foreground">
        Next
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-[0.35em] text-primary-foreground/70">
        Marketing
      </div>
      <div className="mt-6 h-0.5 w-12 rounded-full bg-black/40" />
      <p className="mt-6 max-w-xs text-sm text-primary-foreground/80">
        Plataforma de vendas para SDRs e Closers.
      </p>
    </div>

    {/* Footer absoluto */}
    <div className="absolute bottom-6 left-0 right-0 hidden md:block text-center text-xs text-primary-foreground/60">
      © 2026 Next Marketing
    </div>
  </div>
);

// ===== Wrapper estilo "Hi, Friends": card externo + branding-card interno + form à direita =====
const SplitWrapper = ({ children }: { children: React.ReactNode }) => {
  const [branding, form] = Array.isArray(children) ? children : [null, children];
  return (
    <div
      className="relative h-screen w-screen overflow-hidden bg-background"
      style={{
        backgroundImage:
          "radial-gradient(circle at 20% 30%, hsl(50 100% 50% / 0.07), transparent 55%), radial-gradient(circle at 85% 80%, hsl(33 100% 50% / 0.06), transparent 60%)",
      }}
    >
      <div className="h-full w-full p-1.5 md:p-2 animate-fade-in">
        <div className="grid h-full w-full grid-cols-1 md:grid-cols-[minmax(320px,42%)_1fr] gap-3 md:gap-4 overflow-hidden rounded-3xl border border-border/60 bg-card/95 p-3 md:p-4 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <div className="overflow-hidden rounded-2xl">{branding}</div>
          <div className="flex flex-col justify-center p-2 md:p-8">
            <div className="mx-auto w-full max-w-md">{form}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Auth() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      const raw = error.toLowerCase();
      const description = raw.includes("email not confirmed")
        ? "Sua conta ainda não foi liberada. Aguarde a aprovação do administrador."
        : raw.includes("invalid login credentials")
          ? "E-mail ou senha incorretos."
          : error;
      toast({ title: "Erro ao entrar", description, variant: "destructive" });

    } else {
      navigate("/");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Senha muito curta", description: "Mínimo de 6 caracteres", variant: "destructive" });
      return;
    }
    if (!fullName.trim()) {
      toast({ title: "Nome obrigatório", description: "Informe seu nome completo", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, fullName.trim());
    if (error) {
      setLoading(false);
      toast({ title: "Erro ao cadastrar", description: error, variant: "destructive" });
      return;
    }

    setLoading(false);
    setSignupSuccess(true);
  };
  if (signupSuccess) {
    return (
      <SplitWrapper>
        <BrandingSide />
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl gradient-yellow-orange glow-yellow">
            <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-foreground">Cadastro realizado!</h2>
          <p className="mb-2 text-sm text-muted-foreground">
            Sua conta foi criada com sucesso.
          </p>
          <p className="text-sm text-muted-foreground">
            Um administrador precisa aprovar seu acesso antes do primeiro login.
          </p>

          <button
            onClick={() => { setSignupSuccess(false); setTab("login"); }}
            className="mt-6 rounded-xl gradient-yellow-orange px-6 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
          >
            Voltar ao login
          </button>
        </div>
      </SplitWrapper>
    );
  }

  return (
    <SplitWrapper>
      <BrandingSide />

      <div className="p-2">
        {/* Heading */}
        <div className="mb-6">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            {tab === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {tab === "login"
              ? "Entre para acessar seu dashboard."
              : "Preencha os dados para começar."}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex rounded-xl bg-muted/60 p-1">
          <button
            onClick={() => setTab("login")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === "login"
                ? "gradient-yellow-orange text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => setTab("signup")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              tab === "signup"
                ? "gradient-yellow-orange text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Criar conta
          </button>
        </div>

        {/* Form */}
        <form onSubmit={tab === "login" ? handleLogin : handleSignup} className="space-y-4">
          {tab === "signup" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Nome completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
                className="w-full rounded-xl border border-border/50 bg-muted/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full rounded-xl border border-border/50 bg-muted/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border/50 bg-muted/40 px-4 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {tab === "signup" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Cargo</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedRoles.includes("sdr")}
                    onCheckedChange={() => toggleRole("sdr")}
                  />
                  <span className="text-sm text-foreground">SDR</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedRoles.includes("closer")}
                    onCheckedChange={() => toggleRole("closer")}
                  />
                  <span className="text-sm text-foreground">Closer</span>
                </label>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Selecione um ou ambos</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl gradient-yellow-orange py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-all hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : tab === "login" ? (
              "Entrar"
            ) : (
              "Criar conta"
            )}
          </button>
        </form>

        {/* Footer link para alternar tab */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {tab === "login" ? "Não tem conta? " : "Já tem conta? "}
          <button
            type="button"
            onClick={() => setTab(tab === "login" ? "signup" : "login")}
            className="font-semibold text-primary hover:underline"
          >
            {tab === "login" ? "Criar conta" : "Entrar"}
          </button>
        </p>
      </div>
    </SplitWrapper>
  );
}
