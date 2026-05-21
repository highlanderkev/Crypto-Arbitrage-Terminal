import { useListArbitrageOpportunities } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent, formatDate } from "@/lib/format";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Opportunities() {
  const [symbolFilter, setSymbolFilter] = useState("");
  const [minSpreadFilter, setMinSpreadFilter] = useState<number | undefined>(undefined);
  
  const { data: opportunities, isLoading } = useListArbitrageOpportunities({ 
    symbol: symbolFilter || undefined,
    minSpread: minSpreadFilter
  });

  const getSpreadColor = (spread: number) => {
    if (spread >= 1) return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
    if (spread >= 0.5) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    return "bg-muted/50 text-muted-foreground border-border";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Arbitrage Opportunities</h1>
          <p className="text-sm text-muted-foreground mt-1">Live cross-exchange price discrepancies</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter symbol (e.g. BTC)..."
              className="pl-8 w-[200px] bg-card/50"
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              data-testid="input-filter-symbol"
            />
          </div>
          <div className="relative">
            <SlidersHorizontal className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              placeholder="Min Spread %"
              className="pl-8 w-[150px] bg-card/50"
              value={minSpreadFilter || ""}
              onChange={(e) => setMinSpreadFilter(e.target.value ? Number(e.target.value) : undefined)}
              data-testid="input-filter-spread"
            />
          </div>
        </div>
      </div>

      <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Time Detected</th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Pair</th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Buy Exchange</th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Sell Exchange</th>
                  <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">Spread %</th>
                  <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">Net Profit %</th>
                  <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                        </span>
                        Scanning markets...
                      </div>
                    </td>
                  </tr>
                ) : opportunities?.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">No active opportunities matching criteria.</td>
                  </tr>
                ) : (
                  opportunities?.map(opp => (
                    <tr key={opp.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="p-4 align-middle text-muted-foreground">
                        {formatDate(opp.detectedAt)}
                      </td>
                      <td className="p-4 align-middle font-bold font-mono text-foreground">
                        {opp.symbol}
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{opp.buyExchangeName}</span>
                          <span className="text-xs text-muted-foreground font-mono">{formatCurrency(opp.buyPrice, 4)}</span>
                        </div>
                      </td>
                      <td className="p-4 align-middle">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{opp.sellExchangeName}</span>
                          <span className="text-xs text-muted-foreground font-mono">{formatCurrency(opp.sellPrice, 4)}</span>
                        </div>
                      </td>
                      <td className="p-4 align-middle text-right">
                        <Badge variant="outline" className={`font-mono text-sm px-2 py-0.5 ${getSpreadColor(opp.spreadPct)}`}>
                          {formatPercent(opp.spreadPct)}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle text-right font-mono font-bold">
                        <span className={opp.netProfitPct > 0 ? "text-emerald-500" : "text-destructive"}>
                          {formatPercent(opp.netProfitPct)}
                        </span>
                      </td>
                      <td className="p-4 align-middle text-right">
                        <Button variant="secondary" size="sm" asChild>
                          <Link href={`/opportunities/${opp.id}`}>Analyze</Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}