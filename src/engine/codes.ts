// Alpha colour codes 0x01-0x07
export const RED = 0x01;
export const GREEN = 0x02;
export const YELLOW = 0x03;
export const BLUE = 0x04;
export const MAGENTA = 0x05;
export const CYAN = 0x06;
export const WHITE = 0x07;

// Mosaic colour codes 0x11-0x17
export const MOSAIC_RED = 0x11;
export const MOSAIC_GREEN = 0x12;
export const MOSAIC_YELLOW = 0x13;
export const MOSAIC_BLUE = 0x14;
export const MOSAIC_MAGENTA = 0x15;
export const MOSAIC_CYAN = 0x16;
export const MOSAIC_WHITE = 0x17;

// Flash/steady attributes
export const FLASH = 0x08;
export const STEADY = 0x09;

// Height attributes
export const NORMAL_HEIGHT = 0x0c;
export const DOUBLE_HEIGHT = 0x0d;

// Conceal
export const CONCEAL = 0x18;

// Mosaic mode
export const CONTIGUOUS_MOSAIC = 0x19;
export const SEPARATED_MOSAIC = 0x1a;

// Background
export const BLACK_BACKGROUND = 0x1c;
export const NEW_BACKGROUND = 0x1d;

// Hold/release mosaics
export const HOLD_MOSAICS = 0x1e;
export const RELEASE_MOSAICS = 0x1f;

// Colour to RGB mapping
export const COLOUR_RGB: Record<number, [number, number, number]> = {
  // Alpha colours
  [RED]: [255, 0, 0],
  [GREEN]: [0, 255, 0],
  [YELLOW]: [255, 255, 0],
  [BLUE]: [0, 0, 255],
  [MAGENTA]: [255, 0, 255],
  [CYAN]: [0, 255, 255],
  [WHITE]: [255, 255, 255],

  // Mosaic colours (same RGB as alpha)
  [MOSAIC_RED]: [255, 0, 0],
  [MOSAIC_GREEN]: [0, 255, 0],
  [MOSAIC_YELLOW]: [255, 255, 0],
  [MOSAIC_BLUE]: [0, 0, 255],
  [MOSAIC_MAGENTA]: [255, 0, 255],
  [MOSAIC_CYAN]: [0, 255, 255],
  [MOSAIC_WHITE]: [255, 255, 255],

  // Black (background)
  [BLACK_BACKGROUND]: [0, 0, 0],
};

// Common names for colours
export const COLOUR_NAMES: Record<number, string> = {
  [RED]: 'red',
  [GREEN]: 'green',
  [YELLOW]: 'yellow',
  [BLUE]: 'blue',
  [MAGENTA]: 'magenta',
  [CYAN]: 'cyan',
  [WHITE]: 'white',
  [MOSAIC_RED]: 'red',
  [MOSAIC_GREEN]: 'green',
  [MOSAIC_YELLOW]: 'yellow',
  [MOSAIC_BLUE]: 'blue',
  [MOSAIC_MAGENTA]: 'magenta',
  [MOSAIC_CYAN]: 'cyan',
  [MOSAIC_WHITE]: 'white',
};
