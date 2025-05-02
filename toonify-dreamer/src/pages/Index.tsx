import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ImageUpload";
import { StyleSelector } from "@/components/StyleSelector";
import { ImageResult } from "@/components/ImageResult";
import { imageEditService } from "@/services/imageEditService";
import { toast } from "sonner";
import { Loader2, Brush, Star, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Settings, User as UserIcon } from "lucide-react";
import { PricingModal } from "@/components/PricingModal";
import CountUp from "react-countup";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star as StarIcon } from "lucide-react";

// Use Vite's import.meta.env for frontend environment variables
// Use the VITE_ prefixed variable name
const BACKEND_BASE_URL = import.meta.env.VITE_BETTER_AUTH_URL || ''; // Provide a default

const stylePrompts: Record<string, string> = {
  ghibli: "Turn this image into Ghibli anime style",
  pixel: "Turn this image into pixel art style",
  cartoon: "Turn this image into a 3D cartoon style",
};

const Index = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedStyle, setSelectedStyle] = useState("ghibli");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingTimeMs, setProcessingTimeMs] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const prevCreditsRef = useRef<number>(0);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [sessionState, setSessionState] = useState<{ 
    data: Awaited<ReturnType<typeof authClient.getSession>>['data'] | null; 
    isLoading: boolean; 
    error: any | null; 
  }>({ data: null, isLoading: true, error: null });
  
  // Fetch session manually on mount
  useEffect(() => {
    let isMounted = true;
    const fetchSession = async () => {
      console.log("[Frontend Index] Attempting to fetch session...");
      setSessionState({ data: null, isLoading: true, error: null });
      try {
        const { data, error } = await authClient.getSession();
        if (isMounted) {
          if (error) {
            console.error("[Frontend Index] Error fetching session:", error);
            setSessionState({ data: null, isLoading: false, error });
          } else {
            console.log("[Frontend Index] Session fetched successfully:", data ? { session: !!data.session, user: !!data.user } : null);
            setSessionState({ data, isLoading: false, error: null });
          }
        }
      } catch (catchError) {
        console.error("[Frontend Index] Exception fetching session:", catchError);
        if (isMounted) {
          setSessionState({ data: null, isLoading: false, error: catchError });
        }
      }
    };
    fetchSession();
    return () => { isMounted = false; }; // Cleanup function
  }, []); // Empty dependency array ensures it runs only once on mount

  // Derive authentication status and user data
  const session = sessionState.data?.session;
  const user = sessionState.data?.user;
  const userId = session?.userId; 
  const isAuthenticated = !!session;
  const userEmail = user?.email;
  const isSessionLoading = sessionState.isLoading;

  // Fetch credits when authentication status changes (or session loads)
  useEffect(() => {
    let currentCredits = 0;
    if (isAuthenticated) {
      setIsLoadingCredits(true);
      console.log("[Frontend Index] Auth successful, fetching credits...");
      fetch(`${BACKEND_BASE_URL}/api/user/credits`, { credentials: 'include' })
        .then(res => {
          if (!res.ok) { throw new Error(`Failed to fetch credits: ${res.statusText}`); }
          return res.json();
        })
        .then(data => {
          if (typeof data.credits === 'number') {
            prevCreditsRef.current = credits;
            setCredits(data.credits);
            currentCredits = data.credits;
          }
        })
        .catch(err => {
          console.error("Error fetching credits:", err);
          toast.error("Could not load your credit balance.");
          prevCreditsRef.current = credits;
          setCredits(0);
          currentCredits = 0;
        }).finally(() => {
          setIsLoadingCredits(false);
        });
    } else {
        // If not authenticated, but session isn't loading anymore, clear credits
        if (!isSessionLoading) {
            console.log("[Frontend Index] Not authenticated or session load finished, clearing credits.");
            prevCreditsRef.current = credits;
            setCredits(0);
            currentCredits = 0;
            setIsLoadingCredits(false);
        }
    }
    // Depend on isAuthenticated and isSessionLoading to trigger correctly
  }, [isAuthenticated, isSessionLoading]); 

  // Update previous credits ref after successful transform fetch
  useEffect(() => {
    prevCreditsRef.current = credits;
  }, [credits]);

  // Function to refresh credits (call after successful transform)
  const refreshCredits = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingCredits(true);
    try {
      console.log("[Frontend Index] Refreshing credits...");
      const res = await fetch(`${BACKEND_BASE_URL}/api/user/credits`, { credentials: 'include' });
      if (!res.ok) {
        throw new Error(`Failed to fetch credits: ${res.statusText}`);
      }
      const data = await res.json();
      if (typeof data.credits === 'number') {
        setCredits(data.credits);
      }
    } catch (err) {
      console.error("Error refreshing credits:", err);
      // Optionally show a toast, but maybe silently fail here?
    } finally {
      setIsLoadingCredits(false);
    }
  }, [isAuthenticated]);

  const handleImageSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setProcessedImageUrl(null);
  }, []);
  
  const handleStyleChange = useCallback((styleId: string) => {
    setSelectedStyle(styleId);
  }, []);
  
  const triggerAuthModal = () => {
    setIsAuthModalOpen(true);
  };

  const processImage = useCallback(async () => {
    if (!selectedFile) {
      toast.error("Please upload an image first");
      return;
    }
    
    const prompt = stylePrompts[selectedStyle];
    if (!prompt) {
      toast.error("Invalid style selected");
      console.error("No prompt found for style:", selectedStyle);
      return;
    }

    setIsProcessing(true);
    setProcessedImageUrl(null);
    
    try {
      console.log("[Frontend Index] Calling imageEditService...");
      const editedImageUrl = await imageEditService.transformImageWithPrompt(selectedFile, prompt);
      
      setProcessedImageUrl(editedImageUrl);
      toast.success("Image transformed successfully!");

      // Refresh credits after successful transformation
      await refreshCredits(); 

    } catch (error: any) {
      console.error("[Frontend Index] Error processing image:", error);
      if (error.status === 402) {
        setIsPricingModalOpen(true);
      } else if (error.status === 401) {
        toast.error("Authentication error. Please sign in again.");
      } else {
        toast.error(error.message || "Failed to transform image. Please try again later.");
      }
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, selectedStyle, refreshCredits]);
  
  const handleTransformClick = () => {
    // 1. Check if authenticated
    if (!isAuthenticated) {
      triggerAuthModal(); // Open login modal if not authenticated
      return;
    }

    // 2. Client-side check for sufficient credits (for immediate feedback)
    const requiredCredits = 10;
    if (credits < requiredCredits) {
      console.log("Client-side check: Insufficient credits. Opening pricing modal.");
      setIsPricingModalOpen(true); // Open pricing modal immediately
      return; // Stop before calling the backend
    }

    // 3. If client-side check passes, proceed with the backend call
    console.log("Client-side check: Credits sufficient. Proceeding to process image.");
    processImage(); // This function contains the backend call and processing logic
  };
  
  const downloadImage = useCallback(() => {
    if (!processedImageUrl) return;
    
    const link = document.createElement("a");
    link.href = processedImageUrl;
    link.download = `toonly-${selectedStyle}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [processedImageUrl, selectedStyle]);

  const handleMagicLinkSignIn = useCallback(async () => {
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsSendingMagicLink(true);
    console.log(`[Frontend Index] Requesting magic link for: ${email}`);
    try {
      // Ensure callback URL is correct
      const { data, error } = await authClient.signIn.magicLink({
        email,
        callbackURL: "http://localhost:8080",
        // callbackURL: "https://toonlyai.com",
      });

      if (error) {
        console.error("[Frontend Index] Magic link request error:", error);
        toast.error(error.message || "Failed to send magic link. Please try again.");
      } else {
        console.log("[Frontend Index] Magic link request success:", data);
        toast.success("Magic link sent! Check your email (including Spam/Promotions) to sign in.");
        setIsAuthModalOpen(false);
        setEmail("");
      }
    } catch (error) {
      console.error("[Frontend Index] Error sending magic link:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsSendingMagicLink(false);
    }
  }, [email]);

  const handleSignOut = async () => {
    try {
      console.log("[Frontend Index] Signing out...");
      await authClient.signOut();
      console.log("[Frontend Index] Sign out successful, clearing session state.");
      // Manually clear session state after successful sign out
      setSessionState({ data: null, isLoading: false, error: null });
      toast.success("Signed out successfully!");
    } catch (error) {
      console.error("[Frontend Index] Sign out error:", error);
      toast.error("Failed to sign out.");
    }
  };

  // --- Timer Logic using requestAnimationFrame ---
  useEffect(() => {
    const updateTimer = () => {
      if (startTimeRef.current) {
        const elapsed = Date.now() - startTimeRef.current;
        setProcessingTimeMs(elapsed);
        // Continue the loop
        animationFrameRef.current = requestAnimationFrame(updateTimer);
      }
    };

    if (isProcessing) {
      // Start timer
      setProcessingTimeMs(0); // Reset timer state
      startTimeRef.current = Date.now(); // Record start time
      // Start the animation frame loop
      animationFrameRef.current = requestAnimationFrame(updateTimer);
    } else {
      // Stop timer
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
        startTimeRef.current = null;
      }
    }

    // Cleanup function to cancel animation frame
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isProcessing]); // Dependency array ensures this runs when isProcessing changes

  // Format the time for display (e.g., 12.3s)
  const formattedProcessingTime = (processingTimeMs / 1000).toFixed(1);

  return (
    <div className="bg-[url('https://i.ibb.co/DDcDBgws/Chat-GPT-Image-Apr-3-2025-07-56-00-PM.png')] bg-cover bg-center bg-fixed min-h-screen w-full backdrop-blur-sm">
      <header className="sticky top-0 bg-[#a87b5d]/80 backdrop-blur-md z-10 playful-shadow">
        <div className="container flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <img 
              src="https://i.ibb.co/JfbH12h/Chat-GPT-Image-Apr-3-2025-08-33-33-PM.png" 
              alt="ToonlyAI Wizard Logo" 
              className="h-12 w-12 object-contain"
              onError={(e) => {
                console.error("Error loading logo:", e);
                e.currentTarget.style.display = 'none';
              }}
            />
            <h1 className="text-2xl font-bold text-white">Toonly AI</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* These elements are always shown */} 
            <button 
              onClick={() => setIsPricingModalOpen(true)}
              className="bg-white/30 backdrop-blur-sm h-8 px-2 rounded-lg flex items-center text-white font-bold cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-white/40 hover:shadow-md active:scale-95"
            >
              Buy Stars
            </button>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="bg-white/30 backdrop-blur-sm h-8 px-2 rounded-lg flex items-center text-white font-bold cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-white/40 hover:shadow-md active:scale-95"
                  >
                    <img 
                      src="https://i.ibb.co/Rd8VZxC/Open-AI-Playground-2025-04-25-at-15-20-53.png" 
                      alt="Credit Icon" 
                      className="h-4 w-4 mr-1"
                    />
                    <span className="flex items-center min-w-[20px] justify-center">
                      {isLoadingCredits ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CountUp 
                          start={prevCreditsRef.current} 
                          end={credits} 
                          duration={1.5}
                          separator="," 
                          decimals={0} 
                        />
                      )}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent 
                  side="bottom"
                  className="bg-[#8b5e3c] text-white border-[#a87b5d] animate-bounce-in"
                >
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3" />
                    <span>Stars</span>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Conditionally render the user dropdown */} 
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="relative h-10 w-10 rounded-full p-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0"
                  >
                    <Avatar className="h-10 w-10 border-2 border-white/50">
                      {/* <AvatarImage src={user?.avatarUrl} alt={userEmail} /> */}
                      <AvatarFallback className="bg-white/30 text-white">
                        {userEmail ? userEmail[0].toUpperCase() : <UserIcon size={20} />}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-[#3a2e23] border-[#5D4037] text-[#e9e2d6]" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-xs leading-none text-[#e9e2d6]/80">
                        {userEmail || "Loading..."}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-[#5D4037]/50" />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer focus:bg-[#5D4037]/50">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null /* Render nothing if not authenticated, as other elements are always shown */} 
          </div>
        </div>
      </header>
    
    <main className="container py-8">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold mb-4 text-[#f4efe4] [text-shadow:1px_1px_2px_rgba(93,64,55,0.7)]">Toonly AI</h2>
        <p className="text-lg text-[#f4efe4]/95 max-w-2xl mx-auto [text-shadow:1px_1px_1px_rgba(93,64,55,0.6)]">
          Effortlessly transform your photos into stunning cartoon styles, pixel art, and more in seconds. 
          Simple upload, instant magic!
        </p>
      </div>
      
      <div className="max-w-5xl mx-auto bg-[#e9e2d6]/70 backdrop-blur-sm rounded-xl playful-shadow playful-border p-6 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:divide-x md:divide-[#8b5e3c]/30 min-h-[600px]">
          <div className="space-y-6 md:pr-6">            
            <ImageUpload onImageSelect={handleImageSelect} isUploading={isProcessing} />
            
            <StyleSelector 
              selectedStyle={selectedStyle} 
              onChange={handleStyleChange} 
              disabled={isProcessing}
            />
            
            <Button 
              onClick={handleTransformClick}
              disabled={isProcessing}
              className="w-full bg-[#8b5e3c] hover:bg-[#6d4c30] text-[#FFF8E1] playful-shadow flex items-center justify-center gap-2" 
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Transforming...</span>
                </>
              ) : (
                <>
                  <Brush className="h-4 w-4" />
                  <span>Transform Image</span>
                  <img 
                    src="https://i.ibb.co/Rd8VZxC/Open-AI-Playground-2025-04-25-at-15-20-53.png" 
                    alt="Credit Icon" 
                    className="h-4 w-4"
                  />
                  <span>10</span>
                </>
              )}
            </Button>
            
            <div className="md:hidden">
              <ImageResult imageUrl={processedImageUrl} isLoading={isProcessing} onDownload={downloadImage} formattedProcessingTime={formattedProcessingTime} />
            </div>
          </div>
          
          <div className="md:pl-6 flex items-center justify-center h-full">
            <div className="hidden md:block w-full h-full stitch-border rounded-xl overflow-hidden bg-[#f4efe4]">
              <ImageResult imageUrl={processedImageUrl} isLoading={isProcessing} onDownload={downloadImage} formattedProcessingTime={formattedProcessingTime} />
            </div>
          </div>
        </div>
      </div>
      
      <section className="py-16 bg-[#f4efe4]/70 backdrop-blur-sm rounded-xl playful-shadow playful-border mb-16 text-[#3a2e23]">
        <div className="container max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4 text-[#5D4037]">Create Stunning Art in 3 Simple Steps</h2>
          <div className="grid md:grid-cols-3 gap-8 mt-8 text-left">
            <div className="p-4">
              <div className="text-4xl font-bold text-[#8b5e3c] mb-2">1.</div>
              <h3 className="text-xl font-semibold mb-2">Upload Your Image</h3>
              <p className="text-sm text-[#5D4037]/90">Choose any photo from your device – portraits, pets, landscapes, you name it!</p>
            </div>
            <div className="p-4">
              <div className="text-4xl font-bold text-[#8b5e3c] mb-2">2.</div>
              <h3 className="text-xl font-semibold mb-2">Select a Style</h3>
              <p className="text-sm text-[#5D4037]/90">Pick from over 100 unique styles, from classic cartoons to modern fine art.</p>
            </div>
            <div className="p-4">
              <div className="text-4xl font-bold text-[#8b5e3c] mb-2">3.</div>
              <h3 className="text-xl font-semibold mb-2">Transform!</h3>
              <p className="text-sm text-[#5D4037]/90">Click the button and watch Toonly AI work its magic in under a minute.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TO BE ADDED AS TIME GOES ON */}
      {/* 
      <section className="py-16 text-center mb-16">
        <h2 className="text-3xl font-bold mb-8 text-white">See the Magic!</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-[#e9e2d6]/70 backdrop-blur-sm rounded-lg playful-shadow playful-border overflow-hidden aspect-square flex items-center justify-center">
              <div className="w-full h-full bg-[#a87b5d]/30 flex items-center justify-center text-center p-4">
                <span className="text-[#3a2e23] font-semibold">Example {i}</span>
              </div>
            </div>
          ))}
        </div>
      </section> 
      */}

      {/* --- Testimonials Section --- */}
      {/* 
      <section className="py-16 bg-[#a87b5d]/80 backdrop-blur-md rounded-xl playful-shadow playful-border mb-16 text-white">
        <div className="container max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">What Our Users Say</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-[#3a2e23]/50 p-6 rounded-lg shadow-md">
              <p className="italic mb-4">"ToonlyAI is incredibly fun and easy to use! Transformed my dog into a cartoon hero in seconds."</p>
              <p className="font-semibold">- Sarah K.</p>
            </div>
            <div className="bg-[#3a2e23]/50 p-6 rounded-lg shadow-md">
              <p className="italic mb-4">"The variety of styles is amazing. I keep finding new ways to reimagine my photos."</p>
              <p className="font-semibold">- Mike P.</p>
            </div>
            <div className="bg-[#3a2e23]/50 p-6 rounded-lg shadow-md">
              <p className="italic mb-4">"Perfect for creating unique profile pictures and gifts! Highly recommended."</p>
              <p className="font-semibold">- Chloe T.</p>
            </div>
          </div>
        </div>
      </section>
      */}

      <section id="pricing" className="py-16 bg-[#f4efe4]/70 backdrop-blur-sm rounded-xl playful-shadow playful-border mb-16 text-[#3a2e23]">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#5D4037] mb-2 flex items-center justify-center gap-2">
              <StarIcon className="h-7 w-7 text-yellow-400" />
              Choose Your Plan
            </h2>
            <p className="text-center text-[#614e2e]/90">
              Pick the perfect option to fuel your creativity. Each transformation costs 10 stars.
            </p>
          </div>

          <Tabs defaultValue="packages" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-[#e9e2d6]/50 h-11 mb-6 border border-[#a87b5d]/50 rounded-lg">
              <TabsTrigger value="packages" className="text-base data-[state=active]:bg-[#8b5e3c] data-[state=active]:text-white data-[state=active]:shadow-md rounded-md">Packages</TabsTrigger>
              <TabsTrigger value="subscription" className="text-base data-[state=active]:bg-[#8b5e3c] data-[state=active]:text-white data-[state=active]:shadow-md rounded-md">Subscription</TabsTrigger>
            </TabsList>

            <TabsContent value="packages">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-2">
                <div className="border border-[#5D4037] rounded-lg p-6 text-center bg-white/30 flex flex-col hover:bg-white/40 transition-colors shadow-md">
                  <h3 className="font-semibold text-lg mb-1 text-[#3a2e23] flex items-center justify-center gap-1"><StarIcon className="h-4 w-4 inline text-yellow-500"/> 50</h3>
                  <p className="text-2xl font-bold text-[#8b5e3c] my-3">$3.00</p>
                  <ul className="text-xs text-[#5D4037]/90 list-none space-y-1 my-4 text-left px-2 flex-grow">
                    <li>✨ Approx. 5 Image Transforms</li>
                    <li>💰 $0.06 per Star</li>
                    <li>🎨 Access to 100+ Styles</li>
                    <li>⏱️ &lt; 1 Min Turnaround</li>
                  </ul>
                  <Button 
                    className="w-full mt-auto bg-[#8b5e3c] hover:bg-[#6d4c30] text-[#FFF8E1] playful-shadow"
                    onClick={() => {
                      const amountToCredit = 50;
                      if (userId && isAuthenticated) {
                        const paymentUrl = `https://test.checkout.dodopayments.com/buy/pdt_XuaWyd2YlrOuWIk7diVGN?quantity=1&metadata_user_id=${encodeURIComponent(userId)}&metadata_credit_amount=${amountToCredit}`;
                        console.log(`[Payment] Redirecting (50 credits) to: ${paymentUrl}`);
                        window.location.href = paymentUrl;
                      } else {
                        console.error("[Payment] User ID/Auth missing for payment (50 credits).");
                        if (!isAuthenticated) triggerAuthModal();
                        else toast.error("User session error. Please refresh.");
                      }
                    }}
                    disabled={!isAuthenticated || isSessionLoading}
                  >
                    Buy Now
                  </Button>
                </div>
                <div className="border-2 border-yellow-500 rounded-lg p-6 text-center bg-white/50 flex flex-col ring-2 ring-yellow-500/50 shadow-lg relative">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-[#3a2e23] px-3 py-0.5 rounded-full text-xs font-bold">Most Popular</div>
                  <h3 className="font-semibold text-lg mb-1 text-[#3a2e23] mt-3 flex items-center justify-center gap-1"><StarIcon className="h-4 w-4 inline text-yellow-500"/> 120</h3>
                  <p className="text-2xl font-bold text-[#8b5e3c] my-3">$6.00</p>
                  <ul className="text-xs text-[#5D4037]/90 list-none space-y-1 my-4 text-left px-2 flex-grow">
                    <li>✨ Approx. 12 Image Transforms</li>
                    <li>💰 $0.05 per Star</li>
                    <li>🎨 Access to 100+ Styles</li>
                    <li>⏱️ &lt; 1 Min Turnaround</li>
                  </ul>
                  <Button 
                    className="w-full mt-auto bg-yellow-500 hover:bg-yellow-600 text-[#3a2e23] playful-shadow font-semibold"
                    onClick={() => {
                      const amountToCredit = 120;
                      if (userId && isAuthenticated) {
                        // ** NOTE: Assuming same product ID pdt_X... for all packages - ADJUST IF NEEDED **
                        const paymentUrl = `https://test.checkout.dodopayments.com/buy/pdt_XuaWyd2YlrOuWIk7diVGN?quantity=1&metadata_user_id=${encodeURIComponent(userId)}&metadata_credit_amount=${amountToCredit}`;
                        console.log(`[Payment] Redirecting (120 credits) to: ${paymentUrl}`);
                        window.location.href = paymentUrl;
                      } else {
                        console.error("[Payment] User ID/Auth missing for payment (120 credits).");
                        if (!isAuthenticated) triggerAuthModal();
                        else toast.error("User session error. Please refresh.");
                      }
                    }}
                    disabled={!isAuthenticated || isSessionLoading}
                  >
                    Buy Now
                  </Button>
                </div>
                <div className="border border-[#5D4037] rounded-lg p-6 text-center bg-white/30 flex flex-col hover:bg-white/40 transition-colors shadow-md">
                  <h3 className="font-semibold text-lg mb-1 text-[#3a2e23] flex items-center justify-center gap-1"><StarIcon className="h-4 w-4 inline text-yellow-500"/> 300</h3>
                  <p className="text-2xl font-bold text-[#8b5e3c] my-3">$12.00</p>
                  <ul className="text-xs text-[#5D4037]/90 list-none space-y-1 my-4 text-left px-2 flex-grow">
                    <li>✨ Approx. 30 Image Transforms</li>
                    <li>💰 $0.04 per Star</li>
                    <li>🎨 Access to 100+ Styles</li>
                    <li>⏱️ &lt; 1 Min Turnaround</li>
                  </ul>
                  <Button 
                    className="w-full mt-auto bg-[#8b5e3c] hover:bg-[#6d4c30] text-[#FFF8E1] playful-shadow"
                    onClick={() => {
                      const amountToCredit = 300;
                      if (userId && isAuthenticated) {
                        // ** NOTE: Assuming same product ID pdt_X... for all packages - ADJUST IF NEEDED **
                        const paymentUrl = `https://test.checkout.dodopayments.com/buy/pdt_XuaWyd2YlrOuWIk7diVGN?quantity=1&metadata_user_id=${encodeURIComponent(userId)}&metadata_credit_amount=${amountToCredit}`;
                        console.log(`[Payment] Redirecting (300 credits) to: ${paymentUrl}`);
                        window.location.href = paymentUrl;
                      } else {
                        console.error("[Payment] User ID/Auth missing for payment (300 credits).");
                        if (!isAuthenticated) triggerAuthModal();
                        else toast.error("User session error. Please refresh.");
                      }
                    }}
                    disabled={!isAuthenticated || isSessionLoading}
                  >
                    Buy Now
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="subscription">
              <div className="border-2 border-yellow-500 rounded-lg p-8 text-center bg-white/50 flex flex-col items-center shadow-lg ring-2 ring-yellow-500/50">
                <h3 className="font-semibold text-xl mb-2 text-[#3a2e23]">Monthly Subscription</h3>
                <p className="text-3xl font-bold text-[#8b5e3c] my-3">$21 / month</p>
                <p className="text-lg text-[#3a2e23] mb-4">
                  Unlock premium features & enhance your creativity!
                </p>
                <ul className="text-sm text-[#5D4037]/90 list-disc list-outside text-left space-y-1 mb-6 max-w-md mx-auto pl-5">
                  <li>✨ Access the <span className="font-semibold">Edit feature</span> to customize specific parts of generated images.</li>
                  <li>🖼️ Use the <span className="font-semibold">Multi-Images feature</span> for batch uploads and unique styles.</li>
                  <li>⚡ <span className="font-semibold">Faster processing:</span> Get your images transformed in 40 seconds or less.</li>
                  <li>🌟 Keep and use your existing purchased stars.</li>
                  <li>🚫 Cancel your subscription at any time.</li>
                </ul>
                <Button 
                  className="w-full max-w-xs mt-4 bg-yellow-500 hover:bg-yellow-600 text-[#3a2e23] playful-shadow font-semibold text-lg py-3"
                  onClick={() => {
                    const amountToCredit = 0;
                    if (userId && isAuthenticated) {
                      const paymentUrl = `https://test.checkout.dodopayments.com/buy/pdt_ZlnbO81l1eACfK1QadoTf?quantity=1&metadata_user_id=${encodeURIComponent(userId)}&metadata_credit_amount=${amountToCredit}`;
                      console.log(`[Payment] Redirecting (Subscription) to: ${paymentUrl}`);
                      window.location.href = paymentUrl;
                    } else {
                      console.error("[Payment] User ID/Auth missing for payment (Subscription).");
                      if (!isAuthenticated) triggerAuthModal();
                      else toast.error("User session error. Please refresh.");
                    }
                  }}
                  disabled={!isAuthenticated || isSessionLoading}
                >
                  Subscribe Now
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <section className="py-16 text-center">
        <h2 className="text-3xl font-bold mb-8 text-[#f4efe4] [text-shadow:1px_1px_2px_rgba(93,64,55,0.7)]">Frequently Asked Questions</h2>
        <div className="max-w-3xl mx-auto text-left">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1" className="border-b border-[#f4efe4]/20">
              <AccordionTrigger className="py-4 text-lg font-medium text-[#f4efe4] hover:text-white [text-shadow:1px_1px_1px_rgba(93,64,55,0.6)] [&[data-state=open]>svg]:text-yellow-400">How many images can I transform?</AccordionTrigger>
              <AccordionContent className="pt-1 pb-4 text-[#f4efe4]/80 [text-shadow:1px_1px_1px_rgba(93,64,55,0.5)]">
                Each image transformation costs 10 stars. You can buy star packages or subscribe for a monthly allowance. Check the pricing section above for details!
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="border-b border-[#f4efe4]/20">
              <AccordionTrigger className="py-4 text-lg font-medium text-[#f4efe4] hover:text-white [text-shadow:1px_1px_1px_rgba(93,64,55,0.6)] [&[data-state=open]>svg]:text-yellow-400">What kind of images work best?</AccordionTrigger>
              <AccordionContent className="pt-1 pb-4 text-[#f4efe4]/80 [text-shadow:1px_1px_1px_rgba(93,64,55,0.5)]">
                Clear photos of faces, pets, or objects generally produce the best results. Experiment to see what works for your chosen style!
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4" className="border-b-0">
              <AccordionTrigger className="py-4 text-lg font-medium text-[#f4efe4] hover:text-white [text-shadow:1px_1px_1px_rgba(93,64,55,0.6)] [&[data-state=open]>svg]:text-yellow-400">How do I cancel my subscription?</AccordionTrigger>
              <AccordionContent className="pt-1 pb-4 text-[#f4efe4]/80 [text-shadow:1px_1px_1px_rgba(93,64,55,0.5)]">
                You can manage or cancel your subscription at any time through your account settings (link available when logged in).
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
       
      <footer className="mt-16 pt-8 text-center text-sm text-[#f4efe4]/90 border-t border-[#f4efe4]/20 [text-shadow:1px_1px_1px_rgba(93,64,55,0.6)]">
        <div className="flex flex-wrap items-center justify-center space-x-4">
          <a href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</a>
          <span>•</span>
          <a href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</a>
          <span>•</span>
          <a href="/legal" className="hover:text-white transition-colors">Legal</a>
        </div>
        <p className="mt-2 mb-4">© {new Date().getFullYear()} ToonlyAI. All rights reserved.</p>
      </footer>
    </main>
    
    <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
      <DialogContent className="sm:max-w-3xl bg-[#3a2e23] border-[#5D4037] p-0 overflow-hidden rounded-lg">
        <div className="flex">
          <div className="w-1/3 hidden md:block">
            <img 
              src="/images/theGalazy.png"
              alt="Galaxy"
              className="object-cover h-full w-full"
            />
          </div>

          <div className="w-full md:w-2/3 p-8 flex flex-col justify-between">
            <DialogHeader className="text-left mb-6">
              <DialogTitle className="text-3xl font-bold text-[#e9e2d6] mb-4">Turn Moments into Magic with Toonly AI</DialogTitle>
              <div className="space-y-4 text-[#f4efe4]/80">
                <section>
                  <h3 className="text-lg font-semibold text-[#f4efe4]/90 mb-1">Join the Fun</h3>
                  <p className="text-sm">Instantly transform your images into cartoons and other art styles.</p>
                </section>
                <section>
                  <h3 className="text-lg font-semibold text-[#f4efe4]/90 mb-1">Why Sign Up?</h3>
                  <ul className="list-disc list-inside text-sm space-y-1 pl-2">
                    <li>🎨 Choose from 100+ cartoon, art, anime styles and more</li>
                    <li>✨ Edit, customize and personalize every detail</li>
                    <li>😂 Create funny images that will crack everyone up</li>
                    <li>🚀 Share your creations instantly with friends!</li>
                  </ul>
                  
                </section>
                <div className="space-y-4 py-4">
                  <div className="grid w-full items-center gap-1.5 mb-10">
                    <Label htmlFor="email-magic" className="text-[#f4efe4]/90">Email</Label>
                    <Input 
                      type="email" 
                      id="email-magic"
                      placeholder="you@example.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSendingMagicLink}
                      className="bg-[#e9e2d6]/20 border-[#5D4037] text-[#e9e2d6] placeholder:text-[#e9e2d6]/70 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                </div>
              </div>
            </DialogHeader>
            
            <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-auto">
              <Button 
                type="button" 
                onClick={handleMagicLinkSignIn}
                disabled={isSendingMagicLink}
                className="btn-starry text-white w-full sm:w-auto flex items-center justify-center gap-2 transition-shadow duration-300"
              >
                {isSendingMagicLink ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" /> 
                )}
                <span>
                  {isSendingMagicLink ? "Sending Link..." : "Sign In with a Magic Link"}
                </span> 
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    
    <PricingModal 
      isOpen={isPricingModalOpen} 
      onClose={() => setIsPricingModalOpen(false)} 
    />
  </div>
  );
};

export default Index;
