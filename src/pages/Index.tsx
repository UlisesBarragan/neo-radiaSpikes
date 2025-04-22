
import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
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
  const [studies, setStudies] = useState<Study[]>([]);

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
      },
      {
        id: "2",
        patientName: "María González",
        patientId: "P67890",
        studyDate: "2023-11-20",
        modality: "MRI",
        description: "Resonancia magnética cerebral",
        images: ["/sample-dicom-3.dcm"],
      },
      {
        id: "3",
        patientName: "Carlos Rodríguez",
        patientId: "P24680",
        studyDate: "2023-12-05",
        modality: "XR",
        description: "Radiografía de rodilla",
        images: ["/sample-dicom-4.dcm", "/sample-dicom-5.dcm", "/sample-dicom-6.dcm"],
      },
      {
        id: "4",
        patientName: "Laura Sánchez",
        patientId: "P13579",
        studyDate: "2024-01-10",
        modality: "US",
        description: "Ecografía abdominal",
        images: ["/sample-dicom-7.dcm", "/sample-dicom-8.dcm"],
      }
    ];

    setStudies(mockStudies);
    setCurrentStudy(mockStudies[0]); // Establecer el primer estudio como activo
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
      .catch((err) => {
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

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          studies={studies} 
          currentStudy={currentStudy} 
          setCurrentStudy={(study) => setCurrentStudy(study)} 
        />

        {/* DicomViewer */}
        <div className="flex-1 overflow-hidden">
          {currentStudy ? (
            <DicomViewer study={currentStudy} />
          ) : (
            <div className="flex justify-center items-center h-full bg-accent/20">
              <p className="text-muted-foreground">
                {studies.length === 0 ? "Cargando estudios..." : "Seleccione un estudio para visualizar"}
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
