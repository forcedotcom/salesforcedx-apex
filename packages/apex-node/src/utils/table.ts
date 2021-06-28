/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import stripAnsi from 'strip-ansi';

const COLUMN_SEPARATOR = '  ';
const COLUMN_FILLER = ' ';
const HEADER_FILLER = '─';

export interface Row {
  [column: string]: string;
}

export interface Column {
  key: string;
  label: string;
}

export class Table {
  public createTable(rows: Row[], cols: Column[], title?: string): string {
    if (!rows) {
      throw Error('rows cannot be undefined');
    }
    if (!cols) {
      throw Error('columns cannot be undefined');
    }
    const maxColWidths = this.calculateMaxColumnWidths(rows, cols);
    let table = title ? `=== ${title}` : '';

    let columnHeader = '';
    let headerSeparator = '';
    cols.forEach((col, index, arr) => {
      const width = maxColWidths.get(col.key);
      if (width) {
        const isLastCol = index === arr.length - 1;
        columnHeader += this.fillColumn(
          col.label || col.key,
          width,
          COLUMN_FILLER,
          isLastCol
        );
        headerSeparator += this.fillColumn('', width, HEADER_FILLER, isLastCol);
      }
    });

    if (columnHeader && headerSeparator) {
      table += `${title ? '\n' : ''}${columnHeader}\n${headerSeparator}\n`;
    }

    rows.forEach(row => {
      let outputArray: string[] = [];
      cols.forEach((col, colIndex, colArr) => {
        const cell = row[col.key];
        const isLastCol = colIndex === colArr.length - 1;
        const columnStartLength = (stripAnsi(outputArray[0]) || '').length;
        cell.split('\n').forEach((line, lineIndex) => {
          let outputRow = outputArray[lineIndex] || '';
          const cellWidth = maxColWidths.get(col.key);
          if (cellWidth) {
            if (lineIndex === 0) {
              outputRow += this.fillColumn(
                line,
                cellWidth,
                COLUMN_FILLER,
                isLastCol
              );
            } else {
              // If the cell is multiline, add an additional line to the table
              // and pad it to the beginning of the current column.
              // Only add col separator padding once to additional line.
              outputRow +=
                this.fillColumn('', columnStartLength, COLUMN_FILLER, true) +
                this.fillColumn(line, cellWidth, COLUMN_FILLER, isLastCol);
            }
          }
          outputArray[lineIndex] = outputRow;
        });
      });

      const tableWidth =
        cols.reduce((sum, col) => sum + maxColWidths.get(col.key), 0) +
        COLUMN_SEPARATOR.repeat(cols.length - 1).length;

      outputArray = outputArray.map(row => {
        const rowLength = tableWidth - stripAnsi(row).length;
        if (rowLength > 0) {
          return row + COLUMN_FILLER.repeat(rowLength);
        }
        return row;
      });

      table += outputArray.join('\n') + '\n';
    });

    return table;
  }

  private calculateMaxColumnWidths(
    rows: Row[],
    cols: Column[]
  ): Map<string, number> {
    const maxColWidths = new Map<string, number>();
    cols.forEach(col => {
      rows.forEach(row => {
        const cell = row[col.key];
        if (cell === undefined) {
          throw Error(`Row is missing the key ${col.key}`);
        }

        let maxColWidth = maxColWidths.get(col.key);
        if (maxColWidth === undefined) {
          maxColWidth = stripAnsi(col.label || col.key).length;
          maxColWidths.set(col.key, maxColWidth);
        }

        // if a cell is multiline, find the line that's the longest
        const longestLineWidth = stripAnsi(cell)
          .split('\n')
          .reduce((maxLine, line) =>
            line.length > maxLine.length ? line : maxLine
          ).length;
        if (longestLineWidth > maxColWidth) {
          maxColWidths.set(col.key, longestLineWidth);
        }
      });
    });
    return maxColWidths;
  }

  private fillColumn(
    label: string,
    width: number,
    filler: string,
    isLastCol: boolean
  ): string {
    let filled = label;
    for (let i = 0; i < width - stripAnsi(label).length; i++) {
      filled += filler;
    }
    if (!isLastCol) {
      filled += COLUMN_SEPARATOR;
    }
    return filled;
  }
}
