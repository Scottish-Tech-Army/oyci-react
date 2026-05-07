import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
} from '@mui/material';
import dayjs, { type Dayjs } from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { useAppContext } from '../context/useAppContext';
import type { HolidayPeriod } from '../types';
import { formatDate } from '../utils/helpers';

dayjs.extend(isBetween);

interface StaffCalendarProps {
  staffId: string;
  holidays: HolidayPeriod[];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function StaffCalendar({ staffId, holidays }: Readonly<StaffCalendarProps>) {
  const { assignments, events, eventTypes, locations } = useAppContext();
  const [selectedMonth, setSelectedMonth] = useState<Dayjs>(dayjs());
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());

  const eventTypeById = Object.fromEntries(eventTypes.map((et) => [et.id, et]));
  const locationById = Object.fromEntries(locations.map((loc) => [loc.id, loc]));

  // Events this staff member is assigned to
  const staffEventIds = new Set(
    assignments.filter((a) => a.staffId === staffId).map((a) => a.eventId)
  );

  const staffEvents = events.filter((e) => staffEventIds.has(e.id));

  const monthEvents = staffEvents
    .filter((e) => {
      const d = dayjs(e.date);
      return d.month() === selectedMonth.month() && d.year() === selectedMonth.year();
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  const getEventsForDate = (date: Dayjs) => {
    const dateStr = date.format('YYYY-MM-DD');
    return monthEvents.filter((e) => e.date === dateStr);
  };

  const isHolidayDate = (date: Dayjs) =>
    holidays.some((h) =>
      date.isBetween(h.startDate, h.endDate, 'day', '[]')
    );

  const getDaysInMonth = (date: Dayjs) => {
    const year = date.year();
    const month = date.month();
    const firstDay = dayjs().year(year).month(month).date(1);
    const lastDay = dayjs().year(year).month(month).daysInMonth();
    const days: (Dayjs | null)[] = [];

    for (let i = firstDay.day() - 1; i >= 0; i--) {
      days.push(null);
    }
    for (let i = 1; i <= lastDay; i++) {
      days.push(dayjs().year(year).month(month).date(i));
    }
    return days;
  };

  const shiftMonth = (delta: number) => {
    const next = selectedMonth.add(delta, 'month');
    setSelectedMonth(next);
    if (!selectedDate.isSame(next, 'month')) {
      setSelectedDate(next.startOf('month'));
    }
  };

  const days = getDaysInMonth(selectedMonth);
  const weeks: (Dayjs | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const selectedDateEvents = getEventsForDate(selectedDate);
  const selectedIsHoliday = isHolidayDate(selectedDate);
  const selectedHoliday = holidays.find((h) =>
    selectedDate.isBetween(h.startDate, h.endDate, 'day', '[]')
  );

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="subtitle2">{selectedMonth.format('MMMM YYYY')}</Typography>
        <Button size="small" variant="outlined" onClick={() => shiftMonth(-1)}>‹</Button>
        <Button size="small" variant="outlined" onClick={() => { const t = dayjs(); setSelectedMonth(t); setSelectedDate(t); }}>Today</Button>
        <Button size="small" variant="outlined" onClick={() => shiftMonth(1)}>›</Button>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', rowGap: 0.5 }}>
        <Chip size="small" label="Assigned event" sx={{ backgroundColor: '#e8f5e9', border: '1px solid #2e7d32' }} />
        <Chip size="small" label="Holiday / unavailable" sx={{ backgroundColor: '#fff3e0', border: '1px solid #e65100' }} />
        <Chip size="small" label="Selected" sx={{ backgroundColor: 'rgba(16, 182, 234, 0.12)', border: '1px solid rgba(16, 182, 234, 0.5)' }} />
        <Chip size="small" label="Today" sx={{ backgroundColor: 'rgba(230, 0, 141, 0.09)', border: '1px solid rgba(230, 0, 141, 0.4)' }} />
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              {WEEKDAYS.map((day) => (
                <TableCell key={day} align="center" sx={{ fontWeight: 'bold', width: '14.28%', py: 0.75, px: 0.5 }}>
                  {day}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {weeks.map((week, weekIdx) => {
              const weekKey = `${selectedMonth.year()}-${selectedMonth.month()}-w${weekIdx}`;
              return (
                <TableRow key={weekKey} sx={{ height: 80 }}>
                  {week.map((date, dayIdx) => {
                    const dateKey = date ? date.format('YYYY-MM-DD') : `empty-${weekIdx}-${dayIdx}`;
                    const dateEvents = date ? getEventsForDate(date) : [];
                    const isToday = Boolean(date?.isSame(dayjs(), 'day'));
                    const isSelected = Boolean(date?.isSame(selectedDate, 'day'));
                    const onHoliday = Boolean(date && isHolidayDate(date));

                    let bgColor = 'inherit';
                    if (isSelected) bgColor = 'rgba(16, 182, 234, 0.12)';
                    else if (isToday) bgColor = 'rgba(230, 0, 141, 0.09)';
                    else if (onHoliday) bgColor = 'rgba(230, 100, 0, 0.08)';

                    return (
                      <TableCell
                        key={dateKey}
                        onClick={() => { if (date) setSelectedDate(date); }}
                        sx={{
                          border: '1px solid #ddd',
                          backgroundColor: bgColor,
                          verticalAlign: 'top',
                          p: 0.75,
                          cursor: date ? 'pointer' : 'default',
                        }}
                      >
                        {date && (
                          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: isToday || isSelected ? 'bold' : 'normal' }}
                              >
                                {date.date()}
                              </Typography>
                              {dateEvents.length > 0 && (
                                <Chip size="small" label={dateEvents.length} sx={{ height: 16, fontSize: '0.65rem' }} />
                              )}
                            </Stack>
                            <Box sx={{ mt: 0.5, overflow: 'hidden', flex: 1 }}>
                              {onHoliday && (
                                <Typography variant="caption" sx={{ display: 'block', color: '#e65100', fontSize: '0.6rem', fontStyle: 'italic' }}>
                                  Holiday
                                </Typography>
                              )}
                              {dateEvents.slice(0, 2).map((event) => {
                                const et = eventTypeById[event.eventTypeId];
                                return (
                                  <Box
                                    key={event.id}
                                    sx={{
                                      mb: 0.25,
                                      p: 0.25,
                                      backgroundColor: '#e8f5e9',
                                      borderLeft: '3px solid #2e7d32',
                                      borderRadius: 0.5,
                                    }}
                                  >
                                    <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 'bold', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {et?.name}
                                    </Typography>
                                    <Typography variant="caption" sx={{ fontSize: '0.6rem', display: 'block' }}>
                                      {event.startTime}
                                    </Typography>
                                  </Box>
                                );
                              })}
                              {dateEvents.length > 2 && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                                  +{dateEvents.length - 2} more
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

      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent sx={{ pb: '16px !important' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {formatDate(selectedDate.format('YYYY-MM-DD'))}
          </Typography>

          {selectedIsHoliday && selectedHoliday && (
            <Box sx={{ p: 1, mb: 1.5, backgroundColor: '#fff3e0', borderRadius: 1, borderLeft: '3px solid #e65100' }}>
              <Typography variant="body2" fontWeight={500} color="#e65100">Holiday / Unavailable</Typography>
              {selectedHoliday.reason && (
                <Typography variant="caption" color="text.secondary">{selectedHoliday.reason}</Typography>
              )}
            </Box>
          )}

          {selectedDateEvents.length === 0 && !selectedIsHoliday && (
            <Typography variant="body2" color="text.secondary">No assignments on this date.</Typography>
          )}

          {selectedDateEvents.map((event) => {
            const et = eventTypeById[event.eventTypeId];
            const loc = locationById[event.locationId];
            return (
              <Paper key={event.id} variant="outlined" sx={{ p: 1.25, mb: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="subtitle2">{et?.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Event: {event.startTime}–{event.endTime}
                    </Typography>
                    <Divider sx={{ my: 0.5 }} />
                    <Typography variant="caption" color="text.secondary">
                      Staff time: {event.staffStartTime}–{event.staffEndTime}
                    </Typography>
                    {loc && (
                      <>
                        <Divider sx={{ my: 0.5 }} />
                        <Typography variant="caption" color="text.secondary">
                          {loc.name}
                        </Typography>
                      </>
                    )}
                    {event.notes && (
                      <>
                        <Divider sx={{ my: 0.5 }} />
                        <Typography variant="caption" color="text.secondary">{event.notes}</Typography>
                      </>
                    )}
                  </Box>
                  <Chip label={`${event.staffStartTime}–${event.staffEndTime}`} size="small" color="primary" variant="outlined" sx={{ ml: 1, flexShrink: 0 }} />
                </Stack>
              </Paper>
            );
          })}
        </CardContent>
      </Card>
    </Box>
  );
}
