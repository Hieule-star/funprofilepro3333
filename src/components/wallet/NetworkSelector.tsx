import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { supportedChains } from "@/lib/wagmi-config";

export default function NetworkSelector() {
  const { chainId, switchNetwork } = useWallet();

  const currentChain = chainId ? supportedChains[chainId] : null;

  const getNetworkIcon = (symbol: string) => {
    return symbol === "BNB" ? "🟡" : "🔷";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 bg-white text-gray-900 hover:bg-gray-100 border-gray-200">
          {currentChain ? (
            <>
              <span className="text-lg">{getNetworkIcon(currentChain.symbol)}</span>
              {currentChain.name}
            </>
          ) : (
            'Chọn mạng'
          )}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-background z-50">
        {Object.entries(supportedChains).map(([id, chain]) => (
          <DropdownMenuItem
            key={id}
            onClick={() => switchNetwork(Number(id))}
            className={chainId === Number(id) ? 'bg-accent' : ''}
          >
            <span className="text-lg mr-2">{getNetworkIcon(chain.symbol)}</span>
            {chain.name} ({chain.symbol})
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
