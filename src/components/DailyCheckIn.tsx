import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Flame, Gift, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface CheckInData {
  checkin_date: string;
  streak_count: number;
  bonus_awarded: boolean;
}

export default function DailyCheckIn() {
  const { user } = useAuth();
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [checkInDates, setCheckInDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  useEffect(() => {
    if (user) {
      fetchCheckInData();
    }
  }, [user, selectedMonth]);

  const fetchCheckInData = async () => {
    if (!user) return;

    try {
      // Get current streak
      const { data: streakData } = await supabase.rpc("get_user_streak", {
        p_user_id: user.id,
      });

      setCurrentStreak(streakData || 0);

      // Check if checked in today
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: todayCheckIn } = await (supabase as any)
        .from("daily_checkins")
        .select("*")
        .eq("user_id", user.id)
        .eq("checkin_date", today)
        .maybeSingle();

      setCheckedInToday(!!todayCheckIn);

      // Get check-ins for current month
      const monthStart = format(startOfMonth(selectedMonth), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(selectedMonth), "yyyy-MM-dd");

      const { data: checkIns } = await (supabase as any)
        .from("daily_checkins")
        .select("checkin_date")
        .eq("user_id", user.id)
        .gte("checkin_date", monthStart)
        .lte("checkin_date", monthEnd);

      if (checkIns) {
        const dates = checkIns.map((c: any) => new Date(c.checkin_date));
        setCheckInDates(dates);
      }
    } catch (error) {
      console.error("Error fetching check-in data:", error);
    }
  };

  const handleCheckIn = async () => {
    if (!user || checkedInToday) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("process_daily_checkin", {
        p_user_id: user.id,
      });

      if (error) throw error;

      const result = data as any;

      // Update UI
      setCheckedInToday(true);
      setCurrentStreak(result.streak);
      setCheckInDates([...checkInDates, new Date()]);

      // Show success notification
      if (result.bonus_awarded) {
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.6 },
        });
        toast.success("🎉 STREAK BONUS! +55,000 CAMLY", {
          description: `Bạn đã duy trì streak ${result.streak} ngày!`,
          duration: 5000,
        });
      } else {
        toast.success("✅ Check-in thành công! +5,000 CAMLY", {
          description: `Streak hiện tại: ${result.streak} ngày`,
          duration: 4000,
        });
      }
    } catch (error: any) {
      console.error("Check-in error:", error);
      if (error.message?.includes("Already checked in")) {
        toast.error("Bạn đã check-in hôm nay rồi!");
      } else {
        toast.error("Lỗi check-in. Vui lòng thử lại!");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <CalendarCheck className="h-6 w-6 text-primary" />
            Daily Check-In
          </CardTitle>
          {currentStreak > 0 && (
            <Badge className="flex items-center gap-1 bg-gradient-to-r from-orange-500 to-red-500 text-lg px-3 py-1">
              <Flame className="h-4 w-4" />
              {currentStreak} ngày
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Check-in button */}
        <div className="text-center space-y-3">
          <Button
            onClick={handleCheckIn}
            disabled={checkedInToday || loading}
            size="lg"
            className="w-full h-16 text-lg font-bold bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 disabled:opacity-50"
          >
            {checkedInToday ? (
              <>
                <CalendarCheck className="mr-2 h-6 w-6" />
                Đã Check-in Hôm Nay ✓
              </>
            ) : loading ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Gift className="mr-2 h-6 w-6" />
                Check-in Ngay (+5,000 CAMLY)
              </>
            )}
          </Button>

          {/* Rewards info */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Card className="p-3 bg-muted">
              <div className="flex items-center gap-2 justify-center">
                <Gift className="h-4 w-4 text-primary" />
                <span className="font-semibold">5,000 CAMLY</span>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-1">
                Mỗi ngày
              </p>
            </Card>
            <Card className="p-3 bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30">
              <div className="flex items-center gap-2 justify-center">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <span className="font-semibold text-orange-600">+50,000 CAMLY</span>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-1">
                Streak 7 ngày
              </p>
            </Card>
          </div>
        </div>

        {/* Calendar */}
        <div className="border rounded-lg p-4 bg-muted/30">
          <Calendar
            mode="single"
            selected={undefined}
            month={selectedMonth}
            onMonthChange={setSelectedMonth}
            className="rounded-md mx-auto pointer-events-auto"
            modifiers={{
              checkedIn: checkInDates,
            }}
            modifiersStyles={{
              checkedIn: {
                backgroundColor: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
                fontWeight: "bold",
              },
            }}
          />
          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-primary" />
              <span className="text-muted-foreground">Đã check-in</span>
            </div>
          </div>
        </div>

        {/* Streak info */}
        {currentStreak > 0 && (
          <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/30">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  Streak hiện tại
                </p>
                <p className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
                  <Flame className="h-8 w-8 text-orange-500" />
                  {currentStreak} ngày
                </p>
                {currentStreak < 7 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Còn {7 - (currentStreak % 7)} ngày nữa để nhận Streak Bonus!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
