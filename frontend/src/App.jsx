import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth, AuthProvider } from "./hooks/useAuth";
import { useWatchlist } from "./hooks/useWatchlist";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Feed from "./pages/Feed";
import Watchlist from "./pages/Watchlist";
import Replay from "./pages/Replay";

function ProtectedApp() {
  const {
    watchlists,
    activeWatchlist,
    setActiveWatchlist,
    items,
    addItem,
    removeItem,
    createWatchlist,
  } = useWatchlist();

  return (
    <div className="min-h-screen bg-[#050505] text-[#f5f5f5] flex flex-col">
      <Navbar
        watchlists={watchlists}
        activeWatchlist={activeWatchlist}
        onSelectWatchlist={setActiveWatchlist}
      />
      <main className="flex-1">
        <Routes>
          <Route
            path="/"
            element={
              <Feed
                activeWatchlist={
                  activeWatchlist
                    ? { ...activeWatchlist, items, itemCount: items.length }
                    : null
                }
              />
            }
          />
          <Route
            path="/watchlist"
            element={
              <Watchlist
                watchlists={watchlists}
                activeWatchlist={activeWatchlist}
                items={items}
                addItem={addItem}
                removeItem={removeItem}
                createWatchlist={createWatchlist}
              />
            }
          />
          <Route
            path="/replay"
            element={<Replay activeWatchlist={activeWatchlist} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="border-t border-[#181818] py-6 text-center text-xs font-mono text-[#555555]">
        Driftt · Groww Code 2026 Build Challenge · Append-only, Materiality-Ranked Market Watchlist
      </footer>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/*"
          element={isAuthenticated ? <ProtectedApp /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
