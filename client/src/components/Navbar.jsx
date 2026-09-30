import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Vote, LayoutDashboard, PlusCircle, LogOut, Settings, Award } from 'lucide-react';

export default function Navbar() {
  const { mentor, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isStudentPage = location.pathname.startsWith('/vote/');

  return (
    <header
      style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0.875rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Brand Logo */}
        <Link to={mentor ? "/mentor/dashboard" : "/"} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)'
            }}
          >
            <Vote size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              Creative Voting
            </h1>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
              Student Creative Image Platform
            </span>
          </div>
        </Link>

        {/* Navigation Menu */}
        <div>
          {mentor && !isStudentPage ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Link to="/mentor/dashboard" className={`btn ${location.pathname === '/mentor/dashboard' ? 'btn-primary' : 'btn-secondary'}`}>
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </Link>
              <Link to="/mentor/create-session" className={`btn ${location.pathname === '/mentor/create-session' ? 'btn-primary' : 'btn-secondary'}`}>
                <PlusCircle size={18} />
                <span>Create Session</span>
              </Link>
              <Link to="/mentor/settings" className="btn btn-secondary" title="Settings">
                <Settings size={18} />
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate('/mentor/login');
                }}
                className="btn btn-danger"
                title="Logout"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          ) : !isStudentPage ? (
            <Link to="/mentor/login" className="btn btn-primary">
              Mentor Login
            </Link>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
              <Award size={16} style={{ color: '#4f46e5' }} />
              <span>Student Voting Interface</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
