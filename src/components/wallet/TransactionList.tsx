import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, ArrowUpRight, ArrowDownRight, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { supportedChains } from "@/lib/wagmi-config";

interface Transaction {
  id: string;
  chain: 'bnb' | 'ethereum';
  tx_hash: string;
  type: 'send' | 'receive';
  amount: string;
  from_address: string;
  to_address: string;
  created_at: string;
}

export default function TransactionList() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setTransactions(data as Transaction[]);
      }
      setLoading(false);
    };

    fetchTransactions();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Lịch sử giao dịch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Lịch sử giao dịch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Chưa có giao dịch nào. Kết nối ví để bắt đầu!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Lịch sử giao dịch
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {transactions.map((tx) => {
          const chainInfo = supportedChains[tx.chain === 'bnb' ? 56 : 1];
          return (
            <div
              key={tx.id}
              className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    tx.type === "receive"
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {tx.type === "receive" ? (
                    <ArrowDownRight className="h-5 w-5" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="font-medium capitalize">{tx.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`font-semibold ${
                    tx.type === "receive" ? "text-success" : "text-destructive"
                  }`}
                >
                  {tx.type === "receive" ? "+" : "-"}
                  {tx.amount} {chainInfo?.symbol}
                </p>
                <a
                  href={`${chainInfo?.explorer}/tx/${tx.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  View <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
