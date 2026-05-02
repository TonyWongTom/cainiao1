
import React from 'react';
import { Player, Period } from '../types';
import { formatDateChinese } from '../utils/dateUtils';

interface DashboardProps {
  players: Player[];
  periods: Period[];
  activePeriod: Period | null;
  onPeriodChange: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ players, periods, activePeriod, onPeriodChange }) => {
  // Total fees collected
  const grossFees = activePeriod?.sessions.reduce((acc, s) => acc + s.attendees.reduce((sum, a) => sum + a.fee, 0), 0) || 0;
  // Total extra session costs
  const sessionCosts = activePeriod?.sessions.reduce((acc, s) => acc + (s.sessionCost || 0), 0) || 0;
  
  // Total income is net (Gross Fees - Session Costs)
  const totalIncome = grossFees - sessionCosts;
  
  // Total expenses is just the base period cost (as sessions costs are deducted from income)
  const baseCourtCost = activePeriod?.courtCost || 0;
  const totalExpenses = baseCourtCost;
  
  const funderIdsCount = activePeriod?.funderIds?.length || 0;
  
  // Calculations per funder
  const investmentPerFunder = funderIdsCount > 0 ? totalExpenses / funderIdsCount : 0;
  const refundPerFunder = funderIdsCount > 0 ? totalIncome / funderIdsCount : 0;

  return (
    <div className="p-4 space-y-4">
      {/* Period Selection */}
      <div className="mb-2">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
          当前查看周期
        </label>
        <div className="relative">
          <select
            value={activePeriod?.id || ''}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-2xl p-4 text-xs font-black text-emerald-700 outline-none appearance-none shadow-sm cursor-pointer"
          >
            {Array.isArray(periods) && periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            {(!Array.isArray(periods) || periods.length === 0) && (
              <option value="" disabled>暂无结算周期</option>
            )}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
          </div>
        </div>
      </div>

      {/* Active Period Summary Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
            <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
            当前周期概览
          </h2>
          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-black uppercase tracking-wider shadow-sm">
            {activePeriod?.name || '无活跃周期'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
            <p className="text-[10px] text-emerald-600 font-bold mb-1 uppercase tracking-widest">本期净余收入</p>
            <p className="text-xl font-black text-emerald-700">¥{totalIncome.toFixed(2)}</p>
            <p className="text-[8px] text-emerald-400 opacity-60">已扣除单场加支</p>
          </div>
          <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
            <p className="text-[10px] text-red-600 font-bold mb-1 uppercase tracking-widest">本期基础成本</p>
            <p className="text-xl font-black text-red-700">¥{totalExpenses.toFixed(2)}</p>
            <p className="text-[8px] text-red-400 opacity-60">不含单场加支</p>
          </div>
        </div>

        {activePeriod && (
          <div className="space-y-3">
            <div className="p-5 bg-gray-900 text-white rounded-2xl shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl">👑</div>
               <p className="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">集资人财务结算 (每人)</p>
               
               <div className="flex justify-between items-end">
                 <div>
                   <p className="text-[10px] text-emerald-400 font-bold mb-0.5">本期返款 (↑)</p>
                   <p className="text-2xl font-black">¥{refundPerFunder.toFixed(2)}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-[10px] text-red-400 font-bold mb-0.5">预付投入 (↓)</p>
                   <p className="text-lg font-black opacity-80">¥{investmentPerFunder.toFixed(2)}</p>
                 </div>
               </div>

               <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                 <span className="text-[10px] font-bold text-gray-400 italic">本期集资人数：{funderIdsCount}人</span>
                 <span className={`text-xs font-black px-2 py-0.5 rounded ${refundPerFunder >= investmentPerFunder ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                   {refundPerFunder >= investmentPerFunder ? '盈余' : '超支'} ¥{Math.abs(refundPerFunder - investmentPerFunder).toFixed(2)}
                 </span>
               </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
          <p className="text-3xl mb-2">👥</p>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">成员档案</p>
          <p className="text-xl font-black text-gray-800">{players.length}</p>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center">
          <p className="text-3xl mb-2">📅</p>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">结算历史</p>
          <p className="text-xl font-black text-gray-800">{periods.length}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
