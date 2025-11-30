import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface ClaimRequest {
  id: string;
  wallet_address: string;
  amount_db: number;
  amount_token: number;
  status: string;
  tx_hash: string | null;
  created_at: string;
  completed_at: string | null;
}

const ClaimHistory = () => {
  const { user } = useAuth();
  const [claims, setClaims] = useState<ClaimRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchClaimHistory();
    }
  }, [user]);

  const fetchClaimHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('claim_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClaims(data || []);
    } catch (error: any) {
      console.error('Error fetching claim history:', error);
      toast.error('Không thể tải lịch sử claim');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: 'Chờ xử lý', variant: 'secondary' },
      processing: { label: 'Đang xử lý', variant: 'default' },
      completed: { label: 'Hoàn thành', variant: 'outline' },
      failed: { label: 'Thất bại', variant: 'destructive' }
    };

    const config = statusConfig[status] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('en-US');
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Lịch sử Claim CAMLY</h1>
        <p className="text-muted-foreground mt-2">
          Theo dõi các yêu cầu claim CAMLY token của bạn
        </p>
      </div>

      {claims.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Bạn chưa có yêu cầu claim nào
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {claims.map((claim) => (
            <Card key={claim.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {formatAmount(claim.amount_token)} CAMLY Token
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(claim.created_at), 'dd/MM/yyyy HH:mm')}
                    </CardDescription>
                  </div>
                  {getStatusBadge(claim.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Số lượng DB CAMLY</p>
                    <p className="font-medium">{formatAmount(claim.amount_db)} CAMLY</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Số lượng Token</p>
                    <p className="font-medium">{formatAmount(claim.amount_token)} CAMLY</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Địa chỉ ví</p>
                    <p className="font-mono text-xs">{shortenAddress(claim.wallet_address)}</p>
                  </div>
                  {claim.completed_at && (
                    <div>
                      <p className="text-muted-foreground">Hoàn thành lúc</p>
                      <p className="font-medium">
                        {format(new Date(claim.completed_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                  )}
                </div>
                
                {claim.tx_hash && (
                  <div className="pt-3 border-t">
                    <p className="text-muted-foreground text-sm mb-2">Transaction Hash</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-muted px-3 py-2 rounded">
                        {claim.tx_hash}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <a
                          href={`https://bscscan.com/tx/${claim.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1"
                        >
                          <ExternalLink className="h-4 w-4" />
                          BscScan
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClaimHistory;
