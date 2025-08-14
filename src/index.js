// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';        // если у вас React 18+
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Удаляем старые service worker'ы, чтобы исключить проблемы с кэшированием
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then(regs => regs.forEach(reg => reg.unregister()))
    .catch(() => {});
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);