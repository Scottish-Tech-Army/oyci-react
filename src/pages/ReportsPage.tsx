import { useMemo, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from "@mui/material";
import { useAppContext } from "../context/useAppContext";
import type { AssignmentDetail, Staff, PayType } from "../types";
import HourlyWagesPage from "./HourlyWagesPage";

export default function ReportsPage() {
  const { staff, getAssignmentsForStaff, locations, eventTypes } =
    useAppContext();

  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [appliedRange, setAppliedRange] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [payTypeFilter, setPayTypeFilter] = useState<string>("all");

  const roundToOne = (n: number) => Math.round(n * 10) / 10;
  const formatHours = (n: number) => roundToOne(n).toFixed(1);

  type ReportRow = {
    staff: Staff;
    totalHours: number;
    assignments: AssignmentDetail[];
    events: string[];
    locations: string[];
  };

  const staffReport = useMemo((): ReportRow[] => {
    if (!appliedRange) return [];

    const sDate = new Date(appliedRange.start);
    const eDate = new Date(appliedRange.end);
    const inRangeLocal = (dateStr?: string | null) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= sDate && d <= eDate;
    };

    return staff
      .map((s) => {
        const assigns = (getAssignmentsForStaff(s.id) ||
          []) as AssignmentDetail[];
        const inRangeAssigns = assigns.filter((a) => {
          if (!a.eventDetail) return false;
          if (!inRangeLocal(a.eventDetail.date)) return false;
          if (
            locationFilter !== "all" &&
            a.eventDetail.locationId !== locationFilter
          )
            return false;
          if (
            eventTypeFilter !== "all" &&
            a.eventDetail.eventTypeId !== eventTypeFilter
          )
            return false;
          return true;
        });

        const total = inRangeAssigns.reduce(
          (sum, a) => sum + (a.hoursAllocated || 0),
          0
        );
        const events = Array.from(
          new Set(
            inRangeAssigns
              .map((a) => a.eventTypeDetail?.name || "")
              .filter(Boolean)
          )
        );
        const locs = Array.from(
          new Set(
            inRangeAssigns
              .map((a) => a.locationDetail?.name || "")
              .filter(Boolean)
          )
        );

        return {
          staff: s,
          totalHours: total,
          assignments: inRangeAssigns,
          events,
          locations: locs,
        } as ReportRow;
      })
      .filter((r) => roundToOne(r.totalHours) > 0)
      .filter((r) =>
        payTypeFilter === "all"
          ? true
          : r.staff.payType === (payTypeFilter as PayType)
      );
  }, [
    staff,
    getAssignmentsForStaff,
    appliedRange,
    locationFilter,
    eventTypeFilter,
    payTypeFilter,
  ]);

  const exportCSV = () => {
    if (!appliedRange) return;
    const escapeCSV = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const rows: string[] = [];
    rows.push("Staff Member,Contract Type,Total Hours,Events,Locations");

    staffReport.forEach((r) => {
      rows.push(
        [
          escapeCSV(r.staff.name),
          escapeCSV(r.staff.payType),
          formatHours(r.totalHours),
          escapeCSV(r.events.join(" | ")),
          escapeCSV(r.locations.join(" | ")),
        ].join(",")
      );
    });

    // Add per-assignment detail
    rows.push("");
    rows.push("Per-assignment detail");
    rows.push("Staff Member,Date,Hours,Event,Location");
    staffReport.forEach((r) => {
      r.assignments.forEach((a: AssignmentDetail) => {
        rows.push(
          [
            escapeCSV(r.staff.name),
            escapeCSV(a.eventDetail?.date || ""),
            formatHours(a.hoursAllocated || 0),
            escapeCSV(a.eventTypeDetail?.name || ""),
            escapeCSV(a.locationDetail?.name || ""),
          ].join(",")
        );
      });
    });

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const startStr = appliedRange.start.replace(/-/g, "");
    const endStr = appliedRange.end.replace(/-/g, "");
    a.href = url;
    a.download = `report_${startStr}_${endStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const [tabIndex, setTabIndex] = useState<number>(0);

  const applyRange = () => {
    if (!startDate || !endDate) return;
    if (new Date(startDate) > new Date(endDate)) {
      alert("Start date must be before or equal to end date");
      return;
    }
    setAppliedRange({ start: startDate, end: endDate });
  };

  const clearRange = () => {
    setStartDate(null);
    setEndDate(null);
    setAppliedRange(null);
  };

  const generalReportingUI = (
    <>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          alignItems: "center",
          flexWrap: "wrap",
          mb: 1,
        }}
      >
        <TextField
          label="Start date"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={startDate || ""}
          onChange={(e) => setStartDate(e.target.value || null)}
        />
        <TextField
          label="End date"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={endDate || ""}
          onChange={(e) => setEndDate(e.target.value || null)}
        />

        <Button
          variant="contained"
          onClick={applyRange}
          disabled={!startDate || !endDate}
        >
          Apply
        </Button>
        <Button variant="outlined" onClick={exportCSV} disabled={!appliedRange}>
          Export CSV
        </Button>
        <Button variant="text" onClick={clearRange}>
          Clear
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", mb: 2 }}>
        <FormControl
          size="small"
          sx={{
            minWidth: 280,
            "& .MuiOutlinedInput-root": { borderRadius: "28px" },
          }}
        >
          <InputLabel>Location</InputLabel>
          <Select
            value={locationFilter}
            label="Location"
            onChange={(e) => setLocationFilter(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            {locations.map((l) => (
              <MenuItem key={l.id} value={l.id}>
                {l.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl
          size="small"
          sx={{
            minWidth: 280,
            "& .MuiOutlinedInput-root": { borderRadius: "28px" },
          }}
        >
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

        <FormControl
          size="small"
          sx={{
            minWidth: 280,
            "& .MuiOutlinedInput-root": { borderRadius: "28px" },
          }}
        >
          <InputLabel>Contract Type</InputLabel>
          <Select
            value={payTypeFilter}
            label="Contract Type"
            onChange={(e) => setPayTypeFilter(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="hourly">Hourly</MenuItem>
            <MenuItem value="salaried">Salaried</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {!startDate || !endDate ? (
        <Typography color="textSecondary">
          Select a date range to run the report.
        </Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell>Staff Member</TableCell>
                <TableCell>Contract Type</TableCell>
                <TableCell>Hours</TableCell>
                <TableCell>Events</TableCell>
                <TableCell>Locations</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {staffReport.map((r) => (
                <TableRow key={r.staff.id}>
                  <TableCell>{r.staff.name}</TableCell>
                  <TableCell sx={{ textTransform: "capitalize" }}>
                    {r.staff.payType}
                  </TableCell>
                  <TableCell>{formatHours(r.totalHours)}h</TableCell>
                  <TableCell>{r.events.join(", ") || "—"}</TableCell>
                  <TableCell>{r.locations.join(", ") || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Reporting
      </Typography>

      <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 3 }}>
        <Tab label="Hourly Wages" />
        <Tab label="General Reporting" />
      </Tabs>

      {tabIndex === 0 ? <HourlyWagesPage hideTitle /> : generalReportingUI}
    </Box>
  );
}
