
import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import DicomViewer from "@/components/DicomViewer";
import { toast } from "@/hooks/use-toast";

interface Study {
  id: string;
  patientName: string;
  patientId: string;
  studyDate: string;
  modality: string;
  description: string;
  images: string[];
}

export default function Index() {
  const [currentStudy, setCurrentStudy] = useState<Study | null>(null);

  useEffect(() => {
    // Simulación de carga de estudios (puedes reemplazarlo con datos reales)
    const mockStudies = [
      {
        id: "1",
        patientName: "Juan Pérez",
        patientId: "P12345",
        studyDate: "2023-10-15",
        modality: "CT",
        description: "Tomografía de tórax",
        images: ["/sample-dicom-1.dcm", "/sample-dicom-2.dcm"],
      }
      // Si deseas agregar varios puedes hacerlo, pero SOLO se mostrará el primero (el estudio activo)
    ];

    setCurrentStudy(mockStudies[0]); // Solo mostrar el primer estudio
  }, []);

  const handleShareStudy = () => {
    const shareLink = `https://neoradia.com/share/${currentStudy?.id}?token=abc123`;

    navigator.clipboard
      .writeText(shareLink)
      .then(() => {
        toast({
          title: "Enlace copiado",
          description: "El enlace para compartir ha sido copiado al portapapeles",
        });
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "No se pudo copiar el enlace",
          variant: "destructive",
        });
      });
  };

  const handleExportImage = (format: string) => {
    toast({
      title: `Exportando como ${format.toUpperCase()}`,
      description: "El archivo se descargará en breve",
    });
    // Aquí iría la lógica de exportación (PNG, JPEG, PDF, etc.)
  };

  return (
    <main className="flex flex-col h-screen bg-background">
      {/* Header */}
      <Header currentStudy={currentStudy} onShare={handleShareStudy} onExport={handleExportImage} />

      <div className="flex-1 overflow-hidden flex">
        {/* Se elimina el sidebar, sólo vista central */}
        <div className="flex-1 overflow-hidden">
          {currentStudy ? (
            <DicomViewer study={currentStudy} />
          ) : (
            <div className="flex justify-center items-center h-full bg-accent/20">
              <p className="text-muted-foreground">
                {"Cargando estudio..."}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

