import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2 } from "lucide-react";

interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: File | null;
  onConfirm: (blob: Blob) => void;
}

export function AvatarUploadModal({ isOpen, onClose, imageFile, onConfirm }: AvatarUploadModalProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState([1]);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerSize = 300;

  // Load image from file
  useEffect(() => {
    if (!imageFile) return;

    const img = new Image();
    img.src = URL.createObjectURL(imageFile);
    img.onload = () => {
      setImage(img);
      // Reset state
      setZoom([1]);
      setPan({ x: 0, y: 0 });
    };
    
    return () => {
      URL.revokeObjectURL(img.src);
    };
  }, [imageFile]);

  // Draw image to canvas
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, containerSize, containerSize);

    // Calculate scaling to fit image initially
    const scaleX = containerSize / image.width;
    const scaleY = containerSize / image.height;
    const baseScale = Math.max(scaleX, scaleY); // Cover
    
    const currentScale = baseScale * zoom[0];

    ctx.save();
    
    // Center of canvas
    ctx.translate(containerSize / 2, containerSize / 2);
    
    // Apply transformations
    ctx.translate(pan.x, pan.y);
    ctx.scale(currentScale, currentScale);
    
    // Draw image centered
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    
    ctx.restore();

  }, [image, zoom, pan]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleConfirm = async () => {
    if (!image) return;
    setProcessing(true);

    try {
      // Create output canvas
      const outputSize = 512;
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = outputSize;
      outputCanvas.height = outputSize;
      const ctx = outputCanvas.getContext('2d');

      if (!ctx) throw new Error("Could not get context");

      // Same logic as preview but scaled to output size
      const scaleRatio = outputSize / containerSize;
      
      const scaleX = containerSize / image.width;
      const scaleY = containerSize / image.height;
      const baseScale = Math.max(scaleX, scaleY);
      const currentScale = baseScale * zoom[0] * scaleRatio;

      ctx.save();
      ctx.translate(outputSize / 2, outputSize / 2);
      ctx.translate(pan.x * scaleRatio, pan.y * scaleRatio);
      ctx.scale(currentScale, currentScale);
      ctx.drawImage(image, -image.width / 2, -image.height / 2);
      ctx.restore();

      outputCanvas.toBlob((blob) => {
        if (blob) {
          onConfirm(blob);
        }
        setProcessing(false);
      }, 'image/jpeg', 0.9);

    } catch (error) {
      console.error("Error cropping image:", error);
      setProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !processing && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar Foto</DialogTitle>
          <DialogDescription>
            Arraste para posicionar e use o slider para ampliar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          <div className="relative overflow-hidden rounded-full border-2 border-primary shadow-lg cursor-move">
            <canvas
              ref={canvasRef}
              width={containerSize}
              height={containerSize}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="bg-muted"
            />
          </div>

          <div className="w-full max-w-[200px] flex items-center gap-2">
            <span className="text-xs text-muted-foreground">-</span>
            <Slider
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onValueChange={setZoom}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground">+</span>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="secondary" onClick={onClose} disabled={processing}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={processing}>
            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Foto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
