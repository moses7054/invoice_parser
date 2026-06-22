import { createContext, useContext, useState } from "react";

type Provider = "anthropic" | "openai";

const ProviderContext = createContext<{
  provider: Provider;
  setProvider: (p: Provider) => void;
}>({ provider: "anthropic", setProvider: () => {} });

export function ProviderProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<Provider>("anthropic");
  return (
    <ProviderContext.Provider value={{ provider, setProvider }}>
      {children}
    </ProviderContext.Provider>
  );
}

export const useProvider = () => useContext(ProviderContext);
