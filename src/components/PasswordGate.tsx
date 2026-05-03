
import React, { useState, useEffect } from 'react';
import { dbService, getAccessPassword } from '../services/dbService';

interface PasswordGateProps {
  children: React.ReactNode;
}

const PasswordGate: React.FC<PasswordGateProps> = ({ children }) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    return localStorage.getItem('isAuthorized') === 'true';
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await dbService.login(password);
    if (success) {
      setIsAuthorized(true);
      localStorage.setItem('isAuthorized', 'true');
      setError(false);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const storedAuth = localStorage.getItem('isAuthorized') === 'true';
      if (storedAuth) {
        const password = getAccessPassword();
        const success = await dbService.login(password);
        if (!success) {
          setIsAuthorized(false);
          localStorage.removeItem('isAuthorized');
        } else {
           setIsAuthorized(true);
        }
      }
    };
    checkAuth();
  }, []);

  if (isAuthorized) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-transparent px-4">
      <div className="w-full max-w-sm bg-white/20 backdrop-blur-md rounded-[2.5rem] p-8 shadow-xl border border-white/30 animate-slide-up text-center">
        <div className="w-16 h-16 bg-white/30 backdrop-blur-md text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl border border-white/40">
          🏸
        </div>
        <h2 className="text-xl font-black text-emerald-900 mb-2">菜鸟基地小帮手</h2>
        <p className="text-sm text-emerald-800/80 mb-8 font-medium">请输入访问密码以继续</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="访问密码"
            className={`w-full px-4 py-3 bg-white/30 backdrop-blur-md border ${error ? 'border-red-500 animate-shake' : 'border-white/40'} rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-center text-lg tracking-widest text-emerald-900 placeholder:text-emerald-800/50`}
            autoFocus
          />
          {error && <p className="text-[10px] font-bold text-red-500 animate-fade-in">❌ 密码错误，请重试</p>}
          
          <button
            type="submit"
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-black shadow-[0_0_20px_rgba(16,185,129,0.5)] ring-1 ring-white/50 active:scale-95 transition-all"
          >
            确认进入
          </button>
        </form>
      </div>
      
      <p className="mt-8 text-[10px] text-emerald-900/60 font-bold uppercase tracking-widest">
        Badminton Club Financial Helper v2.0
      </p>
    </div>
  );
};

export default PasswordGate;
