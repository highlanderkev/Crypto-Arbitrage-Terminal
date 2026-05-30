import { useGetPrices, getGetPricesQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search } from "lucide-react";

export default function PriceMonitor() {
  const [symbolFilter, setSymbolFilter] = useState("BTC");
  
  const params = { symbol: symbolFilter || undefined };
  const { data: prices, isLoading } = useGetPrices(
    params,
    { 
      query: { 
        queryKey: getGetPricesQueryKey(params),
        refetchInterval: 5000 // Refetch every 5 seconds for live feel
      } 
    }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Price Monitor</h1>
          <p className="text-sm text-muted-foreground mt-1">Live market data across exchanges</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search symbol..."
              className="pl-8 w-[250px] bg-card/50"
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value.toUpperCase())}
              data-testid="input-price-symbol"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading && !prices ? (
          <div className="flex items-center justify-center p-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
              </span>
              Loading price feeds...
            </div>
          </div>
        ) : prices?.length === 0 ? (
          <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
            <CardContent className="p-12 text-center text-muted-foreground">
              No price data found for '{symbolFilter}'.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {prices?.map(price => (
              <Card key={`${price.exchange}-${price.symbol}`} className="border-sidebar-border bg-card/50 backdrop-blur-sm overflow-hidden">
                <div className="p-4 border-b border-border/50 flex justify-between items-center bg-muted/10">
                  <span className="font-bold text-foreground">{price.exchangeName}</span>
                  <span className="text-xs font-mono px-2 py-1 rounded bg-muted/50 text-muted-foreground">
                    {price.symbol}
                  </span>
                </div>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Last Price</div>
                      <div className="text-2xl font-bold font-mono text-primary">
                        {formatCurrency(price.last, 2)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Bid</div>
                        <div className="text-sm font-mono text-emerald-400">{formatCurrency(price.bid, 2)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Ask</div>
                        <div className="text-sm font-mono text-destructive">{formatCurrency(price.ask, 2)}</div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 text-xs text-muted-foreground">
                      <span>Vol: {price.volume24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      <span className="font-mono text-[10px]">{formatDate(price.updatedAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}