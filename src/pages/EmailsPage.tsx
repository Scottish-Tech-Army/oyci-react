import { useState } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import MailIcon from "@mui/icons-material/Mail";
import { useAppContext } from "../context/useAppContext";
import { formatDate } from "../utils/helpers";

// Helper to get ISO week start (Monday)
const getWeekStart = (dateStr: string) => {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
};

// Helper to get ISO week end (Sunday) given a Monday ISO date
const getWeekEnd = (mondayIso: string) => {
  const d = new Date(mondayIso);
  const sunday = new Date(d);
  sunday.setDate(d.getDate() + 6);
  return sunday.toISOString().split("T")[0];
};

const formatWeekRange = (mondayIso: string) => {
  if (!mondayIso) return "";
  return `${formatDate(mondayIso)} — ${formatDate(getWeekEnd(mondayIso))}`;
};

export default function EmailsPage() {
  const { events, staff, getAssignmentsForEvent } = useAppContext();
  const [selectedWeekStart, setSelectedWeekStart] = useState<string | null>(
    null
  );
  // no modal — render previews inline
  const [generatedEmails, setGeneratedEmails] = useState<
    { staffId: string; staffName: string; staffEmail?: string; body: string }[]
  >([]);

  // Build a set of possible week starts from events
  const weekStarts = Array.from(
    new Set(events.map((e) => getWeekStart(e.date)))
  ).sort();

  const handleWeekChange = (e: SelectChangeEvent<string>) => {
    setSelectedWeekStart(e.target.value || null);
  };

  const handleGenerate = () => {
    if (!selectedWeekStart) return;

    // For each staff member, find events in the selected week where they are assigned
    const emails: {
      staffId: string;
      staffName: string;
      staffEmail?: string;
      body: string;
    }[] = [];

    staff.forEach((s) => {
      // find events in the chosen week
      const eventsInWeek = events.filter((ev) => {
        const ws = getWeekStart(ev.date);
        return ws === selectedWeekStart;
      });

      // for each event, check assignments
      const assignedEvents = eventsInWeek.filter((ev) => {
        const assigns = getAssignmentsForEvent(ev.id);
        return assigns.some((a) => a.staffId === s.id);
      });

      if (assignedEvents.length > 0) {
        const lines = assignedEvents.map((ev) => {
          const assigns = getAssignmentsForEvent(ev.id);
          const myAssign = assigns.find((a) => a.staffId === s.id);
          const locationName = myAssign?.locationDetail?.name || ev.locationId;
          const eventTypeName = myAssign?.eventTypeDetail?.name || "Event";
          const eventTime = `${ev.startTime || ""}-${ev.endTime || ""}`;
          const staffTime = `${ev.staffStartTime || ev.startTime || ""}-${
            ev.staffEndTime || ev.endTime || ""
          }`;
          return `• ${formatDate(
            ev.date
          )} — ${eventTypeName} at ${locationName}\n    Event time: ${eventTime}\n    Staff time: ${staffTime}\n    Hours: ${
            myAssign?.hoursAllocated
          }h`;
        });

        const body = `Hi ${
          s.name
        },\n\nHere are your assignments for the week ${formatWeekRange(
          selectedWeekStart
        )}:\n\n${lines.join("\n")}\n\nThanks,\nAdmin`;

        emails.push({
          staffId: s.id,
          staffName: s.name,
          staffEmail: s.email,
          body,
        });
      }
    });

    setGeneratedEmails(emails);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Emails
      </Typography>

      <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
        <FormControl sx={{ minWidth: 240 }} size="small">
          <InputLabel id="week-select-label">Week start</InputLabel>
          <Select
            labelId="week-select-label"
            value={selectedWeekStart || ""}
            label="Week start"
            onChange={handleWeekChange}
          >
            <MenuItem value="">Select week</MenuItem>
            {weekStarts.map((ws) => (
              <MenuItem key={ws} value={ws}>
                {formatWeekRange(ws)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={!selectedWeekStart}
        >
          Generate Emails
        </Button>

        <Button
          variant="outlined"
          onClick={() => {
            // Confirm and send all generated emails
            if (generatedEmails.length === 0) return;
            if (
              !confirm(
                `Send ${generatedEmails.length} emails via your email client?`
              )
            )
              return;
            const sendMail = (to: string, subject: string, body: string) => {
              const mailto = `mailto:${encodeURIComponent(
                to
              )}?subject=${encodeURIComponent(
                subject
              )}&body=${encodeURIComponent(body)}`;
              // open in new tab/window to avoid navigating away
              window.open(mailto, "_blank");
            };

            const subject = `Assignments for week ${formatWeekRange(
              selectedWeekStart || ""
            )}`;
            generatedEmails.forEach((ge, i) => {
              if (!ge.staffEmail) return;
              // stagger openings slightly to avoid being blocked
              setTimeout(
                () => sendMail(ge.staffEmail!, subject, ge.body),
                i * 250
              );
            });
          }}
          disabled={generatedEmails.filter((g) => g.staffEmail).length === 0}
        >
          Send All Emails
        </Button>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="h6">
          Generated Emails ({generatedEmails.length})
        </Typography>
        {generatedEmails.length === 0 ? (
          <Typography sx={{ mt: 1 }}>
            No assignments for selected week.
          </Typography>
        ) : (
          <List>
            {generatedEmails.map((e) => (
              <Box key={e.staffId} sx={{ mb: 1 }}>
                <ListItem
                  alignItems="flex-start"
                  sx={{ alignItems: "flex-start" }}
                >
                  <ListItemText
                    primary={e.staffName}
                    secondary={
                      <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                        {e.body}
                      </pre>
                    }
                  />
                  <Box sx={{ ml: 2, display: "flex", alignItems: "center" }}>
                    <Button
                      variant="outlined"
                      startIcon={<MailIcon />}
                      size="small"
                      disabled={!e.staffEmail}
                      onClick={() => {
                        const to = e.staffEmail;
                        if (!to) return;
                        const subject = `Assignments for week ${formatWeekRange(
                          selectedWeekStart || ""
                        )}`;
                        const mailto = `mailto:${to}?subject=${encodeURIComponent(
                          subject
                        )}&body=${encodeURIComponent(e.body)}`;
                        window.location.href = mailto;
                      }}
                    >
                      Send Email
                    </Button>
                  </Box>
                </ListItem>
                <Divider />
              </Box>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
}
