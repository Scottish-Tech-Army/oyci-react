import axiosInstance from '../api/axiosInstance';
import type { Location } from '../models/location';

const BASE = '/locations';

const locationService = {
    getAll: (): Promise<Location[]> =>
        axiosInstance.get<Location[]>(BASE).then(res => res.data),

    getById: (id: number): Promise<Location> =>
        axiosInstance.get<Location>(`${BASE}/${id}`).then(res => res.data),
};

export default locationService;
