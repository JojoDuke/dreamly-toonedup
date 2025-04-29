
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Key } from "lucide-react";

interface APIKeyInputProps {
  onSave: (apiKey: string) => void;
}

export function APIKeyInput({ onSave }: APIKeyInputProps) {
  const [apiKey, setApiKey] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }
    
    // Save API key
    onSave(apiKey);
    toast.success("API key saved successfully");
    setIsVisible(false);
  };

  return (
    <div className="mb-6">
      {isVisible ? (
        <div className="space-y-2 bg-card p-4 rounded-lg">
          <h3 className="text-base font-medium flex items-center gap-2">
            <Key className="h-4 w-4" /> 
            Enter Runware API Key
          </h3>
          <p className="text-sm text-muted-foreground mb-2">
            Visit <a href="https://runware.ai/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              runware.ai
            </a> to get your API key.
          </p>
          <div className="flex gap-2">
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              className="flex-1"
            />
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      ) : (
        <Button 
          variant="outline" 
          onClick={() => setIsVisible(true)}
          className="flex items-center gap-2"
        >
          <Key className="h-4 w-4" /> Change API Key
        </Button>
      )}
    </div>
  );
}
