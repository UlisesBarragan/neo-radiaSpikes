
import React, { useState } from "react";
import { 
  Share,
  Download,
  ZoomIn,
  Move,
  Edit,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

interface HeaderProps {
  currentStudy: {
    patientName: string;
    patientId: string;
    modality: string;
    description: string;
  } | null;
  onShare: () => void;
  onExport: (format: string) => void;
}

export default function Header({ currentStudy, onShare, onExport }: HeaderProps) {
  const [activeToolId, setActiveToolId] = useState("move");

  const tools = [
    { id: "move", icon: Move, label: "Mover" },
    { id: "zoom", icon: ZoomIn, label: "Zoom" },
    { id: "draw", icon: Edit, label: "Dibujar" },
  ];

  const handleReset = () => {
    // Implementa aquí la lógica para restablecer las herramientas
    console.log("Restablecer valores");
  };

  if (!currentStudy) return null;

  return (
    <header className="bg-card border-b border-border shadow-sm px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-primary">NeoRadia</h1>

          <div className="hidden md:block">
            <div className="text-sm">
              <span className="font-medium">{currentStudy.patientName}</span>
              <span className="mx-2 text-muted-foreground">|</span>
              <span className="text-muted-foreground">{currentStudy.patientId}</span>
              <span className="mx-2 text-muted-foreground">|</span>
              <span className="text-muted-foreground">
                {currentStudy.modality}: {currentStudy.description}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-secondary rounded-md p-0.5 flex items-center">
            {tools.map((tool) => (
              <Button
                key={tool.id}
                variant={activeToolId === tool.id ? "secondary" : "ghost"}
                size="sm"
                className={`px-2 py-1 ${activeToolId === tool.id ? "bg-background shadow-sm" : ""}`}
                onClick={() => setActiveToolId(tool.id)}
              >
                <tool.icon className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">{tool.label}</span>
              </Button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Restablecer</span>
          </Button>

          <DropdownMenu>
            <Button variant="outline" size="sm" asChild>
              <DropdownMenuTrigger className="flex items-center gap-1">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </DropdownMenuTrigger>
            </Button>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExport("png")}>PNG</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("jpg")}>JPEG</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("pdf")}>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="default" size="sm" onClick={onShare}>
            <Share className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Compartir</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
