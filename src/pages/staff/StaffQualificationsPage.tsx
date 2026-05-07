import { useQuery } from '@tanstack/react-query';
import { getQualifications } from '../../api/masterdata';

export default function StaffQualificationsPage() {
  const { data: qualifications, isLoading, error } = useQuery({
    queryKey: ['qualifications'],
    queryFn: getQualifications,
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Qualifications</h1>
      <div className="h-1 w-12 rounded mb-3" style={{ background: '#913a8e' }} />
      <p className="text-sm text-slate-500 mb-6">
        System-wide qualifications.{' '}
        <span className="italic">
          Staff qualification records will be available once the backend implements PUT /staff/:id/qualifications.
        </span>
      </p>

      {isLoading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="text-red-500">Failed to load qualifications.</p>}

      {!isLoading && !error && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {qualifications && qualifications.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Code</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {qualifications.map(q => (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-slate-700">{q.code}</td>
                    <td className="px-4 py-3 text-slate-800">{q.name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${q.active ? 'bg-green-100 text-oyci-green-dark' : 'bg-gray-100 text-gray-500'}`}>
                        {q.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-8 text-center text-slate-400">No qualifications found.</p>
          )}
        </div>
      )}
    </div>
  );
}
