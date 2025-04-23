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
    const ctx = canvas?.getContext("2d");
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

  const stopDrawing = () => setIsDrawing(false);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.5));
  const handleRotateClockwise = () => setRotation((prev) => prev + 90);
  const handleRotateCounterClockwise = () => setRotation((prev) => prev - 90);
  const handleNextImage = () => setCurrentImageIndex((prev) => Math.min(prev + 1, study.images.length - 1));
  const handlePrevImage = () => setCurrentImageIndex((prev) => Math.max(prev - 1, 0));

  const handleResetView = () => {
    setZoom(1);
    setRotation(0);
    setWindowLevel(50);
    setWindowWidth(50);
  };

  const handleClearAnnotations = () => {
    const canvas = annotationCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const exportCanvas = () => {
    const baseCanvas = cornerstoneElementRef.current?.querySelector("canvas");
    const annotationCanvas = annotationCanvasRef.current;
    if (!baseCanvas || !annotationCanvas) return null;
    const merged = document.createElement("canvas");
    merged.width = baseCanvas.width;
    merged.height = baseCanvas.height;
    const ctx = merged.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(baseCanvas, 0, 0);
    ctx.drawImage(annotationCanvas, 0, 0);
    return merged;
  };

  const exportAs = (format: "jpg" | "png" | "pdf") => {
    const merged = exportCanvas();
    if (!merged) return alert("No se pudo generar la imagen.");
    const dataUrl = merged.toDataURL(format === "pdf" ? "image/jpeg" : `image/${format}`);
    if (format === "pdf") {
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [merged.width, merged.height] });
      pdf.addImage(dataUrl, "JPEG", 0, 0, merged.width, merged.height);
      pdf.save("imagen_dicom.pdf");
    } else {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `imagen_dicom.${format}`;
      link.click();
    }
  };

  useEffect(() => {
    const jpgHandler = () => exportAs("jpg");
    const pngHandler = () => exportAs("png");
    const pdfHandler = () => exportAs("pdf");
    document.addEventListener("export-jpg", jpgHandler);
    document.addEventListener("export-png", pngHandler);
    document.addEventListener("export-pdf", pdfHandler);
    return () => {
      document.removeEventListener("export-jpg", jpgHandler);
      document.removeEventListener("export-png", pngHandler);
      document.removeEventListener("export-pdf", pdfHandler);
    };
  }, []);

  if (!study) return null;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="px-6 py-4 bg-white border-b shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-blue-700">NeoRadia</h1>
          <p className="text-sm text-gray-500">
            {study.patientName} | {study.patientId} | {study.modality}: {study.description}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleClearAnnotations}>🧹 Limpiar</Button>
          <Button variant="outline" size="sm" onClick={() => document.dispatchEvent(new CustomEvent("export-jpg"))}>🖼 JPG</Button>
          <Button variant="outline" size="sm" onClick={() => document.dispatchEvent(new CustomEvent("export-png"))}>📷 PNG</Button>
          <Button variant="default" size="sm" onClick={() => document.dispatchEvent(new CustomEvent("export-pdf"))}>📄 PDF</Button>
        </div>
      </div>

      <div className="flex-1 flex justify-center items-center p-4">
        <div className="relative rounded-lg shadow-lg bg-black" style={{ width: 700, height: 700 }}>
          <div ref={cornerstoneElementRef} className="w-full h-full rounded-lg" />
          <canvas
            ref={annotationCanvasRef}
            width={700}
            height={700}
            className="absolute top-0 left-0 z-10"
            style={{ cursor: "crosshair" }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>
      </div>

      <section className="bg-white border-t p-6 rounded-t-xl shadow-md">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="window">Ventana</TabsTrigger>
            <TabsTrigger value="annotations">Anotaciones</TabsTrigger>
            <TabsTrigger value="info">Información</TabsTrigger>
          </TabsList>

          <TabsContent value="window" className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="flex justify-between text-sm">
                <span>Nivel de ventana</span>
                <span className="font-medium">{windowLevel}%</span>
              </label>
              <Slider value={[windowLevel]} min={0} max={100} step={1} onValueChange={(v) => setWindowLevel(v[0])} />
            </div>
            <div className="space-y-2">
              <label className="flex justify-between text-sm">
                <span>Ancho de ventana</span>
                <span className="font-medium">{windowWidth}%</span>
              </label>
              <Slider value={[windowWidth]} min={0} max={100} step={1} onValueChange={(v) => setWindowWidth(v[0])} />
            </div>
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleResetView}>🔄 Restablecer</Button>
            </div>
          </TabsContent>

          <TabsContent value="annotations" className="pt-4">
            <p className="text-sm text-gray-500 mb-2">Haz clic y arrastra para dibujar sobre la imagen. Las anotaciones serán guardadas con el estudio.</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClearAnnotations}>🧹 Limpiar</Button>
              <Button variant="outline" size="sm">💾 Guardar</Button>
            </div>
          </TabsContent>

          <TabsContent value="info" className="pt-4">
            <dl className="grid grid-cols-4 gap-y-2 text-sm">
              <dt className="font-medium">Paciente:</dt>
              <dd className="col-span-3">{study.patientName}</dd>
              <dt className="font-medium">ID:</dt>
              <dd className="col-span-3">{study.patientId}</dd>
              <dt className="font-medium">Modalidad:</dt>
              <dd className="col-span-3">{study.modality}</dd>
              <dt className="font-medium">Descripción:</dt>
              <dd className="col-span-3">{study.description}</dd>
              <dt className="font-medium">Fecha:</dt>
              <dd className="col-span-3">{study.studyDate}</dd>
            </dl>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}