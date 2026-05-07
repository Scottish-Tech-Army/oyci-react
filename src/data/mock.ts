import type { Assignment, EventInstance, EventType, Location, Staff, StaffAvailability } from "../types/model";

export const eventTypes: EventType[] = [
  { id: "et1", name: "Music Lessons", description: "Music session", durationHours: 2, requiredQualifications: ["Music"] },
  { id: "et2", name: "Outdoor Adventure", description: "Outdoor activity", durationHours: 2, requiredQualifications: ["Outdoor", "First Aid"] },
  { id: "et3", name: "Art Workshop", description: "Creative session", durationHours: 2, requiredQualifications: ["Art"] },
];

export const locations: Location[] = [
  { id: "l1", name: "West Hall", address: "OYCI West Hall" },
  { id: "l2", name: "Forest Park", address: "Forest Park" },
  { id: "l3", name: "Community Center", address: "Main community center" },
];

export const events: EventInstance[] = [
  // ASC session: 3:30-5:30pm → staff shift 2:00-6:00pm
  { id: "e1",  date: "2026-04-04", locationId: "l1", status: "SCHEDULED", maxAttendees: 2,  time: "15:30", endTime: "17:30", shiftStart: "14:00", shiftEnd: "18:00", eventTypeName: "Music Lessons" },
  // Outdoor Adventure: 3:00-5:00pm → staff shift 2:30-5:30pm
  { id: "e2",  date: "2026-04-15", locationId: "l2", status: "SCHEDULED", maxAttendees: 45, time: "15:00", endTime: "17:00", shiftStart: "14:30", shiftEnd: "17:30", eventTypeName: "Outdoor Adventure" },
  // Art Workshop: 9:00am-12:00pm → staff shift 8:30am-12:30pm
  { id: "e3",  date: "2026-04-25", locationId: "l3", status: "DRAFT",     maxAttendees: 34, time: "09:00", endTime: "12:00", shiftStart: "08:30", shiftEnd: "12:30", eventTypeName: "Art Workshop" },
];

export const staff: Staff[] = [
  { id: "s1", name: "Alex Johnson", email: "alex@oyci.org.uk", roleLabel: "Facilitator", weeklyHoursCap: 20, qualifications: ["Outdoor", "First Aid"], phone: "+44 678456344" , photoUrl: "knnd"},
  { id: "s2", name: "Kelly Martin", email: "kelly@oyci.org.uk", roleLabel: "Instructor", weeklyHoursCap: 16, qualifications: ["Music"], phone: "+44 678456344", photoUrl: "knnd" },
  { id: "s3", name: "Jamie Lee", email: "jamie@oyci.org.uk", roleLabel: "Volunteer", weeklyHoursCap: 12, qualifications: ["Art"], phone: "+44 678456344", photoUrl: "knnd" },
];

export const availability: StaffAvailability[] = [
  // Working patterns
  { id: "a1", staffId: "s1", type: "WORKING", dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }, // Mon
  { id: "a2", staffId: "s2", type: "WORKING", dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
  { id: "a3", staffId: "s3", type: "WORKING", dayOfWeek: 4, startTime: "09:00", endTime: "17:00" }, // Thu
  // Holiday example
  { id: "h1", staffId: "s2", type: "HOLIDAY", startDate: "2026-04-14", endDate: "2026-04-16" },
];

export let assignments: Assignment[] = [
  { id: "as1", eventInstanceId: "e1", staffId: "s2" },
];