import React, { useState, useEffect } from 'react';
import { hearingService } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';
import { useToast } from '../../components/Toast';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year, month) { return new Date(year, month, 1).getDay(); }

export default function JudgeCalendar() {
  const toast = useToast();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [hearings, setHearings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    setLoading(true);
    hearingService.getAll({ limit: 100 })
      .then((d) => setHearings(d.hearings))
      .catch((err) => toast?.show(err.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  function getHearingsForDay(day) {
    return hearings.filter((h) => {
      const d = new Date(h.hearingDate);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedHearings = selectedDay ? getHearingsForDay(selectedDay) : [];

  if (loading) return <LoadingSpinner text="Loading calendar…" />;

  return (
    <div>
      <div className="page-header">
        <div><h1>Hearing Calendar</h1><p>View your scheduled hearings by month</p></div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="btn btn-secondary btn-sm" onClick={prevMonth}>← Prev</button>
          <h3>{MONTHS[month]} {year}</h3>
          <button className="btn btn-secondary btn-sm" onClick={nextMonth}>Next →</button>
        </div>
        <div className="card-body">
          <div className="calendar-header">
            {DAYS.map((d) => <div key={d} className="calendar-day-label">{d}</div>)}
          </div>
          <div className="calendar-grid">
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} className="calendar-cell other-month" />;
              const dayHearings = getHearingsForDay(day);
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              return (
                <div key={day} className={`calendar-cell ${isToday ? 'today' : ''}`} style={{ cursor: dayHearings.length ? 'pointer' : 'default' }} onClick={() => setSelectedDay(day === selectedDay ? null : day)}>
                  <div className="calendar-date" style={{ color: isToday ? 'var(--accent)' : 'var(--gray-700)', fontWeight: isToday ? 700 : 600 }}>{day}</div>
                  {dayHearings.slice(0, 2).map((h) => (
                    <div key={h.id} className="calendar-event" style={{ background: h.status === 'Completed' ? 'var(--success)' : h.status === 'Scheduled' ? 'var(--accent)' : 'var(--warning)' }}>
                      {h.hearingTime} {h.case?.caseNumber}
                    </div>
                  ))}
                  {dayHearings.length > 2 && <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>+{dayHearings.length - 2} more</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedDay && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header"><h3>Hearings on {MONTHS[month]} {selectedDay}, {year}</h3></div>
          <div className="card-body">
            {selectedHearings.length === 0 ? <p style={{ color: 'var(--gray-500)' }}>No hearings on this day.</p> : (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Time</th><th>Case</th><th>Location</th><th>Status</th></tr></thead>
                  <tbody>
                    {selectedHearings.map((h) => (
                      <tr key={h.id}>
                        <td><strong>{h.hearingTime}</strong></td>
                        <td>{h.case?.caseNumber} — {h.case?.title}</td>
                        <td>{h.location}</td>
                        <td><StatusBadge status={h.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
