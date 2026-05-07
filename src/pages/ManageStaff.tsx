import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Page from "../components/Page";
import StaffCard from "../components/StaffCard";
import ConfirmDialog from "../components/ConfirmDialog";
import { listStaff, deleteStaff } from "../api/staff";
import type { Staff } from "../types/model";
import "../styles/panels.css";

export default function ManageStaff() {
  const nav = useNavigate();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStaff() {
      try {
        setLoading(true);
        setError(null);
        const data = await listStaff();
        setStaff(data.staff);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load staff");
      } finally {
        setLoading(false);
      }
    }

    fetchStaff();
  }, []);

  // ✅ Safe, case‑insensitive search (defensive email handling)
  const filtered = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function confirmDelete() {
    if (!deleteId) return;

    try {
      setDeleting(true);
      setDeleteError(null);
      await deleteStaff(deleteId);
      
      // Refresh the staff list from server to show updated status
      const updatedData = await listStaff();
      setStaff(updatedData.staff);
      setDeleteId(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete staff");
      console.error("Error deleting staff:", err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Page>
      <div className="panel" role="region" aria-label="Manage Staff">
        <div className="panelHeader yellow">Manage Staff</div>

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
              Loading staff...
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
              {/* ✅ Search + Add Staff */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <input
                  type="search"
                  placeholder="🔍 Search staff by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ flex: 1, minWidth: 220 }}
                  aria-label="Search staff"
                />

                <button
                  type="button"
                  className="btn btnPrimary"
                  onClick={() => nav("/staff/new")}
                >
                  + Add Staff
                </button>
              </div>

              {/* ✅ Empty state */}
              {filtered.length === 0 && (
                <div
                  className="muted"
                  style={{ textAlign: "center", padding: 16 }}
                  role="status"
                >
                  No staff found
                </div>
              )}

              {/* ✅ Staff list */}
              <ul
                className="grid3"
                style={{ listStyle: "none", padding: 0, margin: 0 }}
              >
                {filtered.map((s) => (
                  <li key={s.id}>
                    <StaffCard
                      staff={s}
                      onEdit={(id) => nav(`/staff/${id}/edit`)}
                      onDelete={(id) => setDeleteId(id)}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* ✅ Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteId !== null}
        title="Delete staff member"
        message={
          deleteError
            ? `Error: ${deleteError}`
            : deleting
            ? "Deleting staff member..."
            : "This action cannot be undone. Are you sure you want to delete this staff member?"
        }
        confirmText={deleting ? "Deleting..." : "Delete"}
        onCancel={() => {
          if (!deleting) {
            setDeleteId(null);
            setDeleteError(null);
          }
        }}
        onConfirm={confirmDelete}
      />
    </Page>
  );
}