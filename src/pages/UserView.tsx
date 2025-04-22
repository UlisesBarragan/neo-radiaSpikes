
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Share, Download, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Study {
  id: string;
  patientName: string;
  patientId: string;
  studyDate: string;
  modality: string;
  description: string;
  doctorComments: string[];
  files: {
    pdf: string;
    jpg: string[];
  };
}

export default function UserView() {
  const { userId } = useParams();
  const [study, setStudy] = useState<Study | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFormat, setActiveFormat] = useState("jpg");

  useEffect(() => {
    // Simulación de carga de datos del estudio
    setIsLoading(true);
    setTimeout(() => {
      // En una aplicación real, esto vendría de una API
      const mockStudy: Study = {
        id: "1",
        patientName: "Juan Pérez",
        patientId: userId || "P12345",
        studyDate: "2023-10-15",
        modality: "CT",
        description: "Tomografía de tórax",
        doctorComments: [
          "El paciente muestra mejoría respecto al estudio anterior.",
          "No hay hallazgos significativos que requieran atención inmediata.",
          "Recomiendo seguimiento en 6 meses."
        ],
        files: {
          pdf: "/sample-report.pdf",
          jpg: ["/sample-image-1.jpg", "/sample-image-2.jpg"]
        }
      };
      
      setStudy(mockStudy);
      setIsLoading(false);
    }, 1000);
  }, [userId]);

  const handleShare = () => {
    const shareLink = `https://neoradia.com/share/${study?.id}?patient=${userId}`;
    
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

  const handleDownload = (format: string) => {
    toast({
      title: `Descargando en formato ${format.toUpperCase()}`,
      description: "El archivo se descargará en breve",
    });
    
    // En una aplicación real, aquí iría la lógica para descargar el archivo
    // Por ahora solo mostramos el toast
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">Cargando su estudio...</p>
      </div>
    );
  }

  if (!study) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">No se encontró ningún estudio para este ID.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">NeoRadia</h1>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share className="mr-2 h-4 w-4" />
              Compartir
            </Button>
            <Button variant="default" size="sm" onClick={() => handleDownload("pdf")}>
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </Button>
          </div>
        </div>
      </header>

      <div className="container max-w-6xl mx-auto p-4 space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <h2 className="text-xl font-semibold mb-4">{study.description}</h2>
                <div className="space-y-2">
                  <p><span className="font-medium">Paciente:</span> {study.patientName}</p>
                  <p><span className="font-medium">ID:</span> {study.patientId}</p>
                  <p><span className="font-medium">Fecha:</span> {new Date(study.studyDate).toLocaleDateString("es-ES")}</p>
                  <p><span className="font-medium">Modalidad:</span> {study.modality}</p>
                </div>
              </div>
              <div>
                <h3 className="text-md font-semibold mb-2">Comentarios del médico:</h3>
                <ul className="space-y-2 bg-muted p-3 rounded-md">
                  {study.doctorComments.map((comment, index) => (
                    <li key={index} className="flex gap-2">
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <span>{comment}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Tabs value={activeFormat} onValueChange={setActiveFormat}>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Visualización</h3>
              <TabsList>
                <TabsTrigger value="jpg">Imágenes</TabsTrigger>
                <TabsTrigger value="pdf">Reporte PDF</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="jpg" className="mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                {study.files.jpg.map((img, index) => (
                  <div key={index} className="bg-black rounded-md overflow-hidden">
                    <img 
                      src={`https://via.placeholder.com/600x400?text=Imagen+${index+1}`} 
                      alt={`Imagen ${index+1}`} 
                      className="w-full h-auto"
                    />
                    <div className="p-2 flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleDownload("jpg")}>
                        <Download className="h-4 w-4 mr-1" />
                        JPG
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="pdf" className="mt-4">
              <div className="aspect-[3/4] bg-muted rounded-md overflow-hidden flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-20 w-20 mx-auto text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">Vista previa del PDF</p>
                  <Button className="mt-4" onClick={() => handleDownload("pdf")}>
                    <Download className="mr-2 h-4 w-4" /> 
                    Descargar PDF
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
