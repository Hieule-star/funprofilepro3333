import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Receipt } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Claim {
  id: string;
  user_id: string;
  wallet_address: string;
  amount_db: number;
  amount_token: number;
  status: string;
  tx_hash: string | null;
  created_at: string;
  profiles?: {
    username: string;
  };
}

export default function ClaimsTable() {
  const [claims, setClaims] = useState<Claim[]>([]);

  useEffect(() => {
    async function fetchClaims() {
      const { data } = await supabase
        .from('claim_requests')
        .select('*, profiles(username)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) setClaims(data as any);
    }

    fetchClaims();

    const channel = supabase
      .channel('claim-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claim_requests' }, () => {
        fetchClaims();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Receipt className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Recent Claims</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b text-left text-sm text-muted-foreground">
              <th className="pb-3 font-medium">User</th>
              <th className="pb-3 font-medium">Amount</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Time</th>
              <th className="pb-3 font-medium">Tx</th>
            </tr>
          </thead>
          <tbody>
            {claims.length > 0 ? (
              claims.map((claim) => (
                <tr key={claim.id} className="border-b text-sm">
                  <td className="py-3 text-foreground">
                    {claim.profiles?.username || 'Unknown'}
                  </td>
                  <td className="py-3 text-foreground font-mono">
                    {claim.amount_token.toLocaleString()} CAMLY
                  </td>
                  <td className="py-3">
                    <Badge variant={getStatusColor(claim.status) as any}>
                      {claim.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {new Date(claim.created_at).toLocaleString('vi-VN')}
                  </td>
                  <td className="py-3">
                    {claim.tx_hash ? (
                      <a
                        href={`https://bscscan.com/tx/${claim.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                  No claims found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
