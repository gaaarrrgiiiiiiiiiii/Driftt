import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { SpotlightNavbar } from "./ui/spotlight-navbar";
import LogoutIcon from "@mui/icons-material/Logout";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export default function Navbar({ watchlists = [], activeWatchlist, onSelectWatchlist }) {
  const { isAuthenticated, userName, logout } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: "Overview", href: "/" },
    { label: "Watchlist & Thesis", href: "/watchlist" },
    { label: "Timeline Replay", href: "/replay" },
  ];

  const handleSignOut = () => {
    setIsSigningOut(true);
    setTimeout(() => {
      logout();
    }, 150);
  };

  return (
    <header className="border-b border-[#1c1c1c] bg-[#080909]/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand + Market Status */}
        <div className="flex items-center gap-4 shrink-0">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#32d583]/10 border border-[#32d583]/40 flex items-center justify-center text-[#32d583] font-bold text-lg group-hover:scale-105 transition">
              Δ
            </div>
            <div>
              <span className="font-bold text-white tracking-tight flex items-center gap-2 text-sm">
                Driftt
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#171717] text-[#8a8a8a] border border-[#262626]">
                  Groww Code 2026
                </span>
              </span>
            </div>
          </Link>

          {/* Market Status pill */}
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#121212] border border-[#1f1f1f] text-[11px] text-[#8a8a8a]">
            <span className="w-2 h-2 rounded-full bg-[#32d583] animate-pulse" />
            <span className="text-white font-medium">Market Open</span>
            <span>·</span>
            <span>NSE 09:15–15:30 IST</span>
          </div>
        </div>

        {/* Center: VengeanceUI Spotlight Navbar */}
        {isAuthenticated && (
          <div className="hidden md:flex flex-1 justify-center">
            <SpotlightNavbar
              items={navItems}
              activeHref={location.pathname}
              onItemClick={(item) => navigate(item.href)}
            />
          </div>
        )}

        {/* Right side: Watchlist switcher + Profile + Logout */}
        <div className="flex items-center gap-3 shrink-0">
          {isAuthenticated ? (
            <>
              {watchlists.length > 0 && onSelectWatchlist && (
                <div className="flex items-center gap-1.5 bg-[#121212] border border-[#222222] rounded-lg px-2.5 py-1.5 text-xs text-[#f5f5f5]">
                  <BookmarkBorderIcon sx={{ fontSize: 16, color: "#8a8a8a" }} />
                  <select
                    value={activeWatchlist?.id || ""}
                    onChange={(e) => {
                      const target = watchlists.find((w) => w.id === e.target.value);
                      if (target) onSelectWatchlist(target);
                    }}
                    className="bg-transparent text-xs text-[#f5f5f5] focus:outline-none cursor-pointer"
                  >
                    {watchlists.map((w) => (
                      <option key={w.id} value={w.id} className="bg-[#121212] text-white">
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2 pl-2 border-l border-[#222222]">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#121212] border border-[#222222]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#32d583]" />
                  <span className="text-xs text-white font-medium hidden sm:inline">
                    {userName || "Investor"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  title="Sign out"
                  className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition ${
                    isSigningOut
                      ? "bg-rose-950/40 border-rose-800/60 text-rose-300 cursor-wait"
                      : "text-[#8a8a8a] border-transparent hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30"
                  }`}
                >
                  {isSigningOut ? (
                    <>
                      <div className="w-3 h-3 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                      <span>Signing out...</span>
                    </>
                  ) : (
                    <>
                      <LogoutIcon sx={{ fontSize: 14 }} />
                      <span className="hidden sm:inline">Sign out</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <Link
              to="/login"
              className="bg-[#32d583] hover:bg-[#28b86e] text-black font-semibold px-3.5 py-1.5 rounded-lg text-xs transition shadow flex items-center gap-1.5"
            >
              <span>Sign in</span>
              <ArrowForwardIcon sx={{ fontSize: 14 }} />
            </Link>
          )}
        </div>
      </div>

      {/* Mobile nav links */}
      {isAuthenticated && (
        <div className="md:hidden flex items-center justify-around py-2 border-t border-[#1c1c1c] bg-[#050505]">
          {navItems.map((item) => {
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`text-xs px-3 py-1 rounded-full transition ${
                  active
                    ? "bg-[#1f1f1f] text-white font-semibold"
                    : "text-[#8a8a8a] hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
