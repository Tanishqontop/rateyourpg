import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/context/useAuth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function AuthPage() {
  const { signInEmail, signUpEmail, signInGuest } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const initialMode = params.get("mode") === "signup" ? "signup" : "login";
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const fn = mode === "login" ? signInEmail : signUpEmail;
    const { error: err } = await fn(email.trim(), password);
    if (err) setError(err);
    else navigate("/");
  };

  return (
    <>
      <Helmet>
        <title>Login · RateYourPG</title>
      </Helmet>
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <Card className="p-6">
          <h1 className="text-2xl font-bold text-stone-900">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Email &amp; password only — no social logins.
          </p>

          <form className="mt-6 space-y-3" onSubmit={(e) => void onSubmit(e)}>
            <div>
              <label className="text-sm font-medium text-stone-700">Email</label>
              <input
                type="email"
                className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700">Password</label>
              <input
                type="password"
                className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" className="w-full">
              {mode === "login" ? "Login" : "Sign up"}
            </Button>
          </form>

          <button
            type="button"
            className="mt-4 w-full text-center text-sm font-semibold text-teal-800 hover:underline"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login"
              ? "Need an account? Sign up"
              : "Already have an account? Login"}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-stone-500">Or</span>
            </div>
          </div>

          <Button
            variant="secondary"
            className="w-full"
            type="button"
            onClick={async () => {
              setError(null);
              const { error: err } = await signInGuest();
              if (err) setError(err);
              else navigate("/");
            }}
          >
            Continue as Guest
          </Button>

          <p className="mt-4 text-center text-sm text-stone-600">
            <Link className="font-semibold text-teal-800 hover:underline" to="/">
              ← Back to home
            </Link>
          </p>
        </Card>
      </div>
    </>
  );
}
