import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Eye, AlertTriangle } from "lucide-react";

export default function SecurityTips() {
  const tips = [
    {
      icon: Lock,
      title: "Bảo mật Private Key",
      desc: "Không chia sẻ private key với bất kỳ ai",
      color: "text-red-500",
    },
    {
      icon: Shield,
      title: "Xác thực 2 lớp",
      desc: "Bật 2FA trên tất cả ví crypto",
      color: "text-blue-500",
    },
    {
      icon: Eye,
      title: "Kiểm tra địa chỉ",
      desc: "Luôn kiểm tra địa chỉ ví trước khi gửi",
      color: "text-yellow-500",
    },
    {
      icon: AlertTriangle,
      title: "Cẩn thận Phishing",
      desc: "Đề phòng các trang web giả mạo",
      color: "text-orange-500",
    },
  ];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Bảo mật Ví
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tips.map((tip, index) => {
          const Icon = tip.icon;
          return (
            <div
              key={index}
              className="flex items-start gap-3 p-3 bg-background/50 rounded-lg border border-primary/10 hover:border-primary/30 transition-colors"
            >
              <Icon className={`h-5 w-5 ${tip.color} shrink-0 mt-0.5`} />
              <div>
                <p className="text-sm font-semibold">{tip.title}</p>
                <p className="text-xs text-muted-foreground">{tip.desc}</p>
              </div>
            </div>
          );
        })}

        <div className="pt-2 text-center">
          <p className="text-xs text-muted-foreground">
            💡 Luôn cẩn thận khi giao dịch crypto
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
