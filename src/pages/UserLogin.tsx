
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

export default function UserLogin() {
  const [userId, setUserId] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingrese un ID válido",
        variant: "destructive",
      });
      return;
    }
    
    // En una aplicación real, validaríamos el ID contra una base de datos
    // Por ahora, solo simulamos el acceso
    navigate(`/user-view/${userId}`);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[350px] shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-primary">NeoRadia</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="userId" className="text-sm font-medium">
                Ingrese su ID de paciente
              </label>
              <Input
                id="userId"
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Ejemplo: P12345"
              />
            </div>
            <Button type="submit" className="w-full">
              Acceder
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground">
          Acceda para ver sus estudios y resultados médicos
        </CardFooter>
      </Card>
    </div>
  );
}
