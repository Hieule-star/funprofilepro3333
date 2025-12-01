import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  metadata: any;
  resolved: boolean;
  created_at: string;
}

export default function AlertsList() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  useEffect(() => {
    fetchAlerts();
    
    const channel = supabase
      .channel('treasury-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'treasury_alerts' }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchAlerts() {
    const { data } = await supabase
      .from('treasury_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setAlerts(data);
  }

  async function markResolved(id: string) {
    const { error } = await supabase
      .from('treasury_alerts')
      .update({ resolved: true })
      .eq('id', id);

    if (error) {
      toast.error('Failed to mark alert as resolved');
    } else {
      toast.success('Alert marked as resolved');
      fetchAlerts();
    }
  }

  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(a => a.severity === filter);

  const unresolved = alerts.filter(a => !a.resolved).length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
      default: return 'secondary';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'warning': return '🟡';
      case 'info': return '🔵';
      default: return '⚪';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-lg relative">
            <Bell className="h-6 w-6 text-primary" />
            {unresolved > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unresolved}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-foreground">Alerts</h2>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            size="sm"
            variant={filter === 'critical' ? 'default' : 'outline'}
            onClick={() => setFilter('critical')}
          >
            Critical
          </Button>
          <Button
            size="sm"
            variant={filter === 'warning' ? 'default' : 'outline'}
            onClick={() => setFilter('warning')}
          >
            Warning
          </Button>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 border rounded-lg ${
                alert.resolved ? 'bg-muted/50 opacity-60' : 'bg-card'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-xl">{getSeverityIcon(alert.severity)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getSeverityColor(alert.severity) as any}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.created_at).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{alert.message}</p>
                    {alert.metadata && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {JSON.stringify(alert.metadata, null, 2)}
                      </p>
                    )}
                  </div>
                </div>
                {!alert.resolved && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => markResolved(alert.id)}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No alerts found
          </div>
        )}
      </div>
    </Card>
  );
}
