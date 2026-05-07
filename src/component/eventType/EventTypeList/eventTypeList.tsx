import { useState, useEffect } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import TableSortLabel from '@mui/material/TableSortLabel';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import CreateEventType from '../createEventType/createEventType';
import type { EventType } from '../../../models/eventType';
import axiosInstance from '../../../api/axiosInstance';

type Order = 'asc' | 'desc';

const EventTypeList = () => {
    const [dialogVisible, setDialogVisible] = useState(false);
    const [editData, setEditData] = useState<EventType | null>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [orderBy, setOrderBy] = useState<keyof EventType>('id');
    const [order, setOrder] = useState<Order>('asc');
    const [data, setData] = useState<{ loading: boolean; data: EventType[] }>({ loading: true, data: [] });
    const [refreshKey, setRefreshKey] = useState(0);

    const fetchData = () => {
        setData(prev => ({ ...prev, loading: true }));
        setRefreshKey(k => k + 1);
    };

    useEffect(() => {
        let cancelled = false;
        axiosInstance.get<EventType[]>('/event-types').then(res => {
            if (!cancelled) {
                setData({ loading: false, data: res.data });
            }
        });
        return () => { cancelled = true; };
    }, [refreshKey]);

    const openCreate = () => {
        setEditData(null);
        setDialogVisible(true);
    };

    const openEdit = (row: EventType) => {
        setEditData(row);
        setDialogVisible(true);
    };

    const handleSave = (eventType: EventType) => {
        const payload = {
            ...eventType,
            requiredQualifications: eventType.requiredQualifications?.map(q => ({
                ...q,
                requiredExperience: 0,
                requiredExperienceMonths: 0,
            })),
        };
        const request = payload.id
            ? axiosInstance.put(`/event-types/${payload.id}`, payload)
            : axiosInstance.post('/event-types', payload);

        request.then(() => {
            setDialogVisible(false);
            fetchData();
        }).catch((error: Error) => {
            console.error('Error saving event type:', error);
            alert('Failed to save event type. Please try again.');
        });
    };

    const handleSort = (column: keyof EventType) => {
        const isAsc = orderBy === column && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(column);
    };

    const formatExperience = (months?: number) => {
        if (months === undefined || months === null) return '—';
        const y = Math.floor(months / 12);
        const m = months % 12;
        const parts: string[] = [];
        if (y > 0) parts.push(`${y} yr${y > 1 ? 's' : ''}`);
        if (m > 0) parts.push(`${m} mo${m > 1 ? 's' : ''}`);
        return parts.length ? parts.join(' ') : '0 mos';
    };

    const sorted = [...data.data].sort((a, b) => {
        const valA = a[orderBy] ?? '';
        const valB = b[orderBy] ?? '';
        let cmp = 0;
        if (valA < valB) cmp = -1;
        else if (valA > valB) cmp = 1;
        return order === 'asc' ? cmp : -cmp;
    });

    const paginated = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <div className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="m-0">Event Types</h2>
                <div className="d-flex gap-2">
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchData}>
                        Refresh
                    </Button>
                    <Button variant="contained" color="success" startIcon={<AddIcon />} onClick={openCreate}>
                        Create Event Type
                    </Button>
                </div>
            </div>

            <Paper>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sortDirection={orderBy === 'id' ? order : false} sx={{ width: '5%' }}>
                                    <TableSortLabel active={orderBy === 'id'} direction={orderBy === 'id' ? order : 'asc'} onClick={() => handleSort('id')}>
                                        ID
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sortDirection={orderBy === 'name' ? order : false}>
                                    <TableSortLabel active={orderBy === 'name'} direction={orderBy === 'name' ? order : 'asc'} onClick={() => handleSort('name')}>
                                        Name
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sortDirection={orderBy === 'description' ? order : false}>
                                    <TableSortLabel active={orderBy === 'description'} direction={orderBy === 'description' ? order : 'asc'} onClick={() => handleSort('description')}>
                                        Description
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>Qualifications</TableCell>
                                <TableCell sortDirection={orderBy === 'defDurMins' ? order : false} sx={{ width: '10%' }}>
                                    <TableSortLabel active={orderBy === 'defDurMins'} direction={orderBy === 'defDurMins' ? order : 'asc'} onClick={() => handleSort('defDurMins')}>
                                        Duration (hrs)
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sortDirection={orderBy === 'requiredExperienceMonths' ? order : false} sx={{ width: '12%' }}>
                                    <TableSortLabel active={orderBy === 'requiredExperienceMonths'} direction={orderBy === 'requiredExperienceMonths' ? order : 'asc'} onClick={() => handleSort('requiredExperienceMonths')}>
                                        Experience
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ width: '8%' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginated.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">No event types found.</TableCell>
                                </TableRow>
                            ) : paginated.map(row => (
                                <TableRow key={row.id} hover>
                                    <TableCell>{row.id}</TableCell>
                                    <TableCell>{row.name}</TableCell>
                                    <TableCell>{row.description}</TableCell>
                                    <TableCell>
                                        <div className="d-flex flex-wrap gap-1">
                                            {row.requiredQualifications && row.requiredQualifications.length > 0
                                                ? row.requiredQualifications.map(q => (
                                                    <span key={q.id} className="badge bg-primary">{q.name}</span>
                                                ))
                                                : <span className="text-muted">—</span>
                                            }
                                        </div>
                                    </TableCell>
                                    <TableCell>{row.defDurMins ? (row.defDurMins / 60).toFixed(1) + ' hrs' : '—'}</TableCell>
                                    <TableCell>{formatExperience(row.requiredExperienceMonths)}</TableCell>
                                    <TableCell>
                                        <IconButton size="small" color="primary" onClick={() => openEdit(row)}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={data.data.length}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[5, 10, 20, 50, 100]}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    onRowsPerPageChange={e => { setRowsPerPage(Number.parseInt(e.target.value, 10)); setPage(0); }}
                />
            </Paper>

            <CreateEventType
                key={editData ? editData.id : 'new'}
                visible={dialogVisible}
                onHide={() => setDialogVisible(false)}
                onSave={handleSave}
                editData={editData}
            />
        </div>
    );
};

export default EventTypeList;
