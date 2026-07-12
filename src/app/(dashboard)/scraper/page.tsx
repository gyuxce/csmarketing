"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, CheckCircle2, XCircle } from "lucide-react";

const sourceLabels: Record<string, string> = {
  GOOGLE_MAPS: "Google Maps",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
};

export default function ScraperPage() {
  const [source, setSource] = useState("GOOGLE_MAPS");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<any>(null);

  const fetchJobs = async () => {
    const res = await fetch("/api/scrape");
    setJobs(await res.json());
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleScrape = async () => {
    if (!query.trim()) return;
    setRunning(true);
    setResult(null);
    const res = await fetch("/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, query, location }),
    });
    const data = await res.json();
    setResult(data);
    setRunning(false);
    fetchJobs();
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/leads/import", { method: "POST", body: formData });
    setCsvResult(await res.json());
    setCsvImporting(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Scraper</h1>

      {/* Google Maps Scraper */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Scrape Business Leads
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={source} onValueChange={(v: string | null) => setSource(v || "GOOGLE_MAPS")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GOOGLE_MAPS">Google Maps</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Search Query *</Label>
              <Input
                placeholder="e.g. restoran, klinik kecantikan, bengkel mobil"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Location (optional)</Label>
              <Input
                placeholder="e.g. Jakarta Selatan, Bandung"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleScrape} disabled={running || !query}>
            {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {running ? "Scraping..." : "Start Scraping"}
          </Button>

          {result && (
            <div className={`rounded-lg border p-4 ${result.error ? "bg-destructive/10" : "bg-green-50"}`}>
              {result.error ? (
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-4 w-4" />
                  <span>{result.error}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    Found {result.total} leads, imported {result.inserted} ({result.total - result.inserted} duplicates skipped)
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CSV Import */}
      <Card>
        <CardHeader>
          <CardTitle>CSV Import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Upload CSV dengan columns: <code>name, phone, email, company, city, address</code>
          </p>
          <div className="flex items-center gap-3">
            <Input type="file" accept=".csv" onChange={handleCSVUpload} disabled={csvImporting} />
            {csvImporting && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          {csvResult && (
            <div className="rounded-lg border bg-green-50 p-3 text-sm text-green-700">
              Imported {csvResult.imported} / {csvResult.total} rows ({csvResult.skipped} skipped)
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job History */}
      <Card>
        <CardHeader>
          <CardTitle>Scrape History</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No scrape jobs yet.</p>
          ) : (
            <div className="space-y-2">
              {jobs.map((job: any) => (
                <div key={job.id} className="flex items-center justify-between border-b py-2">
                  <div>
                    <p className="font-medium text-sm">
                      {sourceLabels[job.source] || job.source}: {job.query}
                      {job.location ? ` (${job.location})` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(job.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={job.status === "COMPLETED" ? "default" : job.status === "FAILED" ? "destructive" : "secondary"}>
                      {job.status}
                    </Badge>
                    {job.resultCount > 0 && (
                      <span className="text-sm text-muted-foreground">{job.resultCount} leads</span>
                    )}
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