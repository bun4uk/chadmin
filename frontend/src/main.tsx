import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import './index.css';
import { ToastProvider } from './components/Toast';
import ClickThemeProvider from './ClickThemeProvider';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('#root element not found');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ClickThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ClickThemeProvider>
  </React.StrictMode>
);