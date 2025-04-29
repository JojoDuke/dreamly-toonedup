
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export type HistoryImage = {
  id: string;
  url: string;
  style: string;
  timestamp: Date;
};

interface ImageHistoryProps {
  images: HistoryImage[];
  onSelect: (image: HistoryImage) => void;
  className?: string;
}

export function ImageHistory({ images, onSelect, className }: ImageHistoryProps) {
  if (images.length === 0) {
    return (
      <div className={cn("rounded-lg border p-4", className)}>
        <h3 className="font-medium mb-2">Image History</h3>
        <div className="text-center py-10 text-muted-foreground">
          <p>Your processed images will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border", className)}>
      <div className="p-4">
        <h3 className="font-medium">Image History</h3>
      </div>
      <ScrollArea className="h-[400px] px-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          {images.map((image) => (
            <button
              key={image.id}
              className="overflow-hidden rounded-md border hover:opacity-80 transition-opacity"
              onClick={() => onSelect(image)}
            >
              <div className="aspect-square w-full relative">
                <img 
                  src={image.url} 
                  alt={`${image.style} style`}
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="p-2 text-xs text-left">
                <p className="font-medium">{image.style}</p>
                <p className="text-muted-foreground">
                  {image.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
