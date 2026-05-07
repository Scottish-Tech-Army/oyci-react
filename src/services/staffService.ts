import axiosInstance from '../api/axiosInstance';
import type { Staff } from '../models/staff';

const BASE = '/staff';

const staffService = {
    getAll: (): Promise<Staff[]> =>
        axiosInstance.get<Staff[]>(BASE).then(res => res.data),

    getById: (id: number): Promise<Staff> =>
        axiosInstance.get<Staff>(`${BASE}/${id}`).then(res => res.data),

    create: (staff: Omit<Staff, 'id'>): Promise<Staff> =>
        axiosInstance.post<Staff>(BASE, staff).then(res => res.data),

    update: (id: number, staff: Partial<Staff>): Promise<Staff> =>
        axiosInstance.put<Staff>(`${BASE}/${id}`, staff).then(res => res.data),

    remove: (id: number): Promise<void> =>
        axiosInstance.delete(`${BASE}/${id}`).then(() => undefined),
};

export default staffService;
