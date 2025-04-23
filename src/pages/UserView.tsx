
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Share, Download, FileText, MessageSquare, MessageSquareReply, History, UserRound } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

// Cambia aquí: Añade el nombre del médico con su email
const mockSharedHistory = [
  {
    id: "1",
    sharedWith: [
      { name: "Dr. Martín Díaz", email: "m.diazm@hospital.com" },
      { name: "Dra. María Pérez", email: "m.perez@mediclinic.com" }
    ],
    date: "2024-04-14",
    description: "Tomografía de tórax compartida con médico",
  },
  {
    id: "2",
    sharedWith: [
      { name: "Dr. Álvaro Castro", email: "dr.castro@hospital.com" }
    ],
    date: "2023-10-10",
    description: "Estudio MRI compartido con médico",
  }
];

interface Study {
  id: string;
  patientName: string;
  patientId: string;
  studyDate: string;
  modality: string;
  description: string;
  doctorComments: {
    text: string;
    replies: { text: string; date: string; }[];
    date: string;
  }[];
  files: {
    pdf: string;
    jpg: string[];
  };
  sharedWith?: string[];
}

export default function UserView() {
  const { userId } = useParams();
  const [study, setStudy] = useState<Study | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFormat, setActiveFormat] = useState("jpg");
  const [replyText, setReplyText] = useState<string>("");
  const [commentReplyIndex, setCommentReplyIndex] = useState<number | null>(null);

  // Estado temporal para simular si ya fue compartido con el médico
  const [sharedWithDoctor, setSharedWithDoctor] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      const mockStudy: Study = {
        id: "1",
        patientName: "Juan Pérez",
        patientId: userId || "P12345",
        studyDate: "2023-10-15",
        modality: "CT",
        description: "Tomografía de tórax",
        doctorComments: [
          {
            text: "El paciente muestra mejoría respecto al estudio anterior.",
            replies: [
              { text: "Gracias doctor. Tomaré en cuenta la recomendación.", date: "2024-03-21" }
            ],
            date: "2024-03-20"
          },
          {
            text: "No hay hallazgos significativos que requieran atención inmediata.",
            replies: [],
            date: "2024-03-20"
          },
          {
            text: "Recomiendo seguimiento en 6 meses.",
            replies: [],
            date: "2024-03-20"
          }
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

  // Compartir general (solo PDF/JPG)
  const handleShare = () => {
    toast({
      title: "Solo puedes compartir imágenes o PDF al público general",
      description: "Selecciona si deseas compartir JPG o PDF",
    });
    // Aquí podrías abrir un modal o desplegar una opción para compartir JPG/PDF,
    // por simplicidad solo mostramos un toast.
  };

  // Compartir con médico
  const handleShareWithDoctor = () => {
    setSharedWithDoctor(true);
    toast({
      title: "Estudio compartido con el médico",
      description: "El médico ahora tiene acceso a tu estudio completo.",
    });
    // Aquí iría la lógica real para compartir el estudio con el médico autorizado
  };

  const handleDownload = (format: string) => {
    toast({
      title: `Descargando en formato ${format.toUpperCase()}`,
      description: "El archivo se descargará en breve",
    });
    // Lógica real de descarga
  };

  const handleReply = (index: number) => {
    if (!replyText.trim()) {
      toast({
        title: "Mensaje vacío",
        description: "No puedes enviar una respuesta vacía.",
        variant: "destructive"
      });
      return;
    }
    setStudy((prev) => {
      if (!prev) return prev;
      const updatedComments = [...prev.doctorComments];
      updatedComments[index].replies.push({
        text: replyText,
        date: new Date().toISOString().split("T")[0]
      });
      return { ...prev, doctorComments: updatedComments };
    });
    setReplyText("");
    setCommentReplyIndex(null);
    toast({
      title: "Respuesta enviada",
      description: "Tu respuesta ha sido enviada al médico",
    });
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
            {/* Botón solo para compartir con el médico */}
            <Button
              variant={sharedWithDoctor ? "secondary" : "default"}
              size="sm"
              onClick={handleShareWithDoctor}
              disabled={sharedWithDoctor}
            >
              <UserRound className="mr-2 h-4 w-4" />
              {sharedWithDoctor ? "Compartido con médico" : "Compartir con médico"}
            </Button>
            {/* Compartir público general, solo PDF/JPG */}
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share className="mr-2 h-4 w-4" />
              Compartir público (PDF/JPG)
            </Button>
            <Button variant="default" size="sm" onClick={() => handleDownload("pdf")}>
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </Button>
          </div>
        </div>
      </header>

      <div className="container max-w-6xl mx-auto p-4 space-y-6">

        {/* Historial de archivos compartidos solo para el paciente */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center mb-3 gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-md font-semibold">Historial de archivos compartidos</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="px-2 py-1 text-left">Fecha</th>
                    <th className="px-2 py-1 text-left">Descripción</th>
                    <th className="px-2 py-1 text-left">Compartido con</th>
                  </tr>
                </thead>
                <tbody>
                  {mockSharedHistory.map((h) => (
                    <tr key={h.id} className="border-b last:border-0">
                      <td className="px-2 py-1">{new Date(h.date).toLocaleDateString("es-ES")}</td>
                      <td className="px-2 py-1">{h.description}</td>
                      <td className="px-2 py-1">
                        {h.sharedWith.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 mb-1">
                            <UserRound className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{item.name}</span>
                            <span className="text-xs text-muted-foreground ml-1">({item.email})</span>
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

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
                <h3 className="text-md font-semibold mb-2 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comentarios del médico y respuestas
                </h3>
                <ul className="space-y-4 bg-muted p-3 rounded-md">
                  {study.doctorComments.map((comment, index) => (
                    <li key={index}>
                      <div className="flex items-start gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                        <div className="flex-1">
                          <div className="text-sm mb-2">
                            <span>{comment.text}</span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({new Date(comment.date).toLocaleDateString("es-ES")})
                            </span>
                          </div>
                          <div className="ml-2">
                            {comment.replies.map((reply, rIdx) => (
                              <div key={rIdx} className="flex gap-2 mb-1 items-center">
                                <MessageSquareReply className="h-4 w-4 text-primary" />
                                <span className="text-xs">{reply.text}</span>
                                <span className="ml-1 text-xs text-muted-foreground">
                                  ({new Date(reply.date).toLocaleDateString("es-ES")})
                                </span>
                              </div>
                            ))}
                          </div>
                          {commentReplyIndex === index ? (
                            <div className="mt-2 space-y-2">
                              <Textarea
                                name={`reply-${index}`}
                                placeholder="Escribe tu respuesta..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={2}
                              />
                              <div className="flex gap-2">
                                <Button variant="default" size="sm" onClick={() => handleReply(index)}>
                                  Responder
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setCommentReplyIndex(null)}>
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => {
                                setCommentReplyIndex(index);
                                setReplyText("");
                              }}
                            >
                              <MessageSquareReply className="mr-1 h-4 w-4" />
                              Responder
                            </Button>
                          )}
                        </div>
                      </div>
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
