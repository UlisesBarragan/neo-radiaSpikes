import React from "react";
import { User, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { SharedHistory } from "@/types/study";

export default function SharedHistorySection({ history }: { history: SharedHistory[] }) {
  return (
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
              {history.map((h) => (
                <tr key={h.id} className="border-b last:border-0">
                  <td className="px-2 py-1">{new Date(h.date).toLocaleDateString("es-ES")}</td>
                  <td className="px-2 py-1">{h.description}</td>
                  <td className="px-2 py-1">
                    {h.sharedWith.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-muted-foreground" />
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
  );
}
