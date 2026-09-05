import { useState, useEffect, useCallback } from "react";
import api from "../api/client";

export function useFeed(watchlistId, sensitivity = "balanced", range = "today") {
  const [events, setEvents] = useState([]);
  const [lastSeq, setLastSeq] = useState(0);
  const [unseenCount, setUnseenCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFeed = useCallback(async () => {
    if (!watchlistId) return;
    setLoading(true);
    setError(null);
    try {
      const params = { sensitivity };
      if (range) {
        params.range = range;
      }
      const res = await api.get(`/feed/${watchlistId}`, { params });
      setEvents(res.data.events || []);
      setLastSeq(res.data.last_seq || 0);
      setUnseenCount(res.data.unseen_count || 0);
    } catch (err) {
      setError("Failed to fetch feed events");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [watchlistId, sensitivity, range]);

  const markSeen = async () => {
    if (!watchlistId) return;
    try {
      const res = await api.post(`/feed/${watchlistId}/seen`);
      setLastSeq(res.data.last_seen_seq);
      setEvents([]);
      setUnseenCount(0);
    } catch (err) {
      console.error("Failed to mark events as seen", err);
    }
  };

  useEffect(() => {
    fetchFeed();
    // Optional polling every 30s
    const interval = setInterval(fetchFeed, 30000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  return {
    events,
    lastSeq,
    unseenCount,
    loading,
    error,
    refetch: fetchFeed,
    markSeen,
  };
}
