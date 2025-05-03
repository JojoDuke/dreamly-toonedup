import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";

export type StyleOption = {
  id: string;
  name: string;
  description: string;
  disabled?: boolean;
  comingSoon?: boolean;
};

export type CategoryOption = {
  id: string;
  name: string;
  styles: StyleOption[];
};

export const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: "anime",
    name: "Anime",
    styles: [
      {
        id: "ghibli",
        name: "Studio Ghibli",
        description: "Transform your image into a warm anime Studio Ghibli style",
      },
    ],
  },
  {
    id: "art",
    name: "Art",
    styles: [
      {
        id: "pixel",
        name: "Pixel Art",
        description: "Transform your image into pixel art style",
      },
    ],
  },
];

interface StyleSelectorProps {
  selectedStyle: string;
  onChange: (styleId: string) => void;
  className?: string;
  disabled?: boolean;
}

export function StyleSelector({ 
  selectedStyle, 
  onChange, 
  className,
  disabled = false
}: StyleSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("anime");
  
  const currentCategory = CATEGORY_OPTIONS.find(cat => cat.id === selectedCategory) || CATEGORY_OPTIONS[0];
  const availableStyles = currentCategory.styles;
  
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    const category = CATEGORY_OPTIONS.find(cat => cat.id === categoryId);
    if (category) {
      const firstAvailableStyle = category.styles.find(style => !style.disabled && !style.comingSoon);
      if (firstAvailableStyle) {
        onChange(firstAvailableStyle.id);
      }
    }
  };

  return (
    <div className={cn("w-full space-y-3", className)}>
      <div className="space-y-2">
        <h3 className="font-medium text-lg text-[#5D4037]">Select Category</h3>
        <Select 
          value={selectedCategory}
          onValueChange={handleCategoryChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-full border-[#a87b5d] bg-[#f4efe4] text-[#5D4037] ring-0 outline-none ring-offset-0 focus:ring-0 focus:outline-none focus:border-[#a87b5d] focus:ring-offset-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0">
            <SelectValue placeholder="Select Category" />
          </SelectTrigger>
          <SelectContent className="bg-[#f4efe4] border-[#a87b5d] max-w-[250px]">
            {CATEGORY_OPTIONS.map((category) => (
              <SelectItem 
                key={category.id} 
                value={category.id} 
                className="text-[#5D4037] focus:bg-[#a87b5d]/40 hover:bg-[#a87b5d]/20 cursor-pointer whitespace-normal"
              >
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium text-lg text-[#5D4037]">Select Style</h3>
        <div className="grid grid-cols-1 gap-3">
          {availableStyles.map((style) => (
            <Button
              key={style.id}
              variant={selectedStyle === style.id ? "default" : "outline"}
              className={cn(
                "h-auto flex flex-col items-start p-4 text-left playful-shadow w-full",
                selectedStyle === style.id 
                  ? "bg-[#a87b5d]/20 border-[#8b5e3c] text-[#3E2723]" 
                  : "border-[#a87b5d] text-[#5D4037] hover:border-[#8b5e3c] hover:bg-[#a87b5d]/10",
                style.disabled || style.comingSoon ? "opacity-70 cursor-not-allowed" : ""
              )}
              onClick={() => !(style.disabled || style.comingSoon) && onChange(style.id)}
              disabled={disabled || style.disabled || style.comingSoon}
            >
              <div className="flex flex-col w-full">
                <span className="font-medium">{style.name}</span>
                <span className="text-xs text-[#8b5e3c] mt-1 break-words break-normal hyphens-auto w-full whitespace-normal">
                  {style.description}
                </span>
                {style.comingSoon && (
                  <span className="text-xs font-medium text-amber-600 mt-1">
                    Coming Soon
                  </span>
                )}
              </div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
