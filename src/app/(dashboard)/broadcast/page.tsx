"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, Radio } from "lucide-react";

export default function BroadcastPage() {
  const [name, setName] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("NEW");
  const [availableLeads, setAvailableLeads] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const fetchLeads = async () => {
    const params = new URLSearchParams();
    if (sourceFilter) params.set("source", sourceFilter);
    if (statusFilter) params.set("status", statusFilter);
    params.set("limit", "50");
    const res = await fetch(`/api/leads?${params}`);
    const data = await res.json();
    setAvailableLeads(data.leads || []);
  };

  const fetchHistory = async () => {
    const res = await fetch("/api/broadcast");
    setHistory(await res.json());
  };

  useEffect(() => { fetchHistory(); }, []);

  const toggleLead = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === availableLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(availableLeads.map((l) => l.id)));
    }
  };

  const sendBroadcast = async () => {
    if (!name || !messageBody || selectedIds.size === 0) return;
    setSending(true);
    const res = await fetch("/api/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        messageBody,
        audienceLeadIds: Array.from(selectedIds),
      }),
    });
    setResult(await res.json());
    setSending(false);
    fetchHistory();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Broadcast</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" /> New Broadcast
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Campaign Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Follow Up Januari" />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Halo {{name}}, ada penawaran menarik..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3 items-end">
            <div className="space-y-2">
              <Label className="text-xs">Filter Source</Label>
              <select className="flex h-9 rounded-md border px-3 text-sm" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                <option value="">All</option>
                <option value="GOOGLE_MAPS">Google Maps</option>
                <option value="MANUAL">Manual</option>
                <option value="CSV_IMPORT">CSV</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Filter Status</Label>
              <select className="flex h-9 rounded-md border px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All</option>
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
              </select>
            </div>
            <Button variant="outline" onClick={fetchLeads}>Load Leads</Button>
          </div>

          {availableLeads.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {selectedIds.size} / {availableLeads.length} selected
                </p>
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  {selectedIds.size === availableLeads.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <div className="max-h-40 space-y-1 overflow-y-auto border rounded-md p-2">
                {availableLeads.map((lead) => (
                  <label key={lead.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted px-2 py-1 rounded">
                    <input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleLead(lead.id)} />
                    <span>{lead.name}</span>
                    <span className="text-muted-foreground text-xs">{lead.phone}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          <Button onClick={sendBroadcast} disabled={sending || !name || !messageBody || selectedIds.size === 0} className="w-full">
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {sending ? "Sending..." : `Send to ${selectedIds.size} leads`}
          </Button>

          {result && !result.error && (
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
              Broadcast queued — {result.recipientCount} recipients
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader><CardTitle>Broadcast History</CardTitle></CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No broadcasts yet.</p>
          ) : (
            <div className="space-y-2">
              {history.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between border-b py-2">
                  <div>
                    <p className="font-medium text-sm">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={b.status === "COMPLETED" ? "default" : b.status === "FAILED" ? "destructive" : "secondary"}>
                      {b.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {b.sentCount}s / {b.failedCount}f
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}