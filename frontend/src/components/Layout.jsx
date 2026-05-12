import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/helpers';
import { LayoutDashboard, FolderKanban, Users, LogOut, ChevronDown, Shield, Menu, X } from 'lucide-react';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const nav = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: FolderKanban, label: 'Projects', path: '/projects' },
    ...(user?.role === 'admin' ? [{ icon: Users, label: 'Team', path: '/team' }] : []),
  ];

  const Sidebar = () => (
    <aside className="sidebar">
      <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--bg-600)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: 'var(--accent)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800 }}>T</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}>TaskFlow</div>
            <div style={{ fontSize: 11, color: 'var(--text-500)', fontWeight: 500 }}>Team Manager</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nav.map(({ icon: Icon, label, path }) => (
          <Link key={path} to={path} onClick={() => setSidebarOpen(false)}>
            <div className={`nav-item ${isActive(path) ? 'active' : ''}`}>
              <Icon size={17} />
              <span>{label}</span>
            </div>
          </Link>
        ))}
      </nav>

      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--bg-600)' }}>
        <div style={{ position: 'relative' }}>
          <button className="nav-item" style={{ width: '100%', justifyContent: 'space-between' }} onClick={() => setShowUserMenu(p => !p)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="avatar">
                {user?.avatar ? <img src={user.avatar} alt="" onError={e => e.target.style.display='none'} /> : initials(user?.name)}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-100)' }}>{user?.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {user?.role === 'admin' && <Shield size={10} style={{ color: 'var(--accent-light)' }} />}
                  {user?.role}
                </div>
              </div>
            </div>
            <ChevronDown size={14} />
          </button>
          {showUserMenu && (
            <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: 'var(--bg-700)', border: '1px solid var(--bg-500)', borderRadius: 'var(--radius)', padding: 8, marginBottom: 4 }}>
              <button className="nav-item" style={{ color: 'var(--red)', gap: 8 }} onClick={handleLogout}>
                <LogOut size={15} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Desktop sidebar */}
      <div style={{ display: 'none' }} className="desktop-sidebar">
        <Sidebar />
      </div>
      <div className="sidebar-desktop">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={() => setSidebarOpen(false)} />
          <div style={{ position: 'relative', zIndex: 1 }}><Sidebar /></div>
        </div>
      )}

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Mobile header */}
        <div className="mobile-header" style={{ display: 'none', padding: '12px 16px', borderBottom: '1px solid var(--bg-600)', background: 'var(--bg-800)', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button>
          <span style={{ fontWeight: 800, fontSize: 15 }}>TaskFlow</span>
        </div>
        <div style={{ flex: 1, padding: '28px', maxWidth: '1200px', width: '100%', margin: '0 auto' }} className="page">
          {children}
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .mobile-header { display: flex !important; }
        }
        @media (min-width: 769px) {
          .sidebar-desktop { display: block; }
        }
      `}</style>
    </div>
  );
}
