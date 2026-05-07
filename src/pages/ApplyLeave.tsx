import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Page from "../components/Page";
import { listStaff } from "../api/staff";
import { getSession } from "../app/auth";
import type { Staff } from "../types/model";
import "../styles/panels.css";

export default function ApplyLeave() {
  const nav = useNavigate();
  const session = getSession();

  const [staff, setStaff] = useState<Staff[]>([]);
  const [currentStaff, setCurrentStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [staffId, setStaffId] = useState("");
  const [leaveType, setLeaveType] = useState("ANNUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    async function fetchStaff() {
      try {
        const data = await listStaff();
        setStaff(data.staff);
        
        // Find current user's staff record by matching email/username
        const myStaffRecord = data.staff.find(
          (s) => s.email.toLowerCase() === session?.username.toLowerCase()
        );
        
        if (myStaffRecord) {
          setCurrentStaff(myStaffRecord);
          setStaffId(myStaffRecord.id);
        }
      } catch (err) {
        console.error("Failed to load staff:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStaff();
  }, [session?.username]);

  function submitLeave(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      staffId,
      leaveType,
      startDate,
      endDate,
      reason,
      status: "PENDING",
    };

    console.log("Apply leave:", payload);

    // TODO: Call Apply Leave API
    nav("/absence");
  }

  return (
    <Page>
      <div
        className="panel"
        role="region"
        aria-label="Apply Leave"
        style={{ maxWidth: 720, margin: "0 auto" }}
      >
        <div className="panelHeader pink">Apply Leave</div>

        <div
          className="panelBody"
          style={{
            display: "flex",
            justifyContent: "center",
          }}
        >
          {loading ? (
            <div style={{ padding: 16, color: "var(--muted)" }}>
              Loading staff…
            </div>
          ) : !currentStaff ? (
            <div style={{ padding: 16, color: "var(--error, red)", textAlign: "center" }}>
              <p>⚠️ No staff record found for your account.</p>
              <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>
                Please contact an administrator.
              </p>
            </div>
          ) : (
            <form
              onSubmit={submitLeave}
              style={{ width: 420 }}
            >
              {/* Staff - Read-only (current user) */}
              <div className="field">
                <label>Staff Member</label>
                <input
                  type="text"
                  value={currentStaff.name}
                  readOnly
                  disabled
                  style={{
                    backgroundColor: "var(--bg, #f5f5f5)",
                    cursor: "not-allowed",
                    color: "var(--text)",
                  }}
                />
              </div>

              {/* Leave Type */}
              <div className="field">
                <label>Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                >
                  <option value="ANNUAL">Annual Leave</option>
                  <option value="SICK">Sick Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
              </div>

              {/* Date range */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div className="field">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Reason */}
              <div className="field">
                <label>Reason</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Optional"
                  style={{ resize: "vertical" }}
                />
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 16,
                }}
              >
                <button
                  type="button"
                  className="btn btnOutline"
                  onClick={() => nav(-1)}
                >
                  Cancel
                </button>

                <button type="submit" className="btn btnPrimary">
                  Submit
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Page>
  );
}