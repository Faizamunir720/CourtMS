import React from 'react';

export default function StatusBadge({ status }) {
  if (!status) return null;
  const key = status.toLowerCase().replace(/\s/g, '_');
  return <span className={`badge badge-${key}`}>{status}</span>;
}
