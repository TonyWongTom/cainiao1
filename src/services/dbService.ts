import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  runTransaction,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Player, Period } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error Detailed: ', JSON.stringify(errInfo, null, 2));
  throw error;
}

export const dbService = {
  // Players
  async getPlayers(): Promise<Player[]> {
    const path = 'players';
    console.log('正在从集合抓取数据:', path);
    try {
      const q = query(collection(db, path), orderBy('name'));
      const snapshot = await getDocs(q);
      console.log('Firestore 返回的原始数据 (getPlayers):', snapshot.docs.map(d => d.data()));
      return snapshot.docs.map(doc => doc.data() as Player);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async savePlayer(player: Player): Promise<boolean> {
    const path = `players/${player.id}`;
    try {
      await setDoc(doc(db, 'players', player.id), player);
      return true;
    } catch (error) {
      console.error("Firestore SAVE_PLAYER Error:", error);
      handleFirestoreError(error, OperationType.WRITE, path);
      return false;
    }
  },

  async deletePlayer(playerId: string): Promise<boolean> {
    const path = `players/${playerId}`;
    try {
      await deleteDoc(doc(db, 'players', playerId));
      return true;
    } catch (error) {
      console.error("Firestore DELETE_PLAYER Error:", error);
      handleFirestoreError(error, OperationType.DELETE, path);
      return false;
    }
  },

  // Periods
  async getPeriods(): Promise<Period[]> {
    const path = 'periods';
    try {
      const q = query(collection(db, path), orderBy('startDate', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Period);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async savePeriod(period: Period): Promise<boolean> {
    const path = `periods/${period.id}`;
    try {
      await setDoc(doc(db, 'periods', period.id), period);
      return true;
    } catch (error) {
      console.error("Firestore SAVE_PERIOD Error:", error);
      handleFirestoreError(error, OperationType.WRITE, path);
      return false;
    }
  },

  async deletePeriod(periodId: string): Promise<boolean> {
    const path = `periods/${periodId}`;
    try {
      await deleteDoc(doc(db, 'periods', periodId));
      return true;
    } catch (error) {
      console.error("Firestore DELETE_PERIOD Error:", error);
      handleFirestoreError(error, OperationType.DELETE, path);
      return false;
    }
  },

  // Real-time synchronization
  subscribeToPlayers(callback: (players: Player[]) => void) {
    return onSnapshot(collection(db, 'players'), (snapshot) => {
      const players = snapshot.docs.map(doc => doc.data() as Player);
      console.log('Firestore 返回的原始数据 (subscribeToPlayers):', players);
      callback(players);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'players'));
  },

  subscribeToPeriods(callback: (periods: Period[]) => void) {
    const q = query(collection(db, 'periods'), orderBy('startDate', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const periods = snapshot.docs.map(doc => doc.data() as Period);
      callback(periods);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'periods'));
  }
};
