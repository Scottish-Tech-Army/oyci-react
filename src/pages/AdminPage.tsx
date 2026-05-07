import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { useAppContext } from "../context/useAppContext";
import type { Location } from "../types";
import AddLocationIcon from "@mui/icons-material/Place";

function LocationManager({
  locations,
  onAdd,
  onUpdate,
  onDelete,
}: {
  locations: Location[];
  onAdd: (loc: Omit<Location, "id" | "createdAt">) => void;
  onUpdate: (id: string, updates: Partial<Location>) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [capacity, setCapacity] = useState<number | "">("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAdd = () => {
    if (!name) return alert("Name is required");
    onAdd({
      name: name.trim(),
      address: address.trim(),
      capacity: capacity === "" ? undefined : Number(capacity),
    });
    setName("");
    setAddress("");
    setCapacity("");
  };

  const startEdit = (loc: Location) => {
    setEditingId(loc.id);
    setName(loc.name);
    setAddress(loc.address || "");
    setCapacity(loc.capacity ?? "");
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    onUpdate(editingId, {
      name: name.trim(),
      address: address.trim(),
      capacity: capacity === "" ? undefined : Number(capacity),
    });
    setEditingId(null);
    setName("");
    setAddress("");
    setCapacity("");
  };

  return (
    <>
      <Box sx={{ display: "flex", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
        <TextField
          label="Name"
          size="small"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Address"
          size="small"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <TextField
          label="Capacity"
          size="small"
          type="number"
          value={capacity === "" ? "" : String(capacity)}
          onChange={(e) =>
            setCapacity(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
        {editingId ? (
          <Button
            variant="contained"
            startIcon={<AddLocationIcon />}
            onClick={handleSaveEdit}
          >
            Save
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<AddLocationIcon />}
            onClick={handleAdd}
          >
            Add
          </Button>
        )}
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>Name</TableCell>
              <TableCell>Address</TableCell>
              <TableCell align="center">Capacity</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {locations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                  No locations defined.
                </TableCell>
              </TableRow>
            ) : (
              locations.map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell>{loc.name}</TableCell>
                  <TableCell>{loc.address}</TableCell>
                  <TableCell align="center">{loc.capacity ?? "—"}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => startEdit(loc)}>
                      Edit
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => onDelete(loc.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

export default function AdminPage() {
  const {
    qualifications,
    addQualification,
    renameQualification,
    removeQualification,
    getQualificationUsage,
    locations,
    addLocation,
    updateLocation,
    deleteLocation,
  } = useAppContext();

  const [searchTerm, setSearchTerm] = useState("");
  const [newQualification, setNewQualification] = useState("");
  const [message, setMessage] = useState<{
    severity: "success" | "error";
    text: string;
  } | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [qualificationToRename, setQualificationToRename] = useState("");
  const [renameValue, setRenameValue] = useState("");

  const filteredQualifications = useMemo(
    () =>
      qualifications.filter((q) =>
        q.toLowerCase().includes(searchTerm.trim().toLowerCase())
      ),
    [qualifications, searchTerm]
  );

  const handleAddQualification = () => {
    const result = addQualification(newQualification);
    setMessage({
      severity: result.success ? "success" : "error",
      text: result.message,
    });
    if (result.success) {
      setNewQualification("");
    }
  };

  const handleDeleteQualification = (name: string) => {
    const result = removeQualification(name);
    setMessage({
      severity: result.success ? "success" : "error",
      text: result.message,
    });
  };

  const handleOpenRenameDialog = (name: string) => {
    setQualificationToRename(name);
    setRenameValue(name);
    setRenameDialogOpen(true);
  };

  const handleRenameQualification = () => {
    const result = renameQualification(qualificationToRename, renameValue);
    setMessage({
      severity: result.success ? "success" : "error",
      text: result.message,
    });
    if (result.success) {
      setRenameDialogOpen(false);
      setQualificationToRename("");
      setRenameValue("");
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Admin Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage shared configuration used across planning screens.
      </Typography>

      <Paper sx={{ p: 2.5 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Qualification Types
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Add, rename, and remove qualification types. Deletion is blocked while
          a qualification is still in use.
        </Typography>

        {message && (
          <Alert
            severity={message.severity}
            sx={{ mb: 2 }}
            onClose={() => setMessage(null)}
          >
            {message.text}
          </Alert>
        )}

        <Box sx={{ display: "flex", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
          <TextField
            label="New qualification"
            size="small"
            value={newQualification}
            onChange={(e) => setNewQualification(e.target.value)}
            placeholder="e.g., Sports Coach"
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddQualification}
          >
            Add
          </Button>
          <TextField
            label="Search"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter qualification list"
          />
        </Box>

        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell>Qualification</TableCell>
                <TableCell align="center">Staff Using</TableCell>
                <TableCell align="center">Event Types Using</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredQualifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                    No qualifications match your filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredQualifications.map((qualification) => {
                  const usage = getQualificationUsage(qualification);
                  const usageTitle = [
                    `Staff: ${
                      usage.staffMembers.length === 0
                        ? "None"
                        : usage.staffMembers.join(", ")
                    }`,
                    `Event types: ${
                      usage.eventTypes.length === 0
                        ? "None"
                        : usage.eventTypes.join(", ")
                    }`,
                  ].join("\n");

                  return (
                    <TableRow key={qualification}>
                      <TableCell>{qualification}</TableCell>
                      <TableCell align="center">
                        <Tooltip title={usageTitle}>
                          <Typography variant="body2">
                            {usage.staffCount}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={usageTitle}>
                          <Typography variant="body2">
                            {usage.eventTypeCount}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenRenameDialog(qualification)}
                          aria-label={`Rename ${qualification}`}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() =>
                            handleDeleteQualification(qualification)
                          }
                          aria-label={`Delete ${qualification}`}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 2.5, mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Locations
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Add, edit, and remove locations used for events.
        </Typography>

        <LocationManager
          locations={locations}
          onAdd={(loc) => addLocation(loc)}
          onUpdate={(id, updates) => updateLocation(id, updates)}
          onDelete={(id) => deleteLocation(id)}
        />
      </Paper>

      <Dialog
        open={renameDialogOpen}
        onClose={() => setRenameDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Rename Qualification</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Qualification name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRenameQualification} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
