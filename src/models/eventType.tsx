

export interface EventType {
    id?: number;
    name: string;
    description: string;
    requiredQualifications?: EventTypeQualification[];
    defDurMins?: number;
    eventDurMins?: number;
    requiredExperienceMonths?: number;
}

export interface EventTypeQualification {
    id?: number;
    name: string;
}
