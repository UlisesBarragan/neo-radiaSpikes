import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, MessageSquareReply } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { Study } from "@/types/study";
import { toast } from "@/hooks/use-toast";

interface Props {
  comments: Study["doctorComments"];
  onReply: (index: number, replyText: string) => void;
}

export default function DoctorComments({ comments, onReply }: Props) {
  const [replyText, setReplyText] = useState("");
  const [replyingIndex, setReplyingIndex] = useState<number | null>(null);

  return (
    <div>
      <h3 className="text-md font-semibold mb-2 flex items-center gap-2">
        <MessageSquare className="h-5 w-5" />
        Comentarios del médico y respuestas
      </h3>
      <ul className="space-y-4 bg-muted p-3 rounded-md shadow">
        {comments.map((comment, index) => (
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
                {replyingIndex === index ? (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      name={`reply-${index}`}
                      placeholder="Escribe tu respuesta..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          if (!replyText.trim()) {
                            toast({
                              title: "Mensaje vacío",
                              description: "No puedes enviar una respuesta vacía.",
                              variant: "destructive"
                            });
                            return;
                          }
                          onReply(index, replyText);
                          setReplyText("");
                          setReplyingIndex(null);
                        }}
                      >
                        Responder
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setReplyingIndex(null)}>
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
                      setReplyingIndex(index);
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
  );
}
