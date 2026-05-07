import { useState } from 'react';
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
import CreateLocation from '../createLocation/createLocation';
import type { Location } from '../../../models/location';
import { useGetLocationsQuery, useCreateLocationMutation, useUpdateLocationMutation } from '../../../store/api/locationApi';

type Order = 'asc' | 'desc';

const LocationList = () => {
    const { data: locations = [], refetch } = useGetLocationsQuery();
    const [createLocation] = useCreateLocationMutation();
    const [updateLocation] = useUpdateLocationMutation();

    const [dialogVisible, setDialogVisible] = useState(false);
    const [editData, setEditData] = useState<Location | null>(null);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [orderBy, setOrderBy] = useState<keyof Location>('id');
    const [order, setOrder] = useState<Order>('asc');

    const openCreate = () => {
        setEditData(null);
        setDialogVisible(true);
    };

    const openEdit = (row: Location) => {
        setEditData(row);
        setDialogVisible(true);
    };

    const handleSave = async (location: Location) => {
        try {
            if (location.id) {
                await updateLocation(location).unwrap();
            } else {
                await createLocation(location).unwrap();
            }
            setDialogVisible(false);
            refetch();
        } catch (error) {
            console.error('Error saving location:', error);
            alert('Failed to save location. Please try again.');
        }
    };

    const handleSort = (column: keyof Location) => {
        const isAsc = orderBy === column && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(column);
    };

    const sorted = [...locations].sort((a, b) => {
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
                <h2 className="m-0">Locations</h2>
                <div className="d-flex gap-2">
                    <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => refetch()}>
                        Refresh
                    </Button>
                    <Button variant="contained" color="success" startIcon={<AddIcon />} onClick={openCreate}>
                        Create Location
                    </Button>
                </div>
            </div>

            <Paper>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sortDirection={orderBy === 'id' ? order : false} sx={{ width: '10%' }}>
                                    <TableSortLabel active={orderBy === 'id'} direction={orderBy === 'id' ? order : 'asc'} onClick={() => handleSort('id')}>
                                        ID
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sortDirection={orderBy === 'name' ? order : false}>
                                    <TableSortLabel active={orderBy === 'name'} direction={orderBy === 'name' ? order : 'asc'} onClick={() => handleSort('name')}>
                                        Name
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sortDirection={orderBy === 'address' ? order : false}>
                                    <TableSortLabel active={orderBy === 'address'} direction={orderBy === 'address' ? order : 'asc'} onClick={() => handleSort('address')}>
                                        Address
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ width: '8%' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginated.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center">No locations found.</TableCell>
                                </TableRow>
                            ) : paginated.map(row => (
                                <TableRow key={row.id} hover>
                                    <TableCell>{row.id}</TableCell>
                                    <TableCell>{row.name}</TableCell>
                                    <TableCell>{row.address}</TableCell>
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
                    count={locations.length}
                    page={page}
                    rowsPerPage={rowsPerPage}
                    rowsPerPageOptions={[5, 10, 20, 50, 100]}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    onRowsPerPageChange={e => { setRowsPerPage(Number.parseInt(e.target.value, 10)); setPage(0); }}
                />
            </Paper>

            <CreateLocation
                key={editData ? editData.id : 'new'}
                visible={dialogVisible}
                onHide={() => setDialogVisible(false)}
                onSave={handleSave}
                editData={editData}
            />
        </div>
    );
};

export default LocationList;
