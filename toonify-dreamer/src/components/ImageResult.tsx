import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Download, Image as ImageIcon } from "lucide-react";
import { useState } from "react";

interface ImageResultProps {
  imageUrl: string | null;
  isLoading: boolean;
  formattedProcessingTime: string;
  className?: string;
  onDownload?: () => void;
}

export function ImageResult({ 
  imageUrl, 
  isLoading, 
  formattedProcessingTime,
  className,
  onDownload 
}: ImageResultProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  if (isLoading) {
    return (
      <div 
        className={cn(
          "relative flex flex-col items-center justify-center h-full min-h-[400px] bg-[#f4efe4]",
          className
        )}
      >
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#a87b5d] border-t-transparent rounded-full mx-auto animate-spin mb-4"></div>
          <p className="text-lg font-medium text-[#5D4037]">Processing image...</p>
          <p className="text-sm text-[#8b5e3c] mt-1">This may take a moment</p>
        </div>
        <div className="absolute bottom-4 right-4 bg-[#3a2e23]/80 text-white text-xs font-mono px-2 py-1 rounded">
          {formattedProcessingTime}s
        </div>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div 
        className={cn(
          "flex flex-col items-center justify-center h-full min-h-[400px] bg-[#f4efe4]",
          className
        )}
      >
        <div className="text-center p-6">
          <ImageIcon className="h-16 w-16 mx-auto mb-4 text-[#a87b5d]" />
          <p className="text-lg font-medium text-[#5D4037]">No image processed yet</p>
          <p className="text-sm text-[#8b5e3c] mt-1">
            Upload an image and select a style to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden h-full bg-[#f4efe4] flex justify-center items-center", className)}>
      <div className="relative h-auto max-w-full max-h-full">
        {!isImageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-[#a87b5d] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <img
          src={imageUrl}
          alt="Processed image"
          className={cn(
            "w-full h-auto object-contain max-h-[calc(100vh-200px)]",
            !isImageLoaded && "opacity-0"
          )}
          onLoad={() => setIsImageLoaded(true)}
        />
        {isImageLoaded && onDownload && (
          <Button
            onClick={onDownload}
            className="absolute bottom-4 right-4 bg-[#8b5e3c] hover:bg-[#6d4c30] text-[#FFF8E1] playful-shadow"
            variant="default"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            <span>Download Result</span>
          </Button>
        )}
      </div>
    </div>
  );
}
