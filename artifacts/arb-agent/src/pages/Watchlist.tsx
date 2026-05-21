import { useListWatchlist, useAddToWatchlist, useRemoveFromWatchlist, getListWatchlistQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Search, Plus, Trash2, Eye } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/format";

export default function Watchlist() {
  const [newSymbol, setNewSymbol] = useState("");
  const { data: watchlist, isLoading } = useListWatchlist();
  const addMutation = useAddToWatchlist();
  const removeMutation = useRemoveFromWatchlist();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;
    
    const symbol = newSymbol.trim().toUpperCase();
    
    addMutation.mutate({ data: { symbol } }, {
      onSuccess: () => {
        setNewSymbol("");
        queryClient.invalidateQueries({ queryKey: getListWatchlistQueryKey() });
        toast({ title: "Added to watchlist", description: `${symbol} is now being tracked.` });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err?.message || "Failed to add symbol." });
      }
    });
  };

  const handleRemove = (id: number, symbol: string) => {
    removeMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListWatchlistQueryKey() });
        toast({ title: "Removed", description: `${symbol} removed from watchlist.` });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Eye className="h-6 w-6 text-primary" /> Watchlist
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage symbols to actively track for opportunities</p>
        </div>
      </div>

      <Card className="border-sidebar-border bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <form onSubmit={handleAdd} className="flex gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Add symbol (e.g. BTC, ETH, SOL)..."
                className="pl-9"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={!newSymbol.trim() || addMutation.isPending}>
              <Plus className="h-4 w-4 mr-2" /> Add
            </Button>
          </form>

          <div className="rounded-md border border-border/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Symbol</th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                  <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Added On</th>
                  <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">Loading watchlist...</td>
                  </tr>
                ) : watchlist?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">Your watchlist is empty. Add a symbol above.</td>
                  </tr>
                ) : (
                  watchlist?.map(item => (
                    <tr key={item.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10 transition-colors">
                      <td className="p-4 align-middle font-bold font-mono text-foreground">
                        {item.symbol}
                      </td>
                      <td className="p-4 align-middle">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                          Tracking Active
                        </span>
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="p-4 align-middle text-right">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemove(item.id, item.symbol)}
                          disabled={removeMutation.isPending}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
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