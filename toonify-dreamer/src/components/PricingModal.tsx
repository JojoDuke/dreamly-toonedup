import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl bg-[#3a2e23] border-[#5D4037] text-[#e9e2d6] p-8 rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-white mb-2 flex items-center justify-center gap-2">
            <Star className="h-6 w-6 text-yellow-400" />
            Need More Stars?
          </DialogTitle>
          <DialogDescription className="text-center text-[#f4efe4]/80 mb-4">
            Choose how you want to fuel your creativity!
            Each transformation costs 10 stars.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="packages" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#e9e2d6]/10 h-11 mb-6">
            <TabsTrigger value="packages" className="text-base data-[state=active]:bg-[#8b5e3c] data-[state=active]:text-white data-[state=active]:shadow-md">Packages</TabsTrigger>
            <TabsTrigger value="subscription" className="text-base data-[state=active]:bg-[#8b5e3c] data-[state=active]:text-white data-[state=active]:shadow-md">Subscription</TabsTrigger>
          </TabsList>

          <TabsContent value="packages">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-2">
              <div className="border border-[#5D4037] rounded-lg p-6 text-center bg-[#e9e2d6]/5 flex flex-col hover:bg-[#e9e2d6]/10 transition-colors shadow-md">
                <h3 className="font-semibold text-lg mb-1 text-white flex items-center justify-center gap-1"><Star className="h-4 w-4 inline text-yellow-400"/> 50</h3>
                <p className="text-2xl font-bold text-yellow-400 my-3">$3.00</p>
                <ul className="text-xs text-[#f4efe4]/70 list-none space-y-1 my-4 text-left px-2 flex-grow">
                  <li>✨ Approx. 5 Image Transforms</li>
                  <li>💰 $0.06 per Star</li>
                  <li>🎨 Access to 100+ Styles</li>
                  <li>⏱️ &lt; 1 Min Turnaround</li>
                </ul>
                <Button className="w-full mt-auto bg-[#8b5e3c] hover:bg-[#6d4c30] text-[#FFF8E1] playful-shadow">Buy Now</Button>
              </div>
              <div className="border-2 border-yellow-400 rounded-lg p-6 text-center bg-[#e9e2d6]/10 flex flex-col ring-2 ring-yellow-400/50 shadow-lg relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-[#3a2e23] px-3 py-0.5 rounded-full text-xs font-bold">Most Popular</div>
                <h3 className="font-semibold text-lg mb-1 text-white mt-3 flex items-center justify-center gap-1"><Star className="h-4 w-4 inline text-yellow-400"/> 120</h3>
                <p className="text-2xl font-bold text-yellow-400 my-3">$6.00</p>
                <ul className="text-xs text-[#f4efe4]/70 list-none space-y-1 my-4 text-left px-2 flex-grow">
                  <li>✨ Approx. 12 Image Transforms</li>
                  <li>💰 $0.05 per Star</li>
                  <li>🎨 Access to 100+ Styles</li>
                  <li>⏱️ &lt; 1 Min Turnaround</li>
                </ul>
                <Button className="w-full mt-auto bg-yellow-500 hover:bg-yellow-600 text-[#3a2e23] playful-shadow font-semibold">Buy Now</Button>
              </div>
              <div className="border border-[#5D4037] rounded-lg p-6 text-center bg-[#e9e2d6]/5 flex flex-col hover:bg-[#e9e2d6]/10 transition-colors shadow-md">
                <h3 className="font-semibold text-lg mb-1 text-white flex items-center justify-center gap-1"><Star className="h-4 w-4 inline text-yellow-400"/> 300</h3>
                <p className="text-2xl font-bold text-yellow-400 my-3">$12.00</p>
                <ul className="text-xs text-[#f4efe4]/70 list-none space-y-1 my-4 text-left px-2 flex-grow">
                  <li>✨ Approx. 30 Image Transforms</li>
                  <li>💰 $0.04 per Star</li>
                  <li>🎨 Access to 100+ Styles</li>
                  <li>⏱️ &lt; 1 Min Turnaround</li>
                </ul>
                <Button className="w-full mt-auto bg-[#8b5e3c] hover:bg-[#6d4c30] text-[#FFF8E1] playful-shadow">Buy Now</Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="subscription">
            <div className="border-2 border-yellow-400 rounded-lg p-8 text-center bg-[#e9e2d6]/10 flex flex-col items-center shadow-lg ring-2 ring-yellow-400/50">
              <h3 className="font-semibold text-xl mb-2 text-white">Monthly Subscription</h3>
              <p className="text-3xl font-bold text-yellow-400 my-3">$21 / month</p>
              <p className="text-lg text-white mb-4">
                Unlock premium features & enhance your creativity!
              </p>
              <ul className="text-sm text-[#f4efe4]/80 list-disc list-outside text-left space-y-1 mb-6 max-w-md mx-auto pl-5">
                <li>✨ Access the <span className="font-semibold">Edit feature</span> to customize specific parts of generated images.</li>
                <li>🖼️ Use the <span className="font-semibold">Multi-Images feature</span> for batch uploads and unique styles.</li>
                <li>⚡ <span className="font-semibold">Faster processing:</span> Get your images transformed in 40 seconds or less.</li>
                <li>🌟 Keep and use your existing purchased stars.</li>
                <li>🚫 Cancel your subscription at any time.</li>
              </ul>
              <Button 
                className="w-full max-w-xs mt-4 bg-yellow-500 hover:bg-yellow-600 text-[#3a2e23] playful-shadow font-semibold text-lg py-3"
              >
                Subscribe Now
              </Button>
            </div>
          </TabsContent>

        </Tabs>
        
        <DialogFooter className="mt-6">
          <Button 
            type="button" 
            onClick={onClose} 
            className="bg-[#e9e2d6]/10 text-[#e9e2d6]/80 hover:bg-[#e9e2d6]/20 hover:text-[#e9e2d6] transition-colors px-4 py-2 rounded-md"
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 