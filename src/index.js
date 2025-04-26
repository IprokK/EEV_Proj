// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';        // если у вас React 18+
import { BrowserRouter } from 'react-router-dom';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);