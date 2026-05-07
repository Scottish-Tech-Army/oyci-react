import { useNavigate } from 'react-router-dom';

const summaryCards = [
    { title: 'Total Events This Week', value: 12, icon: 'pi pi-calendar', color: 'primary' },
    { title: 'Staff Assigned', value: 18, icon: 'pi pi-id-card', color: 'success' },
    { title: 'Pending Assignments', value: 4, icon: 'pi pi-check-square', color: 'warning' },
    { title: 'Staff on Leave', value: 2, icon: 'pi pi-send', color: 'info' },
];

const upcomingEvents = [
    { name: 'Music Workshop', date: 'April 25, 2024 • 4:00 PM', capacity: '2 / 11 qp', location: 'Community Hall' },
    { name: 'Outdoor Activities', date: 'April 25, 2024 • 9:30 AM', capacity: '2 / 3 qp', location: 'Local Park' },
];

const quickActions = [
    { label: 'Create Event Type', path: '/events', icon: 'pi pi-plus' },
    { label: 'Add Event Instance', path: '/events', icon: 'pi pi-plus' },
    { label: 'Add Staff', path: '/staff', icon: 'pi pi-plus' },
    { label: 'Add Location', path: '/locations', icon: 'pi pi-plus' },
];

const staffAlerts = [
    { message: 'John Doe - Exceeds weekly hours limit' },
    { message: 'Priya Shah is assigned during leave date' },
];

const Dashboard = () => {
    const navigate = useNavigate();

    return (
        <div className="container-fluid p-4 min-vh-100" style={{ backgroundColor: '#f0f2f5' }}>
            {/* Summary Cards */}
            <div className="row g-3 mb-4">
                {summaryCards.map(card => (
                    <div key={card.title} className="col-12 col-sm-6 col-lg-3">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body d-flex align-items-center gap-3">
                                <div className={`bg-${card.color} bg-opacity-10 rounded-3 p-3`}>
                                    <i className={`${card.icon} fs-4 text-${card.color}`} />
                                </div>
                                <div>
                                    <h3 className="mb-0 fw-bold">{card.value}</h3>
                                    <small className="text-muted">{card.title}</small>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="row g-3 mb-4">
                {/* Upcoming Events */}
                <div className="col-12 col-lg-7">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                            <h5 className="fw-bold mb-3">Upcoming Events</h5>
                            {upcomingEvents.map(evt => (
                                <div key={evt.name} className="d-flex justify-content-between align-items-center border-bottom py-2">
                                    <div>
                                        <div className="fw-semibold">{evt.name}</div>
                                        <small className="text-muted">{evt.date}</small>
                                    </div>
                                    <div className="text-end">
                                        <small className="text-muted d-block">{evt.capacity}</small>
                                        <small className="text-muted">{evt.location}</small>
                                    </div>
                                    <button className="btn btn-sm btn-outline-primary ms-2" onClick={() => navigate('/events')}>View</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="col-12 col-lg-5">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                            <h5 className="fw-bold mb-3">Quick Actions</h5>
                            <div className="d-flex flex-column gap-2">
                                {quickActions.map(action => (
                                    <button
                                        key={action.label}
                                        className="btn btn-light text-start d-flex align-items-center gap-2"
                                        onClick={() => navigate(action.path)}
                                    >
                                        <i className={`${action.icon} text-primary`} />
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Staff Alerts */}
            <div className="row g-3">
                <div className="col-12">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body">
                            <h5 className="fw-bold mb-3">Staff Alerts</h5>
                            {staffAlerts.map(alert => (
                                <div key={alert.message} className="d-flex justify-content-between align-items-center border-bottom py-2">
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="badge rounded-pill bg-primary">&nbsp;</span>
                                        <span>{alert.message}</span>
                                    </div>
                                    <i className="pi pi-chevron-right text-muted" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
