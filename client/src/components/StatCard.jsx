import React from 'react';
import Icon from './Icon';

export default function StatCard({ icon, label, value, color = 'blue' }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>
        <Icon name={icon} size={22} />
      </div>
      <div className="stat-info">
        <h4>{value ?? '—'}</h4>
        <p>{label}</p>
      </div>
    </div>
  );
}
