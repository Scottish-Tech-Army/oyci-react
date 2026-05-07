import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import RepeatIcon from "@mui/icons-material/Repeat";
import { useAppContext } from "../context/useAppContext";
import { fetchEventsList } from "../api/resourceApi";
import type { Event } from "../types";
import { calculateDurationHours, formatDate } from "../utils/helpers";
import EventTypesPage from "./EventTypesPage";

export default function EventsPage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Events
      </Typography>
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{ mb: 3 }}
      >
        <Tab label="Events" />
        <Tab label="Event Types" />
      </Tabs>
      {activeTab === 0 && <EventsTab />}
      {activeTab === 1 && <EventTypesPage />}
    </Box>
  );
}

function EventsTab() {
  const OPEN_EVENT_STORAGE_KEY = "oyci.openEventId";
  const { events, eventTypes, locations, addEvent, updateEvent, deleteEvent } =
    useAppContext();
  const [remoteEvents, setRemoteEvents] = useState<Event[] | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [formData, setFormData] = useState({
    eventTypeId: "",
    locationId: "",
    date: "",
    startTime: "",
    endTime: "",
    staffStartTime: "",
    staffEndTime: "",
    maxAttendees: "",
    notes: "",
  });
  const [recurrence, setRecurrence] = useState({
    enabled: false,
    pattern: "weekly" as "weekly" | "biweekly" | "monthly",
    until: "",
  });
  const handleOpenDialog = (event?: Event) => {
    setShowValidation(false);
    setRecurrence({ enabled: false, pattern: "weekly", until: "" });
    if (event) {
      setEditingId(event.id);
      setFormData({
        eventTypeId: event.eventTypeId,
        locationId: event.locationId,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        staffStartTime: event.staffStartTime || event.startTime,
        staffEndTime: event.staffEndTime || event.endTime,
        maxAttendees: event.maxAttendees?.toString() || "",
        notes: event.notes || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        eventTypeId: "",
        locationId: "",
        date: "",
        startTime: "",
        endTime: "",
        staffStartTime: "",
        staffEndTime: "",
        maxAttendees: "",
        notes: "",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
    setShowValidation(false);
    setRecurrence({ enabled: false, pattern: "weekly", until: "" });
    setFormData({
      eventTypeId: "",
      locationId: "",
      date: "",
      startTime: "",
      endTime: "",
      staffStartTime: "",
      staffEndTime: "",
      maxAttendees: "",
      notes: "",
    });
  };

  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!formData.eventTypeId) errors.eventTypeId = "Event type is required.";
    if (!formData.locationId) errors.locationId = "Location is required.";
    if (!formData.date) errors.date = "Date is required.";
    if (!formData.startTime) errors.startTime = "Start time is required.";
    if (!formData.endTime) errors.endTime = "End time is required.";

    if (
      formData.startTime &&
      formData.endTime &&
      formData.endTime <= formData.startTime
    ) {
      errors.endTime = "End time must be after start time.";
    }

    const staffStart = formData.staffStartTime || formData.startTime;
    const staffEnd = formData.staffEndTime || formData.endTime;
    if (staffStart && staffEnd && staffEnd <= staffStart) {
      errors.staffEndTime = "Staff end time must be after staff start time.";
    }

    if (formData.maxAttendees) {
      const parsed = Number.parseInt(formData.maxAttendees, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        errors.maxAttendees = "Max attendees must be a positive whole number.";
      }
    }

    if (recurrence.enabled && !editingId) {
      if (!recurrence.until)
        errors.recurrenceUntil = "End date is required for recurring events.";
      else if (recurrence.until <= formData.date)
        errors.recurrenceUntil = "End date must be after the start date.";
    }

    return errors;
  }, [formData, recurrence, editingId]);

  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  const generateRecurringDates = (
    startDate: string,
    pattern: "weekly" | "biweekly" | "monthly",
    until: string
  ): string[] => {
    const dates: string[] = [];
    const end = new Date(until);
    const current = new Date(startDate);
    while (current <= end) {
      dates.push(current.toISOString().split("T")[0]);
      if (pattern === "weekly") current.setDate(current.getDate() + 7);
      else if (pattern === "biweekly") current.setDate(current.getDate() + 14);
      else current.setMonth(current.getMonth() + 1);
    }
    return dates;
  };

  const handleSave = () => {
    setShowValidation(true);
    if (hasValidationErrors) return;

    const data = {
      eventTypeId: formData.eventTypeId,
      locationId: formData.locationId,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      staffStartTime: formData.staffStartTime || formData.startTime,
      staffEndTime: formData.staffEndTime || formData.endTime,
      maxAttendees: formData.maxAttendees
        ? Number.parseInt(formData.maxAttendees, 10)
        : undefined,
      notes: formData.notes || undefined,
    };

    if (editingId) {
      updateEvent(editingId, data);
    } else if (recurrence.enabled && recurrence.until) {
      const dates = generateRecurringDates(
        formData.date,
        recurrence.pattern,
        recurrence.until
      );
      dates.forEach((date) => addEvent({ ...data, date }));
    } else {
      addEvent(data);
    }

    handleCloseDialog();
  };

  const handleDelete = (id: string) => {
    if (globalThis.confirm("Are you sure you want to delete this event?")) {
      deleteEvent(id);
    }
  };

  // Filters / search
  const [searchTerm, setSearchTerm] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("upcoming"); // all | past | upcoming
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  useEffect(() => {
    let isMounted = true;

    const loadEvents = async () => {
      try {
        const fetchedEvents = await fetchEventsList();
        if (!isMounted) return;
        setRemoteEvents(fetchedEvents);
      } catch {
        if (!isMounted) return;
        setRemoteEvents(null);
      }
    };

    void loadEvents();
    return () => {
      isMounted = false;
    };
  }, [events.length]);

  const eventsForView = remoteEvents ?? events;

  useEffect(() => {
    const targetEventId = sessionStorage.getItem(OPEN_EVENT_STORAGE_KEY);
    if (!targetEventId) return;

    const targetEvent = eventsForView.find(
      (event) => event.id === targetEventId
    );
    if (!targetEvent) return;

    setSearchTerm("");
    setEventTypeFilter(targetEvent.eventTypeId);
    setLocationFilter(targetEvent.locationId);
    setTimeFilter("all");
    setPage(1);
    handleOpenDialog(targetEvent);
    sessionStorage.removeItem(OPEN_EVENT_STORAGE_KEY);
  }, [eventsForView]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredEvents = eventsForView
    .filter((ev) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      const typeName =
        eventTypes.find((t) => t.id === ev.eventTypeId)?.name || "";
      return (
        ev.notes?.toLowerCase().includes(q) ||
        typeName.toLowerCase().includes(q)
      );
    })
    .filter((ev) =>
      eventTypeFilter === "all" ? true : ev.eventTypeId === eventTypeFilter
    )
    .filter((ev) =>
      locationFilter === "all" ? true : ev.locationId === locationFilter
    )
    .filter((ev) => {
      if (timeFilter === "all") return true;
      const evDate = new Date(ev.date);
      evDate.setHours(0, 0, 0, 0);
      if (timeFilter === "past") return evDate < today;
      if (timeFilter === "upcoming") return evDate >= today;
      return true;
    });

  const getEventTypeName = (id: string) => {
    return eventTypes.find((et) => et.id === id)?.name || "Unknown";
  };

  const getLocationName = (id: string) => {
    return locations.find((l) => l.id === id)?.name || "Unknown";
  };

  const getDurationHours = (startTime: string, endTime: string) => {
    try {
      return calculateDurationHours(startTime, endTime).toFixed(1);
    } catch {
      return "—";
    }
  };

  const totalCount = filteredEvents.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          disabled={eventTypes.length === 0 || locations.length === 0}
        >
          Add Event
        </Button>
      </Box>

      {eventTypes.length === 0 || locations.length === 0 ? (
        <Typography color="error" sx={{ mb: 2 }}>
          ⚠️ Please create at least one Event Type and one Location before
          adding events.
        </Typography>
      ) : null}

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          placeholder="Search by event type or notes"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Event Type</InputLabel>
          <Select
            value={eventTypeFilter}
            label="Event Type"
            onChange={(e) => setEventTypeFilter(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            {eventTypes.map((et) => (
              <MenuItem key={et.id} value={et.id}>
                {et.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Location</InputLabel>
          <Select
            value={locationFilter}
            label="Location"
            onChange={(e) => setLocationFilter(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            {locations.map((loc) => (
              <MenuItem key={loc.id} value={loc.id}>
                {loc.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>When</InputLabel>
          <Select
            value={timeFilter}
            label="When"
            onChange={(e) => setTimeFilter(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="upcoming">Upcoming</MenuItem>
            <MenuItem value="past">Past</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>Event Type</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Event Time</TableCell>
              <TableCell>Staff Time</TableCell>
              <TableCell>Staff Hours</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Max Attendees</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  No events match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              (() => {
                const start = (currentPage - 1) * pageSize;
                const end = start + pageSize;
                return filteredEvents.slice(start, end).map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{getEventTypeName(event.eventTypeId)}</TableCell>
                    <TableCell>{formatDate(event.date)}</TableCell>
                    <TableCell>
                      {event.startTime} - {event.endTime}
                    </TableCell>
                    <TableCell>
                      {event.staffStartTime} - {event.staffEndTime}
                    </TableCell>
                    <TableCell>
                      {getDurationHours(
                        event.staffStartTime,
                        event.staffEndTime
                      )}
                      h
                    </TableCell>
                    <TableCell>{getLocationName(event.locationId)}</TableCell>
                    <TableCell>{event.maxAttendees || "—"}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(event)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(event.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ));
              })()
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mt: 2,
        }}
      >
        <Box>
          <Typography variant="body2">
            Showing {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1} -{" "}
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Per page</InputLabel>
            <Select
              value={pageSize}
              label="Per page"
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <MenuItem value={5}>5</MenuItem>
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
            </Select>
          </FormControl>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, p) => setPage(p)}
            color="primary"
          />
        </Box>
      </Box>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          {editingId ? "Edit Event" : "Add Event"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {/* Section 1: Event details */}
          <Typography variant="overline" color="textSecondary">
            Event Details
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 2,
              mt: 1,
              mb: 2,
            }}
          >
            <FormControl fullWidth required>
              <InputLabel>Event Type</InputLabel>
              <Select
                value={formData.eventTypeId}
                onChange={(e) =>
                  setFormData({ ...formData, eventTypeId: e.target.value })
                }
                label="Event Type"
                error={showValidation && Boolean(validationErrors.eventTypeId)}
              >
                {eventTypes.map((et) => (
                  <MenuItem key={et.id} value={et.id}>
                    {et.name}
                  </MenuItem>
                ))}
              </Select>
              {showValidation && validationErrors.eventTypeId && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  {validationErrors.eventTypeId}
                </Typography>
              )}
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Location</InputLabel>
              <Select
                value={formData.locationId}
                onChange={(e) =>
                  setFormData({ ...formData, locationId: e.target.value })
                }
                label="Location"
                error={showValidation && Boolean(validationErrors.locationId)}
              >
                {locations.map((loc) => (
                  <MenuItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </MenuItem>
                ))}
              </Select>
              {showValidation && validationErrors.locationId && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  {validationErrors.locationId}
                </Typography>
              )}
            </FormControl>
          </Box>

          <TextField
            label="Date"
            fullWidth
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            error={showValidation && Boolean(validationErrors.date)}
            helperText={showValidation ? validationErrors.date : ""}
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />

          <Divider sx={{ mb: 2 }} />

          {/* Section 2: Timings */}
          <Typography variant="overline" color="textSecondary">
            Event Times
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 2,
              mt: 1,
              mb: 2,
            }}
          >
            <TextField
              label="Start Time"
              type="time"
              value={formData.startTime}
              onChange={(e) =>
                setFormData({ ...formData, startTime: e.target.value })
              }
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
              error={showValidation && Boolean(validationErrors.startTime)}
              helperText={showValidation ? validationErrors.startTime : ""}
            />
            <TextField
              label="End Time"
              type="time"
              value={formData.endTime}
              onChange={(e) =>
                setFormData({ ...formData, endTime: e.target.value })
              }
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
              error={showValidation && Boolean(validationErrors.endTime)}
              helperText={showValidation ? validationErrors.endTime : ""}
            />
          </Box>

          <Typography variant="overline" color="textSecondary">
            Staff Times{" "}
            <Typography
              component="span"
              variant="caption"
              color="textSecondary"
            >
              (for setup / teardown)
            </Typography>
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 2,
              mt: 1,
              mb: 2,
            }}
          >
            <TextField
              label="Staff Arrive"
              type="time"
              value={formData.staffStartTime}
              onChange={(e) =>
                setFormData({ ...formData, staffStartTime: e.target.value })
              }
              fullWidth
              InputLabelProps={{ shrink: true }}
              placeholder={formData.startTime}
              helperText="Defaults to event start"
              error={showValidation && Boolean(validationErrors.staffStartTime)}
            />
            <TextField
              label="Staff Leave"
              type="time"
              value={formData.staffEndTime}
              onChange={(e) =>
                setFormData({ ...formData, staffEndTime: e.target.value })
              }
              fullWidth
              InputLabelProps={{ shrink: true }}
              placeholder={formData.endTime}
              helperText={
                showValidation && validationErrors.staffEndTime
                  ? validationErrors.staffEndTime
                  : "Defaults to event end"
              }
              error={showValidation && Boolean(validationErrors.staffEndTime)}
            />
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Section 3: Optional details */}
          <Typography variant="overline" color="textSecondary">
            Optional
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr",
              gap: 2,
              mt: 1,
              mb: 2,
            }}
          >
            <TextField
              label="Max Attendees"
              type="number"
              value={formData.maxAttendees}
              onChange={(e) =>
                setFormData({ ...formData, maxAttendees: e.target.value })
              }
              fullWidth
              error={showValidation && Boolean(validationErrors.maxAttendees)}
              helperText={showValidation ? validationErrors.maxAttendees : ""}
            />
            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              fullWidth
              multiline
              rows={1}
            />
          </Box>

          {/* Section 4: Recurrence (add only) */}
          {!editingId && (
            <>
              <Divider sx={{ mb: 2 }} />
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: recurrence.enabled ? 2 : 0,
                }}
              >
                <RepeatIcon
                  fontSize="small"
                  color={recurrence.enabled ? "secondary" : "disabled"}
                />
                <Typography
                  variant="overline"
                  color="textSecondary"
                  sx={{ flex: 1 }}
                >
                  Recurring Event
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={recurrence.enabled}
                      onChange={(e) =>
                        setRecurrence({
                          ...recurrence,
                          enabled: e.target.checked,
                        })
                      }
                      size="small"
                      color="secondary"
                    />
                  }
                  label=""
                  sx={{ m: 0 }}
                />
              </Box>
              {recurrence.enabled && (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 2,
                  }}
                >
                  <FormControl fullWidth>
                    <InputLabel>Repeats</InputLabel>
                    <Select
                      value={recurrence.pattern}
                      label="Repeats"
                      onChange={(e) =>
                        setRecurrence({
                          ...recurrence,
                          pattern: e.target.value as typeof recurrence.pattern,
                        })
                      }
                    >
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="biweekly">Every 2 weeks</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Repeat until"
                    type="date"
                    value={recurrence.until}
                    onChange={(e) =>
                      setRecurrence({ ...recurrence, until: e.target.value })
                    }
                    fullWidth
                    required
                    InputLabelProps={{ shrink: true }}
                    error={
                      showValidation &&
                      Boolean(validationErrors.recurrenceUntil)
                    }
                    helperText={
                      showValidation && validationErrors.recurrenceUntil
                        ? validationErrors.recurrenceUntil
                        : recurrence.until && formData.date
                        ? `${
                            generateRecurringDates(
                              formData.date,
                              recurrence.pattern,
                              recurrence.until
                            ).length
                          } occurrence(s)`
                        : ""
                    }
                  />
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            startIcon={
              recurrence.enabled && !editingId ? <RepeatIcon /> : undefined
            }
          >
            {editingId
              ? "Update"
              : recurrence.enabled
              ? `Create Recurring Events`
              : "Add Event"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
