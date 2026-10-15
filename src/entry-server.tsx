import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';
import { queryClient } from './queryClient';

export function renderHome() {
  try {
    return renderToString(
      <React.StrictMode>
        <App staticLocation="/" />
      </React.StrictMode>,
    );
  } finally {
    queryClient.clear();
  }
}
