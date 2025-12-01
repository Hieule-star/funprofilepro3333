import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp } from "lucide-react";

type TimeRange = '24h' | '7d' | '30d';

export default function BalanceChart() {
  const [range, setRange] = useState<TimeRange>('7d');
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchSnapshots() {
      const hours = range === '24h' ? 24 : range === '7d' ? 168 : 720;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

      const { data: snapshots } = await supabase
        .from('treasury_snapshots')
        .select('*')
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: true });

      if (snapshots) {
        const formatted = snapshots.map((s) => ({
          time: new Date(s.recorded_at).toLocaleString('vi-VN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
          }),
          BNB: typeof s.balance_bnb === 'string' ? parseFloat(s.balance_bnb) : s.balance_bnb,
          CAMLY: (typeof s.balance_camly === 'string' ? parseFloat(s.balance_camly) : s.balance_camly) / 1000000, // Scale down for better visualization
        }));
        setData(formatted);
      }
    }

    fetchSnapshots();
  }, [range]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Balance History</h2>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={range === '24h' ? 'default' : 'outline'}
            onClick={() => setRange('24h')}
          >
            24h
          </Button>
          <Button
            size="sm"
            variant={range === '7d' ? 'default' : 'outline'}
            onClick={() => setRange('7d')}
          >
            7 days
          </Button>
          <Button
            size="sm"
            variant={range === '30d' ? 'default' : 'outline'}
            onClick={() => setRange('30d')}
          >
            30 days
          </Button>
        </div>
      </div>

      <div className="h-80">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="time" className="text-xs" />
              <YAxis yAxisId="left" className="text-xs" />
              <YAxis yAxisId="right" orientation="right" className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="BNB"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="CAMLY"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            No data available for selected range
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        *CAMLY values displayed in millions for better visualization
      </p>
    </Card>
  );
}
