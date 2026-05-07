
import type { Qualification } from "./qualification";
import type { Holiday } from "./holiday";

export interface Staff {
    id: number;
    name: string;
    email: string;
    weeklyAvailHours ?: number;
    experienceMonths ?: number;
    qualifications ?: Qualification[];
    // location ?: Location;
    //designation ?: Designation;
    designation ?: string;
    holidays ?: Holiday[];
    deletedHolidayIds ?: number[];
}

