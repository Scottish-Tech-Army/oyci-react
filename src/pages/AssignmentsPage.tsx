import { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  Badge,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Chip,
  Paper,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormControlLabel,
  Checkbox,
  Pagination,
  LinearProgress,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import InfoIcon from "@mui/icons-material/Info";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useAppContext } from "../context/useAppContext";
import { normalizeEventTypeStaffRequirements, summarizeRequirement } from "../shared/staffRequirements";
import { formatDate, calculateDurationHours } from "../utils/helpers";
import type { StaffSuggestion } from "../types";

export default function AssignmentsPage() {
  const {
    events,
    staff,
    eventTypes,
    locations,
    addAssignment,
    deleteAssignment,
    getAssignmentsForEvent,
    getAvailableStaffForEvent,
    getStaffWeeklyLoad,
    suggestStaffForEvent,
  } = useAppContext();

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [openSuggestDialog, setOpenSuggestDialog] = useState(false);
  const [suggestEventId, setSuggestEventId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<StaffSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(
    new Set()
  );
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");

  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("upcoming");
  const [needStaffOnly, setNeedStaffOnly] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const filteredEvents = events
    .filter((ev) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      const typeName =
        eventTypes.find((t) => t.id === ev.eventTypeId)?.name || "";
      const locName = locations.find((l) => l.id === ev.locationId)?.name || "";
      return (
        typeName.toLowerCase().includes(q) || locName.toLowerCase().includes(q)
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (timeFilter === "past") return evDate < today;
      if (timeFilter === "upcoming") return evDate >= today;
      return true;
    })
    .filter((ev) => {
      if (staffFilter === "all") return true;
      const assignments = getAssignmentsForEvent(ev.id);
      return assignments.some((a) => a.staffId === staffFilter);
    })
    .filter((ev) => {
      if (!needStaffOnly) return true;
      const assignments = getAssignmentsForEvent(ev.id);
      const et = eventTypes.find((t) => t.id === ev.eventTypeId);
      const minStaff = et ? et.minimumStaffRequired || 0 : 0;
      return assignments.length < minStaff;
    });

  const totalCount = filteredEvents.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    const eventId = sessionStorage.getItem("oyci.assignmentsEventId");
    if (eventId) {
      sessionStorage.removeItem("oyci.assignmentsEventId");
      const ev = events.find((e) => e.id === eventId);
      if (ev) {
        setEventTypeFilter(ev.eventTypeId);
        setLocationFilter(ev.locationId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [
    searchTerm,
    eventTypeFilter,
    locationFilter,
    staffFilter,
    needStaffOnly,
    events,
    pageSize,
  ]);

  const handleOpenDialog = (eventId: string) => {
    setSelectedEventId(eventId);
    setSelectedStaffId(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedEventId(null);
    setSelectedStaffId(null);
  };

  const handleAssignStaff = () => {
    if (!selectedEventId || !selectedStaffId) {
      alert("Please select a staff member");
      return;
    }

    const event = events.find((e) => e.id === selectedEventId);
    if (!event) return;

    const hoursAllocated = calculateDurationHours(
      event.staffStartTime,
      event.staffEndTime
    );

    addAssignment({
      eventId: selectedEventId,
      staffId: selectedStaffId,
      hoursAllocated,
    });

    handleCloseDialog();
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    if (globalThis.confirm("Remove this staff member from the event?")) {
      deleteAssignment(assignmentId);
    }
  };

  const handleOpenSuggestDialog = (eventId: string) => {
    setSuggestEventId(eventId);
    setSuggestions(suggestStaffForEvent(eventId));
    setSelectedSuggestions(new Set());
    setOpenSuggestDialog(true);
  };

  const handleCloseSuggestDialog = () => {
    setOpenSuggestDialog(false);
    setSuggestEventId(null);
    setSuggestions([]);
    setSelectedSuggestions(new Set());
  };

  const handleToggleSuggestion = (staffId: string) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) {
        next.delete(staffId);
      } else {
        next.add(staffId);
      }
      return next;
    });
  };

  const handleApplySuggestions = () => {
    if (!suggestEventId) return;
    const event = events.find((e) => e.id === suggestEventId);
    if (!event) return;
    const hoursAllocated = calculateDurationHours(
      event.staffStartTime,
      event.staffEndTime
    );
    selectedSuggestions.forEach((staffId) => {
      addAssignment({ eventId: suggestEventId, staffId, hoursAllocated });
    });
    handleCloseSuggestDialog();
  };

  const getEventTypeName = (id: string) => {
    return eventTypes.find((et) => et.id === id)?.name || "Unknown";
  };

  const getLocationName = (id: string) => {
    return locations.find((l) => l.id === id)?.name || "Unknown";
  };

  const getWeekStart = (date: string): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split("T")[0];
  };

  const renderStaffWeekHoverCard = (staffId: string, date: string) => {
    const weekStart = getWeekStart(date);
    const weekLoad = getStaffWeeklyLoad(staffId, weekStart);

    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: "bold" }}>
          Week starting {formatDate(weekStart)}:
        </Typography>
        <Typography variant="caption">
          Hours committed: {weekLoad.hoursCommitted}h of{" "}
          {staff.find((s) => s.id === staffId)?.availableHoursPerWeek}h
        </Typography>
        {weekLoad.assignments.length > 0 && (
          <Box>
            <Typography variant="caption" sx={{ fontWeight: "bold" }}>
              Assignments:
            </Typography>
            {weekLoad.assignments.map((a) => (
              <Typography key={a.id} variant="caption" display="block">
                • {a.eventDetail && getEventTypeName(a.eventDetail.eventTypeId)}{" "}
                at {a.eventDetail && getLocationName(a.eventDetail.locationId)}
              </Typography>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Staff Assignments
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          placeholder="Search by event type or location"
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

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Assigned Staff</InputLabel>
          <Select
            value={staffFilter}
            label="Assigned Staff"
            onChange={(e) => setStaffFilter(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            {staff.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
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

        <FormControlLabel
          control={
            <Checkbox
              checked={needStaffOnly}
              onChange={(e) => setNeedStaffOnly(e.target.checked)}
            />
          }
          label="Needs staff"
        />
      </Box>

      {filteredEvents.length === 0 ? (
        <Typography align="center" color="textSecondary" sx={{ py: 3 }}>
          No events match the current filters.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {(() => {
            const start = (page - 1) * pageSize;
            const end = start + pageSize;
            return filteredEvents.slice(start, end).map((event) => {
              const eventType = eventTypes.find(
                (et) => et.id === event.eventTypeId
              );
              const location = locations.find((l) => l.id === event.locationId);
              const eventAssignments = getAssignmentsForEvent(event.id);
              const availableStaff = getAvailableStaffForEvent(event.id);

              return (
                <Card key={event.id}>
                  <CardHeader
                    title={
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="h6">
                          {eventType?.name || "Unknown"} -{" "}
                          {formatDate(event.date)}
                        </Typography>
                      </Box>
                    }
                    subheader={`Event: ${event.startTime} - ${
                      event.endTime
                    } | Staff: ${event.staffStartTime} - ${
                      event.staffEndTime
                    } at ${location?.name || "Unknown"}`}
                  />
                  <CardContent>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Assigned Staff ({eventAssignments.length})
                      </Typography>
                      {eventAssignments.length === 0 ? (
                        <Typography variant="caption" color="textSecondary">
                          No staff assigned yet
                        </Typography>
                      ) : (
                        <TableContainer component={Paper} sx={{ mb: 2 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                                <TableCell>Staff Member</TableCell>
                                <TableCell>Hours Allocated</TableCell>
                                <TableCell align="right">Action</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {eventAssignments.map((assignment) => (
                                <TableRow key={assignment.id}>
                                  <TableCell>
                                    <Tooltip
                                      title={renderStaffWeekHoverCard(
                                        assignment.staffId,
                                        event.date
                                      )}
                                      arrow
                                    >
                                      <span>
                                        {assignment.staffDetail?.name ||
                                          "Unknown"}
                                        <InfoIcon
                                          sx={{
                                            fontSize: 14,
                                            ml: 0.5,
                                            verticalAlign: "text-bottom",
                                          }}
                                        />
                                      </span>
                                    </Tooltip>
                                  </TableCell>
                                  <TableCell>
                                    {assignment.hoursAllocated}h
                                  </TableCell>
                                  <TableCell align="right">
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        handleRemoveAssignment(assignment.id)
                                      }
                                      color="error"
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Box>

                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog(event.id)}
                        disabled={availableStaff.length === 0}
                      >
                        {availableStaff.length === 0
                          ? "No available staff"
                          : `Assign Staff (${availableStaff.length} available)`}
                      </Button>
                      {eventAssignments.length <
                        (eventType?.minimumStaffRequired || 1) && (
                        <Button
                          variant="outlined"
                          size="small"
                          color="secondary"
                          startIcon={<AutoAwesomeIcon />}
                          onClick={() => handleOpenSuggestDialog(event.id)}
                          disabled={availableStaff.length === 0}
                        >
                          Suggest Staff
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              );
            });
          })()}
        </Box>
      )}

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Assign Staff to Event</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedEventId && (
            <>
              {(() => {
                const event = events.find((e) => e.id === selectedEventId);
                const eventType = eventTypes.find(
                  (et) => et.id === event?.eventTypeId
                );
                return (
                  <Box
                    sx={{
                      mb: 2,
                      p: 2,
                      backgroundColor: "#f5f5f5",
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="subtitle2">
                      {eventType?.name} - {event && formatDate(event.date)}
                    </Typography>
                    {eventType && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="textSecondary">
                          Staff requirements:
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mt: 0.5 }}>
                          {normalizeEventTypeStaffRequirements(eventType).map((requirement, index) => (
                            <Typography key={requirement.id} variant="caption" color="textSecondary">
                              Staff Slot {index + 1}: {summarizeRequirement(requirement)}
                            </Typography>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                );
              })()}

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Available Staff
              </Typography>

              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableCell>Name</TableCell>
                      <TableCell>This Week Hours</TableCell>
                      <TableCell>Eligibility</TableCell>
                      <TableCell align="center">Select</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(() => {
                      const event = events.find(
                        (e) => e.id === selectedEventId
                      );
                      const availableStaff =
                        getAvailableStaffForEvent(selectedEventId);
                      return availableStaff.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 2 }}>
                            No available staff for this event
                          </TableCell>
                        </TableRow>
                      ) : (
                        availableStaff.map((s) => {
                          const weekStart = getWeekStart(event?.date || "");
                          const weekLoad = getStaffWeeklyLoad(s.id, weekStart);
                          return (
                            <TableRow
                              key={s.id}
                              onClick={() => setSelectedStaffId(s.id)}
                              sx={{
                                backgroundColor:
                                  selectedStaffId === s.id
                                    ? "#e3f2fd"
                                    : "inherit",
                                cursor: "pointer",
                              }}
                            >
                              <TableCell>{s.name}</TableCell>
                              <TableCell>
                                {weekLoad.hoursCommitted}h /{" "}
                                {s.availableHoursPerWeek}h
                              </TableCell>
                              <TableCell>
                                {(() => {
                                  const event = events.find(
                                    (e) => e.id === selectedEventId
                                  );
                                  const eventType = event
                                    ? eventTypes.find(
                                        (et) => et.id === event.eventTypeId
                                      )
                                    : undefined;
                                  const requirementSummaries = eventType
                                    ? normalizeEventTypeStaffRequirements(eventType).map(summarizeRequirement)
                                    : [];

                                  return (
                                    <Box
                                      sx={{
                                        display: "flex",
                                        gap: 1,
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}
                                    >
                                      <Tooltip
                                        title={
                                          <Box
                                            sx={{
                                              display: "flex",
                                              flexDirection: "column",
                                              gap: 1,
                                            }}
                                          >
                                            <Typography variant="caption">
                                              Eligible for at least one open staff slot.
                                            </Typography>
                                            {requirementSummaries.length === 0 ? (
                                              <Typography variant="caption">
                                                No qualifications required
                                              </Typography>
                                            ) : (
                                              requirementSummaries.map((summary) => (
                                                <Typography key={summary} variant="caption">
                                                  {summary}
                                                </Typography>
                                              ))
                                            )}
                                          </Box>
                                        }
                                      >
                                        <Badge
                                          badgeContent="Eligible"
                                          color="success"
                                          sx={{
                                            "& .MuiBadge-badge": {
                                              right: -6,
                                              top: 6,
                                              padding: "0 10px",
                                              borderRadius: 12,
                                              fontSize: "0.8rem",
                                              height: 24,
                                              minWidth: 96,
                                              whiteSpace: "nowrap",
                                              display: "inline-flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              textTransform: "capitalize",
                                              fontWeight: 500,
                                            },
                                          }}
                                        >
                                          <Box />
                                        </Badge>
                                      </Tooltip>
                                    </Box>
                                  );
                                })()}
                              </TableCell>
                              <TableCell align="center">
                                <input
                                  type="radio"
                                  name="staff"
                                  checked={selectedStaffId === s.id}
                                  onChange={() => setSelectedStaffId(s.id)}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })
                      );
                    })()}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleAssignStaff} variant="contained">
            Assign
          </Button>
        </DialogActions>
      </Dialog>

      {/* Staff Suggestions Dialog */}
      <Dialog
        open={openSuggestDialog}
        onClose={handleCloseSuggestDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AutoAwesomeIcon color="secondary" />
          Staff Suggestions
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {suggestEventId &&
            (() => {
              const event = events.find((e) => e.id === suggestEventId);
              const eventType = eventTypes.find(
                (et) => et.id === event?.eventTypeId
              );
              return (
                <Box
                  sx={{
                    mb: 2,
                    p: 2,
                    backgroundColor: "#f5f5f5",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="subtitle2">
                    {eventType?.name} — {event && formatDate(event.date)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Staff window: {event?.staffStartTime} –{" "}
                    {event?.staffEndTime}
                  </Typography>
                </Box>
              );
            })()}

          {suggestions.length === 0 ? (
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{ py: 2, textAlign: "center" }}
            >
              No eligible staff available for this event.
            </Typography>
          ) : (
            <>
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ mb: 1, display: "block" }}
              >
                Ranked by qualification fit for each open staff slot (70%) and
                available capacity (30%). Select staff to assign.
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                      <TableCell padding="checkbox" />
                      <TableCell>Required Slot</TableCell>
                      <TableCell>Staff Member</TableCell>
                      <TableCell>Fitness Score</TableCell>
                      <TableCell>Qualifications</TableCell>
                      <TableCell>Hours This Week</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {suggestions.map((suggestion, idx) => {
                      const scorePercent = Math.round(suggestion.score * 100);
                      const scoreColor =
                        scorePercent >= 80
                          ? "success"
                          : scorePercent >= 50
                          ? "warning"
                          : "error";
                      const isSelected = selectedSuggestions.has(
                        suggestion.staff.id
                      );
                      return (
                        <TableRow
                          key={suggestion.staff.id}
                          onClick={() =>
                            handleToggleSuggestion(suggestion.staff.id)
                          }
                          sx={{
                            cursor: "pointer",
                            backgroundColor: isSelected ? "#e8f5e9" : "inherit",
                            "&:hover": {
                              backgroundColor: isSelected
                                ? "#c8e6c9"
                                : "#fafafa",
                            },
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={isSelected}
                              onChange={() =>
                                handleToggleSuggestion(suggestion.staff.id)
                              }
                              onClick={(e) => e.stopPropagation()}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{suggestion.requirementLabel}</TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                              }}
                            >
                              {idx === 0 && (
                                <Chip
                                  label="Best"
                                  size="small"
                                  color="secondary"
                                  sx={{ fontSize: "0.65rem", height: 18 }}
                                />
                              )}
                              <Typography variant="body2">
                                {suggestion.staff.name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ minWidth: 140 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Box sx={{ flex: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={scorePercent}
                                  color={scoreColor}
                                  sx={{ height: 8, borderRadius: 4 }}
                                />
                              </Box>
                              <Typography
                                variant="caption"
                                sx={{ minWidth: 34, textAlign: "right" }}
                              >
                                {scorePercent}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                gap: 0.5,
                                flexWrap: "wrap",
                              }}
                            >
                              {suggestion.matchedQualifications.map((q) => (
                                <Chip
                                  key={q}
                                  label={q}
                                  size="small"
                                  color="success"
                                  sx={{ color: "#fff", fontSize: "0.65rem" }}
                                />
                              ))}
                              {suggestion.missingQualifications.map((q) => (
                                <Chip
                                  key={q}
                                  label={q}
                                  size="small"
                                  color="default"
                                  sx={{ fontSize: "0.65rem" }}
                                />
                              ))}
                              {suggestion.matchedQualifications.length === 0 &&
                                suggestion.missingQualifications.length ===
                                  0 && (
                                  <Typography
                                    variant="caption"
                                    color="textSecondary"
                                  >
                                    None required
                                  </Typography>
                                )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {suggestion.hoursCommitted}h /{" "}
                              {suggestion.staff.availableHoursPerWeek}h
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSuggestDialog}>Cancel</Button>
          <Button
            onClick={() => {
              setSelectedSuggestions(
                new Set(suggestions.map((s) => s.staff.id))
              );
            }}
            disabled={suggestions.length === 0}
          >
            Select All
          </Button>
          <Button
            onClick={handleApplySuggestions}
            variant="contained"
            color="secondary"
            disabled={selectedSuggestions.size === 0}
            startIcon={<AutoAwesomeIcon />}
          >
            Assign Selected ({selectedSuggestions.size})
          </Button>
        </DialogActions>
      </Dialog>

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
            Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1} -{" "}
            {Math.min(page * pageSize, totalCount)} of {totalCount}
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
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
          />
        </Box>
      </Box>
    </Box>
  );
}
