import { Box, Typography } from '@mui/material';
import { useAppContext } from '../context/useAppContext';

type Props = {
  weekStart: string; // YYYY-MM-DD (Monday)
  maxItems?: number;
};

export default function StaffUtilizationChart({ weekStart, maxItems = 12 }: Props) {
  const { staff, getStaffWeeklyLoad } = useAppContext();

  const rows = staff.map((s) => {
    const load = getStaffWeeklyLoad(s.id, weekStart);
    const percent = s.availableHoursPerWeek > 0 ? Math.min(100, Math.round((load.hoursCommitted / s.availableHoursPerWeek) * 100)) : 0;
    return {
      id: s.id,
      name: s.name,
      hoursCommitted: load.hoursCommitted,
      available: s.availableHoursPerWeek,
      percent,
    };
  })
    .sort((a, b) => b.hoursCommitted - a.hoursCommitted)
    .slice(0, maxItems);

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>Staff Utilisation (week of {weekStart})</Typography>
      <Box sx={{ display: 'grid', gap: 1 }}>
        {rows.map((r) => (
          <Box key={r.id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ minWidth: 160 }}>
              <Typography variant="body2">{r.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {r.hoursCommitted}h / {r.available}h
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ height: 14, backgroundColor: '#e0e0e0', borderRadius: 1, overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: `${r.percent}%`, backgroundColor: r.percent >= 100 ? '#d32f2f' : '#1976d2' }} />
              </Box>
            </Box>
            <Box sx={{ minWidth: 48, textAlign: 'right' }}>
              <Typography variant="caption">{r.percent}%</Typography>
            </Box>
          </Box>
        ))}
        {rows.length === 0 && (
          <Typography variant="caption" color="text.secondary">No staff data available</Typography>
        )}
      </Box>
    </Box>
  );
}
