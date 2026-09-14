import fs from 'fs';
import path from 'path';
import type { Match, Player, Attendance, FinancialEntry, GoalEvent, NotificationMessage } from '../../../core/domain/types.ts';

const DB_PATH = path.join(process.cwd(), '.mizpa-db.json');

export interface DBState {
  players: Player[];
  matches: Match[];
  attendances: Attendance[];
  financialEntries: FinancialEntry[];
  goals: GoalEvent[];
  notifications: NotificationMessage[];
}

export function loadDB(): DBState | null {
  if (process.env.NODE_ENV === 'test' || process.argv.includes('--test')) {
    return null;
  }
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      
      // Revive dates
      const reviveDate = (key: string, value: any) => {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          return new Date(value);
        }
        return value;
      };
      
      return JSON.parse(data, reviveDate);
    }
  } catch (err) {
    console.error('Failed to load DB:', err);
  }
  return null;
}

export function saveDB(state: Partial<DBState>) {
  if (process.env.NODE_ENV === 'test' || process.argv.includes('--test')) {
    return;
  }
  try {
    const current = loadDB() || { players: [], matches: [], attendances: [], financialEntries: [], goals: [], notifications: [] };
    const nextState = { ...current, ...state };
    fs.writeFileSync(DB_PATH, JSON.stringify(nextState, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save DB:', err);
  }
}
