import type { Assignment, Event, EventType, Location, Staff } from '../types/index.js';
import { qualificationOptions } from '../types/index.js';
import { syncEventTypeRequirements } from './staffRequirements.js';

export const LEGACY_DB_STORAGE_KEY = 'oyci.sqlite.database';

export interface AppStateSnapshot {
  locations: Location[];
  eventTypes: EventType[];
  staff: Staff[];
  events: Event[];
  assignments: Assignment[];
  qualifications: string[];
  version?: number;
}

export function hasAnyData(snapshot: AppStateSnapshot): boolean {
  return (
    snapshot.locations.length > 0 ||
    snapshot.eventTypes.length > 0 ||
    snapshot.staff.length > 0 ||
    snapshot.events.length > 0 ||
    snapshot.assignments.length > 0
  );
}

export function buildSeedSnapshot(): AppStateSnapshot {
  const nowIso = new Date().toISOString();

  const locations: Location[] = [
    { id: 'loc-1', name: 'Alloa Community Hall', address: '1 Community Lane, Alloa', capacity: 60, createdAt: nowIso },
    { id: 'loc-2', name: 'Riverfront Youth Centre', address: '2 River Rd, Alloa', capacity: 40, createdAt: nowIso },
  ];

  const eventTypes: EventType[] = [
    syncEventTypeRequirements({ id: 'et-asc', name: 'Active Schools Club', description: 'After-school activity club', durationMinutes: 120, requiredQualifications: ['Safeguarding'], minimumStaffRequired: 2, createdAt: nowIso }),
    syncEventTypeRequirements({ id: 'et-junior', name: 'Junior Youth Club', description: 'Junior youth club session', durationMinutes: 120, requiredQualifications: ['Youth Support'], minimumStaffRequired: 2, createdAt: nowIso }),
    syncEventTypeRequirements({ id: 'et-drama', name: 'Drama Workshop', description: 'Drama and performance session', durationMinutes: 90, requiredQualifications: ['Arts Leader'], minimumStaffRequired: 1, createdAt: nowIso }),
    syncEventTypeRequirements({ id: 'et-gaming', name: 'Gaming Night', description: 'Evening gaming session', durationMinutes: 150, requiredQualifications: ['Safeguarding'], minimumStaffRequired: 1, createdAt: nowIso }),
    syncEventTypeRequirements({ id: 'et-hi5', name: 'Hi5', description: 'Full-day youth activity day', durationMinutes: 420, requiredQualifications: ['Youth Support'], minimumStaffRequired: 3, createdAt: nowIso }),
  ];

  const staffNames = [
    'Elayne', 'Suzanne', 'Daniel', 'Bill', 'Enxhi', 'Joe', 'Nicole', 'Lisa', 'Kirsty', 'Patricia', 'Cath', 'Matthew', 'Nicola',
  ];

  const qualificationsByName: Record<string, string[]> = {
    Elayne: ['Safeguarding', 'Youth Support'],
    Suzanne: ['Safeguarding', 'Arts Leader'],
    Daniel: ['Safeguarding', 'Youth Support', 'Basketball Coach'],
    Bill: ['Safeguarding', 'Arts Leader', 'Physical Activity'],
    Enxhi: ['Safeguarding', 'Youth Support'],
    Joe: ['Safeguarding', 'Arts Leader', 'Physical Activity'],
    Nicole: ['Safeguarding', 'Arts Leader', 'Youth Support'],
    Lisa: ['Safeguarding', 'Event Steward', 'Trip Leader'],
    Kirsty: ['Safeguarding'],
    Patricia: ['Safeguarding', 'Outdoor Leader'],
    Cath: ['Safeguarding', 'Youth Support'],
    Matthew: ['Safeguarding'],
    Nicola: ['Safeguarding', 'Youth Support'],
  };

  const hoursByName: Record<string, number> = {
    Elayne: 35,
    Suzanne: 35,
    Daniel: 35,
    Bill: 35,
    Enxhi: 16,
    Joe: 35,
    Nicole: 35,
    Lisa: 35,
    Kirsty: 35,
    Patricia: 35,
    Cath: 35,
    Matthew: 16,
    Nicola: 16,
  };

  const staff: Staff[] = staffNames.map((name, idx) => ({
    id: `staff-${idx + 1}`,
    name,
    email: `${name.toLowerCase()}@oyci.local`,
    phone: `07700 ${900000 + idx}`,
    qualifications: qualificationsByName[name] || ['Safeguarding'],
    payType: (hoursByName[name] || 20) >= 25 ? 'salaried' : 'hourly',
    availableHoursPerWeek: (hoursByName[name] || 20) >= 25 ? 35 : (hoursByName[name] || 20),
    holidays: [],
    createdAt: nowIso,
  }));

  const hoursBetween = (start: string, end: string) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh + em / 60) - (sh + sm / 60);
  };

  const seedYear = new Date().getFullYear();
  const toSeedDate = (month: number, day: number) => {
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${seedYear}-${mm}-${dd}`;
  };

  const events: Event[] = [];
  const assignments: Assignment[] = [];
  let eventIndex = 1;
  let assignmentIndex = 1;

  const addEventWithAssignments = (params: {
    date: string;
    eventTypeId: string;
    locationId: string;
    startTime: string;
    endTime: string;
    staffList: string[];
    notes?: string;
    staffStartTime?: string;
    staffEndTime?: string;
  }) => {
    const eventId = `evt-${eventIndex}`;
    eventIndex += 1;
    const assignedStartTime = params.staffStartTime ?? params.startTime;
    const assignedEndTime = params.staffEndTime ?? params.endTime;

    events.push({
      id: eventId,
      eventTypeId: params.eventTypeId,
      locationId: params.locationId,
      date: params.date,
      startTime: params.startTime,
      endTime: params.endTime,
      staffStartTime: assignedStartTime,
      staffEndTime: assignedEndTime,
      maxAttendees: 20,
      notes: params.notes ?? undefined,
      createdAt: nowIso,
    });

    const hours = Math.max(0.5, Math.round(hoursBetween(assignedStartTime, assignedEndTime) * 10) / 10);
    params.staffList.forEach((staffName) => {
      const staffMember = staff.find((candidate) => candidate.name === staffName);
      if (!staffMember) {
        return;
      }

      assignments.push({
        id: `asg-${assignmentIndex}`,
        eventId,
        staffId: staffMember.id,
        hoursAllocated: hours,
        confirmedAt: nowIso,
      });
      assignmentIndex += 1;
    });
  };

  addEventWithAssignments({ date: toSeedDate(3, 3), eventTypeId: 'et-asc', locationId: 'loc-1', startTime: '15:30', endTime: '17:30', staffList: ['Elayne', 'Kirsty'], staffStartTime: '15:15', staffEndTime: '17:45' });
  addEventWithAssignments({ date: toSeedDate(3, 4), eventTypeId: 'et-junior', locationId: 'loc-2', startTime: '16:00', endTime: '18:00', staffList: ['Cath', 'Daniel'], staffStartTime: '15:45', staffEndTime: '18:15' });
  addEventWithAssignments({ date: toSeedDate(3, 5), eventTypeId: 'et-drama', locationId: 'loc-1', startTime: '17:00', endTime: '18:30', staffList: ['Nicole'], staffStartTime: '16:45', staffEndTime: '18:45' });
  addEventWithAssignments({ date: toSeedDate(3, 5), eventTypeId: 'et-gaming', locationId: 'loc-2', startTime: '18:30', endTime: '21:00', staffList: ['Joe', 'Matthew'], staffStartTime: '18:15', staffEndTime: '21:15' });
  addEventWithAssignments({ date: toSeedDate(3, 10), eventTypeId: 'et-asc', locationId: 'loc-1', startTime: '15:30', endTime: '17:30', staffList: ['Elayne', 'Enxhi'], staffStartTime: '15:15', staffEndTime: '17:45' });
  addEventWithAssignments({ date: toSeedDate(3, 11), eventTypeId: 'et-junior', locationId: 'loc-2', startTime: '16:00', endTime: '18:00', staffList: ['Cath', 'Nicola'], staffStartTime: '15:45', staffEndTime: '18:15' });
  addEventWithAssignments({ date: toSeedDate(3, 12), eventTypeId: 'et-drama', locationId: 'loc-1', startTime: '17:00', endTime: '18:30', staffList: ['Suzanne'], staffStartTime: '16:45', staffEndTime: '18:45' });
  addEventWithAssignments({ date: toSeedDate(3, 13), eventTypeId: 'et-hi5', locationId: 'loc-2', startTime: '08:30', endTime: '15:30', staffList: ['Joe', 'Daniel', 'Kirsty'], staffStartTime: '08:00', staffEndTime: '16:00' });
  addEventWithAssignments({ date: toSeedDate(3, 13), eventTypeId: 'et-gaming', locationId: 'loc-1', startTime: '18:30', endTime: '21:00', staffList: ['Matthew', 'Bill'], staffStartTime: '18:15', staffEndTime: '21:15' });
  addEventWithAssignments({ date: toSeedDate(3, 17), eventTypeId: 'et-asc', locationId: 'loc-1', startTime: '15:30', endTime: '17:30', staffList: ['Elayne', 'Kirsty', 'Enxhi'], staffStartTime: '15:15', staffEndTime: '17:45' });
  addEventWithAssignments({ date: toSeedDate(3, 18), eventTypeId: 'et-junior', locationId: 'loc-2', startTime: '16:00', endTime: '18:00', staffList: ['Cath', 'Daniel'], staffStartTime: '15:45', staffEndTime: '18:15' });
  addEventWithAssignments({ date: toSeedDate(3, 19), eventTypeId: 'et-drama', locationId: 'loc-1', startTime: '17:00', endTime: '18:30', staffList: ['Nicole'], staffStartTime: '16:45', staffEndTime: '18:45' });
  addEventWithAssignments({ date: toSeedDate(3, 20), eventTypeId: 'et-hi5', locationId: 'loc-2', startTime: '08:30', endTime: '15:30', staffList: ['Joe', 'Lisa', 'Suzanne'], staffStartTime: '08:00', staffEndTime: '16:00' });
  addEventWithAssignments({ date: toSeedDate(3, 24), eventTypeId: 'et-asc', locationId: 'loc-1', startTime: '15:30', endTime: '17:30', staffList: ['Elayne', 'Kirsty'], staffStartTime: '15:15', staffEndTime: '17:45' });
  addEventWithAssignments({ date: toSeedDate(3, 25), eventTypeId: 'et-junior', locationId: 'loc-2', startTime: '16:00', endTime: '18:00', staffList: ['Cath', 'Nicola'], staffStartTime: '15:45', staffEndTime: '18:15' });
  addEventWithAssignments({ date: toSeedDate(3, 26), eventTypeId: 'et-gaming', locationId: 'loc-1', startTime: '18:30', endTime: '21:00', staffList: ['Joe', 'Matthew'], staffStartTime: '18:15', staffEndTime: '21:15' });
  addEventWithAssignments({ date: toSeedDate(3, 26), eventTypeId: 'et-drama', locationId: 'loc-1', startTime: '17:00', endTime: '18:30', staffList: ['Suzanne'], staffStartTime: '16:45', staffEndTime: '18:45' });
  addEventWithAssignments({ date: toSeedDate(4, 1), eventTypeId: 'et-asc', locationId: 'loc-1', startTime: '15:30', endTime: '17:30', staffList: ['Elayne'], staffStartTime: '15:15', staffEndTime: '17:45' });
  addEventWithAssignments({ date: toSeedDate(4, 2), eventTypeId: 'et-junior', locationId: 'loc-2', startTime: '16:00', endTime: '18:00', staffList: [], staffStartTime: '15:45', staffEndTime: '18:15' });
  addEventWithAssignments({ date: toSeedDate(4, 3), eventTypeId: 'et-drama', locationId: 'loc-1', startTime: '17:00', endTime: '18:30', staffList: ['Nicole'], staffStartTime: '16:45', staffEndTime: '18:45' });
  addEventWithAssignments({ date: toSeedDate(4, 7), eventTypeId: 'et-hi5', locationId: 'loc-2', startTime: '08:30', endTime: '15:30', staffList: ['Joe', 'Daniel'], staffStartTime: '08:00', staffEndTime: '16:00' });
  addEventWithAssignments({ date: toSeedDate(4, 9), eventTypeId: 'et-gaming', locationId: 'loc-1', startTime: '18:30', endTime: '21:00', staffList: ['Matthew'], staffStartTime: '18:15', staffEndTime: '21:15' });

  return {
    locations,
    eventTypes,
    staff,
    events,
    assignments,
    qualifications: qualificationOptions,
  };
}
