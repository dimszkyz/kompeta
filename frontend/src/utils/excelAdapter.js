// src/utils/excelAdapter.js
import ExcelJS from "exceljs";

export const XLSXAdapter = {
  utils: {
    book_new() {
      return new ExcelJS.Workbook();
    },

    json_to_sheet(jsonArray, opts = {}) {
      return {
        _json: jsonArray,
        _header: opts.header || null,
        _cols: [],
        _aoa: []
      };
    },

    aoa_to_sheet(aoa) {
      return {
        _json: [],
        _header: null,
        _cols: [],
        _aoa: aoa
      };
    },

    sheet_add_aoa(sheetObj, aoa) {
      if (!sheetObj._aoa) sheetObj._aoa = [];
      sheetObj._aoa.push(...aoa);
    },

    book_append_sheet(workbook, sheetObj, sheetName) {
      const ws = workbook.addWorksheet(sheetName);

      const aoa = sheetObj._aoa || [];
      if (aoa.length > 0) {
        aoa.forEach((row) => ws.addRow(row));
      }

      const json = sheetObj._json || [];
      if (json.length > 0) {
        const headers = sheetObj._header || Object.keys(json[0]);

        ws.columns = headers.map((h, i) => ({
          header: h,
          key: h,
          width: sheetObj._cols[i]?.wch || 20
        }));

        json.forEach((row) => ws.addRow(row));
      }
    },

    async readWorkbook(arrayBuffer) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      return {
        SheetNames: workbook.worksheets.map(ws => ws.name),
        Sheets: Object.fromEntries(
          workbook.worksheets.map(ws => [
            ws.name,
            { _ws: ws }
          ])
        )
      };
    },

    sheet_to_json(sheetObj) {
      const ws = sheetObj._ws;
      const rows = [];

      ws.eachRow((row) => {
        const values = row.values.slice(1);
        rows.push(values);
      });

      const header = rows[0] || [];
      const dataRows = rows.slice(1);

      return dataRows.map(r =>
        Object.fromEntries(
          header.map((h, i) => [String(h).trim(), r[i] ?? ""])
        )
      );
    },

    decode_range(sheetObj) {
      const ws = sheetObj._ws;
      return {
        s: { r: 0, c: 0 },
        e: { r: ws.rowCount - 1, c: ws.columnCount - 1 }
      };
    },

    parse_date_code(val) {
      if (typeof val !== "number") return null;
      const date = ExcelJS.DateUtils.excelToDate(val);
      return {
        y: date.getFullYear(),
        m: date.getMonth() + 1,
        d: date.getDate()
      };
    }
  },

  async writeFile(workbook, filename) {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};