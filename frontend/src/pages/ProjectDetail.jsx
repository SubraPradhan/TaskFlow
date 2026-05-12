import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { STATUS_LABELS, PRIORITY_LABELS, initials, isOverdue, formatDate } from '../utils/helpers';
import TaskModal from '../components/TaskModal';
import { Plus, Users, Settings, ArrowLeft, Clock, Trash2, UserPlus, X, Loader2, ChevronDown, MessageSquare } from 'lucide-react';

function KanbanColumn({ title, status, tasks, onTask, color, commentCounts }) {
  return (
    <div style={{ flex: '1 1 220px', minWidth: 220, maxWidth: 320 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, padding: '0 4px' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-300)' }}>{title}</span>
        <span style={{ fontSize: 12, color: 'var(--text-500)', background: 'var(--bg-700)', borderRadius: 20, padding: '1px 7px' }}>{tasks.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 100 }}>
        {tasks.map(task => {
          const commentCount = commentCounts?.[task.id] || 0;
          return (
            <div key={task.id} className="card" style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={() => onTask(task)}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: isOverdue(task.due_date, task.status) ? 'var(--red)' : 'var(--text-100)', lineHeight: 1.4 }}>{task.title}</div>
              {task.description && <div style={{ fontSize: 12, color: 'var(--text-500)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</div>}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <span className={`badge priority-${task.priority}`} style={{ fontSize: 11 }}>{PRIORITY_LABELS[task.priority]}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {commentCount > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text-500)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <MessageSquare size={10} />{commentCount}
                    </span>
                  )}
                  {task.due_date && <span style={{ fontSize: 11, color: isOverdue(task.due_date, task.status) ? 'var(--red)' : 'var(--text-500)', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} />{formatDate(task.due_date)}</span>}
                  {task.assignee_name && <div className="avatar" style={{ width: 22, height: 22, fontSize: 9 }} title={task.assignee_name}>{initials(task.assignee_name)}</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AddMemberModal({ projectId, onClose, onAdded }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/auth/users').then(r => setUsers(r.data));
  }, []);

  const submit = async e => {
    e.preventDefault();
    if (!selected) { toast.error('Select a user'); return; }
    setLoading(true);
    try {
      await api.post(`/projects/${projectId}/members`, { user_id: selected, role: 'member' });
      toast.success('Member added!');
      onAdded();
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800 }}>Add Member</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Select User</label>
            <select className="input" value={selected} onChange={e => setSelected(e.target.value)}>
              <option value="">Choose a team member…</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <Loader2 size={14} className="spinner" />} Add Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [view, setView] = useState('kanban');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [commentCounts, setCommentCounts] = useState({});

  const load = useCallback(async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/tasks`)
      ]);
      setProject(projRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      toast.error('Failed to load project');
      navigate('/projects');
    } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const handleSaved = (task, newCommentCount) => {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === task.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = task; return n; }
      return [task, ...prev];
    });
    if (newCommentCount !== undefined) {
      setCommentCounts(prev => ({ ...prev, [task.id]: newCommentCount }));
    }
  };

  const handleCommentAdded = (taskId, count) => {
    setCommentCounts(prev => ({ ...prev, [taskId]: count }));
  };

  const handleDeleted = id => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setCommentCounts(prev => { const n = {...prev}; delete n[id]; return n; });
  };

  const filteredTasks = tasks.filter(t =>
    (!filterStatus || t.status === filterStatus) &&
    (!filterPriority || t.priority === filterPriority)
  );

  const tasksByStatus = Object.keys(STATUS_LABELS).reduce((acc, s) => {
    acc[s] = filteredTasks.filter(t => t.status === s);
    return acc;
  }, {});

  const cols = [
    { status: 'todo', title: 'To Do', color: '#64748b' },
    { status: 'in_progress', title: 'In Progress', color: '#3b82f6' },
    { status: 'review', title: 'Review', color: '#a855f7' },
    { status: 'done', title: 'Done', color: '#10b981' },
  ];

  const canManage = user?.role === 'admin' || project?.members?.find(m => m.id === user?.id)?.project_role === 'admin';
  const progress = project?.stats ? Math.round(((project.stats.done || 0) / (project.stats.total || 1)) * 100) : 0;

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={32} className="spinner" style={{ color: 'var(--accent)' }} /></div>;
  if (!project) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')} style={{ marginBottom: 12, gap: 6 }}>
          <ArrowLeft size={14} /> Back to Projects
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: project.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: 'white' }}>
              {project.name[0].toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>{project.name}</h1>
              {project.description && <p style={{ color: 'var(--text-400)', fontSize: 14 }}>{project.description}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canManage && <button className="btn btn-secondary btn-sm" onClick={() => setShowAddMember(true)}><UserPlus size={14} /> Add Member</button>}
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewTask(true)}><Plus size={14} /> New Task</button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-400)', marginBottom: 4 }}>
              <span>Progress</span><span style={{ fontWeight: 600, color: 'var(--text-200)' }}>{progress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%`, background: project.color }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-400)' }}>
            {Object.entries({ '📋 Total': project.stats?.total, '✅ Done': project.stats?.done, '🔴 Overdue': project.stats?.overdue }).map(([k, v]) => (
              <span key={k}>{k}: <strong style={{ color: 'var(--text-100)' }}>{v || 0}</strong></span>
            ))}
          </div>
          {/* Members avatars */}
          <div style={{ display: 'flex' }}>
            {(project.members || []).slice(0, 5).map((m, i) => (
              <div key={m.id} className="avatar" style={{ marginLeft: i > 0 ? -8 : 0, border: '2px solid var(--bg-800)', zIndex: 5-i }} title={m.name}>{initials(m.name)}</div>
            ))}
            {project.members?.length > 5 && <div className="avatar" style={{ marginLeft: -8, border: '2px solid var(--bg-800)', fontSize: 10 }}>+{project.members.length - 5}</div>}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-700)', borderRadius: 8, padding: 3 }}>
          {['kanban', 'list'].map(v => (
            <button key={v} className={`btn btn-sm ${view === v ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => setView(v)}>
              {v === 'kanban' ? 'Kanban' : 'List'}
            </button>
          ))}
        </div>
        <select className="input" style={{ width: 'auto', fontSize: 13, padding: '6px 10px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="input" style={{ width: 'auto', fontSize: 13, padding: '6px 10px' }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priority</option>
          {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {(filterStatus || filterPriority) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilterStatus(''); setFilterPriority(''); }}>
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Kanban */}
      {view === 'kanban' && (
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 8 }}>
          {cols.map(c => <KanbanColumn key={c.status} {...c} tasks={tasksByStatus[c.status] || []} onTask={setSelectedTask} commentCounts={commentCounts} />)}
        </div>
      )}

      {/* List */}
      {view === 'list' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bg-600)', background: 'var(--bg-700)' }}>
                {['Title', 'Status', 'Priority', 'Assignee', 'Due Date', 'Comments'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-400)', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--text-500)' }}>No tasks found</td></tr>
              ) : filteredTasks.map((t, i) => (
                <tr key={t.id} style={{ borderBottom: i < filteredTasks.length-1 ? '1px solid var(--bg-600)' : 'none', cursor: 'pointer' }}
                  onClick={() => setSelectedTask(t)}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-700)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '10px 16px', fontWeight: 500, color: isOverdue(t.due_date, t.status) ? 'var(--red)' : 'var(--text-100)' }}>{t.title}</td>
                  <td style={{ padding: '10px 16px' }}><span className={`badge status-${t.status}`}>{STATUS_LABELS[t.status]}</span></td>
                  <td style={{ padding: '10px 16px' }}><span className={`badge priority-${t.priority}`}>{PRIORITY_LABELS[t.priority]}</span></td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-400)' }}>{t.assignee_name || '—'}</td>
                  <td style={{ padding: '10px 16px', color: isOverdue(t.due_date, t.status) ? 'var(--red)' : 'var(--text-400)' }}>{t.due_date ? formatDate(t.due_date) : '—'}</td>
                  <td style={{ padding: '10px 16px' }}>
                    {commentCounts[t.id] > 0 ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-400)', fontSize: 12 }}>
                        <MessageSquare size={12} />{commentCounts[t.id]}
                      </span>
                    ) : <span style={{ color: 'var(--text-500)' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(selectedTask || showNewTask) && (
        <TaskModal
          task={showNewTask ? null : selectedTask}
          projectId={projectId}
          members={project.members || []}
          onClose={() => { setSelectedTask(null); setShowNewTask(false); }}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          onCommentAdded={handleCommentAdded}
        />
      )}
      {showAddMember && <AddMemberModal projectId={projectId} onClose={() => setShowAddMember(false)} onAdded={load} />}
    </div>
  );
}
