import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function SettingsPanel() {
  const [thresholds, setThresholds] = useState({ bnb: 0.05, camly: 1000000 });
  const [largeTransaction, setLargeTransaction] = useState(500000);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      const { data: thresholdData } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'treasury_low_balance_threshold')
        .single();

      const { data: largeData } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'large_transaction_threshold')
        .single();

      if (thresholdData?.value) {
        setThresholds(thresholdData.value as any);
      }
      if (largeData?.value) {
        setLargeTransaction((largeData.value as any).camly);
      }
    }

    fetchSettings();
  }, []);

  async function saveSettings() {
    setSaving(true);
    try {
      await supabase
        .from('admin_settings')
        .update({ value: thresholds })
        .eq('key', 'treasury_low_balance_threshold');

      await supabase
        .from('admin_settings')
        .update({ value: { camly: largeTransaction } })
        .eq('key', 'large_transaction_threshold');

      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Alert Settings</h2>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bnb-threshold">Low BNB Balance Threshold</Label>
            <Input
              id="bnb-threshold"
              type="number"
              step="0.01"
              value={thresholds.bnb}
              onChange={(e) =>
                setThresholds({ ...thresholds, bnb: parseFloat(e.target.value) })
              }
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Alert when BNB balance falls below this value
            </p>
          </div>

          <div>
            <Label htmlFor="camly-threshold">Low CAMLY Balance Threshold</Label>
            <Input
              id="camly-threshold"
              type="number"
              value={thresholds.camly}
              onChange={(e) =>
                setThresholds({ ...thresholds, camly: parseInt(e.target.value) })
              }
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Alert when CAMLY balance falls below this value
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="large-tx">Large Transaction Threshold</Label>
          <Input
            id="large-tx"
            type="number"
            value={largeTransaction}
            onChange={(e) => setLargeTransaction(parseInt(e.target.value))}
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Alert when a claim exceeds this amount of CAMLY
          </p>
        </div>

        <Button onClick={saveSettings} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </Card>
  );
}
