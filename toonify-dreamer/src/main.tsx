import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import ReactGA from 'react-ga4';
import 'react-loading-skeleton/dist/skeleton.css';

// --- Initialize Google Analytics --- 
const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
if (gaMeasurementId) {
  ReactGA.initialize(gaMeasurementId);
  console.log(`[GA4] Initialized with ID: ${gaMeasurementId}`);
  // Consider adding route tracking here later if needed
} else {
  console.warn('[GA4] VITE_GA_MEASUREMENT_ID not found. Analytics not initialized.');
}
// --- End Google Analytics Initialization ---

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
