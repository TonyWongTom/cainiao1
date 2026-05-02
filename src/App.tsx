
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
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'error' | 'success'} | null>(null);

  // Clear notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load initial data and subscribe to real-time updates
  useEffect(() => {
    const unsubPlayers = dbService.subscribeToPlayers((syncedPlayers) => {
      setPlayers(syncedPlayers);
      if (syncedPlayers.length === 0) {
        // Initialize with default funders if totally empty (first run)
        INITIAL_FUNDERS.forEach(async (p) => {
          try {
            await dbService.savePlayer(p);
          } catch (e) {
            console.error("Failed to save initial player:", e);
          }
        });
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
    
    // Update local state immediately (Optimistic UI)
    const oldPlayers = [...players];
    setPlayers(nextPlayers);
    
    // Process changes
    const processChanges = async () => {
      try {
        // Check for deletions
        for (const p of players) {
          if (!nextPlayers.find(np => np.id === p.id)) {
            const ok = await dbService.deletePlayer(p.id);
            if (!ok) throw new Error("删除成员失败");
          }
        }
        
        // Check for additions/updates
        for (const p of nextPlayers) {
          const existing = players.find(ep => ep.id === p.id);
          if (!existing || JSON.stringify(existing) !== JSON.stringify(p)) {
            const ok = await dbService.savePlayer(p);
            if (!ok) throw new Error(`保存成员 ${p.name} 失败`);
          }
        }
      } catch (err: any) {
        console.error("Sync error:", err);
        setNotification({ 
          message: "数据同步到服务器失败，请检查网络权限", 
          type: 'error' 
        });
        // Rollback local state on fatal error
        // setPlayers(oldPlayers); 
      }
    };

    processChanges();
  };

  const handleSetPeriods: React.Dispatch<React.SetStateAction<Period[]>> = (action) => {
    const nextPeriods = typeof action === 'function' ? action(periods) : action;
    
    // Update local state immediately (Optimistic UI)
    const oldPeriods = [...periods];
    setPeriods(nextPeriods);
    
    const processChanges = async () => {
      try {
        for (const p of nextPeriods) {
          const existing = periods.find(ep => ep.id === p.id);
          if (!existing || JSON.stringify(existing) !== JSON.stringify(p)) {
            const ok = await dbService.savePeriod(p);
            if (!ok) throw new Error(`保存周期 ${p.name} 失败`);
          }
        }
        
        for (const p of periods) {
          if (!nextPeriods.find(np => np.id === p.id)) {
            const ok = await dbService.deletePeriod(p.id);
            if (!ok) throw new Error("删除周期失败");
          }
        }
      } catch (err: any) {
        console.error("Sync error:", err);
        setNotification({ 
          message: "周期数据同步失败", 
          type: 'error' 
        });
      }
    };

    processChanges();
  };

  const renderView = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-emerald-500 animate-pulse text-center p-8">
           <span className="text-5xl mb-6">🏸</span>
           <span className="text-sm font-black uppercase tracking-widest">数据联接中...</span>
           <p className="mt-4 text-xs text-gray-400 font-medium">如果是首次运行，请耐心等待 10-20 秒</p>
        </div>
      );
    }

    if (error && players.length === 0 && periods.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
          <span className="text-5xl mb-6">⚠️</span>
          <h2 className="text-lg font-black text-gray-800 mb-2">连接异常</h2>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <div className="bg-amber-50 p-4 rounded-xl text-xs text-amber-800 mb-6 text-left max-w-xs">
            <p className="font-bold mb-1">可能原因：</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>网络不稳定，请切换网络重试</li>
              <li>如果您使用了非默认数据库，请确认 <b>VITE_FIREBASE_DATABASE_ID</b> 已正确设置</li>
              <li>确认 Firebase 控制台已开启 Firestore 读写权限</li>
            </ul>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-emerald-600 text-white rounded-full text-sm font-bold shadow-lg active:scale-95 transition-transform"
          >
            重试
          </button>
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
        {/* Connection/Sync Toast */}
        {notification && (
          <div className={`fixed top-1 left-1/2 -translate-x-1/2 z-[300] px-6 py-2 rounded-2xl shadow-xl font-black text-xs animate-in slide-in-from-top duration-300 w-[90%] max-w-[320px] text-center ${
            notification.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white shadow-emerald-200'
          }`}>
            <div className="flex items-center justify-center gap-2">
              {notification.type === 'error' ? '⚠️' : '✅'} {notification.message}
            </div>
          </div>
        )}

        {/* Header */}
        <header className="bg-emerald-600 text-white p-4 shadow-md sticky top-0 z-50 pt-safe shrink-0">
          <div className="flex flex-col items-center justify-center">
            <h1 className="text-xl font-black flex items-center">
              <span className="mr-2">🏸</span>
              菜鸟基地小帮手
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : 'bg-white'}`}></div>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-80">Syncing with Cloud</span>
            </div>
          </div>
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
