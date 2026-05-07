import { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Button,
} from "@mui/material";
import { useAppContext } from "../context/useAppContext";
import { formatDate } from "../utils/helpers";

export default function HourlyWagesPage({
  hideTitle = false,
}: {
  hideTitle?: boolean;
}) {
  const { staff, getAssignmentsForStaff } = useAppContext();

  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [appliedRange, setAppliedRange] = useState<{
    start: string;
    end: string;
  } | null>(null);

  // Only show hourly-paid staff
  const hourlyStaff = staff.filter((s) => s.payType === "hourly");

  const roundToOne = (n: number) => Math.round(n * 10) / 10;
  const formatHours = (n: number) => roundToOne(n).toFixed(1);

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

  const computeHours = (sId: string) => {
    if (!appliedRange) return 0;
    const assigns = getAssignmentsForStaff(sId) || [];
    const start = new Date(appliedRange.start);
    const end = new Date(appliedRange.end);
    return assigns.reduce((sum, a) => {
      const evDate = a.eventDetail?.date;
      if (!evDate) return sum;
      const d = new Date(evDate);
      if (d >= start && d <= end) return sum + (a.hoursAllocated || 0);
      return sum;
    }, 0);
  };

  const exportCSV = () => {
    if (!appliedRange) return;
    const escapeCSV = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };

    const rows: string[] = [];
    // Header for per-assignment detail
    rows.push("Staff Member,Date,Hours,Event,Location");

    const start = new Date(appliedRange.start);
    const end = new Date(appliedRange.end);

    // Per-assignment rows
    hourlyStaff.forEach((s) => {
      const assigns = getAssignmentsForStaff(s.id) || [];
      const inRange = assigns.filter((a) => {
        const d = a.eventDetail?.date ? new Date(a.eventDetail.date) : null;
        return d && d >= start && d <= end;
      });

      inRange.forEach((a) => {
        const date = a.eventDetail?.date || "";
        const hours = a.hoursAllocated || 0;
        const eventName = a.eventTypeDetail?.name || "";
        const locationName = a.locationDetail?.name || "";
        rows.push(
          [
            escapeCSV(s.name),
            escapeCSV(date),
            formatHours(hours),
            escapeCSV(eventName),
            escapeCSV(locationName),
          ].join(",")
        );
      });
    });

    // Totals section (only staff with >0 hours)
    const staffWithHours = hourlyStaff
      .map((s) => ({ staff: s, total: computeHours(s.id) }))
      .filter((x) => roundToOne(x.total) > 0);

    rows.push("");
    rows.push("Totals");
    rows.push("Staff Member,Total Hours");
    staffWithHours.forEach(({ staff: s, total }) => {
      rows.push([escapeCSV(s.name), formatHours(total)].join(","));
    });

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const startStr = appliedRange.start.replace(/-/g, "");
    const endStr = appliedRange.end.replace(/-/g, "");
    a.href = url;
    a.download = `export_data_${startStr}_${endStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const grandTotal = () =>
    hourlyStaff.reduce((sum, s) => sum + computeHours(s.id), 0);

  return (
    <Box sx={{ mt: hideTitle ? 2 : 0 }}>
      {!hideTitle && (
        <Typography variant="h4" sx={{ mb: 2 }}>
          Hourly Wages
        </Typography>
      )}

      <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
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
          Export data
        </Button>
        <Button variant="text" onClick={clearRange}>
          Clear
        </Button>
      </Box>

      {appliedRange ? (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell>Staff Member</TableCell>
                <TableCell>Hours Worked</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {hourlyStaff
                .filter((s) => roundToOne(computeHours(s.id)) > 0)
                .map((s) => {
                  const hours = computeHours(s.id);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{formatHours(hours)}h</TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography color="textSecondary">
          Select a date range to view hours worked.
        </Typography>
      )}

      {appliedRange && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1">
            Total hours for {formatDate(appliedRange.start)} to{" "}
            {formatDate(appliedRange.end)}: {formatHours(grandTotal())}h
          </Typography>
        </Box>
      )}
    </Box>
  );
}
