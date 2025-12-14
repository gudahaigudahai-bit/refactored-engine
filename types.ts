export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Message {
  id: string;
  role: Role;
  text: string;
  timestamp: Date;
}

export interface ChildProfile {
  id: string;
  name: string;
  age: number;
  gender: 'boy' | 'girl' | 'other';
  temperament?: string;
}

export interface AppState {
  messages: Message[];
  isLoading: boolean;
  childProfile: ChildProfile | null;
}