"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

const statusColors: Record<string, string> = {
  NEW: "default", CONTACTED: "secondary", INTERESTED: "outline",
  NEGOTIATION: "outline", WON: "default", LOST: "destructive",
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    fetch(`/api/leads/${params.id}`)
      .then((r) => r.json())
      .then(setLead);
  }, [params.id]);

  const handleEdit = () => {
    setForm({
      name: lead.name, phone: lead.phone, email: lead.email || "",
      company: lead.company || "", city: lead.city || "",
      address: lead.address || "", status: lead.status, notes: lead.notes || "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    const res = await fetch(`/api/leads/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const updated = await res.json();
      setLead(updated);
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Hapus lead ini?")) return;
    await fetch(`/api/leads/${params.id}`, { method: "DELETE" });
    router.push("/crm");
  };

  if (!lead) return <p className="p-6 text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/crm")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{lead.name}</h1>
          <Badge variant={statusColors[lead.status] as any || "default"}>
            {lead.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleEdit}>
            <Pencil className="mr-1 h-4 w-4" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      {editing ? (
        <Card>
          <CardHeader><CardTitle>Edit Lead</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: string | null) => setForm({ ...form, status: v || "NEW" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="CONTACTED">Contacted</SelectItem>
                  <SelectItem value="INTERESTED">Interested</SelectItem>
                  <SelectItem value="NEGOTIATION">Negotiation</SelectItem>
                  <SelectItem value="WON">Won</SelectItem>
                  <SelectItem value="LOST">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="grid grid-cols-2 gap-4 py-6">
            <div><p className="text-sm text-muted-foreground">Phone</p><p className="font-medium">{lead.phone}</p></div>
            <div><p className="text-sm text-muted-foreground">Email</p><p className="font-medium">{lead.email || "-"}</p></div>
            <div><p className="text-sm text-muted-foreground">Company</p><p className="font-medium">{lead.company || "-"}</p></div>
            <div><p className="text-sm text-muted-foreground">City</p><p className="font-medium">{lead.city || "-"}</p></div>
            <div><p className="text-sm text-muted-foreground">Source</p><p className="font-medium">{lead.source?.replace(/_/g, " ")}</p></div>
            <div><p className="text-sm text-muted-foreground">Created</p><p className="font-medium">{new Date(lead.createdAt).toLocaleDateString()}</p></div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="activity">
        <TabsList>
          <TabsTrigger value="activity">Activity ({lead.activities?.length || 0})</TabsTrigger>
          <TabsTrigger value="messages">Messages ({lead.messages?.length || 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="activity" className="mt-4">
          {lead.activities?.length > 0 ? (
            <div className="space-y-3">
              {lead.activities.map((a: any) => (
                <div key={a.id} className="flex gap-3 border-b pb-2">
                  <Badge variant="outline" className="text-xs">{a.type}</Badge>
                  <p className="text-sm">{a.description}</p>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No activities yet.</p>
          )}
        </TabsContent>
        <TabsContent value="messages" className="mt-4">
          {lead.messages?.length > 0 ? (
            <div className="space-y-3">
              {lead.messages.map((m: any) => (
                <div key={m.id} className={`flex gap-3 border-b pb-2 ${m.direction === "INBOUND" ? "bg-muted/20" : ""}`}>
                  <Badge variant={m.direction === "OUTBOUND" ? "default" : "secondary"} className="text-xs">
                    {m.direction}
                  </Badge>
                  <p className="text-sm">{m.content}</p>
                  <Badge variant="outline" className="text-xs ml-auto">{m.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No messages yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}