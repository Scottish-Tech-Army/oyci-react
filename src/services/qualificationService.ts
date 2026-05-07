import axiosInstance from '../api/axiosInstance';
import type { Qualification } from '../models/qualification';

const BASE = '/qualifications';

const qualificationService = {
    getAll: (): Promise<Qualification[]> =>
        axiosInstance.get<Qualification[]>(BASE).then(res => res.data),

    getById: (id: number): Promise<Qualification> =>
        axiosInstance.get<Qualification>(`${BASE}/${id}`).then(res => res.data),
};

export default qualificationService;
