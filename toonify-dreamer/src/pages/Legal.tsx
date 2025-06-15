import React from 'react';
import { Link } from 'react-router-dom';

const Legal = () => {
  return (
    <div className="bg-[#e9e2d6] min-h-screen text-[#3a2e23]">
      <header className="border-b sticky top-0 bg-[#a87b5d]/80 backdrop-blur-md z-10 playful-shadow">
        <div className="container flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <img
              src="https://i.imgur.com/B7ptMnm.png"
              alt="ToonlyAI Wizard Logo"
              className="h-12 w-12 object-contain"
              onError={(e) => {
                console.error("Error loading logo:", e);
                e.currentTarget.style.display = 'none';
              }}
            />
            <h1 className="text-2xl font-bold text-white">ToonlyAI</h1>
          </div>
          <a href="/" className="text-white hover:underline">Home</a>
        </div>
      </header>

      <main className="container py-12 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center text-[#6d4c30]">Legal Information</h1>

        <div className="bg-[#f4efe4]/80 backdrop-blur-sm p-8 rounded-lg playful-shadow playful-border space-y-6">
           <p className="text-sm text-center text-[#8b5e3c]">Last Updated: {new Date().toLocaleDateString()}</p>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[#8b5e3c]">General Disclaimers</h2>
            <p>
              The information provided by ToonlyAI ("we," "us," or "our") on toonlyai.com (the "Site") and our
              application is for general informational purposes only. All information on the Site and our application
              is provided in good faith, however, we make no representation or warranty of any kind, express or implied,
              regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information
              on the Site or our application.
            </p>
            <p className="mt-2">
              Under no circumstance shall we have any liability to you for any loss or damage of any kind incurred as a
              result of the use of the site or our application or reliance on any information provided on the site and
              our application. Your use of the site and our application and your reliance on any information on the site
              and our application is solely at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[#8b5e3c]">Intellectual Property Notice</h2>
            <p>
              Unless otherwise indicated, the Site and Application is our proprietary property and all source code,
              databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the
              Site (collectively, the "Content") and the trademarks, service marks, and logos contained therein (the "Marks")
              are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws and various
              other intellectual property rights and unfair competition laws of the United States, foreign jurisdictions,
              and international conventions.
            </p>
             <p className="mt-2">
              The Content and the Marks are provided on the Site "AS IS" for your information and personal use only.
              Except as expressly provided in these Legal Terms, no part of the Site and no Content or Marks may be copied,
              reproduced, aggregated, republished, uploaded, posted, publicly displayed, encoded, translated, transmitted,
              distributed, sold, licensed, or otherwise exploited for any commercial purpose whatsoever, without our express
              prior written permission.
            </p>
             <p className="mt-2">
              Regarding user-uploaded content and generated images, please refer to our Terms of Service for details on ownership and licensing.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[#8b5e3c]">Art Styles and Copyright</h2>
            <p>
              Our Service allows transformation into various artistic styles. It is generally understood in copyright law
              that an artistic style itself, as an idea, method, or concept, is not protectable by copyright. Copyright
              protects the specific expression of an idea (e.g., a particular painting or drawing), not the underlying
              style (e.g., Impressionism, Cubism, or the characteristic style of a specific artist).
            </p>
            <p className="mt-2">
              Therefore, generating an image "in the style of" an artist or genre is typically not considered copyright
              infringement of the style itself. However, users must ensure that the images they upload as input to the
              Service do not infringe on any existing copyrights.
            </p>
            <p className="mt-2">
              This is a complex and evolving area of law, particularly with the advent of AI image generation. The
              information provided here is for general informational purposes and does not constitute legal advice.
              Users are responsible for ensuring their use of the Service and the generated images complies with all
              applicable laws and respects the intellectual property rights of others.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3 text-[#8b5e3c]">Third-Party Links Disclaimer</h2>
            <p>
              The Site or Application may contain links to other websites or content belonging to or originating from
              third parties or links to websites and features in banners or other advertising. Such external links are
              not investigated, monitored, or checked for accuracy, adequacy, validity, reliability, availability or
              completeness by us.
            </p>
            <p className="mt-2">
              We do not warrant, endorse, guarantee, or assume responsibility for the accuracy or reliability of any
              information offered by third-party websites linked through the site or any website or feature linked in any
              banner or other advertising. We will not be a party to or in any way be responsible for monitoring any
              transaction between you and third-party providers of products or services.
            </p>
          </section>

           <section>
            <h2 className="text-2xl font-semibold mb-3 text-[#8b5e3c]">Contact Information</h2>
            <p>
             For any legal questions or notices, please contact us at bhyte.llc@gmail.com or by post to:
             ToonlyAI, a product of Bhyte Company LLC, Papafio Hills, East Legon Hills.
            </p>
          </section>

           {/* Add other relevant legal sections as needed, e.g., specific compliance notices, accessibility statement, etc. */}

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

export default Legal; 