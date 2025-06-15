import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  return (
    <div className="bg-[#e9e2d6] min-h-screen text-[#3a2e23]">
      <header className="border-b sticky top-0 bg-[#a87b5d]/80 backdrop-blur-md z-10 playful-shadow">
        <div className="container flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <img
              src="https://i.imgur.com/B7ptMnm.png"
              alt="ToonlyAI Logo"
              className="h-12 w-12 object-contain"
              onError={(e) => {
                console.error("Error loading logo:", e);
                e.currentTarget.style.display = 'none';
              }}
            />
            <h1 className="text-2xl font-bold text-white">ToonlyAI</h1>
          </div>
          {/* Optional: Add navigation back to home page */}
          <a href="/" className="text-white hover:underline">Home</a>
        </div>
      </header>

      <main className="container py-12 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center text-[#6d4c30]">Privacy Policy</h1>

        <div className="bg-[#f4efe4]/80 backdrop-blur-sm p-8 rounded-lg playful-shadow playful-border space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[#8b5e3c]">Introduction</h2>
            <p>
              Welcome to ToonlyAI! We are committed to protecting your personal information and your right to privacy.
              If you have any questions or concerns about this privacy notice, or our practices with regards to your
              personal information, please contact us at bhyte.llc@gmail.com.
            </p>
            <p className="mt-2">
              This privacy notice describes how we might use your information if you visit our website at https://toonlyai.com
              or use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[#8b5e3c]">Information We Collect</h2>
            <p>
              We primarily process information that you provide directly to us when you use our service.
            </p>
             <p className="mt-2">
              The information we process consists of the images you upload for transformation. We do not collect personal information like names or email addresses through the core image transformation service.
            </p>
             <p className="mt-2">
              We automatically collect certain information when you visit, use or navigate the Website. This information does
              not reveal your specific identity (like your name or contact information) but may include device and usage
              information, such as your IP address, browser and device characteristics, operating system, language preferences,
              referring URLs, device name, country, location, information about how and when you use our Website and other
              technical information. This data is used for analytics and service operation.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[#8b5e3c]">How We Use Your Information</h2>
            <p>
              We use the information collected or processed via our Website for a variety of business purposes described below.
              Primarily, we use it to provide and manage the ToonlyAI image transformation service, respond to user inquiries via the provided contact email, and improve the service.
            </p>
             <p className="mt-2">
              Specifically regarding uploaded images: Images uploaded are sent to our AI processing partners (xAI, OpenAI) solely to create the transformed version requested by the user. Neither the original uploaded image nor the generated image is stored on our servers after the transformation process is complete. We do not use your images for training our AI models or for any other purpose. Please refer to the privacy policies of xAI and OpenAI for details on their data handling during processing.
            </p>
          </section>

           <section>
            <h2 className="text-2xl font-semibold mb-3 text-[#8b5e3c]">Sharing Your Information</h2>
            <p>
             We share the uploaded image data with our third-party AI service providers (xAI, OpenAI) only as necessary to perform the image transformation service you request. We do not share any other personal information, as none is collected through the service itself. We may disclose information if required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[#8b5e3c]">Data Retention</h2>
            <p>
              We do not retain uploaded or generated images after processing is complete. No other personal data is collected or retained through the core service. Technical log data may be retained for a limited period for operational purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[#8b5e3c]">Your Privacy Rights</h2>
            <p>
              Depending on your location, you may have rights regarding personal information. As we do not retain personal data from the core service, these rights related to access, correction, or deletion of stored data are generally not applicable to image data processed. However, you can contact us at the email provided with any privacy-related questions or concerns about automatically collected technical information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[#8b5e3c]">Updates to This Notice</h2>
            <p>
              We may update this privacy notice from time to time. The updated version will be indicated by an updated
              "Revised" date and the updated version will be effective as soon as it is accessible.
            </p>
          </section>

           <section>
            <h2 className="text-2xl font-semibold mb-3 text-[#8b5e3c]">Contact Us</h2>
            <p>
              If you have questions or comments about this notice, you may email us at bhyte.llc@gmail.com
            </p>
          </section>
        </div>
      </main>

       <footer className="mt-16 pt-8 text-center text-sm text-[#5D4037] border-t border-[#a87b5d]/30">
        <div className="flex flex-wrap items-center justify-center space-x-4 mb-4">
          <Link to="/privacy-policy" className="hover:text-[#3a2e23] transition-colors">Privacy Policy</Link>
          <span>•</span>
          <Link to="/terms-of-service" className="hover:text-[#3a2e23] transition-colors">Terms of Service</Link>
          <span>•</span>
          <Link to="/legal" className="hover:text-[#3a2e23] transition-colors">Legal</Link>
        </div>
        
        <p className="text-[#5D4037]/80 mb-3">Built with ❤️ by Bhyte Labs</p>
        
        <div className="mb-4">
          <p className="text-[#5D4037]/70 text-xs">
            We also built: 
            <a href="https://usemidas.app" target="_blank" rel="noopener noreferrer" className="hover:text-[#3a2e23] transition-colors opacity-80 hover:opacity-100 ml-1">Midas</a> <span className="mx-3">•</span> 
            <a href="https://astrae.design" target="_blank" rel="noopener noreferrer" className="hover:text-[#3a2e23] transition-colors opacity-80 hover:opacity-100">Astrae</a> <span className="mx-3">•</span> 
            <a href="https://usepapermind.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#3a2e23] transition-colors opacity-80 hover:opacity-100">Papermind AI</a> <span className="mx-3">•</span> 
            <a href="https://builtwithatlas.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#3a2e23] transition-colors opacity-80 hover:opacity-100">Atlas Labs</a> <span className="mx-3">•</span> 
            <a href="https://studioix.agency" target="_blank" rel="noopener noreferrer" className="hover:text-[#3a2e23] transition-colors opacity-80 hover:opacity-100">Studio IX</a>
          </p>
        </div>
        <p className="mb-4">© {new Date().getFullYear()} ToonlyAI. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default PrivacyPolicy; 