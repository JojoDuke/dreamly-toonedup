import React from 'react'
import ReactDOM from 'react-dom/client'
import Index from './pages/Index.tsx' // Assuming Index is your main page component
import './index.css'
import { Toaster } from "@/components/ui/sonner"
import ReactGA from 'react-ga4';

// --- Initialize Google Analytics --- 
const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
if (gaMeasurementId) {
  ReactGA.initialize(gaMeasurementId);
  console.log(`[GA4] Initialized with ID: ${gaMeasurementId}`);
} else {
  console.warn('[GA4] VITE_GA_MEASUREMENT_ID not found. Analytics not initialized.');
}
// --- End Google Analytics Initialization ---

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Index />
    <Toaster />
  </React.StrictMode>,
)
