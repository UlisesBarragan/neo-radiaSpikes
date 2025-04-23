"use client";

import React, { useState, useRef, useEffect } from "react";
import cornerstone from "cornerstone-core";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import dicomParser from "dicom-parser";
import jsPDF from "jspdf";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";

cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
cornerstoneWADOImageLoader.configure({ useWebWorkers: true });

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
  const cornerstoneElementRef = useRef<HTMLDivElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [windowLevel, setWindowLevel] = useState(50);
  const [windowWidth, setWindowWidth] = useState(50);
  const [activeTab, setActiveTab] = useState("window");

  // Cargar imagen DICOM con Cornerstone
  useEffect(() => {
    if (!study || !cornerstoneElementRef.current) return;

    const element = cornerstoneElementRef.current;
    cornerstone.enable(element);

    const imageId = `wadouri:${study.images[currentImageIndex]}`;
    cornerstone
      .loadImage(imageId)
      .then((image) => {
        const viewport = cornerstone.getDefaultViewportForImage(element, image);
        viewport.scale = zoom;
        viewport.rotation = rotation;
        viewport.voi = {
          windowWidth: windowWidth * 2,
          windowCenter: windowLevel * 2 - 100,
        };

        cornerstone.displayImage(element, image, viewport);
      })
      .catch(console.error);

    return () => {
      cornerstone.disable(element);
    };
  }, [study, currentImageIndex, zoom, rotation, windowLevel, windowWidth]);

  // Dibujo sobre canvas
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

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.5));
  const handleRotateClockwise = () => setRotation((prev) => prev + 90);
  const handleRotateCounterClockwise = () => setRotation((prev) => prev - 90);
  const handleNextImage = () => {
    if (study && currentImageIndex < study.images.length - 1)
      setCurrentImageIndex((prev) => prev + 1);
  };
  const handlePrevImage = () => {
    if (study && currentImageIndex > 0)
      setCurrentImageIndex((prev) => prev - 1);
  };

  const handleResetView = () => {
    setZoom(1);
    setRotation(0);
    setWindowLevel(50);
    setWindowWidth(50);
  };

  const handleClearAnnotations = () => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };
  
  const exportAsJPG = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      alert("No se encontró la imagen para exportar.");
      return;
    }
  
    const image = canvas.toDataURL("image/jpeg", 1.0); // calidad al 100%
  
    const link = document.createElement("a");
    link.href = image;
    link.download = "imagen_dicom.jpg";
    link.click();
  };

  if (!study) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow relative overflow-hidden bg-black">
        <div
          ref={cornerstoneElementRef}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          style={{ width: 800, height: 800, backgroundColor: "black" }}
        />

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

        <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 flex items-center gap-2 glass-panel rounded-full px-4 py-1 mb-4">
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