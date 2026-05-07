import type {
  EventStaffRequirement,
  Qualification,
  QualificationMatchMode,
} from '../types/index.js';

const LEGACY_MATCH_MODE: QualificationMatchMode = 'any';
const EXPLICIT_MATCH_MODE: QualificationMatchMode = 'all';

export type EventTypeRequirementSource = {
  requiredQualifications: Qualification[];
  minimumStaffRequired: number;
  staffRequirements?: EventStaffRequirement[];
};

function sanitizeQualifications(qualifications: readonly Qualification[]): Qualification[] {
  const seen = new Set<string>();

  return qualifications.filter((qualification) => {
    const normalized = qualification.trim();
    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function buildRequirementId(index: number): string {
  return `staff-requirement-${index + 1}`;
}

function normalizeRequirement(
  requirement: Partial<EventStaffRequirement>,
  index: number,
): EventStaffRequirement {
  return {
    id: requirement.id?.trim() || buildRequirementId(index),
    requiredQualifications: sanitizeQualifications(requirement.requiredQualifications ?? []),
    matchMode: requirement.matchMode === 'any' ? 'any' : EXPLICIT_MATCH_MODE,
  };
}

function buildLegacyRequirements(eventType: EventTypeRequirementSource): EventStaffRequirement[] {
  const count = Math.max(1, Math.trunc(eventType.minimumStaffRequired || 1));
  const requiredQualifications = sanitizeQualifications(eventType.requiredQualifications ?? []);

  return Array.from({ length: count }, (_, index) => ({
    id: buildRequirementId(index),
    requiredQualifications,
    matchMode: LEGACY_MATCH_MODE,
  }));
}

export function normalizeEventTypeStaffRequirements(
  eventType: EventTypeRequirementSource,
): EventStaffRequirement[] {
  if (eventType.staffRequirements && eventType.staffRequirements.length > 0) {
    return eventType.staffRequirements.map((requirement, index) => normalizeRequirement(requirement, index));
  }

  return buildLegacyRequirements(eventType);
}

export function collectRequiredQualifications(requirements: EventStaffRequirement[]): Qualification[] {
  return sanitizeQualifications(requirements.flatMap((requirement) => requirement.requiredQualifications));
}

export function summarizeRequirement(requirement: EventStaffRequirement): string {
  if (requirement.requiredQualifications.length === 0) {
    return 'No qualifications required';
  }

  if (requirement.matchMode === 'any') {
    return requirement.requiredQualifications.length === 1
      ? requirement.requiredQualifications[0]
      : `Any of: ${requirement.requiredQualifications.join(', ')}`;
  }

  return requirement.requiredQualifications.join(' + ');
}

export function syncEventTypeRequirements<T extends EventTypeRequirementSource>(
  eventType: T,
): T & EventTypeRequirementSource {
  const staffRequirements = normalizeEventTypeStaffRequirements(eventType);

  return {
    ...eventType,
    staffRequirements,
    requiredQualifications: collectRequiredQualifications(staffRequirements),
    minimumStaffRequired: staffRequirements.length,
  };
}

export function getRequirementMatch(
  staffQualifications: Qualification[],
  requirement: EventStaffRequirement,
): {
  matchedQualifications: Qualification[];
  missingQualifications: Qualification[];
  qualificationScore: number;
  fullyQualified: boolean;
} {
  const requiredQualifications = sanitizeQualifications(requirement.requiredQualifications);
  const matchedQualifications = requiredQualifications.filter((qualification) =>
    staffQualifications.includes(qualification),
  );

  if (requiredQualifications.length === 0) {
    return {
      matchedQualifications: [],
      missingQualifications: [],
      qualificationScore: 1,
      fullyQualified: true,
    };
  }

  if (requirement.matchMode === 'any') {
    const fullyQualified = matchedQualifications.length > 0;
    return {
      matchedQualifications,
      missingQualifications: fullyQualified ? [] : requiredQualifications,
      qualificationScore: fullyQualified ? 1 : 0,
      fullyQualified,
    };
  }

  const missingQualifications = requiredQualifications.filter(
    (qualification) => !staffQualifications.includes(qualification),
  );

  return {
    matchedQualifications,
    missingQualifications,
    qualificationScore: matchedQualifications.length / requiredQualifications.length,
    fullyQualified: missingQualifications.length === 0,
  };
}

export function requirementMatchesStaff(
  staffQualifications: Qualification[],
  requirement: EventStaffRequirement,
): boolean {
  return getRequirementMatch(staffQualifications, requirement).fullyQualified;
}