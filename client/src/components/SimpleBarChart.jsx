import React from 'react';

/** List chart using map() + props + CSS only (no external chart library). */
export default function SimpleBarChart({ data, labelKey, valueKey, barColor = 'var(--accent)' }) {
  if (!data || data.length === 0) {
    return <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>No data to display</p>;
  }

  const max = Math.max(...data.map((item) => item[valueKey] || 0), 1);

  return (
    <div className="simple-chart">
      {data.map((item, index) => {
        const value = item[valueKey] || 0;
        const width = `${Math.round((value / max) * 100)}%`;
        return (
          <div key={index} className="simple-chart-row">
            <span className="simple-chart-label">{item[labelKey]}</span>
            <div className="simple-chart-track">
              <div
                className="simple-chart-bar"
                style={{ width, background: barColor }}
              />
            </div>
            <span className="simple-chart-value">{value}</span>
          </div>
        );
      })}
    </div>
  );
}
