import React from 'react';

export default function LoadingSpinner({ small = false, text = '' }) {
  return (
    <div className="loading-center">
      <div className={small ? 'spinner spinner-sm' : 'spinner'} />
      {text && <p>{text}</p>}
    </div>
  );
}
