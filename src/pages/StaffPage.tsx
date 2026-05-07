import { useState } from "react";
import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  Divider,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { useAppContext } from "../context/useAppContext";
import type { Staff, Qualification, HolidayPeriod, PayType } from "../types";
import { formatDate, getWeekStart, getWeekEnd } from "../utils/helpers";
import StaffUtilizationChart from "../components/StaffUtilizationChart";
import StaffCalendar from "../components/StaffCalendar";

export default function StaffPage() {
  const {
    staff,
    addStaff,
    updateStaff,
    deleteStaff,
    addHolidayToStaff,
    removeHolidayFromStaff,
    qualifications,
  } = useAppContext();
  const { assignments } = useAppContext();
  const [openDialog, setOpenDialog] = useState(false);
  const [openHolidayDialog, setOpenHolidayDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    qualifications: [] as Qualification[],
    payType: "hourly" as PayType,
    availableHoursPerWeek: "",
  });
  const [holidayForm, setHolidayForm] = useState({
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [qualificationFilter, setQualificationFilter] = useState<string>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<string>("all");
  const [payTypeFilter, setPayTypeFilter] = useState<string>("all");
  const [weekStart, setWeekStart] = useState<string>(() =>
    getWeekStart(new Date().toISOString())
  );
  const [showChart, setShowChart] = useState(false);

  const staffWithAssignmentCount = staff.map((s) => ({
    staff: s,
    assignmentCount: assignments.filter((a) => a.staffId === s.id).length,
  }));

  const filteredStaff = staffWithAssignmentCount
    .filter(({ staff: s }) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
      );
    })
    .filter(({ staff: s }) =>
      qualificationFilter === "all"
        ? true
        : s.qualifications.includes(qualificationFilter)
    )
    .filter(({ staff: s }) =>
      payTypeFilter === "all" ? true : s.payType === (payTypeFilter as PayType)
    )
    .filter(({ assignmentCount }) => {
      if (assignmentFilter === "all") return true;
      if (assignmentFilter === "with") return assignmentCount > 0;
      if (assignmentFilter === "without") return assignmentCount === 0;
      return true;
    });

  const expandedStaff = expandedStaffId
    ? staff.find((s) => s.id === expandedStaffId)
    : null;

  const handleOpenDialog = (staffMember?: Staff) => {
    if (staffMember) {
      setEditingId(staffMember.id);
      setFormData({
        name: staffMember.name,
        email: staffMember.email,
        phone: staffMember.phone || "",
        qualifications: staffMember.qualifications,
        payType: staffMember.payType || "hourly",
        availableHoursPerWeek: staffMember.availableHoursPerWeek.toString(),
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        qualifications: [],
        payType: "hourly",
        availableHoursPerWeek: "",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      qualifications: [],
      payType: "hourly",
      availableHoursPerWeek: "",
    });
  };

  const handleOpenHolidayDialog = (staffId: string) => {
    setSelectedStaffId(staffId);
    setHolidayForm({ startDate: "", endDate: "", reason: "" });
    setOpenHolidayDialog(true);
  };

  const handleCloseHolidayDialog = () => {
    setOpenHolidayDialog(false);
    setSelectedStaffId(null);
    setHolidayForm({ startDate: "", endDate: "", reason: "" });
  };

  const handleSave = () => {
    const hours =
      formData.payType === "salaried"
        ? 35
        : Number.parseInt(formData.availableHoursPerWeek, 10);
    if (
      !formData.name ||
      !formData.email ||
      (formData.payType === "hourly" && !formData.availableHoursPerWeek)
    ) {
      alert("Please fill in all required fields");
      return;
    }

    const data = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      qualifications: formData.qualifications,
      payType: formData.payType,
      availableHoursPerWeek: hours,
      holidays: [] as HolidayPeriod[],
    };

    if (editingId) {
      updateStaff(editingId, {
        ...data,
        holidays: staff.find((s) => s.id === editingId)?.holidays || [],
      });
    } else {
      addStaff(data);
    }

    handleCloseDialog();
  };

  const handleAddHoliday = () => {
    if (!holidayForm.startDate || !holidayForm.endDate) {
      alert("Please fill in start and end dates");
      return;
    }

    if (selectedStaffId) {
      addHolidayToStaff(selectedStaffId, {
        startDate: holidayForm.startDate,
        endDate: holidayForm.endDate,
        reason: holidayForm.reason,
      });
      handleCloseHolidayDialog();
    }
  };

  const handleDelete = (id: string) => {
    if (
      globalThis.confirm("Are you sure you want to delete this staff member?")
    ) {
      deleteStaff(id);
      if (expandedStaffId === id) setExpandedStaffId(null);
    }
  };

  const handleDeleteHoliday = (staffId: string, holidayId: string) => {
    if (globalThis.confirm("Remove this holiday period?")) {
      removeHolidayFromStaff(staffId, holidayId);
    }
  };

  // Full-page detail view for a single staff member
  if (expandedStaff) {
    const memberAssignmentCount = assignments.filter(
      (a) => a.staffId === expandedStaff.id
    ).length;
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => setExpandedStaffId(null)}
          sx={{ mb: 2 }}
        >
          Back to Staff List
        </Button>

        <Card>
          <CardHeader
            title={expandedStaff.name}
            subheader={expandedStaff.email}
            action={
              <Box>
                <IconButton
                  size="small"
                  onClick={() => handleOpenDialog(expandedStaff)}
                  color="primary"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDelete(expandedStaff.id)}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            }
          />
          <CardContent>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
                gap: 2,
                mb: 3,
              }}
            >
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Phone
                </Typography>
                <Typography variant="body2">
                  {expandedStaff.phone || "—"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Pay Type
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ textTransform: "capitalize" }}
                >
                  {expandedStaff.payType || "hourly"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Available Hours/Week
                </Typography>
                <Typography variant="body2">
                  {expandedStaff.availableHoursPerWeek}h
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" color="textSecondary">
                Assignments
              </Typography>
              <Typography variant="body2">
                {memberAssignmentCount} assignment
                {memberAssignmentCount === 1 ? "" : "s"}
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Qualifications
              </Typography>
              {expandedStaff.qualifications.length === 0 ? (
                <Typography variant="caption" color="textSecondary">
                  None
                </Typography>
              ) : (
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {expandedStaff.qualifications.map((q) => (
                    <Chip key={q} label={q} size="small" />
                  ))}
                </Box>
              )}
            </Box>

            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                <Typography variant="subtitle2">Holiday Periods</Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenHolidayDialog(expandedStaff.id)}
                >
                  Add Holiday
                </Button>
              </Box>
              {expandedStaff.holidays.length === 0 ? (
                <Typography variant="caption" color="textSecondary">
                  No holidays scheduled
                </Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {expandedStaff.holidays.map((holiday) => (
                    <Box
                      key={holiday.id}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        p: 1,
                        backgroundColor: "#f5f5f5",
                        borderRadius: 1,
                      }}
                    >
                      <Box>
                        <Typography variant="body2">
                          {formatDate(holiday.startDate)} to{" "}
                          {formatDate(holiday.endDate)}
                        </Typography>
                        {holiday.reason && (
                          <Typography variant="caption" color="textSecondary">
                            {holiday.reason}
                          </Typography>
                        )}
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleDeleteHoliday(expandedStaff.id, holiday.id)
                        }
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Schedule Calendar
          </Typography>
          <StaffCalendar
            staffId={expandedStaff.id}
            holidays={expandedStaff.holidays}
          />
        </Box>

        {renderDialogs()}
      </Box>
    );
  }

  function renderDialogs() {
    return (
      <>
        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingId ? "Edit Staff Member" : "Add Staff Member"}
          </DialogTitle>
          <DialogContent
            sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              label="Name"
              fullWidth
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., John Smith"
              required
            />
            <TextField
              label="Email"
              fullWidth
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="john@example.com"
              required
            />
            <TextField
              label="Phone"
              fullWidth
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="e.g., 07123456789"
            />
            <FormControl>
              <FormLabel>Contract Type</FormLabel>
              <RadioGroup
                row
                value={formData.payType}
                onChange={(e) => {
                  const payType = e.target.value as PayType;
                  let hours = formData.availableHoursPerWeek;
                  if (payType === "salaried") {
                    hours = "35";
                  } else if (hours === "35") {
                    hours = "";
                  }
                  setFormData({
                    ...formData,
                    payType,
                    availableHoursPerWeek: hours,
                  });
                }}
              >
                <FormControlLabel
                  value="hourly"
                  control={<Radio />}
                  label="Hourly"
                />
                <FormControlLabel
                  value="salaried"
                  control={<Radio />}
                  label="Salaried"
                />
              </RadioGroup>
            </FormControl>
            {formData.payType === "hourly" ? (
              <TextField
                label="Available Hours per Week"
                fullWidth
                type="number"
                value={formData.availableHoursPerWeek}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    availableHoursPerWeek: e.target.value,
                  })
                }
                placeholder="e.g., 10"
                required
              />
            ) : (
              <TextField
                label="Available Hours per Week"
                fullWidth
                type="number"
                value="35"
                disabled
                helperText="Salaried staff default to 35 hours per week"
              />
            )}
            <FormControl fullWidth>
              <InputLabel>Qualifications</InputLabel>
              <Select
                multiple
                value={formData.qualifications}
                onChange={(e) => {
                  const value =
                    typeof e.target.value === "string"
                      ? e.target.value.split(",")
                      : e.target.value;
                  setFormData({ ...formData, qualifications: value });
                }}
                input={<OutlinedInput label="Qualifications" />}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {qualifications.map((qual) => (
                  <MenuItem key={qual} value={qual}>
                    {qual}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSave} variant="contained">
              {editingId ? "Update" : "Add"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={openHolidayDialog}
          onClose={handleCloseHolidayDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Add Holiday Period</DialogTitle>
          <DialogContent
            sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}
          >
            <TextField
              label="Start Date"
              fullWidth
              type="date"
              InputLabelProps={{ shrink: true }}
              value={holidayForm.startDate}
              onChange={(e) =>
                setHolidayForm({ ...holidayForm, startDate: e.target.value })
              }
              required
            />
            <TextField
              label="End Date"
              fullWidth
              type="date"
              InputLabelProps={{ shrink: true }}
              value={holidayForm.endDate}
              onChange={(e) =>
                setHolidayForm({ ...holidayForm, endDate: e.target.value })
              }
              required
            />
            <TextField
              label="Reason (optional)"
              fullWidth
              value={holidayForm.reason}
              onChange={(e) =>
                setHolidayForm({ ...holidayForm, reason: e.target.value })
              }
              placeholder="e.g., Family vacation"
              multiline
              rows={2}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseHolidayDialog}>Cancel</Button>
            <Button onClick={handleAddHoliday} variant="contained">
              Add Holiday
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  // Compact list view (default)
  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              const d = new Date(weekStart);
              d.setDate(d.getDate() - 7);
              setWeekStart(getWeekStart(d.toISOString()));
            }}
          >
            Previous Week
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setWeekStart(getWeekStart(new Date().toISOString()))}
          >
            This Week
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              const d = new Date(weekStart);
              d.setDate(d.getDate() + 7);
              setWeekStart(getWeekStart(d.toISOString()));
            }}
          >
            Next Week
          </Button>
        </Box>
        <Typography variant="body2" color="textSecondary">
          Week: {formatDate(weekStart)} — {formatDate(getWeekEnd(weekStart))}
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            mb: showChart ? 1 : 0,
          }}
          onClick={() => setShowChart((v) => !v)}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Staff Utilisation
          </Typography>
          <IconButton size="small">
            {showChart ? (
              <ExpandLessIcon fontSize="small" />
            ) : (
              <ExpandMoreIcon fontSize="small" />
            )}
          </IconButton>
        </Box>
        <Collapse in={showChart}>
          <StaffUtilizationChart weekStart={weekStart} />
        </Collapse>
      </Box>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4">Staff</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Staff Member
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          placeholder="Search by name or email"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Qualification</InputLabel>
          <Select
            value={qualificationFilter}
            label="Qualification"
            onChange={(e) => setQualificationFilter(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            {qualifications.map((q) => (
              <MenuItem key={q} value={q}>
                {q}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
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
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Assignments</InputLabel>
          <Select
            value={assignmentFilter}
            label="Assignments"
            onChange={(e) => setAssignmentFilter(e.target.value)}
          >
            <MenuItem value="all">All staff</MenuItem>
            <MenuItem value="with">With assignments</MenuItem>
            <MenuItem value="without">Without assignments</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {staff.length === 0 ? (
        <Typography align="center" color="textSecondary" sx={{ py: 3 }}>
          No staff members yet. Add one to get started!
        </Typography>
      ) : (
        <Card variant="outlined">
          <List disablePadding>
            {filteredStaff.map(
              ({ staff: staffMember, assignmentCount }, index) => (
                <Box key={staffMember.id}>
                  {index > 0 && <Divider />}
                  <ListItem
                    sx={{
                      py: 1.5,
                      cursor: "pointer",
                      "&:hover": { backgroundColor: "action.hover" },
                    }}
                    onClick={() => setExpandedStaffId(staffMember.id)}
                  >
                    <ListItemText
                      primary={
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Typography variant="body1" fontWeight={500}>
                            {staffMember.name}
                          </Typography>
                          <Chip
                            label={
                              staffMember.payType === "salaried"
                                ? "Salaried"
                                : "Hourly"
                            }
                            size="small"
                            color={
                              staffMember.payType === "salaried"
                                ? "primary"
                                : "default"
                            }
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box
                          component="span"
                          sx={{
                            display: "flex",
                            gap: 2,
                            alignItems: "center",
                            mt: 0.5,
                            flexWrap: "wrap",
                          }}
                        >
                          <Typography
                            variant="caption"
                            component="span"
                            color="textSecondary"
                          >
                            {staffMember.email}
                          </Typography>
                          <Typography
                            variant="caption"
                            component="span"
                            color="textSecondary"
                          >
                            {staffMember.availableHoursPerWeek}h/week
                          </Typography>
                          <Typography
                            variant="caption"
                            component="span"
                            color="textSecondary"
                          >
                            {assignmentCount} assignment
                            {assignmentCount === 1 ? "" : "s"}
                          </Typography>
                          {staffMember.qualifications.length > 0 && (
                            <Box
                              component="span"
                              sx={{ display: "flex", gap: 0.5 }}
                            >
                              {staffMember.qualifications
                                .slice(0, 3)
                                .map((q) => (
                                  <Chip
                                    key={q}
                                    label={q}
                                    size="small"
                                    sx={{ height: 20, fontSize: "0.7rem" }}
                                  />
                                ))}
                              {staffMember.qualifications.length > 3 && (
                                <Chip
                                  label={`+${
                                    staffMember.qualifications.length - 3
                                  }`}
                                  size="small"
                                  sx={{ height: 20, fontSize: "0.7rem" }}
                                />
                              )}
                            </Box>
                          )}
                        </Box>
                      }
                    />
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedStaffId(staffMember.id);
                        }}
                        title="View details"
                      >
                        <OpenInFullIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDialog(staffMember);
                        }}
                        color="primary"
                        title="Edit"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(staffMember.id);
                        }}
                        color="error"
                        title="Delete"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </ListItem>
                </Box>
              )
            )}
          </List>
        </Card>
      )}

      {renderDialogs()}
    </Box>
  );
}
