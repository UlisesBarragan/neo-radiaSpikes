
import React, { useState, useRef, useEffect } from "react";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";

interface Study {
  id: string;
  patientName: string;
  patientId: string;
  modality: string;
  description: string;
  studyDate: string;
  images: string[];
}

interface DicomViewerProps {
  study: Study;
}

export default function DicomViewer({ study }: DicomViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [windowLevel, setWindowLevel] = useState(50);
  const [windowWidth, setWindowWidth] = useState(50);
  const [activeTab, setActiveTab] = useState("window");

  // Simulación de carga de imagen DICOM
  useEffect(() => {
    if (!study) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Simulamos la carga de una imagen DICOM con una imagen de placeholder
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `https://via.placeholder.com/512x512.png?text=DICOM+${currentImageIndex + 1}`;

    img.onload = () => {
      // Limpiar el canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Aplicar zoom y rotación
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom / 100, zoom / 100);
      ctx.translate(-centerX, -centerY);

      // Dibujar la imagen centrada
      const x = (canvas.width - img.width) / 2;
      const y = (canvas.height - img.height) / 2;
      ctx.drawImage(img, x, y);

      // Restaurar el contexto
      ctx.restore();

      // Aplicar simulación de window level/width
      applyWindowLevelEffect(canvas, windowLevel, windowWidth);
    };

    // Limpiar el canvas de anotaciones
    const annotationCanvas = annotationCanvasRef.current;
    if (annotationCanvas) {
      const annotationCtx = annotationCanvas.getContext("2d");
      if (annotationCtx) {
        annotationCtx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
      }
    }
  }, [study, currentImageIndex, zoom, rotation, windowLevel, windowWidth]);

  // Función para simular el efecto de window level/width
  const applyWindowLevelEffect = (canvas: HTMLCanvasElement, level: number, width: number) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Convertir width a contraste (0-200%)
    const contrast = 1 + (width / 50 - 1);

    // Convertir level a brillo (-100 a 100)
    const brightness = (level - 50) * 2;

    for (let i = 0; i < data.length; i += 4) {
      // Aplicar contraste
      for (let j = 0; j < 3; j++) {
        data[i + j] = (data[i + j] - 128) * contrast + 128;
      }

      // Aplicar brillo
      for (let j = 0; j < 3; j++) {
        data[i + j] += brightness;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  // Manejo de eventos de dibujo
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    setIsDrawing(true);
    setLastPosition({ x, y });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    ctx.beginPath();
    ctx.strokeStyle = "#FF0000";
    ctx.lineWidth = 2;
    ctx.moveTo(lastPosition.x, lastPosition.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    setLastPosition({ x, y });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 10, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 10, 50));
  };

  const handleRotateClockwise = () => {
    setRotation((prev) => prev + 90);
  };

  const handleRotateCounterClockwise = () => {
    setRotation((prev) => prev - 90);
  };

  const handleNextImage = () => {
    if (study && currentImageIndex < study.images.length - 1) {
      setCurrentImageIndex((prev) => prev + 1);
    }
  };

  const handlePrevImage = () => {
    if (study && currentImageIndex > 0) {
      setCurrentImageIndex((prev) => prev - 1);
    }
  };

  const handleResetView = () => {
    setZoom(100);
    setRotation(0);
    setWindowLevel(50);
    setWindowWidth(50);
  };

  const handleClearAnnotations = () => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  if (!study) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow relative overflow-hidden bg-black">
        {/* Canvas principal para la imagen DICOM */}
        <canvas
          ref={canvasRef}
          width={800}
          height={800}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        />

        {/* Canvas superpuesto para anotaciones */}
        <canvas
          ref={annotationCanvasRef}
          width={800}
          height={800}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          style={{ cursor: "crosshair" }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />

        {/* Controles de navegación */}
        <div 
          className="absolute left-1/2 bottom-0 transform -translate-x-1/2 flex items-center gap-2 glass-panel rounded-full px-4 py-1 mb-4"
        >
          <Button 
            variant="ghost" 
            size="icon"
            className="p-1 hover:bg-white/20" 
            onClick={handlePrevImage} 
            disabled={currentImageIndex === 0}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <span className="text-sm font-medium text-white px-2">
            {currentImageIndex + 1} / {study.images.length}
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="p-1 hover:bg-white/20"
            onClick={handleNextImage}
            disabled={currentImageIndex === study.images.length - 1}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Controles de zoom y rotación */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <Button variant="secondary" size="icon" className="glass-panel" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon" className="glass-panel" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon" className="glass-panel" onClick={handleRotateClockwise}>
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="icon" className="glass-panel" onClick={handleRotateCounterClockwise}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Panel de ajustes */}
      <div className="border-t border-border bg-card p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="window">Ventana</TabsTrigger>
            <TabsTrigger value="annotations">Anotaciones</TabsTrigger>
            <TabsTrigger value="info">Información</TabsTrigger>
          </TabsList>
          
          <TabsContent value="window" className="space-y-4 pt-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Nivel de ventana</span>
                <span className="text-sm font-medium">{windowLevel}%</span>
              </div>
              <Slider
                value={[windowLevel]}
                min={0}
                max={100}
                step={1}
                onValueChange={(values) => setWindowLevel(values[0])}
                className="py-1"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Ancho de ventana</span>
                <span className="text-sm font-medium">{windowWidth}%</span>
              </div>
              <Slider
                value={[windowWidth]}
                min={0}
                max={100}
                step={1}
                onValueChange={(values) => setWindowWidth(values[0])}
                className="py-1"
              />
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={handleResetView}>
                Restablecer valores
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="annotations" className="space-y-4 pt-3">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={handleClearAnnotations}>
                Limpiar anotaciones
              </Button>
              <Button variant="outline" size="sm">
                Guardar anotaciones
              </Button>
            </div>

            <div className="text-sm text-muted-foreground mt-3">
              <p>Haga clic y arrastre para dibujar sobre la imagen.</p>
              <p>Las anotaciones se guardarán con el estudio.</p>
            </div>
          </TabsContent>

          <TabsContent value="info" className="pt-3">
            <dl className="grid grid-cols-4 gap-y-2 text-sm">
              <dt className="col-span-1 font-medium">Paciente:</dt>
              <dd className="col-span-3">{study.patientName}</dd>
              
              <dt className="col-span-1 font-medium">ID:</dt>
              <dd className="col-span-3">{study.patientId}</dd>
              
              <dt className="col-span-1 font-medium">Modalidad:</dt>
              <dd className="col-span-3">{study.modality}</dd>
              
              <dt className="col-span-1 font-medium">Descripción:</dt>
              <dd className="col-span-3">{study.description}</dd>
              
              <dt className="col-span-1 font-medium">Fecha:</dt>
              <dd className="col-span-3">{study.studyDate}</dd>
            </dl>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
