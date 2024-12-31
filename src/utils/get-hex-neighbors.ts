export function getHexNeighbors(hex: string): string[] {
  // Extract column (letter) and row (number) from the input hex string
  const match = hex.toUpperCase().match(/^([A-Z])(\d+)$/);
  if (!match) {
    throw new Error(`Invalid hex format ${hex}. Use a letter followed by a number, e.g., 'P17'.`);
  }

  const column = match[1];
  const row = parseInt(match[2], 10);

  // Convert column letter to a numerical index for calculations
  const columnIndex = column.charCodeAt(0) - "A".charCodeAt(0);

  // Determine the offsets for neighbors based on whether the column is even or odd
  const isEvenColumn = columnIndex % 2 === 0;

  // Neighboring offsets for flat-topped hex grid
  const neighborOffsets = isEvenColumn
    ? [
      { col: -1, row:  0 }, // Upper left
      { col:  0, row: -1 }, // Upper right
      { col:  1, row:  0 }, // Right
      { col:  1, row:  1 }, // Lower right
      { col:  0, row:  1 }, // Lower left
      { col: -1, row:  1 }  // Left
    ]
    : [
      { col: -1, row: -1 }, // Upper left
      { col:  0, row: -1 }, // Upper right
      { col:  1, row: -1 }, // Right
      { col:  1, row:  0 }, // Lower right
      { col:  0, row:  1 }, // Lower left
      { col: -1, row:  0 }  // Left
    ];

  // Generate the neighbors
  const neighbors = neighborOffsets.map(offset => {
    const newColumnIndex = columnIndex + offset.col;
    const newRow = row + offset.row;

    // Ensure the new column index is valid (within 0-25 for A-Z)
    if (newColumnIndex < 0 || newColumnIndex > 25) {
      return null;
    }

    const newColumn = String.fromCharCode(newColumnIndex + "A".charCodeAt(0));

    // Ensure the new row is valid (within 8-27)
    if (newRow < 8 || newRow > 27) {
      return null;
    }

    return `${newColumn}${newRow}`;
  });

  // Filter out null values (invalid neighbors)
  const output = neighbors.filter(Boolean) as string[];
  return output.sort();
}
