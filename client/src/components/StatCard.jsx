import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = '#4f46e5' }) {
  return (
    <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '14px',
          backgroundColor: `${color}15`,
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        {Icon && <Icon size={26} />}
      </div>
      <div>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
          {title}
        </span>
        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.2, marginTop: '2px' }}>
          {value}
        </div>
        {subtitle && (
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
