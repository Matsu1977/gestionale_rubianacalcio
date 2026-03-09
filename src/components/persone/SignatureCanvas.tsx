import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eraser } from "lucide-react";

interface Props {
  onSignatureChange: (dataUrl: string | null) => void;
}

export default function SignatureCanvas({ onSignatureChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [textSignature, setTextSignature] = useState("");
  const [mode, setMode] = useState<"draw" | "text">("draw");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "hsl(var(--foreground))";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setHasDrawn(true);
      const dataUrl = canvasRef.current?.toDataURL("image/png") || null;
      onSignatureChange(dataUrl);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSignatureChange(null);
  };

  // Generate text-based signature
  useEffect(() => {
    if (mode === "text" && textSignature.trim()) {
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 150;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 600, 150);
      ctx.fillStyle = "black";
      ctx.font = "italic 48px 'Georgia', serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(textSignature, 300, 75);
      onSignatureChange(canvas.toDataURL("image/png"));
    } else if (mode === "text") {
      onSignatureChange(null);
    }
  }, [textSignature, mode, onSignatureChange]);

  return (
    <div className="space-y-3">
      <Tabs value={mode} onValueChange={(v) => setMode(v as "draw" | "text")}>
        <TabsList className="w-full">
          <TabsTrigger value="draw" className="flex-1">Firma a mano</TabsTrigger>
          <TabsTrigger value="text" className="flex-1">Firma testuale</TabsTrigger>
        </TabsList>

        <TabsContent value="draw" className="mt-3">
          <div className="relative border rounded-lg bg-background">
            <canvas
              ref={canvasRef}
              className="w-full h-[150px] cursor-crosshair touch-none"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-sm text-muted-foreground">Firma qui con il dito o il mouse</p>
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" className="mt-2" onClick={clearCanvas}>
            <Eraser className="h-3 w-3 mr-1" /> Cancella
          </Button>
        </TabsContent>

        <TabsContent value="text" className="mt-3">
          <Input
            placeholder="Digita il tuo nome completo..."
            value={textSignature}
            onChange={(e) => setTextSignature(e.target.value)}
          />
          {textSignature && (
            <div className="mt-3 border rounded-lg p-4 bg-background text-center">
              <p className="text-3xl italic font-serif text-foreground">{textSignature}</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
