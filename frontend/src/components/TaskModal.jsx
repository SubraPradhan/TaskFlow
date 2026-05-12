import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { STATUS_LABELS, PRIORITY_LABELS, initials, relativeTime } from '../utils/helpers';
import { X, Loader2, Trash2, Send, MessageSquare } from 'lucide-react';

export default function TaskModal({ task: initial, projectId, members = [], onClose, onSaved, onDeleted, onCommentAdded }) {
  const [task, setTask] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isNew = !initial?.id;

  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    status: initial?.status || 'todo',
    priority: initial?.priority || 'medium',
    assignee_id: initial?.assignee_id || '',
    due_date: initial?.due_date || '',
  });

  useEffect(() => {
    if (initial?.id) {
      api.get(`/tasks/${initial.id}`).then(r => setTask(r.data));
    }
  }, [initial?.id]);

  const save = async e => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title required'); return; }
    setLoading(true);
    try {
      if (isNew) {
        const { data } = await api.post(`/projects/${projectId}/tasks`, { ...form, assignee_id: form.assignee_id || null });
        toast.success('Task created!');
        onSaved(data);
      } else {
        const { data } = await api.put(`/tasks/${initial.id}`, { ...form, assignee_id: form.assignee_id || null });
        toast.success('Task updated!');
        onSaved(data);
      }
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const deleteTask = async () => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${initial.id}`);
      toast.success('Task deleted');
      onDeleted(initial.id);
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const addComment = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/tasks/${initial.id}/comments`, { content: comment });
      setTask(t => {
        const updated = { ...t, comments: [...(t?.comments || []), data] };
        if (onCommentAdded) onCommentAdded(initial.id, updated.comments.length);
        return updated;
      });
      setComment('');
    } catch (err) { toast.error('Failed to add comment'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>{isNew ? 'New Task' : 'Edit Task'}</h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isNew && <button className="btn btn-danger btn-sm btn-icon" onClick={deleteTask} title="Delete"><Trash2 size={15} /></button>}
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        <form onSubmit={save}>
          <div style={{ display: 'grid', gridTemplateColumns: isNew ? '1fr' : '1fr 280px', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="input" placeholder="What needs to be done?" value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="input" rows={4} placeholder="Add more details…" value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ resize: 'vertical' }} />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="input" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                    {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Assignee</label>
                  <select className="input" value={form.assignee_id} onChange={e => setForm(p => ({ ...p, assignee_id: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input className="input" type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading && <Loader2 size={14} className="spinner" />}
                  {isNew ? 'Create Task' : 'Save Changes'}
                </button>
              </div>
            </div>

            {!isNew && (
              <div style={{ borderLeft: '1px solid var(--bg-600)', paddingLeft: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                  <MessageSquare size={15} style={{ color: 'var(--text-400)' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-300)' }}>Comments ({task?.comments?.length || 0})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 280, overflowY: 'auto', marginBottom: 12 }}>
                  {(task?.comments || []).map(c => (
                    <div key={c.id} style={{ display: 'flex', gap: 8 }}>
                      <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{initials(c.user_name)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{c.user_name}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-500)' }}>{relativeTime(c.created_at)}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-300)', lineHeight: 1.5, background: 'var(--bg-700)', padding: '8px 10px', borderRadius: 8 }}>{c.content}</div>
                      </div>
                    </div>
                  ))}
                  {(!task?.comments || task.comments.length === 0) && (
                    <div style={{ fontSize: 13, color: 'var(--text-500)', textAlign: 'center', padding: '16px 0' }}>No comments yet</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    className="input"
                    placeholder="Add a comment…"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addComment(e); } }}
                    style={{ fontSize: 13 }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-icon"
                    disabled={submitting}
                    onClick={addComment}
                  >
                    {submitting ? <Loader2 size={14} className="spinner" /> : <Send size={14} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}