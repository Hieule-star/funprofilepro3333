import { Button } from "@/components/ui/button";
import { useConnect, useAccount } from "wagmi";
import { Loader2, Wallet } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";

export default function ConnectWalletButton() {
  const { connectors, connect, isPending } = useConnect();
  const { isConnected } = useAccount();
  const { disconnect, address } = useWallet();

  if (isConnected && address) {
    return (
      <Button
        variant="outline"
        onClick={disconnect}
        className="bg-white text-gray-900 hover:bg-gray-100 border-gray-200"
      >
        Ngắt kết nối
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {connectors.map((connector) => (
        <Button
          key={connector.id}
          onClick={() => connect({ connector })}
          disabled={isPending}
          className="gap-2 bg-white text-gray-900 hover:bg-gray-100 border-gray-200"
          variant="outline"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wallet className="h-4 w-4" />
          )}
          {connector.name}
        </Button>
      ))}
    </div>
  );
}
