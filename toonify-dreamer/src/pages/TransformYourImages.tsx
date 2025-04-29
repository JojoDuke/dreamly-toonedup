import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";

export default function TransformYourImages() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Transform Your Images</h1>
        <p className="text-lg text-muted-foreground">
          Upload an image and transform it into various styles
        </p>

        <Card className="p-8">
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              {preview ? (
                <div className="relative w-full max-w-md aspect-square">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-contain rounded-lg"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setSelectedImage(null);
                      setPreview(null);
                    }}
                  >
                    ×
                  </Button>
                </div>
              ) : (
                <div className="w-full max-w-md aspect-square border-2 border-dashed rounded-lg flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      <label
                        htmlFor="image-upload"
                        className="cursor-pointer hover:text-primary"
                      >
                        Click to upload
                      </label>
                      <input
                        id="image-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {selectedImage && (
              <div className="flex justify-center space-x-4">
                <Button>Transform Image</Button>
                <Button variant="outline">Cancel</Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
} 