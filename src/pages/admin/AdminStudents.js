import React, { useEffect, useState } from 'react';
import { getAllStudents } from '../../services/api';

export default function AdminStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getAllStudents().then(r => setStudents(r.data)).finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(s =>
    s.username.toLowerCase().includes(search.toLowerCase()) ||
    (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
    s.skills?.some(sk => sk.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <div className="metric-row">
        <div className="metric-card"><div className="m-label">Total students</div><div className="m-value">{students.length}</div></div>
        <div className="metric-card"><div className="m-label">Special needs</div><div className="m-value">{students.filter(s => s.specialNeeds).length}</div></div>
        <div className="metric-card"><div className="m-label">With certificates</div><div className="m-value">{students.filter(s => s.completedEventIds?.length > 0).length}</div></div>
      </div>
      <div className="card">
        <div className="card-header"><span className="card-title">All students</span></div>
        <input className="form-input" style={{ marginBottom: 16 }} placeholder="Search by name, username or skill…" value={search} onChange={e => setSearch(e.target.value)} />
        {loading ? <div className="loading"><div className="spinner" /></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Username</th><th>Name</th><th>Email</th><th>Skills</th><th>Special Needs</th><th>Completed</th></tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td><code style={{ fontSize: 12 }}>{s.username}</code></td>
                    <td>{s.name || '—'}</td>
                    <td style={{ fontSize: 12 }}>{s.email || '—'}</td>
                    <td><div className="skills-list">{s.skills?.map(sk => <span key={sk} className="skill-tag">{sk}</span>)}</div></td>
                    <td style={{ textAlign: 'center', fontSize: 16 }}>{s.specialNeeds ? '♿' : '—'}</td>
                    <td style={{ textAlign: 'center' }}><span className="badge badge-good">{s.completedEventIds?.length || 0}</span></td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="empty-state" style={{ padding: '2rem' }}>No students found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
