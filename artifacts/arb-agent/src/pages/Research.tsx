import { useListResearchReports } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatPercent } from "@/lib/format";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function Research() {
  const [symbolFilter, setSymbolFilter] = useState("");
  const { data: reports, isLoading } = useListResearchReports({ symbol: symbolFilter || undefined });

  const getConfidenceColor = (conf: string) => {
    switch (conf) {
      case "high": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
      case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "low": return "bg-destructive/20 text-destructive-foreground border-destructive/50";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getRecColor = (rec: string) => {
    switch (rec) {
      case "execute": return "text-emerald-400 font-bold uppercase tracking-wider text-xs";
      case "monitor": return "text-yellow-400 font-bold uppercase tracking-wider text-xs";
      case "avoid": return "text-destructive font-bold uppercase tracking-wider text-xs";
      default: return "text-muted-foreground font-bold uppercase tracking-wider text-xs";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> 
            AI Research Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Automated analysis of cross-exchange opportunities</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter symbol (e.g. BTC)..."
              className="pl-8 w-[250px] bg-card/50"
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [1,2,3].map(i => <Card key={i} className="animate-pulse h-48 bg-muted/20 border-border/50" />)
        ) : reports?.length === 0 ? (
          <div className="col-span-full p-12 text-center text-muted-foreground border border-dashed rounded-lg">
            No research reports found. Run an analysis from an opportunity detail page.
          </div>
        ) : (
          reports?.map(report => (
            <Card key={report.id} className="border-sidebar-border bg-card/50 backdrop-blur-sm flex flex-col hover:border-primary/50 transition-colors">
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="font-bold font-mono text-xl">{report.symbol}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {report.buyExchange} → {report.sellExchange}
                    </div>
                  </div>
                  <Badge variant="outline" className={`font-mono text-xs ${getConfidenceColor(report.confidence)} capitalize`}>
                    {report.confidence} Conf
                  </Badge>
                </div>
                
                <div className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                  {report.keyInsights[0] || "No key insights extracted."}
                </div>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                  <div className={getRecColor(report.recommendation)}>
                    {report.recommendation}
                  </div>
                  <Button variant="ghost" size="sm" asChild className="h-8">
                    <Link href={`/research/${report.id}`}>Read Full</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}