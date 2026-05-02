import { Player, Period } from '../types';

const ACCESS_PASSWORD = 'cainiao';
const API_BASE = '/api';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

async function apiRequest(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  console.log(`[dbService] Requesting: ${options.method || 'GET'} ${url}`);
  
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Password': ACCESS_PASSWORD,
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      const errorText = await response.text(); // Read exactly once
      console.error('真正的后端报错是:', errorText);
      throw new Error(errorText);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return { success: true };
  } catch (err: any) {
    console.error(`[dbService] API Request Failed: ${url}`, err);
    throw err;
  }
}

export const dbService = {
  // Players
  async getPlayers(): Promise<Player[]> {
    try {
      return await apiRequest('/players');
    } catch (error: any) {
      console.error('Failed to get players:', error);
      return [];
    }
  },

  async savePlayer(player: Player): Promise<boolean> {
    try {
      await apiRequest('/players', {
        method: 'POST',
        body: JSON.stringify(player),
      });
      console.log('✅ 云端写入确认成功！');
      return true;
    } catch (e: any) {
      alert('❌ 写入云端失败：' + e.message);
      console.error('详细错误:', e);
      return false;
    }
  },

  async deletePlayer(playerId: string): Promise<boolean> {
    try {
      await apiRequest(`/players/${playerId}`, { method: 'DELETE' });
      return true;
    } catch (error: any) {
      console.error('Failed to delete player:', error);
      return false;
    }
  },

  // Periods
  async getPeriods(): Promise<Period[]> {
    try {
      return await apiRequest('/periods');
    } catch (error: any) {
      console.error('Failed to get periods:', error);
      return [];
    }
  },

  async savePeriod(period: Period): Promise<boolean> {
    try {
      await apiRequest('/periods', {
        method: 'POST',
        body: JSON.stringify(period),
      });
      return true;
    } catch (error: any) {
      console.error('Failed to save period:', error);
      return false;
    }
  },

  async deletePeriod(periodId: string): Promise<boolean> {
    try {
      await apiRequest(`/periods/${periodId}`, { method: 'DELETE' });
      return true;
    } catch (error: any) {
      console.error('Failed to delete period:', error);
      return false;
    }
  },

  // Simplified Subscriptions using polling
  subscribeToPlayers(callback: (players: Player[]) => void) {
    let active = true;
    const poll = async () => {
      if (!active) return;
      const players = await this.getPlayers();
      callback(players);
      setTimeout(poll, 10000); // Poll every 10 seconds
    };
    poll();
    return () => { active = false; };
  },

  subscribeToPeriods(callback: (periods: Period[]) => void) {
    let active = true;
    const poll = async () => {
      if (!active) return;
      const periods = await this.getPeriods();
      callback(periods);
      setTimeout(poll, 10000); // Poll every 10 seconds
    };
    poll();
    return () => { active = false; };
  }
};
