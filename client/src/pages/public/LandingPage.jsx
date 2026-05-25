import React from 'react';
import Icon from '../../components/Icon';
import { Link } from 'react-router-dom';

const features = [
  { icon: 'scales', title: 'Case Management', desc: 'Track every case from filing to verdict with a full digital workflow.' },
  { icon: 'courthouse', title: 'Hearing Scheduling', desc: 'Schedule hearings, detect conflicts, and notify all parties automatically.' },
  { icon: 'users', title: 'Role-Based Access', desc: 'Separate portals for admins, lawyers, judges, clerks, and citizens.' },
  { icon: 'file', title: 'Document Storage', desc: 'Upload and manage all case-related documents securely in one place.' },
  { icon: 'bell', title: 'Notifications', desc: 'Real-time alerts for hearing updates, case assignments, and outcomes.' },
  { icon: 'chart', title: 'Analytics', desc: 'Dashboard insights on case load, judge workload, and court statistics.' },
];

export default function LandingPage() {
  return (
    <div className="public-page">
      <nav className="landing-nav">
        <div className="logo"><Icon name="scales" size={22} /> CourtMS</div>
        <div className="landing-nav-links">
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </div>
      </nav>

      <section className="landing-hero">
        <h1>Modern Court Case Management System</h1>
        <p>Digitize judicial workflows, streamline case tracking, and bring transparency to the legal process.</p>
        <div className="landing-hero-btns">
          <Link to="/login" className="btn btn-primary btn-lg">Get Started</Link>
          <Link to="/register" className="btn btn-outline btn-lg">Register Account</Link>
        </div>
      </section>

      <section className="landing-features">
        <h2>Everything your court needs</h2>
        <div className="features-grid">
          {features.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon"><Icon name={f.icon} size={32} /></div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
