import { useGetResearchReport } from "@workspace/api-client-react";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Brain, ShieldAlert, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ResearchDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { data: report, isLoading } = useGetResearchReport(Number(id));

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
      case "execute": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "monitor": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
      case "avoid": return "text-destructive bg-destructive/10 border-destructive/30";
      default: return "text-muted-foreground bg-muted border-border";
    }
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-6 max-w-4xl mx-auto">
      <div className="h-10 w-1/3 bg-muted rounded"></div>
      <div className="h-[500px] bg-muted rounded"></div>
    </div>;
  }

  if (!report) return <div className="text-center p-12 text-muted-foreground">Report not found</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/research")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">AI Report: {report.symbol}</h1>
            <Badge variant="outline" className={`font-mono text-xs ${getConfidenceColor(report.confidence)} capitalize`}>
              {report.confidence} Confidence
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Generated {formatDate(report.createdAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" /> Analysis
                </CardTitle>
                <div className={`px-3 py-1 rounded border text-xs font-bold uppercase tracking-wider ${getRecColor(report.recommendation)}`}>
                  Recommendation: {report.recommendation}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="prose prose-invert max-w-none prose-p:text-muted-foreground prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {report.analysis}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" /> Key Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {report.keyInsights.map((insight, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
                {report.keyInsights.length === 0 && <li className="text-sm text-muted-foreground">None identified.</li>}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-destructive" /> Risk Factors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {report.riskFactors.map((risk, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-destructive mt-1">•</span>
                    <span>{risk}</span>
                  </li>
                ))}
                {report.riskFactors.length === 0 && <li className="text-sm text-muted-foreground">No major risks identified.</li>}
              </ul>
            </CardContent>
          </Card>

          {report.opportunityId && (
            <Button variant="outline" className="w-full" asChild>
              <Link href={`/opportunities/${report.opportunityId}`}>View Original Opportunity</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}