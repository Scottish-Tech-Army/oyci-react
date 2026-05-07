import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Pagination,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { useAppContext } from '../context/useAppContext';
import { normalizeEventTypeStaffRequirements, summarizeRequirement, syncEventTypeRequirements } from '../shared/staffRequirements';
import type { EventStaffRequirement, EventType, Qualification } from '../types';

function createEmptyRequirement(index: number): EventStaffRequirement {
  return {
    id: `staff-requirement-${Date.now()}-${index}`,
    requiredQualifications: [],
    matchMode: 'all',
  };
}

export default function EventTypesPage() {
  const { eventTypes, addEventType, updateEventType, deleteEventType, qualifications } = useAppContext();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    durationMinutes: '',
    staffRequirements: [createEmptyRequirement(0)] as EventStaffRequirement[],
  });



  const handleOpenDialog = (eventType?: EventType) => {
    if (eventType) {
      setEditingId(eventType.id);
      setFormData({
        name: eventType.name,
        description: eventType.description,
        durationMinutes: eventType.durationMinutes.toString(),
        staffRequirements: normalizeEventTypeStaffRequirements(eventType),
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        description: '',
        durationMinutes: '',
        staffRequirements: [createEmptyRequirement(0)],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
    setFormData({
      name: '',
      description: '',
      durationMinutes: '',
      staffRequirements: [createEmptyRequirement(0)],
    });
  };

  const handleSave = () => {
    if (!formData.name || !formData.durationMinutes) {
      alert('Please fill in all required fields');
      return;
    }

    const data = {
      name: formData.name,
      description: formData.description,
      durationMinutes: Number.parseInt(formData.durationMinutes, 10),
      requiredQualifications: [] as Qualification[],
      minimumStaffRequired: formData.staffRequirements.length,
      staffRequirements: formData.staffRequirements,
    };

    const normalizedData = syncEventTypeRequirements(data);

    if (editingId) {
      updateEventType(editingId, normalizedData);
    } else {
      addEventType(normalizedData);
    }

    handleCloseDialog();
  };

  const handleRequirementChange = (requirementId: string, updates: Partial<EventStaffRequirement>) => {
    setFormData((current) => ({
      ...current,
      staffRequirements: current.staffRequirements.map((requirement) => (
        requirement.id === requirementId ? { ...requirement, ...updates } : requirement
      )),
    }));
  };

  const handleAddRequirement = () => {
    setFormData((current) => ({
      ...current,
      staffRequirements: [...current.staffRequirements, createEmptyRequirement(current.staffRequirements.length)],
    }));
  };

  const handleRemoveRequirement = (requirementId: string) => {
    setFormData((current) => {
      if (current.staffRequirements.length === 1) {
        return current;
      }

      return {
        ...current,
        staffRequirements: current.staffRequirements.filter((requirement) => requirement.id !== requirementId),
      };
    });
  };

  const handleDelete = (id: string) => {
    if (globalThis.confirm('Are you sure you want to delete this event type?')) {
      deleteEventType(id);
    }
  };

  const totalCount = eventTypes.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    setPage(1);
  }, [eventTypes, pageSize]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Event Type
        </Button>
      </Box>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Manage qualification types in Admin Settings. This page only selects required qualifications.
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>Name</TableCell>
              <TableCell>Duration (min)</TableCell>
              <TableCell>Staff Requirements</TableCell>
              <TableCell>Min. Staff</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {eventTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  No event types yet. Add one to get started!
                </TableCell>
              </TableRow>
            ) : (
              (() => {
                const start = (page - 1) * pageSize;
                const end = start + pageSize;
                return eventTypes.slice(start, end).map((eventType) => (
                  <TableRow key={eventType.id}>
                    <TableCell>
                      <Typography variant="subtitle2">{eventType.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {eventType.description}
                      </Typography>
                    </TableCell>
                    <TableCell>{eventType.durationMinutes}</TableCell>
                    <TableCell>
                      {normalizeEventTypeStaffRequirements(eventType).length === 0 ? (
                        <Typography variant="caption" color="textSecondary">
                          None
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                          {normalizeEventTypeStaffRequirements(eventType).map((requirement, index) => (
                            <Box key={requirement.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Chip label={`Staff ${index + 1}`} size="small" variant="outlined" />
                              <Typography variant="caption" color="textSecondary">
                                {summarizeRequirement(requirement)}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>{eventType.minimumStaffRequired}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(eventType)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(eventType.id)}
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

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
        <Box>
          <Typography variant="body2">
            Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)} of {totalCount}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Per page</InputLabel>
            <Select
              value={pageSize}
              label="Per page"
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
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

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingId ? 'Edit Event Type' : 'Add Event Type'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Event Name"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Basketball"
            required
          />
          <TextField
            label="Description"
            fullWidth
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description"
            multiline
            rows={2}
          />
          <TextField
            label="Duration (minutes)"
            fullWidth
            type="number"
            value={formData.durationMinutes}
            onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
            placeholder="e.g., 60"
            required
          />
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box>
                <Typography variant="subtitle2">Staff Requirements</Typography>
                <Typography variant="caption" color="textSecondary">
                  Each row represents one required staff slot. Minimum staff is set automatically from the number of rows.
                </Typography>
              </Box>
              <Button size="small" startIcon={<AddIcon />} onClick={handleAddRequirement}>
                Add Staff Slot
              </Button>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {formData.staffRequirements.map((requirement, index) => (
                <Paper key={requirement.id} variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle2">Staff Slot {index + 1}</Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveRequirement(requirement.id)}
                      disabled={formData.staffRequirements.length === 1}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 2 }}>
                    <FormControl fullWidth>
                      <InputLabel>Qualification Rule</InputLabel>
                      <Select
                        value={requirement.matchMode}
                        label="Qualification Rule"
                        onChange={(event) => handleRequirementChange(requirement.id, {
                          matchMode: event.target.value as EventStaffRequirement['matchMode'],
                        })}
                      >
                        <MenuItem value="all">Must have all selected qualifications</MenuItem>
                        <MenuItem value="any">Can have any selected qualification</MenuItem>
                      </Select>
                    </FormControl>

                    <FormControl fullWidth>
                      <InputLabel>Required Qualifications</InputLabel>
                      <Select
                        multiple
                        value={requirement.requiredQualifications}
                        onChange={(event) => {
                          const value = typeof event.target.value === 'string'
                            ? event.target.value.split(',') as Qualification[]
                            : event.target.value;
                          handleRequirementChange(requirement.id, { requiredQualifications: value });
                        }}
                        input={<OutlinedInput label="Required Qualifications" />}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.length === 0 ? (
                              <Typography variant="caption" color="textSecondary">
                                No qualifications required
                              </Typography>
                            ) : (
                              selected.map((value) => (
                                <Chip key={value} label={value} size="small" />
                              ))
                            )}
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
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingId ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
