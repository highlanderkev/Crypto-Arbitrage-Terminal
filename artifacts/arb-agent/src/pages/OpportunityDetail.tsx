import { useGetArbitrageOpportunity, useCreateResearchReport } from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency, formatPercent, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Brain, TrendingUp, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function OpportunityDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: opp, isLoading } = useGetArbitrageOpportunity(Number(id));
  const createResearch = useCreateResearchReport();

  const handleRunResearch = () => {
    if (!opp) return;
    createResearch.mutate(
      { data: { opportunityId: opp.id, symbol: opp.symbol } },
      {
        onSuccess: (report) => {
          toast({
            title: "Analysis complete",
            description: "Research report generated successfully.",
          });
          setLocation(`/research/${report.id}`);
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Analysis failed",
            description: "Failed to generate AI research report.",
          });
        }
      }
    );
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-6">
      <div className="h-10 w-1/3 bg-muted rounded"></div>
      <div className="h-64 bg-muted rounded"></div>
    </div>;
  }

  if (!opp) return <div className="text-center p-12 text-muted-foreground">Opportunity not found</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/opportunities")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono tracking-tight">{opp.symbol} Arbitrage</h1>
            <Badge variant="outline" className={opp.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-muted/50 text-muted-foreground'}>
              {opp.status.toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Detected at {formatDate(opp.detectedAt)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-sidebar-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Execution Path</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/50">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Buy from</div>
                <div className="text-lg font-bold">{opp.buyExchangeName}</div>
                <div className="text-xl font-mono text-primary">{formatCurrency(opp.buyPrice, 4)}</div>
              </div>
              <ArrowRight className="h-8 w-8 text-muted-foreground opacity-50" />
              <div className="space-y-1 text-right">
                <div className="text-sm text-muted-foreground">Sell to</div>
                <div className="text-lg font-bold">{opp.sellExchangeName}</div>
                <div className="text-xl font-mono text-emerald-500">{formatCurrency(opp.sellPrice, 4)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 p-4 rounded-lg border border-border/50">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Gross Spread
                </div>
                <div className="text-2xl font-mono text-emerald-500 font-bold">{formatPercent(opp.spreadPct)}</div>
                <div className="text-sm text-muted-foreground font-mono">Δ {formatCurrency(opp.sellPrice - opp.buyPrice, 4)}</div>
              </div>
              <div className="space-y-2 p-4 rounded-lg border border-border/50">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Net Profit (Est.)
                </div>
                <div className="text-2xl font-mono font-bold" className={opp.netProfitPct > 0 ? "text-2xl font-mono font-bold text-emerald-500" : "text-2xl font-mono font-bold text-destructive"}>
                  {formatPercent(opp.netProfitPct)}
                </div>
                <div className="text-sm text-muted-foreground font-mono">{formatCurrency(opp.estimatedProfitUsd, 2)} per unit</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Fees Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Buy Fee ({opp.buyExchangeName})</span>
                <span className="font-mono text-destructive">{formatPercent(opp.buyFee, 4)}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                <span className="text-muted-foreground">Sell Fee ({opp.sellExchangeName})</span>
                <span className="font-mono text-destructive">{formatPercent(opp.sellFee, 4)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium pt-2">
                <span>Total Friction</span>
                <span className="font-mono text-destructive">{formatPercent(opp.buyFee + opp.sellFee, 4)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-sidebar-border bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" /> AI Analyst
              </CardTitle>
              <CardDescription>Generate a deep-dive risk and viability report for this pair.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full font-bold" 
                onClick={handleRunResearch}
                disabled={createResearch.isPending}
              >
                {createResearch.isPending ? "Analyzing..." : "Run AI Analysis"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}