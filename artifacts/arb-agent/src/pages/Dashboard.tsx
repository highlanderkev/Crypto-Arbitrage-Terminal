import { useGetArbitrageSummary, useListArbitrageOpportunities } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { ArrowRight, TrendingUp, Activity, BarChart3, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetArbitrageSummary();
  const { data: opportunities, isLoading: isLoadingOpps } = useListArbitrageOpportunities({ limit: 5 });

  if (isLoadingSummary || isLoadingOpps) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse bg-muted/20 border-border/50">
              <CardHeader className="h-10"></CardHeader>
              <CardContent className="h-16"></CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 animate-pulse bg-muted/20 border-border/50 h-96"></Card>
          <Card className="animate-pulse bg-muted/20 border-border/50 h-96"></Card>
        </div>
      </div>
    );
  }

  if (!summary) return <div>Failed to load dashboard data</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Terminal Overview</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Live Data Feed Connected
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Opportunities</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono" data-testid="stat-total-active">{summary.totalActive}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all tracked exchanges</p>
          </CardContent>
        </Card>
        <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Best Spread</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-emerald-500" data-testid="stat-best-spread">
              {formatPercent(summary.bestSpreadPct)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{summary.bestSymbol} on {summary.bestBuyExchangeName} / {summary.bestSellExchangeName}</p>
          </CardContent>
        </Card>
        <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Spread</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono" data-testid="stat-avg-spread">
              {formatPercent(summary.avgSpreadPct)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Rolling 24h average</p>
          </CardContent>
        </Card>
        <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">24h Detection Vol</CardTitle>
            <AlertCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono" data-testid="stat-total-24h">{summary.totalOpportunitiesLast24h}</div>
            <p className="text-xs text-muted-foreground mt-1">Opportunities detected in last 24h</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-sidebar-border bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Top Arbitrage Opportunities</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Highest spread cross-exchange pairs</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/opportunities">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Pair</th>
                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Buy @ Exchange</th>
                    <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Sell @ Exchange</th>
                    <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">Spread</th>
                    <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">Est. Profit</th>
                    <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {opportunities?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-muted-foreground">No active opportunities found.</td>
                    </tr>
                  ) : (
                    opportunities?.map(opp => (
                      <tr key={opp.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="p-4 align-middle font-bold font-mono">{opp.symbol}</td>
                        <td className="p-4 align-middle">
                          <div className="flex flex-col">
                            <span className="font-medium">{opp.buyExchangeName}</span>
                            <span className="text-xs text-muted-foreground font-mono">{formatCurrency(opp.buyPrice, 4)}</span>
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex flex-col">
                            <span className="font-medium">{opp.sellExchangeName}</span>
                            <span className="text-xs text-muted-foreground font-mono">{formatCurrency(opp.sellPrice, 4)}</span>
                          </div>
                        </td>
                        <td className="p-4 align-middle text-right font-mono font-bold text-emerald-500">
                          {formatPercent(opp.spreadPct)}
                        </td>
                        <td className="p-4 align-middle text-right font-mono">
                          {formatCurrency(opp.estimatedProfitUsd)}
                        </td>
                        <td className="p-4 align-middle text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/opportunities/${opp.id}`}>Details</Link>
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

        <div className="space-y-6">
          <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Top Symbols</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary.topSymbols.slice(0, 5).map(stat => (
                  <div key={stat.symbol} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{stat.symbol}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-mono text-sm text-primary">{formatPercent(stat.avgSpreadPct)}</span>
                      <span className="text-xs text-muted-foreground">{stat.count} opps</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Top Exchange Pairs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary.topExchangePairs.slice(0, 5).map(stat => (
                  <div key={`${stat.buyExchange}-${stat.sellExchange}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <span>{stat.buyExchange}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span>{stat.sellExchange}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-mono text-sm text-primary">{formatPercent(stat.avgSpreadPct)}</span>
                      <span className="text-xs text-muted-foreground">{stat.count} opps</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
