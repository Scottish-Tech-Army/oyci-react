import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { useAppContext } from '../context/useAppContext';
import type { Event, EventType, Location, Assignment, Staff } from '../types';

interface MonthEventCardProps {
  readonly event: Event;
  readonly eventTypeById: Record<string, EventType>;
  readonly eventAssignments: Assignment[];
  readonly onEventClick: (event: Event) => void;
}

function MonthEventCard({ event, eventTypeById, eventAssignments, onEventClick }: Readonly<MonthEventCardProps>) {
  const eventType = eventTypeById[event.eventTypeId];
  
  return (
    <Box
      key={event.id}
      onClick={() => onEventClick(event)}
      sx={{
        p: 1,
        backgroundColor: '#e0e0e0',
        borderRadius: 1,
        fontSize: '0.75rem',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: '#bdbdbd',
        },
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          fontWeight: 'bold',
        }}
      >
        {eventType?.name || 'Event'}
      </Typography>
      <Typography
        variant="caption"
        sx={{ display: 'block' }}
      >
        {event.staffStartTime} - {event.staffEndTime}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          color: '#0066cc',
        }}
      >
        {eventAssignments.length} staff
      </Typography>
    </Box>
  );
}

interface WeekEventCardProps {
  readonly event: Event;
  readonly eventTypeById: Record<string, EventType>;
  readonly locationById: Record<string, Location>;
  readonly eventAssignments: Assignment[];
  readonly staffById: Record<string, Staff>;
  readonly staffFilters: string[];
  readonly onEventClick: (event: Event) => void;
}

function WeekEventCard({
  event,
  eventTypeById,
  locationById,
  eventAssignments,
  staffById,
  staffFilters,
  onEventClick,
}: Readonly<WeekEventCardProps>) {
  const eventType = eventTypeById[event.eventTypeId];
  const location = locationById[event.locationId];

  return (
    <Card
      key={event.id}
      variant="outlined"
      onClick={() => onEventClick(event)}
      sx={{
        p: 1.5,
        backgroundColor: '#fafafa',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: '#f0f0f0',
          boxShadow: 1,
        },
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
        {eventType?.name || 'Event'}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Staff: {event.staffStartTime} - {event.staffEndTime}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        📍 {location?.name || 'Location'}
      </Typography>
      <Box sx={{ mt: 1 }}>
        <Chip
          label={`${eventAssignments.length} staff assigned`}
          size="small"
          variant="outlined"
        />
      </Box>
      {eventAssignments.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography
            variant="caption"
            sx={{ display: 'block', mb: 0.5 }}
          >
            Staff:
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap">
            {eventAssignments.map((assignment) => (
              <Chip
                key={assignment.id}
                label={staffById[assignment.staffId]?.name || 'Staff'}
                size="small"
                variant="outlined"
                color={
                  staffFilters.includes(assignment.staffId)
                    ? 'primary'
                    : 'default'
                }
              />
            ))}
          </Stack>
        </Box>
      )}
    </Card>
  );
}

export default function PublicCalendarPage() {
  const { events, eventTypes, locations, assignments, staff } = useAppContext();
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [staffFilters, setStaffFilters] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const weekTableRef = useRef<HTMLDivElement>(null);

  const eventTypeById = Object.fromEntries(eventTypes.map((et) => [et.id, et]));
  const locationById = Object.fromEntries(locations.map((loc) => [loc.id, loc]));
  const staffById = Object.fromEntries(staff.map((s) => [s.id, s]));

  const getWeekDays = (date: Dayjs): Dayjs[] => {
    const start = date.startOf('week');
    return Array.from({ length: 7 }, (_, i) => start.add(i, 'day'));
  };

  const weekDays = getWeekDays(selectedDate);
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  // Filter events based on selected staff
  const getFilteredEvents = (eventList: typeof events) => {
    if (staffFilters.length === 0) {
      return eventList;
    }

    return eventList.filter((event) => {
      const eventAssignments = assignments.filter((a) => a.eventId === event.id);
      const assignedStaffIds = new Set(eventAssignments.map((a) => a.staffId));
      return staffFilters.some((staffId) => assignedStaffIds.has(staffId));
    });
  };

  const monthEvents = getFilteredEvents(
    events
      .filter((event) => {
        const eventDate = dayjs(event.date);
        return (
          eventDate.month() === selectedMonth.month() &&
          eventDate.year() === selectedMonth.year()
        );
      })
      .sort((a, b) => {
        const byDate = a.date.localeCompare(b.date);
        if (byDate !== 0) return byDate;
        return a.startTime.localeCompare(b.startTime);
      })
  );

  const weekEvents = getFilteredEvents(
    events
      .filter((event) => {
        const eventDate = dayjs(event.date);
        return (
          !eventDate.isBefore(weekStart, 'day') &&
          !eventDate.isAfter(weekEnd, 'day')
        );
      })
      .sort((a, b) => {
        const byDate = a.date.localeCompare(b.date);
        if (byDate !== 0) return byDate;
        return a.startTime.localeCompare(b.startTime);
      })
  );

  const handleViewModeChange = (
    _: React.MouseEvent<HTMLElement>,
    newMode: 'month' | 'week' | null
  ) => {
    if (newMode) setViewMode(newMode);
  };

  const handleStaffFilterChange = (staffId: string) => {
    setStaffFilters((prev) =>
      prev.includes(staffId)
        ? prev.filter((id) => id !== staffId)
        : [...prev, staffId]
    );
  };

  const handleMonthPickerChange = (newValue: Dayjs | null) => {
    if (!newValue) return;
    setSelectedMonth(newValue);
    if (!selectedDate.isSame(newValue, 'month')) {
      setSelectedDate(newValue.startOf('month'));
    }
  };

  const handlePrev = () => {
    if (viewMode === 'week') {
      const nextDate = selectedDate.add(-7, 'day');
      setSelectedDate(nextDate);
      setSelectedMonth(nextDate);
    } else {
      const nextMonth = selectedMonth.add(-1, 'month');
      setSelectedMonth(nextMonth);
      if (!selectedDate.isSame(nextMonth, 'month')) {
        setSelectedDate(nextMonth.startOf('month'));
      }
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      const nextDate = selectedDate.add(7, 'day');
      setSelectedDate(nextDate);
      setSelectedMonth(nextDate);
    } else {
      const nextMonth = selectedMonth.add(1, 'month');
      setSelectedMonth(nextMonth);
      if (!selectedDate.isSame(nextMonth, 'month')) {
        setSelectedDate(nextMonth.startOf('month'));
      }
    }
  };

  const handleJumpToToday = () => {
    const today = dayjs();
    setSelectedMonth(today);
    setSelectedDate(today);
  };

  const handleExportWeekPng = async () => {
    if (viewMode !== 'week') {
      setViewMode('week');
      await new Promise((resolve) => { setTimeout(resolve, 150); });
    }
    if (!weekTableRef.current) return;

    const selectedStaffNames = staffFilters.length > 0
      ? staffFilters.map((id) => staffById[id]?.name).filter(Boolean).join(', ')
      : 'All Staff';
    const weekLabel = `${weekStart.format('D MMM')} - ${weekEnd.format('D MMM YYYY')}`;

    const canvas = await html2canvas(weekTableRef.current, { scale: 2, useCORS: true });
    const titleHeight = 40;
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height + titleHeight * 2;
    const ctx = out.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.fillStyle = '#111111';
    ctx.font = `bold ${titleHeight * 0.6}px sans-serif`;
    ctx.fillText(`Public Calendar - ${selectedStaffNames}`, 24, titleHeight);
    ctx.font = `${titleHeight * 0.45}px sans-serif`;
    ctx.fillText(`Week: ${weekLabel}`, 24, titleHeight * 1.7);
    ctx.drawImage(canvas, 0, titleHeight * 2);

    const fileStaffLabel = selectedStaffNames.replaceAll(' ', '-').toLowerCase();
    const link = document.createElement('a');
    link.download = `public-calendar-${fileStaffLabel}-${weekStart.format('YYYY-MM-DD')}.png`;
    link.href = out.toDataURL('image/png');
    link.click();
  };

  const getDaysInMonth = (date: Dayjs) => {
    const year = date.year();
    const month = date.month();
    const firstDay = dayjs().year(year).month(month).date(1);
    const lastDay = dayjs().year(year).month(month).daysInMonth();

    const days: (Dayjs | null)[] = [];

    const startWeek = firstDay.day();
    for (let i = startWeek - 1; i >= 0; i--) {
      days.push(null);
    }

    for (let i = 1; i <= lastDay; i++) {
      days.push(dayjs().year(year).month(month).date(i));
    }

    return days;
  };

  const getEventsForDate = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    return monthEvents.filter((e) => e.date === dateStr);
  };

  const getEventsForWeekDay = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    return weekEvents.filter((e) => e.date === dateStr);
  };

  const days = getDaysInMonth(selectedMonth);
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getAssignmentsForEvent = (eventId: string) => {
    return assignments.filter((a) => a.eventId === eventId);
  };

  const clearStaffFilters = () => {
    setStaffFilters([]);
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
  };

  const getBackgroundColor = (day: Dayjs | null) => {
    if (!day) return 'white';
    if (day.isSame?.(dayjs(), 'day')) return '#e3f2fd';
    if (!day.isSame(selectedMonth, 'month')) return '#fafafa';
    return 'white';
  };

  const getDateTextColor = (day: Dayjs | null) => {
    if (!day) return 'inherit';
    if (!day.isSame(selectedMonth, 'month')) return '#bdbdbd';
    return 'inherit';
  };

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', lg: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4">Public Staff Calendar</Typography>
          <Typography variant="body2" color="text.secondary">
            View upcoming events and staff assignments
          </Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="center">
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            size="small"
          >
            <ToggleButton value="month">Month</ToggleButton>
            <ToggleButton value="week">Week</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="outlined" onClick={handlePrev}>
            Previous
          </Button>
          <Button variant="outlined" onClick={handleJumpToToday}>
            Today
          </Button>
          <Button variant="outlined" onClick={handleNext}>
            Next
          </Button>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              value={selectedMonth}
              onChange={handleMonthPickerChange}
              slotProps={{
                textField: { size: 'small' },
              }}
            />
          </LocalizationProvider>
          <Button variant="contained" onClick={handleExportWeekPng}>
            Export Week PNG
          </Button>
        </Stack>
      </Stack>

      {/* Staff Filter Section */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f5f5f5' }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Filter by Staff Member
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select staff members to view only their assigned events
            </Typography>
          </Box>

          <Stack direction="row" flexWrap="wrap" gap={1}>
            {staff.map((staffMember) => (
              <Chip
                key={staffMember.id}
                label={staffMember.name}
                onClick={() => handleStaffFilterChange(staffMember.id)}
                color={staffFilters.includes(staffMember.id) ? 'primary' : 'default'}
                variant={staffFilters.includes(staffMember.id) ? 'filled' : 'outlined'}
              />
            ))}
          </Stack>

          {staffFilters.length > 0 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Selected: {staffFilters.map((id) => staffById[id]?.name).join(', ')}
              </Typography>
              <Button variant="text" size="small" onClick={clearStaffFilters}>
                Clear Filters
              </Button>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* Month View */}
      {viewMode === 'month' && (
        <Card>
          <CardContent>
            <Box>
              <Table sx={{ mb: 2 }}>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    {weekdays.map((day) => (
                      <TableCell
                        key={day}
                        align="center"
                        sx={{ fontWeight: 'bold', width: '14.28%' }}
                      >
                        {day}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
              </Table>

              {weeks.map((week) => {
                const weekStartDate = week[0]?.format('YYYY-MM-DD') || 'empty';
                return (
                  <Table key={`week-${weekStartDate}`}>
                    <TableBody>
                      <TableRow>
                        {week.map((day, dayIndex) => (
                        <TableCell
                            key={`day-${weekStartDate}-${dayIndex}`}
                          sx={{
                            width: '14.28%',
                            minHeight: '100px',
                            verticalAlign: 'top',
                            border: '1px solid #ddd',
                            backgroundColor: getBackgroundColor(day),
                          }}
                        >
                          <Box sx={{ minHeight: '100px', p: 1 }}>
                            {day && (
                              <>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 'bold',
                                    mb: 1,
                                    color: getDateTextColor(day),
                                  }}
                                >
                                  {day.date()}
                                </Typography>
                                <Stack spacing={0.5}>
                                  {getEventsForDate(day).map((event) => {
                                    const eventAssignments = getAssignmentsForEvent(
                                      event.id
                                    );
                                    return (
                                      <MonthEventCard
                                        key={event.id}
                                        event={event}
                                        eventTypeById={eventTypeById}
                                        eventAssignments={eventAssignments}
                                        onEventClick={handleEventClick}
                                      />
                                    );
                                  })}
                                </Stack>
                              </>
                            )}
                          </Box>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
                );
              })}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <Card>
          <CardContent>
            <Typography sx={{ mb: 2 }}>
              Week of {weekStart.format('MMM DD')} - {weekEnd.format('MMM DD, YYYY')}
            </Typography>
            <TableContainer ref={weekTableRef}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell sx={{ width: '12%', fontWeight: 'bold' }}>
                      Day
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Events</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {weekDays.map((day) => {
                    const dayEvents = getEventsForWeekDay(day);
                    return (
                      <TableRow key={day.format('YYYY-MM-DD')}>
                        <TableCell sx={{ fontWeight: 'bold' }}>
                          {day.format('ddd')}{' '}
                          <Typography variant="body2" color="text.secondary">
                            {day.format('MMM DD')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Stack spacing={1}>
                            {dayEvents.length > 0 ? (
                              dayEvents.map((event) => {
                                const eventAssignments = getAssignmentsForEvent(
                                  event.id
                                );
                                return (
                                  <WeekEventCard
                                    key={event.id}
                                    event={event}
                                    eventTypeById={eventTypeById}
                                    locationById={locationById}
                                    eventAssignments={eventAssignments}
                                    staffById={staffById}
                                    staffFilters={staffFilters}
                                    onEventClick={handleEventClick}
                                  />
                                );
                              })
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontStyle: 'italic' }}
                              >
                                No events scheduled
                              </Typography>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onClose={() => setSelectedEvent(null)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 'bold' }}>
            {eventTypes.find((et) => et.id === selectedEvent.eventTypeId)?.name || 'Event Details'}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  Event Date
                </Typography>
                <Typography variant="body2">
                  {dayjs(selectedEvent.date).format('dddd, MMMM DD, YYYY')}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  Event Time
                </Typography>
                <Typography variant="body2">
                  {selectedEvent.startTime} - {selectedEvent.endTime}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  Staff Required Time
                </Typography>
                <Typography variant="body2">
                  {selectedEvent.staffStartTime} - {selectedEvent.staffEndTime}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  Location
                </Typography>
                <Typography variant="body2">
                  {locationById[selectedEvent.locationId]?.name || 'Not specified'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  Staff Assigned ({assignments.filter((a) => a.eventId === selectedEvent.id).length})
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {assignments
                    .filter((a) => a.eventId === selectedEvent.id)
                    .map((assignment) => (
                      <Chip
                        key={assignment.id}
                        label={staffById[assignment.staffId]?.name || 'Staff'}
                        size="small"
                        variant="outlined"
                        color={
                          staffFilters.includes(assignment.staffId)
                            ? 'primary'
                            : 'default'
                        }
                      />
                    ))}
                </Stack>
              </Box>

              {selectedEvent.notes && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    Notes
                  </Typography>
                  <Typography variant="body2">{selectedEvent.notes}</Typography>
                </Box>
              )}

              {!!selectedEvent.maxAttendees && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    Max Attendees
                  </Typography>
                  <Typography variant="body2">{selectedEvent.maxAttendees}</Typography>
                </Box>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedEvent(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
