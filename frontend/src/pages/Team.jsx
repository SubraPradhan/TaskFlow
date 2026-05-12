import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { initials, relativeTime } from '../utils/helpers';
import { Shield, User, Mail, Calendar } from 'lucide-react';

export default function Team() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/users').then(r => setUsers(r.data)).finally(() => setLoading(false));
  }, []);

  if (user?.role !== 'admin') return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-400)' }}>Admin access required</div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }}>Team</h1>
        <p style={{ color: 'var(--text-400)', fontSize: 14, marginTop: 2 }}>{users.length} members</p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 14 }}>
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 100 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 14 }}>
          {users.map(u => (
            <div key={u.id} className="card" style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '16px 18px' }}>
              <div className="avatar avatar-lg" style={{ background: u.id === user.id ? 'var(--accent-glow)' : 'var(--bg-700)' }}>
                {u.avatar ? <img src={u.avatar} alt="" onError={e => e.target.style.display='none'} /> : initials(u.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
                  {u.id === user.id && <span style={{ fontSize: 10, background: 'var(--accent-glow)', color: 'var(--accent-light)', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>You</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-400)', display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <Mail size={11} /> {u.email}
                </div>
                <div style={{ marginTop: 6 }}>
                  <span className={`badge ${u.role === 'admin' ? 'status-in_progress' : 'status-todo'}`} style={{ fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {u.role === 'admin' ? <Shield size={10} /> : <User size={10} />} {u.role}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
