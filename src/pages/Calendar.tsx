import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Page from "../components/Page";
import CalendarMonth from "../components/CalendarMonth";
import { eventTypes } from "../data/mock";
import { listEvents } from "../api/events";
import type { EventInstance } from "../types/model";
import "../styles/calendar.css";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const today = new Date();

export default function Calendar() {
  const nav = useNavigate();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<EventInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        setError(null);
        const fetchedEvents = await listEvents();
        setEvents(fetchedEvents.events);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load events");
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  return (
    <Page>
      <section className="panel" aria-label="Events Calendar">

        {/* Panel Header */}
        <div className="panelHeader teal">Events Calendar</div>

        <div className="panelBody">

          {loading && (
            <div style={{ textAlign: "center", padding: 24 }}>
              Loading events...
            </div>
          )}

          {error && (
            <div style={{ textAlign: "center", padding: 24, color: "var(--danger)" }}>
              Error: {error}
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Month Navigation */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <button
                  className="btn btnOutline"
                  onClick={prevMonth}
                  aria-label={`Previous month, ${MONTH_NAMES[month === 0 ? 11 : month - 1]}`}
                  style={{ minWidth: 36, minHeight: 36, fontSize: 16, padding: "4px 8px" }}
                >
                  ‹
                </button>

                <h2
                  aria-live="polite"
                  aria-atomic="true"
                  style={{ fontWeight: 900, fontSize: 16, margin: 0 }}
                >
                  {MONTH_NAMES[month]} {year}
                </h2>

                <button
                  className="btn btnOutline"
                  onClick={nextMonth}
                  aria-label={`Next month, ${MONTH_NAMES[month === 11 ? 0 : month + 1]}`}
                  style={{ minWidth: 36, minHeight: 36, fontSize: 16, padding: "4px 8px" }}
                >
                  ›
                </button>
              </div>

              {/* Calendar */}
              <CalendarMonth
                year={year}
                month={month}
                events={events}
                getType={(name) => eventTypes.find((t) => t.name === name)}
                onSelectEvent={(eventId) => nav(`/assign/${eventId}`)}
              />  

            </>
          )}

        </div>
      </section>
    </Page>
  );
}