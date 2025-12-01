import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BalanceData {
  bnb: number;
  camly: number;
}

export default function TreasuryOverview() {
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const TREASURY_ADDRESS = "0x0910320181889fefde0bb1ca63962b0a8882e413";

  const fetchBalance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('treasury-monitor');
      
      if (error) throw error;
      
      if (data.balance) {
        setBalance(data.balance);
        setLastUpdate(new Date());
        toast.success("Balance updated successfully");
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
      toast.error("Failed to fetch balance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Treasury Overview</h2>
            <p className="text-sm text-muted-foreground">
              {lastUpdate && `Last updated: ${lastUpdate.toLocaleTimeString()}`}
            </p>
          </div>
        </div>
        <Button onClick={fetchBalance} disabled={loading} size="sm" variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="p-4 bg-accent/50 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground mb-1">BNB Balance</p>
          <p className="text-3xl font-bold text-foreground">
            {balance ? balance.bnb.toFixed(4) : '-.----'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Gas for transactions</p>
        </div>

        <div className="p-4 bg-accent/50 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground mb-1">CAMLY Balance</p>
          <p className="text-3xl font-bold text-foreground">
            {balance ? balance.camly.toLocaleString() : '---'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Available for claims</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Wallet Address:</span>
        <code className="px-2 py-1 bg-muted rounded text-xs">
          {TREASURY_ADDRESS.slice(0, 6)}...{TREASURY_ADDRESS.slice(-4)}
        </code>
        <a
          href={`https://bscscan.com/address/${TREASURY_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline flex items-center gap-1"
        >
          View on BscScan <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </Card>
  );
}
