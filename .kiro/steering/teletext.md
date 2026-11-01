---
inclusion: fileMatch
fileMatchPattern: "src/(engine|encode|pages)/**"
---
# Teletext Level 1 rules (ETS 300 706)

- 25 rows x 40 columns. Row 0 is the header: page number, service name, date and clock.
- Each cell holds a 7-bit character. Codes 0x00-0x1F are spacing attributes: they occupy a cell (shown as a space) and change the attributes of the following cells on that row.
  - 0x01-0x07 alpha colour red, green, yellow, blue, magenta, cyan, white
  - 0x08 flash, 0x09 steady, 0x0C normal height, 0x0D double height
  - 0x11-0x17 mosaic (graphics) colour, same order as alpha colours
  - 0x18 conceal, 0x19 contiguous mosaics, 0x1A separated mosaics
  - 0x1C black background, 0x1D new background (current foreground colour becomes background)
  - 0x1E hold mosaics, 0x1F release mosaics
- Attributes reset to white alpha, steady, normal height, black background at the start of every row.
- Mosaic characters: in graphics mode codes 0x20-0x3F and 0x60-0x7F are 2x3 block sextants (bit 0 top-left, 1 top-right, 2 middle-left, 3 middle-right, 4 bottom-left, 6 bottom-right; bit 5 is always set). Codes 0x40-0x5F show as letters even in graphics mode.
- Double height: the row below a double-height row is not displayed separately (it is covered); leave it blank.
- Fastext: four coloured links (red, green, yellow, cyan) per page to other page numbers.
- TTI output (VBIT2 / MRG format): `DE,`, `PN,<mag><page>00`, `SC,0000`, `PS,8000`, `OL,<row>,<text with control codes as ESC + (code + 0x40)>`, `FL,<red>,<green>,<yellow>,<cyan>,8ff,100`.
