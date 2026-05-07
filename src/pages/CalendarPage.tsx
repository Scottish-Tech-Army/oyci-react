import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  type SelectChangeEvent,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { useAppContext } from '../context/useAppContext';
import { formatDate } from '../utils/helpers';

export default function CalendarPage() {
  const { events, eventTypes, locations, assignments, getAssignmentsForEvent, staff } = useAppContext();
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const weekTableRef = useRef<HTMLDivElement>(null);

  const eventTypeById = Object.fromEntries(eventTypes.map((et) => [et.id, et]));
  const locationById = Object.fromEntries(locations.map((loc) => [loc.id, loc]));

  const assignmentCountByEventId = assignments.reduce<Record<string, number>>((acc, assignment) => {
    const current = acc[assignment.eventId] ?? 0;
    acc[assignment.eventId] = current + 1;
    return acc;
  }, {});

  const getWeekDays = (date: Dayjs): Dayjs[] => {
    const start = date.startOf('week');
    return Array.from({ length: 7 }, (_, i) => start.add(i, 'day'));
  };

  const weekDays = getWeekDays(selectedDate);
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];

  const monthEvents = events
    .filter((event) => {
      const eventDate = dayjs(event.date);
      const inSelectedMonth = eventDate.month() === selectedMonth.month() && eventDate.year() === selectedMonth.year();
      const matchesType = eventTypeFilter === 'all' || event.eventTypeId === eventTypeFilter;
      return inSelectedMonth && matchesType;
    })
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      return a.startTime.localeCompare(b.startTime);
    });

  const staffEventIds = staffFilter === 'all'
    ? null
    : new Set(assignments.filter((a) => a.staffId === staffFilter).map((a) => a.eventId));

  const weekEvents = events
    .filter((event) => {
      const eventDate = dayjs(event.date);
      const inWeek = !eventDate.isBefore(weekStart, 'day') && !eventDate.isAfter(weekEnd, 'day');
      const matchesType = eventTypeFilter === 'all' || event.eventTypeId === eventTypeFilter;
      const matchesStaff = staffEventIds === null || staffEventIds.has(event.id);
      return inWeek && matchesType && matchesStaff;
    })
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      return a.startTime.localeCompare(b.startTime);
    });

  const getEventsForWeekDay = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    return weekEvents.filter((e) => e.date === dateStr);
  };

  const getDaysInMonth = (date: Dayjs) => {
    const year = date.year();
    const month = date.month();
    const firstDay = dayjs().year(year).month(month).date(1);
    const lastDay = dayjs().year(year).month(month).daysInMonth();

    const days: (Dayjs | null)[] = [];

    // Add padding for days from previous month
    const startWeek = firstDay.day();
    for (let i = startWeek - 1; i >= 0; i--) {
      days.push(null);
    }

    // Add days of current month
    for (let i = 1; i <= lastDay; i++) {
      days.push(dayjs().year(year).month(month).date(i));
    }

    return days;
  };

  const getEventsForDate = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    return monthEvents.filter((e) => e.date === dateStr);
  };

  const shiftMonth = (delta: number) => {
    const nextMonth = selectedMonth.add(delta, 'month');
    setSelectedMonth(nextMonth);
    if (!selectedDate.isSame(nextMonth, 'month')) {
      setSelectedDate(nextMonth.startOf('month'));
    }
  };

  const shiftWeek = (delta: number) => {
    const nextDate = selectedDate.add(delta * 7, 'day');
    setSelectedDate(nextDate);
    setSelectedMonth(nextDate);
  };

  const handlePrev = () => viewMode === 'week' ? shiftWeek(-1) : shiftMonth(-1);
  const handleNext = () => viewMode === 'week' ? shiftWeek(1) : shiftMonth(1);

  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, newMode: 'month' | 'week' | null) => {
    if (newMode) setViewMode(newMode);
  };

  const handleMonthPickerChange = (newValue: Dayjs | null) => {
    if (!newValue) return;
    setSelectedMonth(newValue);
    if (!selectedDate.isSame(newValue, 'month')) {
      setSelectedDate(newValue.startOf('month'));
    }
  };

  const handleFilterChange = (event: SelectChangeEvent<string>) => {
    setEventTypeFilter(event.target.value);
  };

  const handleStaffFilterChange = (event: SelectChangeEvent<string>) => {
    setStaffFilter(event.target.value);
  };

  const handleExportPng = async () => {
    // Switch to week view if not already, then wait for render
    if (viewMode !== 'week') {
      setViewMode('week');
      // Allow React to re-render before capturing
      await new Promise((resolve) => { setTimeout(resolve, 150); });
    }
    if (!weekTableRef.current) return;
    const selectedStaff = staff.find((s) => s.id === staffFilter);
    const label = selectedStaff ? selectedStaff.name : 'All Staff';
    const weekLabel = `${weekStart.format('D MMM')} – ${weekEnd.format('D MMM YYYY')}`;

    const canvas = await html2canvas(weekTableRef.current, { scale: 2, useCORS: true });

    // Composite: add a title bar above the captured table
    const padding = 16;
    const titleHeight = 40;
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height + titleHeight * 2;
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.fillStyle = '#111111';
    ctx.font = `bold ${titleHeight * 0.6}px sans-serif`;
    ctx.fillText(`${label} — ${weekLabel}`, padding * 2, titleHeight * 1.1);
    ctx.drawImage(canvas, 0, titleHeight * 2);

    const link = document.createElement('a');
    link.download = `calendar-${label.replaceAll(' ', '-').toLowerCase()}-${weekStart.format('YYYY-MM-DD')}.png`;
    link.href = out.toDataURL('image/png');
    link.click();
  };

  const handleJumpToToday = () => {
    const today = dayjs();
    setSelectedMonth(today);
    setSelectedDate(today);
  };

  const days = getDaysInMonth(selectedMonth);
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const selectedDateEvents = getEventsForDate(selectedDate);
  const activeEvent = activeEventId ? monthEvents.find((event) => event.id === activeEventId) : undefined;
  const activeEventType = activeEvent ? eventTypeById[activeEvent.eventTypeId] : undefined;
  const activeLocation = activeEvent ? locationById[activeEvent.locationId] : undefined;
  const activeEventAssignments = activeEvent ? getAssignmentsForEvent(activeEvent.id) : [];
  const activeRequiredQualifications = activeEventType?.requiredQualifications ?? [];
  const activeAssignedCount = activeEvent ? assignmentCountByEventId[activeEvent.id] ?? 0 : 0;
  const activeMinStaff = activeEventType?.minimumStaffRequired ?? 1;
  const activeHasEnoughStaff = activeAssignedCount >= activeMinStaff;

  const openEventModal = (eventId: string) => {
    setActiveEventId(eventId);
  };

  const closeEventModal = () => {
    setActiveEventId(null);
  };

  const openInAssignments = () => {
    if (!activeEvent) return;
    sessionStorage.setItem('oyci.assignmentsEventId', activeEvent.id);
    window.dispatchEvent(new CustomEvent('navigate-page', { detail: { page: 'assignments' } }));
    closeEventModal();
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
          <Typography variant="h4">Calendar View</Typography>
          <Typography variant="body2" color="text.secondary">
            Click any day to review details and staffing status.
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
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="event-type-filter-label">Event Type</InputLabel>
            <Select
              labelId="event-type-filter-label"
              value={eventTypeFilter}
              label="Event Type"
              onChange={handleFilterChange}
            >
              <MenuItem value="all">All Event Types</MenuItem>
              {eventTypes.map((eventType) => (
                <MenuItem key={eventType.id} value={eventType.id}>
                  {eventType.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="staff-filter-label">Staff Member</InputLabel>
            <Select
              labelId="staff-filter-label"
              value={staffFilter}
              label="Staff Member"
              onChange={handleStaffFilterChange}
            >
              <MenuItem value="all">All Staff</MenuItem>
              {staff.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" size="small" onClick={handleExportPng}>
            Export Week PNG
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
        <Chip size="small" label="Selected Day" sx={{ backgroundColor: 'rgba(16, 182, 234, 0.2)' }} />
        <Chip size="small" label="Today" sx={{ backgroundColor: 'rgba(230, 0, 141, 0.2)' }} />
        <Chip size="small" label="Understaffed" sx={{ backgroundColor: 'rgba(211, 47, 47, 0.15)' }} />
        <Chip size="small" label="Meets Staffing" sx={{ backgroundColor: 'rgba(46, 125, 50, 0.15)' }} />
      </Stack>

      {viewMode === 'week' && (
        <TableContainer component={Paper} sx={{ mb: 2 }} ref={weekTableRef}>
          <Table sx={{ tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                {weekDays.map((day) => {
                  const isToday = day.isSame(dayjs(), 'day');
                  const isSelected = day.isSame(selectedDate, 'day');
                  let weekHeaderBg = 'inherit';
                  if (isSelected) weekHeaderBg = 'rgba(16, 182, 234, 0.15)';
                  else if (isToday) weekHeaderBg = 'rgba(230, 0, 141, 0.09)';
                  return (
                    <TableCell
                      key={day.format('YYYY-MM-DD')}
                      align="center"
                      sx={{
                        fontWeight: 'bold',
                        width: '14.28%',
                        backgroundColor: weekHeaderBg,
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedDate(day)}
                    >
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                        {day.format('ddd')}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isToday || isSelected ? 'bold' : 'normal',
                          color: isToday ? 'rgba(230, 0, 141, 0.9)' : 'inherit',
                        }}
                      >
                        {day.date()}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                        {day.format('MMM')}
                      </Typography>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow sx={{ verticalAlign: 'top' }}>
                {weekDays.map((day) => {
                  const dateStr = day.format('YYYY-MM-DD');
                  const dayEvents = getEventsForWeekDay(day);
                  const isToday = day.isSame(dayjs(), 'day');
                  const isSelected = day.isSame(selectedDate, 'day');
                  let weekCellBg = 'inherit';
                  if (isSelected) weekCellBg = 'rgba(16, 182, 234, 0.12)';
                  else if (isToday) weekCellBg = 'rgba(230, 0, 141, 0.06)';
                  return (
                    <TableCell
                      key={dateStr}
                      onClick={() => setSelectedDate(day)}
                      sx={{
                        border: '1px solid #ddd',
                        backgroundColor: weekCellBg,
                        verticalAlign: 'top',
                        padding: 1,
                        cursor: 'pointer',
                        minHeight: 160,
                      }}
                    >
                      <Box>
                        {dayEvents.length === 0 && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                            No events
                          </Typography>
                        )}
                        {dayEvents.map((event) => {
                          const eventType = eventTypeById[event.eventTypeId];
                          const assignedCount = assignmentCountByEventId[event.id] ?? 0;
                          const minimumStaff = eventType?.minimumStaffRequired ?? 1;
                          const hasEnoughStaff = assignedCount >= minimumStaff;
                          return (
                            <Box
                              key={event.id}
                              onClick={(e) => { e.stopPropagation(); openEventModal(event.id); }}
                              sx={{
                                mb: 0.5,
                                p: 0.5,
                                backgroundColor: hasEnoughStaff ? '#e8f5e9' : '#ffebee',
                                borderLeft: `3px solid ${hasEnoughStaff ? '#2e7d32' : '#d32f2f'}`,
                                borderRadius: 0.5,
                                overflow: 'hidden',
                                cursor: 'pointer',
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: 'bold', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                              >
                                {eventType?.name}
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block', fontSize: '0.65rem' }}>
                                {event.startTime}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ display: 'block', fontSize: '0.65rem', color: hasEnoughStaff ? '#2e7d32' : '#d32f2f' }}
                              >
                                Staff: {assignedCount}/{minimumStaff}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {viewMode === 'month' && (
      <TableContainer component={Paper}>
        <Table sx={{ tableLayout: 'fixed' }}>
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
          <TableBody>
            {weeks.map((week, weekIdx) => {
              const weekKey = `${selectedMonth.year()}-${selectedMonth.month()}-week-${weekIdx}`;
              return (
                <TableRow key={weekKey} sx={{ height: 150 }}>
                  {week.map((date, dayIdx) => {
                    const dateKey = date ? date.format('YYYY-MM-DD') : `empty-${dayIdx}`;
                    const dateEvents = date ? getEventsForDate(date) : [];
                    const visibleEvents = dateEvents.slice(0, 2);
                    const overflowCount = Math.max(dateEvents.length - visibleEvents.length, 0);
                    const isToday = Boolean(date?.isSame(dayjs(), 'day'));
                    const isSelected = Boolean(date?.isSame(selectedDate, 'day'));
                    return (
                      <TableCell
                        key={dateKey}
                        onClick={() => {
                          if (date) setSelectedDate(date);
                        }}
                        sx={{
                          border: '1px solid #ddd',
                          backgroundColor: isSelected
                            ? 'rgba(16, 182, 234, 0.12)'
                            : isToday
                              ? 'rgba(230, 0, 141, 0.09)'
                              : 'inherit',
                          verticalAlign: 'top',
                          padding: 1,
                          cursor: date ? 'pointer' : 'default',
                        }}
                      >
                        {date && (
                          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: isToday || isSelected ? 'bold' : 'normal',
                                  color: date.month() === selectedMonth.month() ? 'inherit' : '#999',
                                }}
                              >
                                {date.date()}
                              </Typography>
                              {dateEvents.length > 0 && <Chip size="small" label={dateEvents.length} />}
                            </Stack>
                            <Box sx={{ overflow: 'auto', flex: 1, mt: 0.5 }}>
                              {visibleEvents.map((event) => {
                                const eventType = eventTypeById[event.eventTypeId];
                                const assignedCount = assignmentCountByEventId[event.id] ?? 0;
                                const minimumStaff = eventType?.minimumStaffRequired ?? 1;
                                const hasEnoughStaff = assignedCount >= minimumStaff;
                                return (
                                  <Box
                                    key={event.id}
                                    onClick={(clickEvent) => {
                                      clickEvent.stopPropagation();
                                      openEventModal(event.id);
                                    }}
                                    sx={{
                                      mb: 0.5,
                                      p: 0.5,
                                      backgroundColor: hasEnoughStaff ? '#e8f5e9' : '#ffebee',
                                      borderLeft: `3px solid ${hasEnoughStaff ? '#2e7d32' : '#d32f2f'}`,
                                      borderRadius: 0.5,
                                      overflow: 'hidden',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontWeight: 'bold',
                                        display: 'block',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {eventType?.name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ display: 'block', fontSize: '0.65rem' }}>
                                      {event.startTime}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        display: 'block',
                                        fontSize: '0.65rem',
                                        color: hasEnoughStaff ? '#2e7d32' : '#d32f2f',
                                      }}
                                    >
                                      Staff: {assignedCount}/{minimumStaff}
                                    </Typography>
                                  </Box>
                                );
                              })}
                              {overflowCount > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  +{overflowCount} more
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      )}

      <Card sx={{ mt: 2, mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Selected Day: {formatDate(selectedDate.format('YYYY-MM-DD'))}
          </Typography>
          {selectedDateEvents.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No events scheduled for this date.
            </Typography>
          )}
          {selectedDateEvents.map((event) => {
            const eventType = eventTypeById[event.eventTypeId];
            const location = locationById[event.locationId];
            const assignedCount = assignmentCountByEventId[event.id] ?? 0;
            const minimumStaff = eventType?.minimumStaffRequired ?? 1;
            const hasEnoughStaff = assignedCount >= minimumStaff;

            return (
              <Paper
                key={event.id}
                onClick={() => openEventModal(event.id)}
                sx={{ p: 1.5, mb: 1.25, cursor: 'pointer' }}
              >
                <Stack
                  direction={{ xs: 'column', md: 'row' }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', md: 'center' }}
                >
                  <Box>
                    <Typography variant="subtitle2">{eventType?.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Event: {event.startTime} - {event.endTime} | Staff: {event.staffStartTime} - {event.staffEndTime} at {location?.name}
                    </Typography>
                  </Box>
                  <Chip
                    label={hasEnoughStaff ? `Staffed ${assignedCount}/${minimumStaff}` : `Need Staff ${assignedCount}/${minimumStaff}`}
                    color={hasEnoughStaff ? 'success' : 'error'}
                    size="small"
                  />
                </Stack>
              </Paper>
            );
          })}
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
        Events This Month
      </Typography>

      {monthEvents.map((event) => {
          const eventType = eventTypeById[event.eventTypeId];
          const location = locationById[event.locationId];
          const eventAssignmentsCount = assignmentCountByEventId[event.id] ?? 0;

          return (
            <Card key={event.id} sx={{ mb: 2, cursor: 'pointer' }} onClick={() => openEventModal(event.id)}>
              <CardContent>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <Box>
                    <Typography variant="subtitle2">{eventType?.name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {formatDate(event.date)} at {event.startTime}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Location
                    </Typography>
                    <Typography variant="body2">{location?.name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Event Time
                    </Typography>
                    <Typography variant="body2">
                      {event.startTime} - {event.endTime}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Staff Time
                    </Typography>
                    <Typography variant="body2">
                      {event.staffStartTime} - {event.staffEndTime}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Staff Assigned
                    </Typography>
                    <Typography variant="body2">
                      {eventAssignmentsCount}/{eventType?.minimumStaffRequired || 1}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}

      {monthEvents.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No events match this month and filter.
        </Typography>
      )}

      <Dialog open={Boolean(activeEvent)} onClose={closeEventModal} fullWidth maxWidth="sm">
        <DialogTitle>Event Details</DialogTitle>
        <DialogContent dividers>
          {!activeEvent && (
            <Typography variant="body2" color="text.secondary">
              Event details are unavailable.
            </Typography>
          )}

          {activeEvent && (
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="overline" color="text.secondary">Event Type</Typography>
                <Typography variant="subtitle1">{activeEventType?.name}</Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="overline" color="text.secondary">Date & Time</Typography>
                <Typography variant="body2">
                  {formatDate(activeEvent.date)}
                </Typography>
                <Typography variant="body2">
                  {activeEvent.startTime} - {activeEvent.endTime}
                </Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="overline" color="text.secondary">Location</Typography>
                <Typography variant="body2">{activeLocation?.name ?? 'Unknown location'}</Typography>
              </Box>

              <Divider />

              <Box>
                <Typography variant="overline" color="text.secondary">Staffing</Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <Chip
                    size="small"
                    color={activeHasEnoughStaff ? 'success' : 'error'}
                    label={activeHasEnoughStaff ? 'Meets Requirement' : 'Needs More Staff'}
                  />
                  <Typography variant="body2">
                    {activeAssignedCount}/{activeMinStaff} assigned
                  </Typography>
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="overline" color="text.secondary">Assigned Staff Details</Typography>
                {activeEventAssignments.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    No staff assigned to this session yet.
                  </Typography>
                ) : (
                  <Stack spacing={1} sx={{ mt: 0.75 }}>
                    {activeEventAssignments.map((assignment) => {
                      const staffName = assignment.staffDetail?.name ?? 'Unknown staff';
                      const staffEmail = assignment.staffDetail?.email;
                      const staffQualifications = assignment.staffDetail?.qualifications ?? [];
                      const matchedQualificationCount = activeRequiredQualifications.filter((requiredQualification) =>
                        staffQualifications.includes(requiredQualification)
                      ).length;

                      return (
                        <Paper key={assignment.id} variant="outlined" sx={{ p: 1.25 }}>
                          <Stack spacing={0.75}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                              <Typography variant="subtitle2">{staffName}</Typography>
                              <Chip
                                size="small"
                                label={`${assignment.hoursAllocated}h allocated`}
                                color="primary"
                                variant="outlined"
                              />
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {staffEmail ?? 'No email recorded'}
                            </Typography>

                            <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ rowGap: 0.75 }}>
                              {staffQualifications.length === 0 ? (
                                <Typography variant="caption" color="text.secondary">
                                  No qualifications recorded
                                </Typography>
                              ) : (
                                staffQualifications.map((qualification) => {
                                  const isRequired = activeRequiredQualifications.includes(qualification);
                                  return (
                                    <Chip
                                      key={`${assignment.id}-${qualification}`}
                                      size="small"
                                      label={qualification}
                                      color={isRequired ? 'success' : 'default'}
                                      variant={isRequired ? 'filled' : 'outlined'}
                                    />
                                  );
                                })
                              )}
                            </Stack>

                            {activeRequiredQualifications.length > 0 ? (
                              <Typography variant="caption" color="text.secondary">
                                Qualification match: {matchedQualificationCount}/{activeRequiredQualifications.length}
                              </Typography>
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                No qualifications required for this event type.
                              </Typography>
                            )}
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </Box>

              {activeEvent.notes && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="overline" color="text.secondary">Notes</Typography>
                    <Typography variant="body2">{activeEvent.notes}</Typography>
                  </Box>
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={openInAssignments} disabled={!activeEvent} variant="outlined">
            Open Assignments
          </Button>
          <Button onClick={closeEventModal}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
