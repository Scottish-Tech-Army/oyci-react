import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Tooltip,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import BarChartIcon from '@mui/icons-material/BarChart';
import BoltIcon from '@mui/icons-material/Bolt';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EventIcon from '@mui/icons-material/Event';
import PeopleIcon from '@mui/icons-material/People';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AssignmentIcon from '@mui/icons-material/Assignment';
import WarningIcon from '@mui/icons-material/Warning';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useAppContext } from '../context/useAppContext';
import { fetchEventsList, fetchStaffList } from '../api/resourceApi';
import { normalizeEventTypeStaffRequirements, summarizeRequirement } from '../shared/staffRequirements';
import type { Event, Staff } from '../types';
import { calculateDurationHours, formatDate } from '../utils/helpers';
import EventFormDialog from '../components/EventFormDialog';

interface StatCardProps {
  readonly icon: React.ElementType;
  readonly title: string;
  readonly value: number;
  readonly color: string;
}

function StatCard({ icon: Icon, title, value, color }: Readonly<StatCardProps>) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              backgroundColor: color,
              borderRadius: '50%',
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            <Icon />
          </Box>
          <Box>
            <Typography variant="caption" color="textSecondary">
              {title}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              {value}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { events, staff, locations, eventTypes, assignments, addAssignment, getAvailableStaffForEvent, suggestStaffForEvent } = useAppContext();
  const [remoteEvents, setRemoteEvents] = useState<Event[] | null>(null);
  const [remoteStaff, setRemoteStaff] = useState<Staff[] | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [activeStaffId, setActiveStaffId] = useState<string | null>(null);
  const [selectedStaffToAssign, setSelectedStaffToAssign] = useState<string>('');
  const [assignError, setAssignError] = useState<string>('');
  const [openSuggestDialog, setOpenSuggestDialog] = useState(false);

  // Quick Actions — Create Event dialog
  const [openQuickEvent, setOpenQuickEvent] = useState(false);
  const [bulkSuggestions, setBulkSuggestions] = useState<
    {
      key: string;
      eventId: string;
      eventLabel: string;
      needsCount: number;
      slotIndex: number;
      requirementLabel: string;
      staffId: string;
      staffName: string;
      score: number;
      fullyQualified: boolean;
      hoursAllocated: number;
    }[]
  >([]);
  const [selectedPairs, setSelectedPairs] = useState<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;

    const loadTargetedData = async () => {
      try {
        const [fetchedEvents, fetchedStaff] = await Promise.all([
          fetchEventsList(),
          fetchStaffList(),
        ]);
        if (!isMounted) return;
        setRemoteEvents(fetchedEvents);
        setRemoteStaff(fetchedStaff);
      } catch {
        if (!isMounted) return;
        setRemoteEvents(null);
        setRemoteStaff(null);
      }
    };

    void loadTargetedData();
    return () => {
      isMounted = false;
    };
  }, [events.length, staff.length]);

  const eventsForView = remoteEvents ?? events;
  const staffForView = remoteStaff ?? staff;

  const upcomingEvents = eventsForView
    .filter((e) => new Date(e.date) >= new Date(new Date().setHours(0, 0, 0, 0)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const unassignedEvents = eventsForView.filter((e) => {
    const eventDate = new Date(e.date);
    eventDate.setHours(0, 0, 0, 0);
    if (eventDate < new Date(new Date().setHours(0, 0, 0, 0))) return false;
    const eventAssignments = assignments.filter((a) => a.eventId === e.id);
    const eventType = eventTypes.find((et) => et.id === e.eventTypeId);
    return eventAssignments.length < (eventType?.minimumStaffRequired || 1);
  });

  const activeEvent = activeEventId ? eventsForView.find((event) => event.id === activeEventId) : undefined;
  const activeEventType = activeEvent ? eventTypes.find((eventType) => eventType.id === activeEvent.eventTypeId) : undefined;
  const activeEventLocation = activeEvent ? locations.find((location) => location.id === activeEvent.locationId) : undefined;
  const activeEventAssignments = activeEvent ? assignments.filter((assignment) => assignment.eventId === activeEvent.id) : [];
  const availableStaffForActiveEvent = activeEvent ? getAvailableStaffForEvent(activeEvent.id) : [];

  const activeStaff = activeStaffId ? staffForView.find((staffMember) => staffMember.id === activeStaffId) : undefined;
  const activeStaffAssignments = activeStaffId
    ? assignments.filter((assignment) => assignment.staffId === activeStaffId)
    : [];

  const handleCloseEventDialog = () => {
    setActiveEventId(null);
    setSelectedStaffToAssign('');
    setAssignError('');
  };

  const handleOpenQuickEvent = () => setOpenQuickEvent(true);
  const handleCloseQuickEvent = () => setOpenQuickEvent(false);

  const navigateTo = (page: string) => {
    globalThis.dispatchEvent(new CustomEvent('navigate-page', { detail: { page } }));
  };

  const handleOpenSuggestDialog = () => {
    const rows = unassignedEvents.flatMap((e) => {
      const eventType = eventTypes.find((et) => et.id === e.eventTypeId);
      const currentCount = assignments.filter((a) => a.eventId === e.id).length;
      const minRequired = eventType?.minimumStaffRequired ?? 1;
      const needed = Math.max(0, minRequired - currentCount);
      const topSuggestions = suggestStaffForEvent(e.id);
      if (topSuggestions.length === 0) return [];
      const hoursAllocated = Math.max(0.5, calculateDurationHours(e.staffStartTime, e.staffEndTime));
      return topSuggestions.map((s, idx) => ({
        key: `${e.id}:${s.requirementId}:${s.staff.id}`,
        eventId: e.id,
        eventLabel: `${eventType?.name ?? 'Event'} on ${formatDate(e.date)}`,
        needsCount: needed,
        slotIndex: idx,
        requirementLabel: s.requirementLabel,
        staffId: s.staff.id,
        staffName: s.staff.name,
        score: s.score,
        fullyQualified: s.fullyQualified,
        hoursAllocated,
      }));
    });
    setBulkSuggestions(rows);
    setSelectedPairs(new Set(rows.map((r) => r.key)));
    setOpenSuggestDialog(true);
  };

  const handleCloseSuggestDialog = () => {
    setOpenSuggestDialog(false);
    setBulkSuggestions([]);
    setSelectedPairs(new Set());
  };

  const handleTogglePair = (key: string) => {
    setSelectedPairs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleConfirmAll = () => {
    bulkSuggestions
      .filter((r) => selectedPairs.has(r.key))
      .forEach((r) => {
        addAssignment({ eventId: r.eventId, staffId: r.staffId, hoursAllocated: r.hoursAllocated });
      });
    handleCloseSuggestDialog();
  };

  const handleAssignFromEventDialog = () => {
    if (!activeEvent || !selectedStaffToAssign) {
      setAssignError('Select a staff member first.');
      return;
    }

    const hours = Math.max(0.5, calculateDurationHours(activeEvent.startTime, activeEvent.endTime));

    addAssignment({ eventId: activeEvent.id, staffId: selectedStaffToAssign, hoursAllocated: hours });
    setSelectedStaffToAssign('');
    setAssignError('');
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Dashboard
      </Typography>

      {/* Quick Actions Panel */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <BoltIcon sx={{ color: '#d60087' }} />
            <Typography variant="h6">Quick Actions</Typography>
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
              gap: 1.5,
            }}
          >
            <Tooltip title="Create a new event" arrow>
              <Button
                variant="contained"
                onClick={handleOpenQuickEvent}
                sx={{
                  background: 'linear-gradient(135deg, #d60087 0%, #ff35aa 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #b0006e 0%, #e01090 100%)' },
                  textTransform: 'none',
                  py: 1.5,
                  flexDirection: 'column',
                  gap: 0.5,
                }}
              >
                <EventIcon sx={{ fontSize: 28 }} />
                Create Event
              </Button>
            </Tooltip>

            <Tooltip title="Manage staff members" arrow>
              <Button
                variant="outlined"
                onClick={() => navigateTo('staff')}
                sx={{ textTransform: 'none', py: 1.5, flexDirection: 'column', gap: 0.5 }}
              >
                <PeopleIcon sx={{ fontSize: 28 }} />
                Add Staff
              </Button>
            </Tooltip>

            <Tooltip title="View the staff calendar" arrow>
              <Button
                variant="outlined"
                onClick={() => navigateTo('calendar')}
                sx={{ textTransform: 'none', py: 1.5, flexDirection: 'column', gap: 0.5 }}
              >
                <CalendarMonthIcon sx={{ fontSize: 28 }} />
                Calendar
              </Button>
            </Tooltip>

            <Tooltip title="Manage staff assignments" arrow>
              <Button
                variant="outlined"
                onClick={() => navigateTo('assignments')}
                sx={{ textTransform: 'none', py: 1.5, flexDirection: 'column', gap: 0.5 }}
              >
                <AssignmentTurnedInIcon sx={{ fontSize: 28 }} />
                Assignments
              </Button>
            </Tooltip>

            <Tooltip title="View reports and analytics" arrow>
              <Button
                variant="outlined"
                onClick={() => navigateTo('reports')}
                sx={{ textTransform: 'none', py: 1.5, flexDirection: 'column', gap: 0.5 }}
              >
                <BarChartIcon sx={{ fontSize: 28 }} />
                Reports
              </Button>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>

      {unassignedEvents.length > 0 && (
        <Card sx={{ mb: 3, border: '2px solid #f44336' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon sx={{ color: '#f44336' }} />
                <Typography variant="h6" color="error">
                  ⚠️ Actions Required
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="secondary"
                size="small"
                startIcon={<AutoAwesomeIcon />}
                onClick={handleOpenSuggestDialog}
              >
                Suggest Staff for All
              </Button>
            </Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {unassignedEvents.length} event(s) below minimum staff requirement:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {unassignedEvents.slice(0, 5).map((e) => {
                const eventType = eventTypes.find((et) => et.id === e.eventTypeId);
                return (
                  <Chip
                    key={e.id}
                    label={`${eventType?.name} on ${formatDate(e.date)}`}
                    color="error"
                    variant="outlined"
                    onClick={() => setActiveEventId(e.id)}
                    clickable
                  />
                );
              })}
            </Box>
          </CardContent>
        </Card>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Upcoming Events (Next 5)
          </Typography>
          {upcomingEvents.length === 0 ? (
            <Typography variant="caption" color="textSecondary">
              No upcoming events
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell>Event</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Staff Assigned</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {upcomingEvents.map((event) => {
                    const eventType = eventTypes.find((et) => et.id === event.eventTypeId);
                    const location = locations.find((l) => l.id === event.locationId);
                    const eventAssignments = assignments.filter((a) => a.eventId === event.id);
                    const minRequired = eventType?.minimumStaffRequired || 1;

                    return (
                      <TableRow
                        key={event.id}
                        hover
                        onClick={() => setActiveEventId(event.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{eventType?.name}</TableCell>
                        <TableCell>{formatDate(event.date)}</TableCell>
                        <TableCell>{location?.name}</TableCell>
                        <TableCell>
                          <Chip
                            label={`${eventAssignments.length}/${minRequired}`}
                            color={eventAssignments.length >= minRequired ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Staff Utilisation (This Week)
          </Typography>
          {staff.length === 0 ? (
            <Typography variant="caption" color="textSecondary">
              No staff members
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell>Staff Member</TableCell>
                    <TableCell>Available Hours</TableCell>
                    <TableCell>Assignments</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {staff.map((s) => {
                    const staffAssignments = assignments.filter(
                      (a) => a.staffId === s.id
                    ).length;
                    return (
                      <TableRow
                        key={s.id}
                        hover
                        onClick={() => setActiveStaffId(s.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{s.name}</TableCell>
                        <TableCell>{s.availableHoursPerWeek}h/week</TableCell>
                        <TableCell>{staffAssignments}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
          gap: 2,
          mt: 3,
        }}
      >
        <StatCard
          icon={EventIcon}
          title="Total Events"
          value={eventsForView.length}
          color="#2196F3"
        />
        <StatCard
          icon={PeopleIcon}
          title="Total Staff"
          value={staffForView.length}
          color="#4CAF50"
        />
        <StatCard
          icon={LocationOnIcon}
          title="Locations"
          value={locations.length}
          color="#FF9800"
        />
        <StatCard
          icon={AssignmentIcon}
          title="Assignments"
          value={assignments.length}
          color="#9C27B0"
        />
      </Box>

      <Dialog open={Boolean(activeEvent)} onClose={handleCloseEventDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Event Details</DialogTitle>
        <DialogContent dividers>
          {!activeEvent && (
            <Typography variant="body2" color="text.secondary">
              Event details are unavailable.
            </Typography>
          )}
          {activeEvent && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {activeEventType?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDate(activeEvent.date)} at {activeEvent.startTime} - {activeEvent.endTime}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Location: {activeEventLocation?.name}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Assigned Staff ({activeEventAssignments.length}/{activeEventType?.minimumStaffRequired || 1})
              </Typography>
              {activeEventType && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
                  {normalizeEventTypeStaffRequirements(activeEventType).map((requirement, index) => (
                    <Typography key={requirement.id} variant="caption" color="text.secondary">
                      Staff Slot {index + 1}: {summarizeRequirement(requirement)}
                    </Typography>
                  ))}
                </Box>
              )}
              {activeEventAssignments.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No staff assigned yet.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {activeEventAssignments.map((assignment) => {
                    const assignedStaff = staff.find((staffMember) => staffMember.id === assignment.staffId);
                    return (
                      <Typography key={assignment.id} variant="body2">
                        {assignedStaff?.name} ({assignment.hoursAllocated}h)
                      </Typography>
                    );
                  })}
                </Box>
              )}
              {/* Assignment controls */}
              <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="assign-staff-label">Assign staff</InputLabel>
                  <Select
                    labelId="assign-staff-label"
                    label="Assign staff"
                    value={selectedStaffToAssign}
                    onChange={(e) => {
                      setSelectedStaffToAssign(e.target.value);
                      setAssignError('');
                    }}
                  >
                    <MenuItem value="">None</MenuItem>
                    {availableStaffForActiveEvent.map((s) => (
                      <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="contained"
                  disabled={!selectedStaffToAssign || !activeEvent}
                  onClick={handleAssignFromEventDialog}
                >
                  Assign
                </Button>
              </Box>
              {assignError ? (
                <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                  {assignError}
                </Typography>
              ) : null}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEventDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(activeStaff)} onClose={() => setActiveStaffId(null)} maxWidth="sm" fullWidth>        <DialogTitle>Staff Details</DialogTitle>
        <DialogContent dividers>
          {!activeStaff && (
            <Typography variant="body2" color="text.secondary">
              Staff details are unavailable.
            </Typography>
          )}
          {activeStaff && (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {activeStaff.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {activeStaff.email}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                Available: {activeStaff.availableHoursPerWeek}h/week
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Qualifications
              </Typography>
              {activeStaff.qualifications.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No qualifications recorded.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {activeStaff.qualifications.map((qualification) => (
                    <Chip key={qualification} label={qualification} size="small" />
                  ))}
                </Box>
              )}

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Assignments ({activeStaffAssignments.length})
              </Typography>
              {activeStaffAssignments.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No assignments yet.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {activeStaffAssignments.map((assignment) => {
                    const event = events.find((eventItem) => eventItem.id === assignment.eventId);
                    const eventTypeName = event ? eventTypes.find((eventType) => eventType.id === event.eventTypeId)?.name : 'Unknown event';
                    return (
                      <Typography key={assignment.id} variant="body2">
                        {eventTypeName} on {event ? formatDate(event.date) : 'Unknown date'} ({assignment.hoursAllocated}h)
                      </Typography>
                    );
                  })}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiveStaffId(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Quick Create Event Dialog */}
      <EventFormDialog open={openQuickEvent} onClose={handleCloseQuickEvent} />

      {/* Staff Suggestions Dialog */}
      <Dialog open={openSuggestDialog} onClose={handleCloseSuggestDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon color="secondary" />
          Suggested Staff for All Actions
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {bulkSuggestions.length === 0 ? (
            <Typography variant="body2" color="textSecondary" sx={{ py: 2, textAlign: 'center' }}>
              No eligible staff found for any of the understaffed events.
            </Typography>
          ) : (
            <>
              <Typography variant="caption" color="textSecondary" sx={{ mb: 2, display: 'block' }}>
                The best-fit staff have been pre-selected for each vacancy. Uncheck any you'd like to skip, then confirm.
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell padding="checkbox" />
                      <TableCell>Event</TableCell>
                      <TableCell>Required Slot</TableCell>
                      <TableCell>Suggested Staff</TableCell>
                      <TableCell>Match</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bulkSuggestions.map((row) => {
                      const isSelected = selectedPairs.has(row.key);
                      const scorePercent = Math.round(row.score * 100);
                      let matchLabel = row.fullyQualified ? 'Fully qualified' : 'Partial match';
                      if (!row.fullyQualified && scorePercent < 50) matchLabel = 'Weak match';
                      let matchColor: 'success' | 'warning' | 'default' = 'default';
                      if (row.fullyQualified) matchColor = 'success';
                      else if (scorePercent >= 50) matchColor = 'warning';
                      const isFirstInGroup = row.slotIndex === 0;
                      return (
                        <TableRow
                          key={row.key}
                          onClick={() => handleTogglePair(row.key)}
                          sx={{
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#e8f5e9' : 'inherit',
                            '&:hover': { backgroundColor: isSelected ? '#c8e6c9' : '#fafafa' },
                            borderTop: isFirstInGroup && row.slotIndex !== bulkSuggestions[0].slotIndex
                              ? '2px solid #e0e0e0'
                              : undefined,
                          }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleTogglePair(row.key)}
                              onClick={(e) => e.stopPropagation()}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            {isFirstInGroup ? (
                              <Box>
                                <Typography variant="body2">{row.eventLabel}</Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {row.needsCount} staff slot{row.needsCount === 1 ? '' : 's'} needed
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="caption" color="textSecondary" sx={{ pl: 1 }}>
                                ↳ slot {row.slotIndex + 1}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.requirementLabel}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.staffName}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={matchLabel} color={matchColor} size="small" />
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
            onClick={handleConfirmAll}
            variant="contained"
            color="secondary"
            disabled={selectedPairs.size === 0}
            startIcon={<AutoAwesomeIcon />}
          >
            Confirm {selectedPairs.size} Assignment{selectedPairs.size === 1 ? '' : 's'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
