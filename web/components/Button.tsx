import React from 'react';

const variants: Record<string, React.CSSProperties> = {
  primary: {
    backgroundColor: '#4F46E5',
  },
  gold: {
    backgroundColor: '#D9C27A',
    color: '#0A0A0A',
  },
};

interface ButtonProps {
  label: string;
  variant?: 'primary' | 'gold';
}

export const Button = ({ label, variant = 'primary', ...props }: ButtonProps) => {
  const variantStyle = variants[variant] || variants.primary;
  return (
    <button
      style={{
        padding: '10px 20px',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        ...variantStyle,
      }}
      {...props}
    >
      {label}
    </button>
  );
};
