import { useState, useEffect, useCallback } from "react";
import api from "../api/client";

export function useWatchlist() {
  const [watchlists, setWatchlists] = useState([]);
  const [activeWatchlist, setActiveWatchlist] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWatchlists = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/watchlist/");
      setWatchlists(res.data);
      if (res.data.length > 0 && !activeWatchlist) {
        setActiveWatchlist(res.data[0]);
      }
      return res.data;
    } catch (err) {
      setError("Failed to load watchlists");
    } finally {
      setLoading(false);
    }
  }, [activeWatchlist]);

  const fetchItems = useCallback(async (watchlistId) => {
    if (!watchlistId) return;
    try {
      const res = await api.get(`/watchlist/${watchlistId}/items`);
      setItems(res.data);
    } catch (err) {
      console.error("Failed to load watchlist items", err);
    }
  }, []);

  useEffect(() => {
    fetchWatchlists();
  }, [fetchWatchlists]);

  useEffect(() => {
    if (activeWatchlist) {
      fetchItems(activeWatchlist.id);
    }
  }, [activeWatchlist, fetchItems]);

  const createWatchlist = async (name) => {
    const res = await api.post("/watchlist/", { name });
    await fetchWatchlists();
    setActiveWatchlist(res.data);
    return res.data;
  };

  const addItem = async (symbol, thesisType = null, thesisValue = null, thesisEntry = null) => {
    if (!activeWatchlist) return;
    const payload = {
      symbol: symbol.toUpperCase(),
      thesis_type: thesisType,
      thesis_value: thesisValue ? parseFloat(thesisValue) : null,
      thesis_entry: thesisEntry ? parseFloat(thesisEntry) : null,
    };
    const res = await api.post(`/watchlist/${activeWatchlist.id}/items`, payload);
    await fetchItems(activeWatchlist.id);
    return res.data;
  };

  const removeItem = async (itemId) => {
    if (!activeWatchlist) return;
    await api.delete(`/watchlist/${activeWatchlist.id}/items/${itemId}`);
    await fetchItems(activeWatchlist.id);
  };

  return {
    watchlists,
    activeWatchlist,
    setActiveWatchlist,
    items,
    loading,
    error,
    fetchWatchlists,
    fetchItems,
    createWatchlist,
    addItem,
    removeItem,
  };
}
