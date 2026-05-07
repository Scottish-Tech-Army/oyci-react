import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Designation } from '../../models/designation';

export const designationApi = createApi({
    reducerPath: 'designationApi',
    baseQuery: fetchBaseQuery({
        baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
    }),
    endpoints: builder => ({
        getDesignations: builder.query<Designation[], void>({
            query: () => '/designations',
        }),
    }),
});

export const { useGetDesignationsQuery } = designationApi;
