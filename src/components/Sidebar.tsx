import React, { useState, useMemo } from "react";
import { Search, Calendar, User, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Study {
  id: string;
  patientName: string;
  patientId: string;
  description: string;
  modality: string;
  studyDate: string;
  images: string[];
}

interface SidebarProps {
  studies: Study[];
  currentStudy: Study | null;
  setCurrentStudy: (study: Study) => void;
}

export default function Sidebar({ studies, currentStudy, setCurrentStudy }: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredStudies = useMemo(() => {
    return studies.filter(
      (study) =>
        study.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        study.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        study.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, studies]);

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString("es-ES", options);
  };

  return (
    <div className="border-r border-border bg-card h-full w-64 flex flex-col">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar estudios..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-grow">
        {filteredStudies.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">No se encontraron estudios</div>
        ) : (
          <div className="py-1">
            {filteredStudies.map((study) => (
              <div
                key={study.id}
                onClick={() => setCurrentStudy(study)}
                className={`p-3 cursor-pointer transition-colors hover:bg-accent ${
                  currentStudy?.id === study.id ? "bg-accent/70 border-l-2 border-primary" : ""
                }`}
              >
                <div className="flex items-center mb-1">
                  <User size={16} className="mr-2 text-muted-foreground" />
                  <span className="font-medium">{study.patientName}</span>
                </div>
                <div className="flex items-center text-sm mb-1">
                  <FileText size={16} className="mr-2 text-muted-foreground" />
                  <span>
                    {study.modality}: {study.description}
                  </span>
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Calendar size={12} className="mr-2" />
                  <span>{formatDate(study.studyDate)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
