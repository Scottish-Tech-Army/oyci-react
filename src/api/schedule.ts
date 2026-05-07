import client from './client';
import type { AutoScheduleResult } from '../types';

export const autoSchedule = () =>
  client.post<AutoScheduleResult>('/schedule/auto').then(r => r.data);
