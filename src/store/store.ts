import { configureStore } from '@reduxjs/toolkit';
import { locationApi } from './api/locationApi';
import { qualificationApi } from './api/qualificationApi';
import { designationApi } from './api/designationApi';

export const store = configureStore({
    reducer: {
        [locationApi.reducerPath]: locationApi.reducer,
        [qualificationApi.reducerPath]: qualificationApi.reducer,
        [designationApi.reducerPath]: designationApi.reducer,
    },
    middleware: getDefaultMiddleware =>
        getDefaultMiddleware()
            .concat(locationApi.middleware)
            .concat(qualificationApi.middleware)
            .concat(designationApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
