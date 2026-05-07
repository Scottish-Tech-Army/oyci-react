import { useEffect, useState } from 'react';

const DashboardHome = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  }, []);

  if (!user) return null;

  return (
    <div className="dashboard-home">
      <div className="welcome-card">
        <h1>Welcome back, {user.firstName}!</h1>
        <p>This is your personal dashboard.</p>
        
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Registered Email</h3>
            <p>{user.emailId}</p>
          </div>
          <div className="stat-card">
            <h3>Profile Status</h3>
            <p>{user.qualifications && user.qualifications.length > 0 ? 'Completed' : 'Action Required'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
