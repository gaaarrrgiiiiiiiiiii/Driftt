import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import BoltIcon from "@mui/icons-material/Bolt";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const { login, register, demoLogin, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isRegister) {
        await register(email, name, password);
      } else {
        await login(email, password);
      }
      navigate("/");
    } catch (err) {
      // Handled in hook
    }
  };

  const handleDemoClick = async () => {
    try {
      await demoLogin();
      navigate("/");
    } catch (err) {
      // Handled in hook
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#050505] relative overflow-hidden">
      <div className="max-w-md w-full bg-[#0d0d0d] border border-[#1f1f1f] rounded-3xl p-8 shadow-2xl relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#32d583]/10 border border-[#32d583]/30 text-[#32d583] font-bold text-2xl mb-3">
            Δ
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Driftt
          </h1>
          <p className="text-xs text-[#8a8a8a] mt-1">
            Financial intelligence workspace · Groww Code 2026
          </p>
        </div>

        {/* 1-Click Demo Login */}
        <div className="mb-6 p-5 rounded-2xl bg-[#121212] border border-[#222222] text-center">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#32d583] font-bold block mb-1">
            Instant Evaluation Access
          </span>
          <p className="text-xs text-[#8a8a8a] mb-4">
            Pre-loaded with 5 core NSE tickers, Welford baselines, and ranked events.
          </p>
          <button
            type="button"
            onClick={handleDemoClick}
            disabled={loading}
            className="w-full bg-[#32d583] hover:bg-[#28b86e] text-black font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
          >
            <BoltIcon sx={{ fontSize: 16 }} />
            <span>One-Click Demo Login</span>
          </button>
        </div>

        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-[#1c1c1c]"></div>
          <span className="px-3 text-[10px] font-mono text-[#666666] uppercase">
            Or continue with email
          </span>
          <div className="flex-grow border-t border-[#1c1c1c]"></div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-300 text-xs text-center font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="text-[11px] font-mono text-[#8a8a8a] uppercase block mb-1">
                Your Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full bg-[#121212] border border-[#222222] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#32d583]"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-mono text-[#8a8a8a] uppercase block mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="investor@driftt.app"
              className="w-full bg-[#121212] border border-[#222222] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#32d583]"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono text-[#8a8a8a] uppercase block mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#121212] border border-[#222222] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#32d583]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#171717] hover:bg-[#222222] border border-[#2a2a2a] text-white font-semibold py-2.5 rounded-xl text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <span>{isRegister ? "Create Account" : "Sign In"}</span>
            <ArrowForwardIcon sx={{ fontSize: 14 }} />
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs text-[#8a8a8a] hover:text-white transition font-mono"
          >
            {isRegister
              ? "Already have an account? Sign in"
              : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
