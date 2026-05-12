import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { PROJECT_COLORS } from '../utils/helpers';
import { Plus, FolderKanban, Users, CheckSquare, ArrowRight, X, Loader2 } from 'lucide-react';

function ProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', color: PROJECT_COLORS[0] });
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/projects', form);
      toast.success('Project created!');
      onCreated(data);
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>New Project</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input className="input" placeholder="e.g. Website Redesign" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="input" rows={3} placeholder="What is this project about?" value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={{ resize: 'vertical' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PROJECT_COLORS.map(c => (
                <div key={c} className={`color-swatch ${form.color === c ? 'selected' : ''}`}
                  style={{ background: c }} onClick={() => setForm(p => ({ ...p, color: c }))} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <Loader2 size={14} className="spinner" />}
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/projects').then(r => setProjects(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }}>Projects</h1>
          <p style={{ color: 'var(--text-400)', fontSize: 14, marginTop: 2 }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> New Project</button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 16 }}>
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 160 }} />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <FolderKanban size={48} />
          <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-300)', marginBottom: 6 }}>No projects yet</p>
          <p style={{ fontSize: 14 }}>Create your first project to get started</p>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setShowModal(true)}><Plus size={16} /> New Project</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 16 }}>
          {projects.map(p => (
            <div key={p.id} className="card" style={{ cursor: 'pointer', padding: 20 }}
              onClick={() => navigate(`/projects/${p.id}`)}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                  {p.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description || 'No description'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-400)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><CheckSquare size={14} /> {p.task_count} tasks</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Users size={14} /> {p.member_count} members</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--accent-light)', fontWeight: 600 }}>View <ArrowRight size={14} /></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <ProjectModal onClose={() => setShowModal(false)} onCreated={p => setProjects(prev => [p, ...prev])} />}
    </div>
  );
}
