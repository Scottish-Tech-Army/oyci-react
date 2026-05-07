import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Qualification } from '../../models/qualification';

export const qualificationApi = createApi({
    reducerPath: 'qualificationApi',
    tagTypes: ['Qualification'],
    baseQuery: fetchBaseQuery({
        baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
    }),
    endpoints: builder => ({
        getQualifications: builder.query<Qualification[], void>({
            query: () => '/qualifications',
            providesTags: ['Qualification'],
        }),
        createQualification: builder.mutation<Qualification, Omit<Qualification, 'id'>>({
            query: body => ({ url: '/qualifications', method: 'POST', body }),
            invalidatesTags: ['Qualification'],
        }),
        updateQualification: builder.mutation<Qualification, Qualification>({
            query: ({ id, ...body }) => ({ url: `/qualifications/${id}`, method: 'PUT', body }),
            invalidatesTags: ['Qualification'],
        }),
    }),
});

export const { useGetQualificationsQuery, useCreateQualificationMutation, useUpdateQualificationMutation } = qualificationApi;
