import React from 'react';
import ReactDOM from 'react-dom/client';
import UsersPage from './UsersPage';
import ClickThemeProvider from './ClickThemeProvider';
import './index.css';

const rootEl = document.getElementById('users-root');
if (!rootEl) throw new Error('#users-root element not found');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <ClickThemeProvider>
      <UsersPage />
    </ClickThemeProvider>
  </React.StrictMode>
);


