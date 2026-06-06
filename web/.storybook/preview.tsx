import React from 'react';
import type { Preview } from "@storybook/react";

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const score = context.parameters.compliance ?? 1.0;
      return (
        <div style={{ position: 'relative', minHeight: '100vh', padding: '20px' }}>
          <div style={{ position: 'absolute', right: 12, top: 12, zIndex: 1000 }}>
            <span 
              style={{
                display: 'inline-block',
                padding: '4px 8px',
                fontSize: '12px',
                fontWeight: 'bold',
                borderRadius: '4px',
                backgroundColor: score < 1 ? '#fee2e2' : '#dcfce7',
                color: score < 1 ? '#991b1b' : '#166534',
                border: `1px solid ${score < 1 ? '#f87171' : '#4ade80'}`
              }}
            >
              {score < 1 ? 'Compliance: Fail' : 'Compliance: Pass'}
            </span>
          </div>
          <Story />
        </div>
      );
    }
  ],
};

export default preview;
