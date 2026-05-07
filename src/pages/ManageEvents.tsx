import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Page from "../components/Page";
import EventCard from "../components/EventCard";
import ConfirmDialog from "../components/ConfirmDialog";
import { eventTypes, locations } from "../data/mock";
import { listEvents, deleteEvent } from "../api/events";
import type { EventInstance } from "../types/model";
import "../styles/panels.css";

export default function ManageEvents() {
  const nav = useNavigate();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        setError(null);
        const data = await listEvents();
        setEvents(data.events);
        console.log("Fetched events:", data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load events");
        console.error("Error fetching events:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  const filtered = events.filter((e) => {
    if (!search) return true;
    
    const q = search.toLowerCase();

    return (
      (e.name ?? "").toLowerCase().includes(q) ||
      (e.eventTypeName ?? "").toLowerCase().includes(q) ||
      (e.locationId ?? "").toLowerCase().includes(q) ||
      e.date.toLowerCase().includes(q)
    );
  });

  async function confirmDelete() {
    if (!deleteId) return;

    try {
      setDeleting(true);
      setDeleteError(null);
      await deleteEvent(deleteId);
      setEvents((prev) => prev.filter((e) => e.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete event");
      console.error("Error deleting event:", err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Page>
      <div className="panel" role="region" aria-label="Manage Events">
        <div className="panelHeader teal">Manage Events</div>

        <div className="panelBody">
          {/* Loading state */}
          {loading && (
            <div
              style={{
                textAlign: "center",
                padding: 24,
                color: "var(--muted)",
              }}
              role="status"
            >
              Loading events...
            </div>
          )}

          {/* Error state */}
          {error && (
            <div
              style={{
                textAlign: "center",
                padding: 24,
                color: "var(--error, red)",
              }}
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Content */}
          {!loading && !error && (
            <>
              {/* ✅ Search + Add Event */}
              <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label htmlFor="event-search" className="srOnly">
                Search events
              </label>
              <input
                id="event-search"
                type="search"
                placeholder="🔍 Search by event name, location or date..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button
              className="btn btnPrimary"
              type="button"
              onClick={() => nav("/events/new")}
            >
              + Add Event
            </button>
          </div>

          {/* ✅ Empty state */}
          {filtered.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 24,
                color: "var(--muted)",
              }}
              role="status"
            >
              No events found matching "{search}"
            </div>
          ) : (
            <ul
              className="grid3"
              style={{ listStyle: "none", padding: 0, margin: 0 }}
              aria-label="Events list"
            >
              {filtered.map((e) => {
                // Find or create dynamic type from eventTypeName
                const type = eventTypes.find((t) => t.name === e.eventTypeName) || {
                  id: e.eventTypeName || "unknown",
                  name: e.eventTypeName || "Unknown Type",
                  description: "",
                  durationHours: 2,
                };

                // Find or create dynamic location from locationId (which is the location name)
                const loc = locations.find((l) => l.id === e.locationId) || {
                  id: e.locationId,
                  name: e.locationId,
                };

                return (
                  <li key={e.id}>
                    <EventCard
                      event={e}
                      type={type}
                      location={loc}
                      onAssign={(id) => nav(`/events/${id}/assign`)}
                      onEdit={(id) => nav(`/events/${id}/edit`)}
                      onDelete={(id) => setDeleteId(id)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteId !== null}
        title="Delete Event"
        message={
          deleteError
            ? `⚠️ ${deleteError}`
            : "This action cannot be undone. Are you sure you want to delete this event?"
        }
        confirmText={deleting ? "⏳ Deleting..." : "Delete"}
        onCancel={() => { setDeleteId(null); setDeleteError(null); }}
        onConfirm={confirmDelete}
      />
    </Page>
  );
}