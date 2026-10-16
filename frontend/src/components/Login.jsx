import { useState } from "react";
import { LockKeyhole, Mail, Eye, EyeOff } from "lucide-react";
import { loginUser } from "../api/authApi.js";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("DemoPass!2026");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await loginUser(email.trim(), password);
      onLogin(user);
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F1F4FA] px-4 py-8">
      <section className="w-full max-w-md rounded-xl border border-[#C9D2E4] bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#244BA6] text-white">
            <LockKeyhole size={28} />
          </div>

          <h1 className="text-2xl font-bold text-[#0E427E]">METTLER TOLEDO</h1>
          <p className="mt-2 text-sm text-[#595959]">
            Accounts Receivable Insights Console
          </p>
          <p className="mt-5 text-lg font-semibold text-[#262626]">
            Sign in to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-[#262626]"
            >
              Email address
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#595959]"
              />
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-[#C9D2E4] py-3 pl-10 pr-3 text-sm outline-none focus:border-[#244BA6] focus:ring-2 focus:ring-[#244BA6]/20"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-[#262626]"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-[#C9D2E4] py-3 pl-3 pr-11 text-sm outline-none focus:border-[#244BA6] focus:ring-2 focus:ring-[#244BA6]/20"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#595959]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-[#B3261E]"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#244BA6] px-4 py-3 font-semibold text-white transition hover:bg-[#0E427E] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#595959]">
          Demo account for local assignment testing
        </p>
      </section>
    </main>
  );
}
