import React from 'react';

export const Button = ({ label, ...props }: { label: string }) => {
  return (
    <button
      style={{
        padding: '10px 20px',
        backgroundColor: '#4F46E5',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}
      {...props}
    >
      {label}
    </button>
  );
};
