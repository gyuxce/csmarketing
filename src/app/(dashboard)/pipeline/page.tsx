"use client";

import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";

interface LeadCard {
  id: string;
  name: string;
  phone: string;
  company: string | null;
  source: string;
  createdAt: string;
}

interface Stage {
  id: string;
  name: string;
  order: number;
  color: string;
  leads: LeadCard[];
}

export default function PipelinePage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadCard | null>(null);
  const [newStageName, setNewStageName] = useState("");
  const [showAddStage, setShowAddStage] = useState(false);

  const fetchStages = async () => {
    const res = await fetch("/api/pipeline");
    setStages(await res.json());
  };

  useEffect(() => { fetchStages(); }, []);

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    // Optimistic update
    const newStages = [...stages];
    const sourceStage = newStages.find((s) => s.id === source.droppableId);
    const destStage = newStages.find((s) => s.id === destination.droppableId);
    if (!sourceStage || !destStage) return;

    const [moved] = sourceStage.leads.splice(source.index, 1);
    destStage.leads.splice(destination.index, 0, moved);
    setStages(newStages);

    // Persist
    fetch("/api/pipeline/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: moved.id, newStageId: destination.droppableId }),
    });
  };

  const addStage = async () => {
    if (!newStageName.trim()) return;
    await fetch("/api/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newStageName }),
    });
    setNewStageName("");
    setShowAddStage(false);
    fetchStages();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
        <Button onClick={() => setShowAddStage(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Stage
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "60vh" }}>
          {stages.map((stage) => (
            <Droppable key={stage.id} droppableId={stage.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30 transition-colors ${snapshot.isDraggingOver ? "border-primary bg-primary/5" : ""}`}
                >
                  <div className="flex items-center justify-between p-3" style={{ borderBottom: `3px solid ${stage.color}` }}>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
                      <span className="font-semibold text-sm">{stage.name}</span>
                      <Badge variant="secondary" className="text-xs">{stage.leads.length}</Badge>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2 p-2 overflow-y-auto">
                    {stage.leads.map((lead, index) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => setSelectedLead(lead)}
                            className={`cursor-pointer rounded-md border bg-card p-3 shadow-sm transition-shadow hover:shadow-md ${snapshot.isDragging ? "shadow-lg ring-2 ring-primary" : ""}`}
                          >
                            <p className="font-medium text-sm">{lead.name}</p>
                            <p className="text-xs text-muted-foreground">{lead.phone}</p>
                            {lead.company && <p className="text-xs text-muted-foreground mt-1">{lead.company}</p>}
                            <Badge variant="outline" className="mt-2 text-xs">
                              {lead.source.replace(/_/g, " ")}
                            </Badge>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      {/* Lead detail dialog */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{selectedLead?.name}</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Phone:</span> {selectedLead.phone}</p>
              {selectedLead.company && <p><span className="text-muted-foreground">Company:</span> {selectedLead.company}</p>}
              <p><span className="text-muted-foreground">Source:</span> {selectedLead.source.replace(/_/g, " ")}</p>
              <p><span className="text-muted-foreground">Added:</span> {new Date(selectedLead.createdAt).toLocaleDateString()}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add stage dialog */}
      <Dialog open={showAddStage} onOpenChange={setShowAddStage}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Stage</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Stage Name</Label>
              <Input value={newStageName} onChange={(e) => setNewStageName(e.target.value)} placeholder="e.g. Follow Up" />
            </div>
            <Button onClick={addStage} className="w-full">Add</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}