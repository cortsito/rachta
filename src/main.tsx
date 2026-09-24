import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Layer order first, then each layer's file (see docs/ARCHITECTURE.md, CSS contract).
import './styles/layers.css';
import './styles/reset.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/charts.css';
import './styles/utilities.css';
import { App } from './app/App.tsx';
import { canonicalizeLocation } from './app/location.ts';

canonicalizeLocation();

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
