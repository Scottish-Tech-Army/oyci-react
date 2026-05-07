import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '../component/dashboard/Dashboard';
import StaffList from '../component/staff/StaffList/staffList';
import EventTypeList from '../component/eventType/EventTypeList/eventTypeList';
import LocationList from '../component/location/LocationList/locationList';
import QualificationList from '../component/qualification/QualificationList/qualificationList';
import CalendarPage from '../component/event/Calendar';

const Placeholder = ({ title }: { title: string }) => (
    <div className="p-4">
        <h2>{title}</h2>
        <p className="text-muted">Coming soon.</p>
    </div>
);

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/event-types" element={<EventTypeList />} />
            <Route path="/staff" element={<StaffList />} />
            <Route path="/events" element={<CalendarPage />} />
            <Route path="/locations" element={<LocationList />} />
            <Route path="/qualifications" element={<QualificationList />} />
            <Route path="/reports" element={<Placeholder title="Reports" />} />
        </Routes>
    );
};

export default AppRoutes;
