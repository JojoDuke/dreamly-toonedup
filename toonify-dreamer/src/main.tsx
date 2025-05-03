import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Index from './pages/Index.tsx' // Assuming Index is your main page component
import Legal from './pages/Legal.tsx'
import PrivacyPolicy from './pages/PrivacyPolicy.tsx'
import TermsOfService from './pages/TermsOfService.tsx'
import NotFound from './pages/NotFound.tsx' // Import NotFound
import './index.css'
import { Toaster } from "@/components/ui/sonner"
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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  </React.StrictMode>,
)
