/** RFC 4180 reader and writer. Pure; no I/O. */

export const BOM = "﻿";

const NEEDS_QUOTES = /[",\r\n]/;

function quote(field: string): string {
  return NEEDS_QUOTES.test(field) ? `"${field.replace(/"/g, '""')}"` : field;
}

/** Rows to CSV text with CRLF line ends and no trailing newline. */
export function stringifyCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((row) => row.map(quote).join(",")).join("\r\n");
}

/**
 * CSV text to rows. Handles a leading BOM, quoted fields with commas, doubled quotes and
 * embedded newlines, and CRLF, LF or CR line ends. Blank lines are dropped.
 */
export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let wasQuoted = false;

  const endField = () => {
    row.push(field);
    field = "";
    wasQuoted = false;
  };
  const endRow = () => {
    const blank = row.length === 0 && field === "" && !wasQuoted;
    endField();
    if (!blank) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && field === "") {
      quoted = true;
      wasQuoted = true;
    } else if (ch === ",") endField();
    else if (ch === "\n") endRow();
    else if (ch === "\r") {
      if (text[i + 1] === "\n") i++;
      endRow();
    } else field += ch;
  }
  if (field !== "" || row.length > 0 || wasQuoted) endRow();
  return rows;
}
