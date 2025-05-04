import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ImageUpload";
import { StyleSelector } from "@/components/StyleSelector";
import { ImageResult } from "@/components/ImageResult";
import { imageEditService } from "@/services/imageEditService";
import { toast } from "sonner";
import { Loader2, Brush, Star, Sparkles, Pencil, Edit, Menu, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
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
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";

// Use Vite's import.meta.env for frontend environment variables
// Use the VITE_ prefixed variable name
const BACKEND_BASE_URL = import.meta.env.VITE_BETTER_AUTH_URL || ''; // Provide a default

const stylePrompts: Record<string, string> = {
  ghibli: "Turn this image into Ghibli anime style",
  pixel: "Do this in a 16 bit pixel art style",
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
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoadingSubscriptionStatus, setIsLoadingSubscriptionStatus] = useState(true);
  const [customPrompt, setCustomPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [sessionState, setSessionState] = useState<{ 
    data: Awaited<ReturnType<typeof authClient.getSession>>['data'] | null; 
    isLoading: boolean; 
    error: any | null; 
  }>({ data: null, isLoading: true, error: null });
  const [isMobileDisclaimerOpen, setIsMobileDisclaimerOpen] = useState(false);
  
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

  // Check for mobile view on mount and show disclaimer if needed
  useEffect(() => {
    const checkMobileAndShowDisclaimer = () => {
      const isMobileView = window.innerWidth < 768; // Use 768px as the breakpoint (Tailwind's md)
      const disclaimerShown = sessionStorage.getItem('mobileDisclaimerShown');

      if (isMobileView && !disclaimerShown) {
        console.log("[Mobile Check] Detected mobile view, showing disclaimer");
        setIsMobileDisclaimerOpen(true);
        sessionStorage.setItem('mobileDisclaimerShown', 'true'); // Mark as shown for this session
      } else {
        console.log("[Mobile Check] Desktop view or disclaimer already shown.");
      }
    };

    // Check on initial mount after a short delay to ensure layout is stable
    const timer = setTimeout(checkMobileAndShowDisclaimer, 100); 

    return () => clearTimeout(timer); // Cleanup timer on unmount
  }, []); // Run only once on mount

  // Derive authentication status and user data
  const session = sessionState.data?.session;
  const user = sessionState.data?.user;
  const userId = session?.userId; 
  const isAuthenticated = !!session;
  const userEmail = user?.email;
  const isSessionLoading = sessionState.isLoading;

  // Fetch credits AND subscription status when authentication changes (or session loads)
  useEffect(() => {
    if (isAuthenticated) {
      setIsLoadingCredits(true);
      setIsLoadingSubscriptionStatus(true);
      console.log("[Frontend Index] Auth successful, fetching credits and status...");

      // Fetch Credits
      fetch(`${BACKEND_BASE_URL}/api/user/credits`, { credentials: 'include' })
        .then(res => {
          if (!res.ok) { throw new Error(`Failed to fetch credits: ${res.statusText}`); }
          return res.json();
        })
        .then(data => {
          if (typeof data.credits === 'number') {
            prevCreditsRef.current = credits;
            setCredits(data.credits);
          }
        })
        .catch(err => {
          console.error("Error fetching credits:", err);
          toast.error("Could not load your credit balance.");
          prevCreditsRef.current = credits;
          setCredits(0);
        }).finally(() => {
          setIsLoadingCredits(false);
        });

      // Fetch Subscription Status
      fetch(`${BACKEND_BASE_URL}/api/user/status`, { credentials: 'include' })
        .then(res => {
          if (!res.ok) { throw new Error(`Failed to fetch subscription status: ${res.statusText}`); }
          return res.json();
        })
        .then(data => {
          if (typeof data.isSubscribed === 'boolean') {
            console.log("[Frontend Index] Fetched subscription status:", data.isSubscribed);
            setIsSubscribed(data.isSubscribed);
          } else {
            console.warn("[Frontend Index] Unexpected subscription status data:", data);
            setIsSubscribed(false);
          }
        })
        .catch(err => {
          console.error("Error fetching subscription status:", err);
          toast.error("Could not load subscription status.");
          setIsSubscribed(false);
        }).finally(() => {
          setIsLoadingSubscriptionStatus(false);
        });

    } else {
        // If not authenticated, but session isn't loading anymore, clear state
        if (!isSessionLoading) {
            console.log("[Frontend Index] Not authenticated or session load finished, clearing credits and status.");
            prevCreditsRef.current = credits;
            setCredits(0);
            setIsSubscribed(false);
            setIsLoadingCredits(false);
            setIsLoadingSubscriptionStatus(false);
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
    setCustomPrompt("");
    
    // --- Timer Reset Logic --- 
    console.log("[Image Select] New image selected, resetting timer and states.");
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    startTimeRef.current = null;
    setProcessingTimeMs(0);
    setIsProcessing(false); // Ensure processing flags are off
    setIsEditing(false); 
    // --- End Timer Reset Logic ---
  }, []);
  
  const handleStyleChange = useCallback((styleId: string) => {
    setSelectedStyle(styleId);
    
    // We don't reset timer just on style change, 
    // but will do so when transformImage is called
  }, []);
  
  const triggerAuthModal = () => {
    setIsAuthModalOpen(true);
  };

  const processImage = useCallback(async (promptToUse: string) => {
    if (!selectedFile) {
      toast.error("Please upload an image first");
      return;
    }
    if (!promptToUse) {
      toast.error("Cannot transform without a style or prompt.");
      return;
    }

    // --- Timer Reset Logic (Explicitly reset before processing starts) ---
    console.log("[Process Image] Starting transformation, resetting timer.");
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    startTimeRef.current = null; // Reset start time reference
    setProcessingTimeMs(0); // Reset the displayed timer value
    // --- End Timer Reset Logic ---
    
    setIsProcessing(true);
    setProcessedImageUrl(null);
    setCustomPrompt("");
    
    try {
      console.log(`[Frontend Index] Calling imageEditService.transformImageWithPrompt with prompt: "${promptToUse}"`);
      const editedImageUrl = await imageEditService.transformImageWithPrompt(selectedFile, promptToUse);
      
      setProcessedImageUrl(editedImageUrl);
      toast.success("Image transformed successfully!");
      await refreshCredits(); 
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, refreshCredits]);

  const handleEditImage = useCallback(async () => {
    if (!isAuthenticated || !isSubscribed) {
      toast.error("Editing is available for subscribers only.");
      return;
    }
    if (!processedImageUrl) {
      toast.info("Please transform an image first before editing.");
      return;
    }
    const editPrompt = customPrompt.trim();
    if (!editPrompt) {
      toast.info("Please enter your desired edits in the text box.");
      return;
    }
    if (credits < 10) {
        toast.error("Not enough credits to edit.");
        setIsPricingModalOpen(true);
        return;
    }
    if (isProcessing || isEditing) {
        toast.info("Please wait for the current process to finish.");
        return;
    }
    
    // --- Timer Reset Logic (Explicitly reset before editing starts) ---
    console.log("[Edit Image] Starting edit, resetting timer.");
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    startTimeRef.current = null; // Clear start time ref
    setProcessingTimeMs(0); // Reset displayed time
    // --- End Timer Reset Logic ---
    
    setIsEditing(true); // Now set editing state
    
    try {
      // Directly use processedImageUrl and the editPrompt
      console.log(`[Frontend Index] Calling imageEditService.callEditApi with prompt: "${editPrompt}"`);
      const editedImageUrl = await imageEditService.callEditApi(processedImageUrl, editPrompt); 
      
      setProcessedImageUrl(editedImageUrl);
      toast.success("Image edited successfully!");
      await refreshCredits(); 
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setIsEditing(false);
    }
  }, [processedImageUrl, customPrompt, isAuthenticated, isSubscribed, credits, refreshCredits, isProcessing, isEditing]);

  const handleApiError = (error: any) => {
      console.error("[Frontend Index] Error processing image:", error);
      if (error.status === 402) {
        setIsPricingModalOpen(true);
      } else if (error.status === 401) {
        toast.error("Authentication error. Please sign in again.");
      } else {
        toast.error(error.message || "Failed to process image. Please try again later.");
      }
  };
  
  const handleTransformClick = () => {
    if (!selectedFile) {
      toast.info("Please upload an image first.");
      return;
    }
    if (!isAuthenticated) {
      toast.info("Please sign in to transform images.");
      triggerAuthModal();
      return;
    }
    if (credits < 10) {
      toast.error("Not enough credits to transform.");
      setIsPricingModalOpen(true);
      return;
    }
    if (isProcessing || isEditing) {
        toast.info("Please wait for the current process to finish.");
        return;
    }
    
    // Call processImage. The timer reset logic is now handled explicitly *inside* processImage.
    console.log("[Transform Click] Triggering image processing...");
    processImage(stylePrompts[selectedStyle]); 
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
      const callbackURL = import.meta.env.VITE_APP_BASE_URL;

      const { data, error } = await authClient.signIn.magicLink({
        email,
        callbackURL: callbackURL, 
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
    let isActive = isProcessing || isEditing; // Timer runs if processing OR editing

    const updateTimer = () => {
      if (startTimeRef.current) {
        const elapsed = Date.now() - startTimeRef.current;
        setProcessingTimeMs(elapsed);
        // Continue the loop only if still active
        if (isActive) {
          animationFrameRef.current = requestAnimationFrame(updateTimer);
        }
      }
    };

    if (isActive) {
      // Start timer or ensure it continues
      if (!startTimeRef.current) { 
        // Only reset/set start time if timer wasn't already running
        setProcessingTimeMs(0); // Reset timer state ONLY when starting fresh
        startTimeRef.current = Date.now(); // Record start time
        console.log("[Timer] Starting new timer.");
      } else {
        console.log("[Timer] Already running, continuing...");
      }
      // Start/continue the animation frame loop if not already running
      if (!animationFrameRef.current) {
          animationFrameRef.current = requestAnimationFrame(updateTimer);
      }
    } else {
      // Stop timer if neither processing nor editing
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
        // Keep start time ref and timer value when just stopping 
        // (don't reset so user can see final time)
        console.log("[Timer] Stopping timer.");
      }
    }

    // Cleanup function to cancel animation frame if component unmounts while active
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  // Depend on both flags
  }, [isProcessing, isEditing]);

  // Format the time for display (e.g., 1m 15.7s or 12.3s)
  const formattedProcessingTime = useMemo(() => {
    const totalSeconds = processingTimeMs / 1000;
    if (totalSeconds >= 60) {
      const minutes = Math.floor(totalSeconds / 60);
      const remainingSeconds = totalSeconds % 60;
      return `${minutes}m ${remainingSeconds.toFixed(1)}`;
    } else {
      return `${totalSeconds.toFixed(1)}`;
    }
  }, [processingTimeMs]); // Use useMemo for efficiency

  return (
    <SkeletonTheme baseColor="#e0d8c7" highlightColor="#f4efe4">
      <div className="bg-[url('https://i.ibb.co/DDcDBgws/Chat-GPT-Image-Apr-3-2025-07-56-00-PM.png')] bg-cover bg-center min-h-screen w-full backdrop-blur-sm md:bg-fixed">
        <header className="sticky top-0 bg-[#a87b5d]/80 backdrop-blur-md z-10 playful-shadow">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
            <div className="flex items-center gap-2 flex-shrink-0 mr-2">
              <img 
                src="https://i.ibb.co/JfbH12h/Chat-GPT-Image-Apr-3-2025-08-33-33-PM.png" 
                  alt="ToonlyAI Wizard Logo" 
                className="h-12 w-12 object-contain"
                onError={(e) => {
                  console.error("Error loading logo:", e);
                  e.currentTarget.style.display = 'none';
                }}
              />
                <h1 className="text-xl sm:text-2xl font-bold text-white whitespace-nowrap">Toonly AI</h1>
            </div>
            
            <div className="hidden md:flex items-center justify-end gap-2 sm:gap-4 flex-grow">
              <button 
                  onClick={() => setIsPricingModalOpen(true)}
                className="bg-white/30 backdrop-blur-sm h-8 px-2 rounded-lg flex items-center text-white font-bold cursor-pointer transition-all duration-300 hover:scale-105 hover:bg-white/40 hover:shadow-md active:scale-95"
              >
                <span className="whitespace-nowrap">Buy Stars</span>
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

              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="relative h-10 w-10 rounded-full p-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus:ring-0"
                    >
                      <Avatar className="h-10 w-10 border-2 border-white/50">
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
              ) : null} 
            </div>

            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-[#a87b5d] border-l-[#8b5e3c] p-6 text-white">
                  <SheetHeader className="mb-6">
                    <SheetTitle className="text-2xl font-bold text-white text-left">Menu</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col space-y-4">
                    {isAuthenticated ? (
                      <div className="flex items-center gap-3 border-b border-white/20 pb-4 mb-4">
                        <Avatar className="h-10 w-10 border-2 border-white/50">
                           <AvatarFallback className="bg-white/30 text-white text-sm">
                             {userEmail ? userEmail[0].toUpperCase() : <UserIcon size={20} />} 
                           </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium truncate">{userEmail}</span>
                      </div>
                    ) : null }

                    <SheetClose asChild> 
                      <Button 
                        onClick={() => setIsPricingModalOpen(true)}
                        variant="secondary"
                        className="w-full justify-start gap-2 text-white bg-[#e9e2d6]/20 hover:bg-[#e9e2d6]/30"
                      >
                         <Star className="h-4 w-4 text-yellow-400"/> Buy Stars
                      </Button>
                    </SheetClose>
                    
                    <div className="flex items-center justify-between text-sm px-3 py-2 rounded-md bg-white/10">
                       <span className="flex items-center gap-2">
                         <Star className="h-4 w-4 text-yellow-400"/> Credits Remaining:
                       </span>
                       <span className="font-semibold flex items-center min-w-[20px] justify-center">
                         {isLoadingCredits ? <Loader2 className="h-4 w-4 animate-spin" /> : <CountUp start={prevCreditsRef.current} end={credits} duration={1.5} separator="," decimals={0} />}
                       </span>
                     </div>

                    {isAuthenticated ? (
                      <SheetClose asChild>
                        <Button 
                          onClick={handleSignOut}
                          variant="ghost"
                          className="w-full justify-start gap-2 hover:bg-white/10 text-white"
                          >
                           <LogOut className="h-4 w-4"/> Sign Out
                        </Button>
                       </SheetClose>
                    ) : null}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>
      
        {/* Add overflow constraint to main content area */}
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4 text-[#f4efe4] [text-shadow:1px_1px_2px_rgba(93,64,55,0.7)]">Toonly AI</h2>
            <p className="text-lg text-[#f4efe4]/95 max-w-2xl mx-auto [text-shadow:1px_1px_1px_rgba(93,64,55,0.6)]">
              Effortlessly transform your photos into stunning cartoon styles, pixel art, and more in seconds. 
              Simple upload, instant magic!
            </p>
        </div>
        
          <div className="sm:max-w-xl md:max-w-3xl lg:max-w-5xl mx-auto bg-[#e9e2d6]/70 backdrop-blur-sm rounded-xl playful-shadow playful-border p-4 sm:p-6 mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:divide-x md:divide-[#8b5e3c]/30 min-h-[500px] sm:min-h-[600px]">
            <div className="space-y-6 md:pr-6">            
              <ImageUpload onImageSelect={handleImageSelect} isUploading={isProcessing || isEditing} />
                
                {/* --- Edit Transformation Area (Subscribers Only) --- */}
                {isAuthenticated && isSubscribed && (
                  <div className={`space-y-2 p-4 bg-white/30 rounded-lg border border-[#a87b5d]/40 shadow-inner transition-opacity duration-300 ${processedImageUrl ? 'opacity-100' : 'opacity-50'}`}>
                    <Label htmlFor="custom-prompt" className="flex items-center gap-1.5 text-sm font-semibold text-[#5D4037]">
                      <Pencil className="h-4 w-4" />
                      Edit Transformation
                    </Label>
                    <Textarea
                      id="custom-prompt"
                      placeholder={processedImageUrl ? "Describe further edits (e.g., 'add glasses', 'change background to forest')..." : "Transform an image first to enable editing."}
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      disabled={!processedImageUrl || isProcessing || isEditing}
                      className="bg-white/80 border-[#a87b5d]/60 text-[#3a2e23] placeholder:text-[#5D4037]/70 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#8b5e3c] focus-visible:ring-offset-0 min-h-[80px] resize-none disabled:cursor-not-allowed disabled:bg-opacity-60"
                    />
                  </div>
                )}
                {/* --- End Edit Transformation Area --- */}
              
              <StyleSelector 
                selectedStyle={selectedStyle} 
                onChange={handleStyleChange} 
                disabled={isProcessing || isEditing || (isAuthenticated && isSubscribed && !!processedImageUrl)}
              />
              
              <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleTransformClick}
                  className="flex-1 bg-[#8b5e3c] hover:bg-[#6d4c30] text-[#FFF8E1] playful-shadow flex items-center justify-center gap-2 w-full sm:w-auto text-base"
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

                {/* New Edit Button (Subscribers Only, after transform) */} 
                {isAuthenticated && isSubscribed && (
                  <Button 
                    onClick={handleEditImage}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white playful-shadow flex items-center justify-center gap-2 w-full sm:w-auto text-base"
                  >
                    {isEditing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Editing...</span>
                      </>
                    ) : (
                      <>
                        <Edit className="h-4 w-4" />
                        <span>Edit Image</span>
                        <img 
                          src="https://i.ibb.co/Rd8VZxC/Open-AI-Playground-2025-04-25-at-15-20-53.png" 
                          alt="Credit Icon" 
                          className="h-4 w-4"
                        />
                        <span>10</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              <div className="md:hidden">
                {/* Pass combined loading state */}
                <ImageResult imageUrl={processedImageUrl} isLoading={isProcessing || isEditing} onDownload={downloadImage} formattedProcessingTime={formattedProcessingTime} />
              </div>
            </div>
            
            <div className="md:pl-6 flex items-center justify-center h-full">
              <div className="hidden md:block w-full h-full stitch-border rounded-xl overflow-hidden bg-[#f4efe4]">
                {/* Pass combined loading state */}
                <ImageResult imageUrl={processedImageUrl} isLoading={isProcessing || isEditing} onDownload={downloadImage} formattedProcessingTime={formattedProcessingTime} />
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
                          if (userId && isAuthenticated) {
                            const amountToCredit = 50;
                            const paymentUrl = `https://checkout.dodopayments.com/buy/pdt_o2dgAidb4HRvBPRhiPIkM?quantity=1&metadata_user_id=${encodeURIComponent(userId)}&metadata_credit_amount=${amountToCredit}`;
                            console.log(`[Payment] Redirecting (50 credits) to: ${paymentUrl}`);
                            window.location.href = paymentUrl;
                          } else {
                            console.log("[Payment] User not authenticated for 50 credits purchase. Triggering auth modal.");
                            triggerAuthModal(); 
                          }
                        }}
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
                          if (userId && isAuthenticated) {
                            const amountToCredit = 120;
                            const paymentUrl = `https://checkout.dodopayments.com/buy/pdt_hVW4yq6XK4OVtdfqKEX4b?quantity=1&metadata_user_id=${encodeURIComponent(userId)}&metadata_credit_amount=${amountToCredit}`;
                            console.log(`[Payment] Redirecting (120 credits) to: ${paymentUrl}`);
                            window.location.href = paymentUrl;
                          } else {
                            console.log("[Payment] User not authenticated for 120 credits purchase. Triggering auth modal.");
                            triggerAuthModal();
                          }
                        }}
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
                          if (userId && isAuthenticated) {
                            const amountToCredit = 300;
                            const paymentUrl = `https://checkout.dodopayments.com/buy/pdt_OGKnLAgIESKQpdnWp2yCL?quantity=1&metadata_user_id=${encodeURIComponent(userId)}&metadata_credit_amount=${amountToCredit}`;
                            console.log(`[Payment] Redirecting (300 credits) to: ${paymentUrl}`);
                            window.location.href = paymentUrl;
                          } else {
                            console.log("[Payment] User not authenticated for 300 credits purchase. Triggering auth modal.");
                            triggerAuthModal();
                          }
                        }}
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
                        if (userId && isAuthenticated) {
                          const amountToCredit = 0;
                          const paymentUrl = `https://checkout.dodopayments.com/buy/pdt_3NqIyERjd8icANIGDBrKJ?quantity=1&metadata_user_id=${encodeURIComponent(userId)}&metadata_credit_amount=${amountToCredit}`;
                          console.log(`[Payment] Redirecting (Subscription) to: ${paymentUrl}`);
                          window.location.href = paymentUrl;
                        } else {
                          console.log("[Payment] User not authenticated for subscription purchase. Triggering auth modal.");
                          triggerAuthModal();
                        }
                      }}
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
            <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
            <span>•</span>
            <Link to="/legal" className="hover:text-white transition-colors">Legal</Link>
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
          userId={userId}
        />

        {/* --- Mobile Disclaimer Modal --- */}
        <Dialog open={isMobileDisclaimerOpen} onOpenChange={setIsMobileDisclaimerOpen}>
          <DialogContent className="sm:max-w-xs md:max-w-sm bg-[#3a2e23] border-[#5D4037] text-[#e9e2d6] p-6 rounded-lg shadow-xl">
            <DialogHeader className="text-center mb-4">
              <DialogTitle className="text-lg font-semibold text-white">Mobile Experience Note</DialogTitle>
            </DialogHeader>
            <div className="text-center text-[#f4efe4]/80 text-sm">
              <p>Toonly AI is fully functional on mobile, but for the best experience (especially drag & drop and viewing details), we recommend using a desktop browser.</p>
            </div>
            <DialogFooter className="mt-6 sm:justify-center">
              <Button 
                type="button" 
                onClick={() => setIsMobileDisclaimerOpen(false)}
                className="w-full bg-[#8b5e3c] hover:bg-[#6d4c30] text-[#FFF8E1] playful-shadow text-sm"
              >
                Got it!
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
    </SkeletonTheme>
  );
};

export default Index;
