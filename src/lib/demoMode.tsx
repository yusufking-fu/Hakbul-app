import { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { buildDemoDataset, DemoDataset } from '@/lib/demoData';

interface DemoModeContextValue {
  isDemo: boolean;
  enterDemo: () => void;
  exitDemo: () => void;
  demoData: DemoDataset | null;
  setDemoItirazlar: (itirazlar: DemoDataset['itirazlar']) => void;
}

const DemoModeContext = createContext<DemoModeContextValue | null>(null);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemo, setIsDemo] = useState(false);
  const [demoData, setDemoData] = useState<DemoDataset | null>(null);

  const value = useMemo<DemoModeContextValue>(
    () => ({
      isDemo,
      enterDemo: () => {
        const data = buildDemoDataset();
        setDemoData(data);
        setIsDemo(true);
      },
      exitDemo: () => {
        setDemoData(null);
        setIsDemo(false);
      },
      demoData,
      setDemoItirazlar: (itirazlar) => {
        setDemoData((prev) => (prev ? { ...prev, itirazlar } : prev));
      },
    }),
    [isDemo, demoData]
  );

  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode(): DemoModeContextValue {
  const ctx = useContext(DemoModeContext);
  if (!ctx) {
    throw new Error('useDemoMode must be used within DemoModeProvider');
  }
  return ctx;
}
