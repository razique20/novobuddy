export interface MemoryItem {
  id: string;
  category: 'preference' | 'fact' | 'project' | 'context';
  key: string;
  value: string;
  confidence: number;
  created_at: string;
  updated_at: string;
}

export interface IMemoryService {
  getMemories(): Promise<MemoryItem[]>;
  storeMemory(item: Omit<MemoryItem, 'id' | 'created_at' | 'updated_at'>): Promise<MemoryItem>;
  forgetMemory(id: string): Promise<void>;
  searchMemories(query: string): Promise<MemoryItem[]>;
}

export class MemoryServicePlaceholder implements IMemoryService {
  async getMemories(): Promise<MemoryItem[]> {
    // Coming in Phase 3 with vector persistence
    return [];
  }

  async storeMemory(): Promise<MemoryItem> {
    throw new Error('MemoryService will be enabled in Phase 3');
  }

  async forgetMemory(): Promise<void> {
    throw new Error('MemoryService will be enabled in Phase 3');
  }

  async searchMemories(): Promise<MemoryItem[]> {
    return [];
  }
}

export const memoryService = new MemoryServicePlaceholder();
