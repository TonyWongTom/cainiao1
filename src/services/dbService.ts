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
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase';
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
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {}, // Simplified for now as we might not have auth setup in first turn
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const dbService = {
  // Players
  async getPlayers(): Promise<Player[]> {
    const path = 'players';
    try {
      const q = query(collection(db, path), orderBy('name'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Player);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async savePlayer(player: Player): Promise<void> {
    const path = `players/${player.id}`;
    try {
      await setDoc(doc(db, 'players', player.id), player);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deletePlayer(playerId: string): Promise<void> {
    const path = `players/${playerId}`;
    try {
      await deleteDoc(doc(db, 'players', playerId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
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

  async savePeriod(period: Period): Promise<void> {
    const path = `periods/${period.id}`;
    try {
      await setDoc(doc(db, 'periods', period.id), period);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deletePeriod(periodId: string): Promise<void> {
    const path = `periods/${periodId}`;
    try {
      await deleteDoc(doc(db, 'periods', periodId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Real-time synchronization
  subscribeToPlayers(callback: (players: Player[]) => void) {
    return onSnapshot(collection(db, 'players'), (snapshot) => {
      const players = snapshot.docs.map(doc => doc.data() as Player);
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
