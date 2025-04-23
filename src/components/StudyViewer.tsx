
import React from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import type { Study } from "@/types/study";

interface Props {
  study: Study;
  activeFormat: string;
  setActiveFormat: (f: string) => void;
  onDownload: (format: string) => void;
}

export default function StudyViewer({
  study,
  activeFormat,
  setActiveFormat,
  onDownload,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Visualización</h3>
        <div className="flex gap-2">
          <Button variant={activeFormat === "jpg" ? "default" : "outline"} size="sm" onClick={() => setActiveFormat("jpg")}>Imágenes</Button>
          <Button variant={activeFormat === "pdf" ? "default" : "outline"} size="sm" onClick={() => setActiveFormat("pdf")}>Reporte PDF</Button>
        </div>
      </div>
      {activeFormat === "jpg" && (
        <div className="grid gap-4 md:grid-cols-2 mt-4">
          {study.files.jpg.map((img, index) => (
            <div key={index} className="bg-black rounded-md overflow-hidden">
              <img
                src={`https://via.placeholder.com/600x400?text=Imagen+${index + 1}`}
                alt={`Imagen ${index + 1}`}
                className="w-full h-auto"
              />
              <div className="p-2 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => onDownload("jpg")}>
                  <Download className="h-4 w-4 mr-1" /> JPG
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {activeFormat === "pdf" && (
        <div className="aspect-[3/4] bg-muted rounded-md overflow-hidden flex items-center justify-center mt-4">
          <div className="text-center">
            <FileText className="h-20 w-20 mx-auto text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Vista previa del PDF</p>
            <Button className="mt-4" onClick={() => onDownload("pdf")}>
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
