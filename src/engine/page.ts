// 7-bit cell value (0x00-0x7F)
export type Cell = number;

export interface FastextLinks {
  red?: number;     // 100-899
  green?: number;
  yellow?: number;
  cyan?: number;
}

export interface Page {
  readonly number: number;       // 3-digit page number
  readonly grid: Uint8Array[];   // 25 rows x 40 cols
  readonly title: string;        // used by index
  fastext: FastextLinks;
  fetchedAt?: string;            // ISO-8601 from feed
  source?: string;               // feed source name/URL
}

export function makePage(number: number, title: string): Page {
  const grid: Uint8Array[] = [];
  for (let i = 0; i < 25; i++) {
    grid[i] = new Uint8Array(40);
    // Initialize all cells to 0x20 (space)
    for (let j = 0; j < 40; j++) {
      grid[i][j] = 0x20;
    }
  }
  return {
    number,
    grid,
    title,
    fastext: {},
  };
}
