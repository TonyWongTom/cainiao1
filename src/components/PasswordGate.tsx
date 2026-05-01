
import React, { useState, useEffect } from 'react';

interface PasswordGateProps {
  children: React.ReactNode;
}

const PasswordGate: React.FC<PasswordGateProps> = ({ children }) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean>(() => {
    return localStorage.getItem('isAuthorized') === 'true';
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = import.meta.env.VITE_APP_PASSWORD || 'cainiao';
    if (password === correctPassword) {
      setIsAuthorized(true);
      localStorage.setItem('isAuthorized', 'true');
      setError(false);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  if (isAuthorized) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-xl border border-gray-100 animate-slide-up text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
          🏸
        </div>
        <h2 className="text-xl font-black text-gray-800 mb-2">菜鸟基地小帮手</h2>
        <p className="text-sm text-gray-500 mb-8 font-medium">请输入访问密码以继续</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="访问密码"
            className={`w-full px-4 py-3 bg-gray-50 border ${error ? 'border-red-500 animate-shake' : 'border-gray-200'} rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-center text-lg tracking-widest`}
            autoFocus
          />
          {error && <p className="text-[10px] font-bold text-red-500 animate-fade-in">❌ 密码错误，请重试</p>}
          
          <button
            type="submit"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
          >
            确认进入
          </button>
        </form>
      </div>
      
      <p className="mt-8 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
        Badminton Club Financial Helper v2.0
      </p>
    </div>
  );
};

export default PasswordGate;
