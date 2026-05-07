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
import CreateStaff from '../createStaff/createStaff';
import type { Staff } from '../../../models/staff';
import axiosInstance from '../../../api/axiosInstance';

type Order = 'asc' | 'desc';


const StaffList = () => {
    
    const [dialogVisible, setDialogVisible] = useState(false);
    const [editData, setEditData] = useState<Staff | null>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [orderBy, setOrderBy] = useState<keyof Staff>('id');
    const [order, setOrder] = useState<Order>('asc');
    const [staffData, setStaffData] = useState<{loading: boolean, data: Staff[]}>({loading: true, data: []});
    const [refreshKey, setRefreshKey] = useState(0);

    const fetchStaff = () => {
        setStaffData(prev => ({ ...prev, loading: true }));
        setRefreshKey(k => k + 1);
    };

    useEffect(() => {
        let cancelled = false;
        axiosInstance.get<Staff[]>('/staff').then(res => {
            if (!cancelled) {
                setStaffData({loading: false, data: res.data});
            }
        });
        return () => { cancelled = true; };
    }, [refreshKey]);

    const openCreate = () => {
        setEditData(null);
        setDialogVisible(true);
    };

    const openEdit = (row: Staff) => {
        setEditData(row);
        setDialogVisible(true);
    };

    const handleSave = (staff: Staff) => {
        const request = staff.id
            ? axiosInstance.put(`/staff/${staff.id}`, staff)
            : axiosInstance.post('/staff', staff);

        request.then(() => {
            setDialogVisible(false);
            fetchStaff();
        }).catch((error: Error) => {
            console.error('Error saving staff:', error);
            alert('Failed to save staff. Please try again.');
        });
    };

    const handleSort = (column: keyof Staff) => {
        const isAsc = orderBy === column && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(column);
    };

    const sorted = [...staffData.data].sort((a, b) => {
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
                <h2 className="m-0">Staff List</h2>
                <div className="d-flex gap-2">
                    <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={fetchStaff}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={<AddIcon />}
                        onClick={openCreate}
                    >
                        Create Staff
                    </Button>
                </div>
            </div>

            <Paper>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sortDirection={orderBy === 'id' ? order : false} sx={{ width: '5%' }}>
                                    <TableSortLabel
                                        active={orderBy === 'id'}
                                        direction={orderBy === 'id' ? order : 'asc'}
                                        onClick={() => handleSort('id')}
                                    >ID</TableSortLabel>
                                </TableCell>
                                <TableCell sortDirection={orderBy === 'name' ? order : false}>
                                    <TableSortLabel
                                        active={orderBy === 'name'}
                                        direction={orderBy === 'name' ? order : 'asc'}
                                        onClick={() => handleSort('name')}
                                    >Name</TableSortLabel>
                                </TableCell>
                                <TableCell sortDirection={orderBy === 'email' ? order : false}>
                                    <TableSortLabel
                                        active={orderBy === 'email'}
                                        direction={orderBy === 'email' ? order : 'asc'}
                                        onClick={() => handleSort('email')}
                                    >Email</TableSortLabel>
                                </TableCell>
                                <TableCell sortDirection={orderBy === 'weeklyAvailHours' ? order : false} align="right" sx={{ width: '12%' }}>
                                    <TableSortLabel
                                        active={orderBy === 'weeklyAvailHours'}
                                        direction={orderBy === 'weeklyAvailHours' ? order : 'asc'}
                                        onClick={() => handleSort('weeklyAvailHours')}
                                    >Weekly Hours</TableSortLabel>
                                </TableCell>
                                <TableCell>Qualifications</TableCell>
                                <TableCell>Designation</TableCell>
                                <TableCell sortDirection={orderBy === 'experienceMonths' ? order : false} sx={{ width: '10%' }}>
                                    <TableSortLabel
                                        active={orderBy === 'experienceMonths'}
                                        direction={orderBy === 'experienceMonths' ? order : 'asc'}
                                        onClick={() => handleSort('experienceMonths')}
                                    >Experience</TableSortLabel>
                                </TableCell>
                                <TableCell>Holidays</TableCell>
                                <TableCell sx={{ width: '8%' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginated.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center">No staff found.</TableCell>
                                </TableRow>
                            ) : paginated.map(row => (
                                <TableRow key={row.id} hover>
                                    <TableCell>{row.id}</TableCell>
                                    <TableCell>{row.name}</TableCell>
                                    <TableCell>{row.email}</TableCell>
                                    <TableCell align="right">{row.weeklyAvailHours ?? '—'}</TableCell>
                                    <TableCell>
                                        <div className="d-flex flex-wrap gap-1">
                                            {row.qualifications && row.qualifications.length > 0
                                                ? row.qualifications.map(q => (
                                                    <span key={q.id} className="badge bg-primary">{q.name}</span>
                                                ))
                                                : <span className="text-muted">—</span>
                                            }
                                        </div>
                                    </TableCell>
                                    <TableCell>{row.designation ?? '—'}</TableCell>
                                    <TableCell>
                                        {row.experienceMonths
                                            ? `${Math.floor(row.experienceMonths / 12)} yrs ${row.experienceMonths % 12} mos`
                                            : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="d-flex flex-wrap gap-1">
                                            {row.holidays && row.holidays.length > 0
                                                ? row.holidays.map(h => (
                                                    <span key={h.id} className="badge bg-info text-dark">{h.startDate} - {h.endDate}</span>
                                                ))
                                                : <span className="text-muted">—</span>
                                            }
                                        </div>
                                    </TableCell>
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
                    count={staffData.data.length}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[5, 10, 20, 50, 100]}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    onRowsPerPageChange={e => { setRowsPerPage(Number.parseInt(e.target.value, 10)); setPage(0); }}
                />
            </Paper>

            <CreateStaff
                key={editData ? editData.id : 'new'}
                visible={dialogVisible}
                onHide={() => setDialogVisible(false)}
                onSave={handleSave}
                editData={editData}
            />
        </div>
    );
};

export default StaffList;