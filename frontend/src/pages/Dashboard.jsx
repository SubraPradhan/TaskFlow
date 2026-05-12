import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { STATUS_LABELS, PRIORITY_LABELS, isOverdue, formatDate, relativeTime } from '../utils/helpers';
import { CheckCircle2, Clock, AlertTriangle, FolderKanban, Users, TrendingUp, ArrowRight } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-lg)' }} />)}
    </div>
  );

  const { stats = {}, myTasks = [], recentActivity = [] } = data || {};

  const statCards = [
    { icon: FolderKanban, label: 'Projects', value: stats.total_projects || 0, color: 'var(--accent)' },
    { icon: Clock, label: 'In Progress', value: stats.in_progress || 0, color: 'var(--blue)' },
    { icon: AlertTriangle, label: 'Overdue', value: stats.overdue || 0, color: 'var(--red)' },
    { icon: CheckCircle2, label: 'Completed', value: stats.completed || 0, color: 'var(--green)' },
    ...(user?.role === 'admin' ? [{ icon: Users, label: 'Team Members', value: stats.total_users || 0, color: 'var(--purple)' }] : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text-400)' }}>Here's what's happening with your team today.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
        {statCards.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} style={{ color }} />
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', color }}>{value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-400)', fontWeight: 500, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        {/* My Tasks */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>{user?.role === 'admin' ? 'All Active Tasks' : 'My Active Tasks'}</h2>
            <span style={{ fontSize: 13, color: 'var(--text-400)' }}>{myTasks.length} tasks</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myTasks.length === 0 ? (
              <div className="empty-state">
                <CheckCircle2 size={40} />
                <p style={{ fontWeight: 600, color: 'var(--text-300)' }}>All caught up!</p>
                <p style={{ fontSize: 13 }}>No active tasks right now.</p>
              </div>
            ) : myTasks.map(task => (
              <div key={task.id} className="card" style={{ padding: '14px 16px', cursor: 'pointer' }}
                onClick={() => navigate(`/projects/${task.project_id}`)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: isOverdue(task.due_date, task.status) ? 'var(--red)' : 'var(--text-100)' }}>
                      {task.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-400)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: task.project_color, display: 'inline-block' }} />
                        {task.project_name}
                      </span>
                      {task.due_date && (
                        <span style={{ fontSize: 12, color: isOverdue(task.due_date, task.status) ? 'var(--red)' : 'var(--text-400)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={11} /> {formatDate(task.due_date)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <span className={`badge priority-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
                    <span className={`badge status-${task.status}`}>{STATUS_LABELS[task.status]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Recent Activity</h2>
          <div className="card" style={{ padding: '8px 0' }}>
            {recentActivity.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-400)', fontSize: 13 }}>No recent activity</div>
            ) : recentActivity.map((item, i) => (
              <div key={item.id} style={{ padding: '10px 16px', borderBottom: i < recentActivity.length-1 ? '1px solid var(--bg-600)' : 'none', cursor: 'pointer' }}
                onClick={() => navigate(`/projects/${item.project_id || ''}`)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.project_color || 'var(--accent)', marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-200)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-500)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`badge status-${item.status}`} style={{ fontSize: 10, padding: '2px 6px' }}>{STATUS_LABELS[item.status]}</span>
                      {relativeTime(item.updated_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
