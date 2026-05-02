import { Player, Period } from '../types';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // For Firebase Hosting endpoints
    if (hostname.includes('web.app') || hostname.includes('firebaseapp.com')) {
      return 'https://cainiao1-707432563956.us-central1.run.app/api';
    }
  }
  return '/api';
};

const API_BASE = getApiBaseUrl();

export const getAccessPassword = () => localStorage.getItem('app_password') || 'cainiao';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

async function apiRequest(path: string, options: RequestInit = {}) {
  // Ensure path doesn't have double slashes
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE}${cleanPath}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'X-API-Password': getAccessPassword(),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, { ...options, headers });
    
    // READ TEXT ONCE - Safety first
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error(`[API Error] ${response.status} for ${url}:`, responseText);
      // Attempt to find error message in JSON if possible
      try {
        const errJson = JSON.parse(responseText);
        throw new Error(errJson.error || responseText);
      } catch {
        throw new Error(responseText || `HTTP ${response.status}`);
      }
    }
    
    // Check if we should expect JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        return JSON.parse(responseText);
      } catch (e) {
        console.warn('[API] Expected JSON but failed to parse:', responseText);
        return { success: true };
      }
    }
    
    return { success: true };
  } catch (err: any) {
    console.error(`[dbService] Request Failed: ${url}`, err.message);
    throw err;
  }
}

export const dbService = {
  async login(password: string): Promise<boolean> {
    try {
      const res = await apiRequest('/login', {
        method: 'POST',
        headers: { 'X-API-Password': password },
        body: JSON.stringify({ password }),
      });
      if (res && res.success) {
        localStorage.setItem('app_password', password);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  },

  // Players
  async getPlayers(): Promise<Player[]> {
    try {
      const data = await apiRequest('/players');
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error('Failed to get players:', error);
      return [];
    }
  },

  async savePlayer(player: Player): Promise<boolean> {
    try {
      const resp = await apiRequest('/players', {
        method: 'POST',
        body: JSON.stringify(player),
      });
      if (resp && resp.success && resp.id) {
        console.log('✅ 云端写入确认成功！ID:', resp.id);
        return true;
      } else {
        throw new Error('未收到有效的云端返回ID');
      }
    } catch (e: any) {
      alert('❌ 写入云端失败：' + e.message);
      console.error('详细错误:', e);
      throw e;
    }
  },

  async deletePlayer(playerId: string): Promise<boolean> {
    try {
      await apiRequest(`/players/${playerId}`, { method: 'DELETE' });
      return true;
    } catch (error: any) {
      console.error('Failed to delete player:', error);
      throw error;
    }
  },

  // Periods
  async getPeriods(): Promise<Period[]> {
    try {
      const data = await apiRequest('/periods');
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error('Failed to get periods:', error);
      return [];
    }
  },

  async savePeriod(period: Period): Promise<boolean> {
    try {
      const resp = await apiRequest('/periods', {
        method: 'POST',
        body: JSON.stringify(period),
      });
      if (resp && resp.success && resp.id) {
        console.log('✅ 云端写入确认成功！ID:', resp.id);
        return true;
      } else {
        throw new Error('未收到有效的云端返回ID');
      }
    } catch (error: any) {
      alert('❌ 写入云端失败：' + error.message);
      console.error('Failed to save period:', error);
      throw error;
    }
  },

  async deletePeriod(periodId: string): Promise<boolean> {
    try {
      await apiRequest(`/periods/${periodId}`, { method: 'DELETE' });
      return true;
    } catch (error: any) {
      console.error('Failed to delete period:', error);
      throw error;
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
