
import React, { useState, useEffect, useMemo } from 'react';
import { Player, Period, View } from './types';
import { INITIAL_FUNDERS, Icons } from './constants';
import Dashboard from './components/Dashboard';
import PlayersList from './components/PlayersList';
import PeriodsList from './components/PeriodsList';
import FinanceReport from './components/FinanceReport';
import PasswordGate from './components/PasswordGate';
import { dbService } from './services/dbService';

const App: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const [players, setPlayers] = useState<Player[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data and subscribe to real-time updates
  useEffect(() => {
    const unsubPlayers = dbService.subscribeToPlayers((syncedPlayers) => {
      if (syncedPlayers.length === 0) {
        // Initialize with default funders if totally empty (first run)
        INITIAL_FUNDERS.forEach(p => dbService.savePlayer(p));
      } else {
        setPlayers(syncedPlayers);
      }
    });

    const unsubPeriods = dbService.subscribeToPeriods((syncedPeriods) => {
      setPeriods(syncedPeriods);
      setIsLoading(false);
    });

    return () => {
      unsubPlayers();
      unsubPeriods();
    };
  }, []);

  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

  const activePeriod = useMemo(() => {
    if (selectedPeriodId) {
      return periods.find(p => p.id === selectedPeriodId) || null;
    }
    return periods.length > 0 ? periods[0] : null;
  }, [periods, selectedPeriodId]);

  // Wrapper functions to keep existing component logic working while piping to Firestore
  const handleSetPlayers: React.Dispatch<React.SetStateAction<Player[]>> = (action) => {
    const nextPlayers = typeof action === 'function' ? action(players) : action;
    
    // Identify changes and sync to Firestore
    // This is a naive implementation; in a full app we'd call savePlayer/deletePlayer directly from components
    // But since the current components are built around setPlayers, we'll reconcile here for now
    
    // Check for deletions
    players.forEach(p => {
      if (!nextPlayers.find(np => np.id === p.id)) {
        dbService.deletePlayer(p.id);
      }
    });
    
    // Check for additions/updates
    nextPlayers.forEach(p => {
      const existing = players.find(ep => ep.id === p.id);
      if (!existing || JSON.stringify(existing) !== JSON.stringify(p)) {
        dbService.savePlayer(p);
      }
    });
  };

  const handleSetPeriods: React.Dispatch<React.SetStateAction<Period[]>> = (action) => {
    const nextPeriods = typeof action === 'function' ? action(periods) : action;
    
    nextPeriods.forEach(p => {
      const existing = periods.find(ep => ep.id === p.id);
      if (!existing || JSON.stringify(existing) !== JSON.stringify(p)) {
        dbService.savePeriod(p);
      }
    });
    
    periods.forEach(p => {
      if (!nextPeriods.find(np => np.id === p.id)) {
        dbService.deletePeriod(p.id);
      }
    });
  };

  const renderView = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-emerald-500 animate-pulse">
           <span className="text-4xl mb-4 font-black">🏸</span>
           <span className="text-sm font-black uppercase tracking-widest">数据联接中...</span>
        </div>
      );
    }

    switch (view) {
      case 'dashboard':
        return <Dashboard players={players} periods={periods} activePeriod={activePeriod} onPeriodChange={setSelectedPeriodId} />;
      case 'players':
        return <PlayersList players={players} setPlayers={handleSetPlayers} periods={periods} />;
      case 'periods':
        return <PeriodsList periods={periods} setPeriods={handleSetPeriods} players={players} setPlayers={handleSetPlayers} />;
      case 'finance':
        return <FinanceReport periods={periods} players={players} initialPeriodId={selectedPeriodId} onPeriodChange={setSelectedPeriodId} />;
      default:
        return <Dashboard players={players} periods={periods} activePeriod={activePeriod} onPeriodChange={setSelectedPeriodId} />;
    }
  };

  const tabs: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: '首页', icon: <Icons.Home /> },
    { id: 'periods', label: '结算', icon: <Icons.Calendar /> },
    { id: 'players', label: '人员', icon: <Icons.Users /> },
    { id: 'finance', label: '报表', icon: <Icons.Chart /> },
  ];

  return (
    <PasswordGate>
      <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-50 relative overflow-hidden">
        {/* Header */}
        <header className="bg-emerald-600 text-white p-4 shadow-md sticky top-0 z-50 pt-safe shrink-0">
          <h1 className="text-xl font-black flex items-center justify-center">
            <span className="mr-2">🏸</span>
            菜鸟基地小帮手
          </h1>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto no-scrollbar pb-32">
          {renderView()}
        </main>

        {/* Modern Floating Tab Bar */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50 px-4 pb-safe pointer-events-none">
          <nav className="mb-4 bg-white/90 backdrop-blur-xl border border-white/20 shadow-[0_-10px_30px_-5px_rgba(0,0,0,0.05),0_10px_20px_-5px_rgba(0,0,0,0.1)] rounded-[2.5rem] flex justify-around items-center p-2 pointer-events-auto">
            {tabs.map((tab) => {
              const isActive = view === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id)}
                  className={`relative flex flex-col items-center justify-center flex-1 transition-all duration-300 active:scale-95 py-2 group`}
                >
                  {/* Active Background Bubble */}
                  <div className={`absolute inset-x-1 inset-y-0 rounded-3xl transition-all duration-300 -z-10 ${
                    isActive ? 'bg-emerald-600/10 scale-100 opacity-100' : 'scale-75 opacity-0'
                  }`} />
                  
                  {/* Icon Wrapper */}
                  <div className={`transition-all duration-300 ${
                    isActive ? 'text-emerald-600 transform -translate-y-0.5' : 'text-gray-400'
                  }`}>
                    {tab.icon}
                  </div>
                  
                  {/* Label */}
                  <span className={`text-[10px] mt-1 font-black transition-all duration-300 tracking-wider ${
                    isActive ? 'text-emerald-700 opacity-100' : 'text-gray-400 opacity-70'
                  }`}>
                    {tab.label}
                  </span>

                  {/* Top Dot Indicator */}
                  {isActive && (
                     <div className="absolute top-0 w-1 h-1 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </PasswordGate>
  );
};

export default App;
