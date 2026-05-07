import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Location } from '../../models/location';

export const locationApi = createApi({
    reducerPath: 'locationApi',
    tagTypes: ['Location'],
    baseQuery: fetchBaseQuery({
        baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
    }),
    endpoints: builder => ({
        getLocations: builder.query<Location[], void>({
            query: () => '/locations',
            providesTags: ['Location'],
        }),
        createLocation: builder.mutation<Location, Omit<Location, 'id'>>({
            query: body => ({ url: '/locations', method: 'POST', body }),
            invalidatesTags: ['Location'],
        }),
        updateLocation: builder.mutation<Location, Location>({
            query: ({ id, ...body }) => ({ url: `/locations/${id}`, method: 'PUT', body }),
            invalidatesTags: ['Location'],
        }),
    }),
});

export const { useGetLocationsQuery, useCreateLocationMutation, useUpdateLocationMutation } = locationApi;
