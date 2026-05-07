import React, { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import type {
  EventStaffRequirement,
  Location,
  EventType,
  Staff,
  Event,
  Assignment,
  HolidayPeriod,
  StaffWeeklyLoad,
  AssignmentDetail,
  StaffSuggestion,
} from '../types';
import {
  getRequirementMatch,
  normalizeEventTypeStaffRequirements,
  requirementMatchesStaff,
  summarizeRequirement,
  syncEventTypeRequirements,
} from '../shared/staffRequirements';
import {
  clearLegacyBrowserAppState,
  importLegacyAppState,
  loadAppState,
  loadLegacyBrowserAppState,
} from '../db/sqliteStorage';
import {
  fetchResourceSnapshot,
  apiCreateLocation,
  apiUpdateLocation,
  apiDeleteLocation,
  apiCreateEventType,
  apiUpdateEventType,
  apiDeleteEventType,
  apiCreateStaff,
  apiUpdateStaff,
  apiDeleteStaff,
  apiCreateEvent,
  apiUpdateEvent,
  apiDeleteEvent,
  apiCreateAssignment,
  apiUpdateAssignment,
  apiDeleteAssignment,
  apiAddQualification,
  apiRenameQualification,
  apiRemoveQualification,
} from '../api/resourceApi';
import { hasAnyData } from '../shared/appState';

export interface QualificationUsage {
  qualification: string;
  staffCount: number;
  eventTypeCount: number;
  staffMembers: string[];
  eventTypes: string[];
  inUse: boolean;
}

export interface QualificationActionResult {
  success: boolean;
  message: string;
}

export interface AppContextType {
  // State
  locations: Location[];
  eventTypes: EventType[];
  staff: Staff[];
  events: Event[];
  assignments: Assignment[];
  qualifications: string[];

  // Location actions
  addLocation: (location: Omit<Location, 'id' | 'createdAt'>) => void;
  updateLocation: (id: string, location: Partial<Location>) => void;
  deleteLocation: (id: string) => void;

  // EventType actions
  addEventType: (eventType: Omit<EventType, 'id' | 'createdAt'>) => void;
  updateEventType: (id: string, eventType: Partial<EventType>) => void;
  deleteEventType: (id: string) => void;
  addQualification: (q: string) => QualificationActionResult;
  renameQualification: (oldName: string, newName: string) => QualificationActionResult;
  removeQualification: (q: string) => QualificationActionResult;
  getQualificationUsage: (q: string) => QualificationUsage;

  // Staff actions
  addStaff: (staff: Omit<Staff, 'id' | 'createdAt'>) => void;
  updateStaff: (id: string, staff: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;
  addHolidayToStaff: (staffId: string, holiday: Omit<HolidayPeriod, 'id'>) => void;
  removeHolidayFromStaff: (staffId: string, holidayId: string) => void;

  // Event actions
  addEvent: (event: Omit<Event, 'id' | 'createdAt'>) => void;
  updateEvent: (id: string, event: Partial<Event>) => void;
  deleteEvent: (id: string) => void;

  // Assignment actions
  addAssignment: (assignment: Omit<Assignment, 'id' | 'confirmedAt'>) => void;
  updateAssignment: (id: string, assignment: Partial<Assignment>) => void;
  deleteAssignment: (id: string) => void;
  getAssignmentsForEvent: (eventId: string) => AssignmentDetail[];
  getAssignmentsForStaff: (staffId: string) => AssignmentDetail[];
  getAvailableStaffForEvent: (eventId: string) => Staff[];
  getStaffWeeklyLoad: (staffId: string, weekOf: string) => StaffWeeklyLoad;
  suggestStaffForEvent: (eventId: string) => StaffSuggestion[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export { AppContext };

interface RequirementCoverageAssignment {
  requirementId: string;
  staffId: string;
  matchWeight: number;
}

function normalizeEventTypesCollection(items: EventType[]): EventType[] {
  return items.map((eventType) => syncEventTypeRequirements(eventType));
}

function findBestRequirementCoverage(
  staffMembers: Array<Pick<Staff, 'id' | 'qualifications'>>,
  requirements: EventStaffRequirement[],
): {
  assignments: RequirementCoverageAssignment[];
  unfilledRequirements: EventStaffRequirement[];
} {
  let bestAssignments: RequirementCoverageAssignment[] = [];
  let bestFilledCount = -1;
  let bestMatchWeight = -1;

  const visit = (
    requirementIndex: number,
    usedStaffIds: Set<string>,
    assignments: RequirementCoverageAssignment[],
    filledCount: number,
    matchWeight: number,
  ) => {
    if (requirementIndex >= requirements.length) {
      if (
        filledCount > bestFilledCount ||
        (filledCount === bestFilledCount && matchWeight > bestMatchWeight)
      ) {
        bestAssignments = [...assignments];
        bestFilledCount = filledCount;
        bestMatchWeight = matchWeight;
      }
      return;
    }

    visit(requirementIndex + 1, usedStaffIds, assignments, filledCount, matchWeight);

    const requirement = requirements[requirementIndex];
    for (const member of staffMembers) {
      if (usedStaffIds.has(member.id)) {
        continue;
      }

      const match = getRequirementMatch(member.qualifications, requirement);
      if (!match.fullyQualified) {
        continue;
      }

      usedStaffIds.add(member.id);
      assignments.push({
        requirementId: requirement.id,
        staffId: member.id,
        matchWeight: match.matchedQualifications.length,
      });
      visit(
        requirementIndex + 1,
        usedStaffIds,
        assignments,
        filledCount + 1,
        matchWeight + match.matchedQualifications.length,
      );
      assignments.pop();
      usedStaffIds.delete(member.id);
    }
  };

  visit(0, new Set<string>(), [], 0, 0);

  const filledRequirementIds = new Set(bestAssignments.map((assignment) => assignment.requirementId));
  return {
    assignments: bestAssignments,
    unfilledRequirements: requirements.filter((requirement) => !filledRequirementIds.has(requirement.id)),
  };
}

export function AppProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [qualifications, setQualifications] = useState<string[]>([]);

  const syncFromServer = useCallback(async () => {
    const snapshot = await fetchResourceSnapshot();
    setLocations(snapshot.locations);
    setEventTypes(normalizeEventTypesCollection(snapshot.eventTypes));
    setStaff(snapshot.staff);
    setEvents(snapshot.events.map((event) => ({
      ...event,
      staffStartTime: event.staffStartTime || event.startTime,
      staffEndTime: event.staffEndTime || event.endTime,
    })));
    setAssignments(snapshot.assignments);
    setQualifications(snapshot.qualifications || []);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const hydrateState = async () => {
      try {
        try {
          const resourceSnapshot = await fetchResourceSnapshot();
          if (!isMounted) return;

          setLocations(resourceSnapshot.locations);
          setEventTypes(normalizeEventTypesCollection(resourceSnapshot.eventTypes));
          setStaff(resourceSnapshot.staff);
          setEvents(resourceSnapshot.events.map((event) => ({
            ...event,
            staffStartTime: event.staffStartTime || event.startTime,
            staffEndTime: event.staffEndTime || event.endTime,
          })));
          setAssignments(resourceSnapshot.assignments);
          setQualifications(resourceSnapshot.qualifications || []);
          return;
        } catch {
          const { snapshot: serverSnapshot, hasStoredState } = await loadAppState();
          let snapshot = serverSnapshot;

          if (!hasStoredState) {
            const legacySnapshot = await loadLegacyBrowserAppState();
            if (legacySnapshot && hasAnyData(legacySnapshot)) {
              snapshot = await importLegacyAppState(legacySnapshot);
              clearLegacyBrowserAppState();
            }
          }

          if (!isMounted) {
            return;
          }

          setLocations(snapshot.locations);
          setEventTypes(normalizeEventTypesCollection(snapshot.eventTypes));
          setStaff(snapshot.staff);
          setEvents(snapshot.events.map((e) => ({
            ...e,
            staffStartTime: e.staffStartTime || e.startTime,
            staffEndTime: e.staffEndTime || e.endTime,
          })));
          setAssignments(snapshot.assignments);
          setQualifications(snapshot.qualifications || []);
        }
      } finally {
        // hydration complete
      }
    };

    void hydrateState();

    return () => {
      isMounted = false;
    };
  }, []);

  const generateId = useCallback(() => `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`, []);
  const now = useCallback(() => new Date().toISOString(), []);

  // Location actions
  const addLocation = useCallback((location: Omit<Location, 'id' | 'createdAt'>) => {
    const newLocation: Location = {
      ...location,
      id: generateId(),
      createdAt: now(),
    };
    setLocations((prev) => [...prev, newLocation]);
    apiCreateLocation(newLocation).catch(() => { void syncFromServer(); });
  }, [generateId, now, syncFromServer]);

  const updateLocation = useCallback((id: string, updates: Partial<Location>) => {
    setLocations((prev) => {
      const next = prev.map((loc) => (loc.id === id ? { ...loc, ...updates } : loc));
      const full = next.find((loc) => loc.id === id);
      if (full) apiUpdateLocation(id, full).catch(() => { void syncFromServer(); });
      return next;
    });
  }, [syncFromServer]);

  const deleteLocation = useCallback((id: string) => {
    setLocations((prev) => prev.filter((loc) => loc.id !== id));
    apiDeleteLocation(id).catch(() => { void syncFromServer(); });
  }, [syncFromServer]);

  // EventType actions
  const addEventType = useCallback((eventType: Omit<EventType, 'id' | 'createdAt'>) => {
    const newEventType = syncEventTypeRequirements({
      ...eventType,
      id: generateId(),
      createdAt: now(),
    });
    setEventTypes((prev) => [...prev, newEventType]);
    apiCreateEventType(newEventType).catch(() => { void syncFromServer(); });
  }, [generateId, now, syncFromServer]);

  const normalizeQualificationName = useCallback((value: string) => value.trim(), []);

  const getQualificationUsage = useCallback((q: string): QualificationUsage => {
    const staffMembers = staff
      .filter((member) => member.qualifications.includes(q))
      .map((member) => member.name);
    const eventTypesUsingQualification = eventTypes
      .filter((eventType) => normalizeEventTypeStaffRequirements(eventType).some(
        (requirement) => requirement.requiredQualifications.includes(q),
      ))
      .map((eventType) => eventType.name);

    return {
      qualification: q,
      staffCount: staffMembers.length,
      eventTypeCount: eventTypesUsingQualification.length,
      staffMembers,
      eventTypes: eventTypesUsingQualification,
      inUse: staffMembers.length > 0 || eventTypesUsingQualification.length > 0,
    };
  }, [staff, eventTypes]);

  const addQualification = useCallback((q: string): QualificationActionResult => {
    const normalized = normalizeQualificationName(q);
    if (!normalized) {
      return { success: false, message: 'Qualification name is required.' };
    }

    const alreadyExists = qualifications.some(
      (qualification) => qualification.toLowerCase() === normalized.toLowerCase()
    );
    if (alreadyExists) {
      return { success: false, message: 'A qualification with that name already exists.' };
    }

    setQualifications((prev) => [...prev, normalized]);
    apiAddQualification(normalized).catch(() => { void syncFromServer(); });
    return { success: true, message: `Qualification "${normalized}" added.` };
  }, [normalizeQualificationName, qualifications, syncFromServer]);

  const renameQualification = useCallback((oldName: string, newName: string): QualificationActionResult => {
    const currentName = normalizeQualificationName(oldName);
    const normalizedNewName = normalizeQualificationName(newName);

    if (!currentName || !normalizedNewName) {
      return { success: false, message: 'Both current and new qualification names are required.' };
    }

    const exists = qualifications.includes(currentName);
    if (!exists) {
      return { success: false, message: 'Qualification to rename was not found.' };
    }

    const duplicate = qualifications.some(
      (qualification) =>
        qualification.toLowerCase() === normalizedNewName.toLowerCase() && qualification !== currentName
    );
    if (duplicate) {
      return { success: false, message: 'A qualification with that name already exists.' };
    }

    const renameQualificationValue = (qualification: string) => (
      qualification === currentName ? normalizedNewName : qualification
    );
    const renameEventTypeQualifications = (eventType: EventType): EventType => ({
      ...syncEventTypeRequirements({
        ...eventType,
        staffRequirements: normalizeEventTypeStaffRequirements(eventType).map((requirement) => ({
          ...requirement,
          requiredQualifications: requirement.requiredQualifications.map(renameQualificationValue),
        })),
      }),
    });
    const renameStaffQualifications = (member: Staff): Staff => ({
      ...member,
      qualifications: member.qualifications.map(renameQualificationValue),
    });

    setQualifications((prev) => prev.map((qualification) => (qualification === currentName ? normalizedNewName : qualification)));
    setEventTypes((prev) => prev.map(renameEventTypeQualifications));
    setStaff((prev) => prev.map(renameStaffQualifications));
    apiRenameQualification(currentName, normalizedNewName).catch(() => { void syncFromServer(); });

    return {
      success: true,
      message: `Renamed "${currentName}" to "${normalizedNewName}".`,
    };
  }, [normalizeQualificationName, qualifications, syncFromServer]);

  const removeQualification = useCallback((q: string): QualificationActionResult => {
    const normalized = normalizeQualificationName(q);
    if (!normalized) {
      return { success: false, message: 'Qualification name is required.' };
    }

    const usage = getQualificationUsage(normalized);
    if (usage.inUse) {
      return {
        success: false,
        message: `Cannot delete "${normalized}" because it is used by ${usage.staffCount} staff member(s) and ${usage.eventTypeCount} event type(s).`,
      };
    }

    const exists = qualifications.includes(normalized);
    if (!exists) {
      return { success: false, message: 'Qualification was not found.' };
    }

    setQualifications((prev) => prev.filter((qualification) => qualification !== normalized));
    apiRemoveQualification(normalized).catch(() => { void syncFromServer(); });
    return { success: true, message: `Qualification "${normalized}" deleted.` };
  }, [normalizeQualificationName, getQualificationUsage, qualifications, syncFromServer]);

  const updateEventType = useCallback((id: string, updates: Partial<EventType>) => {
    setEventTypes((prev) => {
      const next = prev.map((et) => (
        et.id === id ? syncEventTypeRequirements({ ...et, ...updates }) : et
      ));
      const full = next.find((et) => et.id === id);
      if (full) apiUpdateEventType(id, full).catch(() => { void syncFromServer(); });
      return next;
    });
  }, [syncFromServer]);

  const deleteEventType = useCallback((id: string) => {
    setEventTypes((prev) => prev.filter((et) => et.id !== id));
    apiDeleteEventType(id).catch(() => { void syncFromServer(); });
  }, [syncFromServer]);

  // Staff actions
  const addStaff = useCallback((staffMember: Omit<Staff, 'id' | 'createdAt'>) => {
    const newStaff: Staff = {
      ...staffMember,
      id: generateId(),
      createdAt: now(),
    };
    setStaff((prev) => [...prev, newStaff]);
    apiCreateStaff(newStaff).catch(() => { void syncFromServer(); });
  }, [generateId, now, syncFromServer]);

  const updateStaff = useCallback((id: string, updates: Partial<Staff>) => {
    setStaff((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
      const full = next.find((s) => s.id === id);
      if (full) apiUpdateStaff(id, full).catch(() => { void syncFromServer(); });
      return next;
    });
  }, [syncFromServer]);

  const deleteStaff = useCallback((id: string) => {
    setStaff((prev) => prev.filter((s) => s.id !== id));
    setAssignments((prev) => prev.filter((assignment) => assignment.staffId !== id));
    apiDeleteStaff(id).catch(() => { void syncFromServer(); });
  }, [syncFromServer]);

  const addHolidayToStaff = useCallback((staffId: string, holiday: Omit<HolidayPeriod, 'id'>) => {
    setStaff((prev) => {
      const next = prev.map((s) => {
        if (s.id !== staffId) return s;
        return { ...s, holidays: [...s.holidays, { ...holiday, id: generateId() }] };
      });
      const full = next.find((s) => s.id === staffId);
      if (full) apiUpdateStaff(staffId, full).catch(() => { void syncFromServer(); });
      return next;
    });
  }, [generateId, syncFromServer]);

  const removeHolidayFromStaff = useCallback((staffId: string, holidayId: string) => {
    setStaff((prev) => {
      const next = prev.map((s) => {
        if (s.id !== staffId) return s;
        return { ...s, holidays: s.holidays.filter((h) => h.id !== holidayId) };
      });
      const full = next.find((s) => s.id === staffId);
      if (full) apiUpdateStaff(staffId, full).catch(() => { void syncFromServer(); });
      return next;
    });
  }, [syncFromServer]);

  // Event actions
  const addEvent = useCallback((event: Omit<Event, 'id' | 'createdAt'>) => {
    const newEvent: Event = {
      ...event,
      id: generateId(),
      createdAt: now(),
    };
    setEvents((prev) => [...prev, newEvent]);
    apiCreateEvent(newEvent).catch(() => { void syncFromServer(); });
  }, [generateId, now, syncFromServer]);

  const updateEvent = useCallback((id: string, updates: Partial<Event>) => {
    setEvents((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...updates } : e));
      const full = next.find((e) => e.id === id);
      if (full) apiUpdateEvent(id, full).catch(() => { void syncFromServer(); });
      return next;
    });
  }, [syncFromServer]);

  const deleteEvent = useCallback((id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setAssignments((prev) => prev.filter((assignment) => assignment.eventId !== id));
    apiDeleteEvent(id).catch(() => { void syncFromServer(); });
  }, [syncFromServer]);

  // Assignment actions
  const addAssignment = useCallback((assignment: Omit<Assignment, 'id' | 'confirmedAt'>) => {
    const newAssignment: Assignment = {
      ...assignment,
      id: generateId(),
      confirmedAt: now(),
    };
    setAssignments((prev) => [...prev, newAssignment]);
    apiCreateAssignment(newAssignment).catch(() => { void syncFromServer(); });
  }, [generateId, now, syncFromServer]);

  const updateAssignment = useCallback((id: string, updates: Partial<Assignment>) => {
    setAssignments((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, ...updates } : a));
      const full = next.find((a) => a.id === id);
      if (full) apiUpdateAssignment(id, full).catch(() => { void syncFromServer(); });
      return next;
    });
  }, [syncFromServer]);

  const deleteAssignment = useCallback((id: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    apiDeleteAssignment(id).catch(() => { void syncFromServer(); });
  }, [syncFromServer]);

  // Query helpers
  const getAssignmentsForEvent = useCallback((eventId: string): AssignmentDetail[] => {
    const event = events.find((e) => e.id === eventId);
    const eventTypeId = event?.eventTypeId;
    const locationId = event?.locationId;
    
    return assignments
      .filter((a) => a.eventId === eventId)
      .map((a) => ({
        ...a,
        eventDetail: event,
        staffDetail: staff.find((s) => s.id === a.staffId),
        eventTypeDetail: eventTypeId ? eventTypes.find((et) => et.id === eventTypeId) : undefined,
        locationDetail: locationId ? locations.find((l) => l.id === locationId) : undefined,
      }));
  }, [assignments, events, staff, eventTypes, locations]);

  const getAssignmentsForStaff = useCallback((staffId: string): AssignmentDetail[] => {
    return assignments
      .filter((a) => a.staffId === staffId)
      .map((a) => {
        const event = events.find((e) => e.id === a.eventId);
        return {
          ...a,
          eventDetail: event,
          staffDetail: staff.find((s) => s.id === staffId),
          eventTypeDetail: event ? eventTypes.find((et) => et.id === event.eventTypeId) : undefined,
          locationDetail: event ? locations.find((l) => l.id === event.locationId) : undefined,
        };
      });
  }, [assignments, events, staff, eventTypes, locations]);

  const getEventStaffingState = useCallback((eventId: string) => {
    const event = events.find((entry) => entry.id === eventId);
    if (!event) {
      return { event: undefined, eventType: undefined, requirements: [], unfilledRequirements: [] };
    }

    const eventType = eventTypes.find((entry) => entry.id === event.eventTypeId);
    if (!eventType) {
      return { event, eventType: undefined, requirements: [], unfilledRequirements: [] };
    }

    const requirements = normalizeEventTypeStaffRequirements(eventType);
    const assignedStaffMembers = assignments
      .filter((assignment) => assignment.eventId === eventId)
      .map((assignment) => staff.find((member) => member.id === assignment.staffId))
      .filter((member): member is Staff => Boolean(member));
    const coverage = findBestRequirementCoverage(assignedStaffMembers, requirements);

    return {
      event,
      eventType,
      requirements,
      unfilledRequirements: coverage.unfilledRequirements,
    };
  }, [assignments, events, eventTypes, staff]);

  const getScheduleAvailableStaffForEvent = useCallback((eventId: string): Staff[] => {
    const event = events.find((entry) => entry.id === eventId);
    if (!event) return [];

    const alreadyAssigned = new Set(
      assignments
        .filter((assignment) => assignment.eventId === eventId)
        .map((assignment) => assignment.staffId),
    );

    return staff.filter((member) => {
      if (alreadyAssigned.has(member.id)) return false;

      const isOnHoliday = member.holidays.some(
        (holiday) => event.date >= holiday.startDate && event.date <= holiday.endDate,
      );
      if (isOnHoliday) return false;

      return true;
    });
  }, [assignments, events, staff]);

  const getAvailableStaffForEvent = useCallback((eventId: string): Staff[] => {
    const { requirements, unfilledRequirements } = getEventStaffingState(eventId);
    const targetRequirements = unfilledRequirements.length > 0 ? unfilledRequirements : requirements;

    return getScheduleAvailableStaffForEvent(eventId).filter((member) => (
      targetRequirements.length === 0 ||
      targetRequirements.some((requirement) => requirementMatchesStaff(member.qualifications, requirement))
    ));
  }, [getEventStaffingState, getScheduleAvailableStaffForEvent]);

  const getStaffWeeklyLoad = useCallback((staffId: string, weekOf: string): StaffWeeklyLoad => {
    const staffAssignments = getAssignmentsForStaff(staffId);
    const weekStart = new Date(weekOf);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekAssignments = staffAssignments.filter((a) => {
      if (!a.eventDetail) return false;
      const eventDate = new Date(a.eventDetail.date);
      return eventDate >= weekStart && eventDate <= weekEnd;
    });

    const hoursCommitted = weekAssignments.reduce((sum, a) => sum + a.hoursAllocated, 0);

    return {
      staffId,
      weekOf,
      hoursCommitted,
      assignments: weekAssignments,
    };
  }, [getAssignmentsForStaff]);

  const suggestStaffForEvent = useCallback((eventId: string): StaffSuggestion[] => {
    const { event, unfilledRequirements } = getEventStaffingState(eventId);
    if (!event || unfilledRequirements.length === 0) return [];

    const available = getScheduleAvailableStaffForEvent(eventId);

    // Determine the Monday of the event's week
    const eventDateObj = new Date(event.date);
    const dayOfWeek = eventDateObj.getDay();
    const diffDays = eventDateObj.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(new Date(event.date).setDate(diffDays))
      .toISOString()
      .split('T')[0];

    const candidatesByRequirement = unfilledRequirements.map((requirement) => (
      available
        .map((member) => {
          const match = getRequirementMatch(member.qualifications, requirement);
          if (requirement.requiredQualifications.length > 0 && match.qualificationScore === 0) {
            return null;
          }

          const weekLoad = getStaffWeeklyLoad(member.id, weekStart);
          const remainingHours = Math.max(0, member.availableHoursPerWeek - weekLoad.hoursCommitted);
          const availabilityScore =
            member.availableHoursPerWeek > 0 ? remainingHours / member.availableHoursPerWeek : 0;
          const score = match.qualificationScore * 0.7 + availabilityScore * 0.3;

          return {
            staff: member,
            requirementId: requirement.id,
            requirementLabel: summarizeRequirement(requirement),
            score,
            qualificationScore: match.qualificationScore,
            availabilityScore,
            hoursCommitted: weekLoad.hoursCommitted,
            fullyQualified: match.fullyQualified,
            matchedQualifications: match.matchedQualifications,
            missingQualifications: match.missingQualifications,
          };
        })
        .filter((candidate): candidate is StaffSuggestion => Boolean(candidate))
        .sort((left, right) => {
          if (left.fullyQualified !== right.fullyQualified) {
            return left.fullyQualified ? -1 : 1;
          }

          return right.score - left.score;
        })
    ));

    let bestSelection: StaffSuggestion[] = [];
    let bestFullyQualifiedCount = -1;
    let bestAssignedCount = -1;
    let bestTotalScore = -1;

    const visit = (
      requirementIndex: number,
      usedStaffIds: Set<string>,
      selected: StaffSuggestion[],
      fullyQualifiedCount: number,
      totalScore: number,
    ) => {
      if (requirementIndex >= candidatesByRequirement.length) {
        if (
          fullyQualifiedCount > bestFullyQualifiedCount ||
          (fullyQualifiedCount === bestFullyQualifiedCount && selected.length > bestAssignedCount) ||
          (
            fullyQualifiedCount === bestFullyQualifiedCount &&
            selected.length === bestAssignedCount &&
            totalScore > bestTotalScore
          )
        ) {
          bestSelection = [...selected];
          bestFullyQualifiedCount = fullyQualifiedCount;
          bestAssignedCount = selected.length;
          bestTotalScore = totalScore;
        }
        return;
      }

      visit(requirementIndex + 1, usedStaffIds, selected, fullyQualifiedCount, totalScore);

      for (const candidate of candidatesByRequirement[requirementIndex]) {
        if (usedStaffIds.has(candidate.staff.id)) {
          continue;
        }

        usedStaffIds.add(candidate.staff.id);
        selected.push(candidate);
        visit(
          requirementIndex + 1,
          usedStaffIds,
          selected,
          fullyQualifiedCount + (candidate.fullyQualified ? 1 : 0),
          totalScore + candidate.score,
        );
        selected.pop();
        usedStaffIds.delete(candidate.staff.id);
      }
    };

    visit(0, new Set<string>(), [], 0, 0);

    return bestSelection.sort((left, right) => right.score - left.score);
  }, [getEventStaffingState, getScheduleAvailableStaffForEvent, getStaffWeeklyLoad]);

  const value = useMemo<AppContextType>(
    () => ({
      locations,
      eventTypes,
      staff,
      events,
      assignments,
      qualifications,
      addLocation,
      updateLocation,
      deleteLocation,
      addEventType,
      updateEventType,
      deleteEventType,
      addQualification,
      renameQualification,
      removeQualification,
      getQualificationUsage,
      addStaff,
      updateStaff,
      deleteStaff,
      addHolidayToStaff,
      removeHolidayFromStaff,
      addEvent,
      updateEvent,
      deleteEvent,
      addAssignment,
      updateAssignment,
      deleteAssignment,
      getAssignmentsForEvent,
      getAssignmentsForStaff,
      getAvailableStaffForEvent,
      getStaffWeeklyLoad,
      suggestStaffForEvent,
    }),
    [
      locations,
      eventTypes,
      staff,
      events,
      assignments,
      qualifications,
      addLocation,
      updateLocation,
      deleteLocation,
      addEventType,
      updateEventType,
      deleteEventType,
      addQualification,
      renameQualification,
      removeQualification,
      getQualificationUsage,
      addStaff,
      updateStaff,
      deleteStaff,
      addHolidayToStaff,
      removeHolidayFromStaff,
      addEvent,
      updateEvent,
      deleteEvent,
      addAssignment,
      updateAssignment,
      deleteAssignment,
      getAssignmentsForEvent,
      getAssignmentsForStaff,
      getAvailableStaffForEvent,
      getStaffWeeklyLoad,
      suggestStaffForEvent,
    ]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}
