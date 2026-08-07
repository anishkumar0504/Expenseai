import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Transaction, Category } from '../types.js';
import { FileSpreadsheet, Download, Upload, X, Check, AlertCircle, Sparkles } from 'lucide-react';

interface ExcelImportExportModalsProps {
  token: string;
  transactions: Transaction[];
  categories: Category[];
  isOpenExport: boolean;
  setIsOpenExport: (open: boolean) => void;
  isOpenImport: boolean;
  setIsOpenImport: (open: boolean) => void;
  onImportSuccess: () => void;
}

export const ExcelImportExportModals: React.FC<ExcelImportExportModalsProps> = ({
  token,
  transactions,
  categories,
  isOpenExport,
  setIsOpenExport,
  isOpenImport,
  setIsOpenImport,
  onImportSuccess,
}) => {
  // Export State
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [exportRange, setExportRange] = useState<'all' | 'current_month' | 'custom'>('all');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  // Import State
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  // ---------- EXPORT LOGIC ----------
  const handlePerformExport = () => {
    let filtered = [...transactions];

    if (exportRange === 'current_month') {
      const now = new Date();
      const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      filtered = filtered.filter((t) => t.date.startsWith(currentMonthPrefix));
    } else if (exportRange === 'custom') {
      if (exportStartDate) filtered = filtered.filter((t) => t.date >= exportStartDate);
      if (exportEndDate) filtered = filtered.filter((t) => t.date <= exportEndDate);
    }

    // Format rows for sheet
    const exportData = filtered.map((t) => ({
      ID: t.id,
      Date: t.date,
      Category: t.categoryName || '',
      Subcategory: t.subcategoryName || '',
      Amount: t.amount,
      'Payment Mode': t.paymentMode,
      Description: t.description || '',
      Tags: t.tags ? t.tags.join(', ') : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

    const fileName = `Expenses_${new Date().toISOString().split('T')[0]}.${exportFormat}`;

    if (exportFormat === 'csv') {
      XLSX.writeFile(workbook, fileName, { bookType: 'csv' });
    } else {
      XLSX.writeFile(workbook, fileName, { bookType: 'xlsx' });
    }

    setIsOpenExport(false);
  };

  // ---------- IMPORT LOGIC ----------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet);

        setParsedRows(rawJson);
        setImportStatus(`Found ${rawJson.length} row(s) ready to preview`);
      } catch (err) {
        console.error('Error parsing file', err);
        setImportStatus('Error reading Excel file. Please ensure valid .xlsx or .csv format.');
      }
    };

    reader.readAsBinaryString(file);
  };

  const handlePerformImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    setImportStatus('Uploading transactions...');

    // Transform imported sheet rows into standard backend format
    const transformedTransactions = parsedRows.map((row) => {
      const catName = row.Category || row.category || 'Miscellaneous';
      const catObj = categories.find((c) => c.name.toLowerCase() === String(catName).toLowerCase()) || categories[0];

      return {
        categoryId: catObj?.id || 'cat_1',
        subcategoryId: catObj?.subcategories[0]?.id || 'sub_1_1',
        amount: parseFloat(row.Amount || row.amount || 0) || 0,
        paymentMode: (row['Payment Mode'] || row.paymentMode || 'UPI').toUpperCase(),
        date: row.Date || row.date || new Date().toISOString().split('T')[0],
        description: row.Description || row.description || null,
        tags: row.Tags ? String(row.Tags).split(',').map((t) => t.trim()) : [],
      };
    });

    try {
      const res = await fetch('/api/expenses/import-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ transactions: transformedTransactions }),
      });

      if (res.ok) {
        onImportSuccess();
        setIsOpenImport(false);
        setParsedRows([]);
      } else {
        const errData = await res.json();
        setImportStatus(errData.error || 'Failed to bulk import');
      }
    } catch (err) {
      console.error('Error in bulk import', err);
      setImportStatus('Failed to upload transactions');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      {/* EXPORT MODAL */}
      {isOpenExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div
            data-lenis-prevent
            className="w-full max-w-md bg-[#121212] border border-white/10 rounded-2xl p-6 text-white relative shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
          >
            <button
              onClick={() => setIsOpenExport(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold mb-1 flex items-center gap-2 text-white">
              <FileSpreadsheet className="w-5 h-5 text-gray-300" /> Export Excel / CSV
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Download your transactions in Excel (.xlsx) or CSV format.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportFormat('xlsx')}
                    className={`py-2.5 rounded-xl font-bold border transition-colors ${
                      exportFormat === 'xlsx'
                        ? 'bg-white text-black font-bold border-white'
                        : 'bg-[#181818] border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`py-2.5 rounded-xl font-bold border transition-colors ${
                      exportFormat === 'csv'
                        ? 'bg-white text-black font-bold border-white'
                        : 'bg-[#181818] border-white/10 text-gray-400 hover:text-white'
                    }`}
                  >
                    CSV (.csv)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  Date Range
                </label>
                <select
                  value={exportRange}
                  onChange={(e) => setExportRange(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[#181818] border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-white/30"
                >
                  <option value="all" className="bg-[#181818]">All Time ({transactions.length} records)</option>
                  <option value="current_month" className="bg-[#181818]">Current Month Only</option>
                  <option value="custom" className="bg-[#181818]">Custom Date Range</option>
                </select>
              </div>

              {exportRange === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-gray-400 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#181818] border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">End Date</label>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#181818] border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsOpenExport(false)}
                  className="px-4 py-2.5 rounded-xl font-semibold text-gray-300 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePerformExport}
                  className="px-5 py-2.5 rounded-xl font-bold text-black bg-white hover:bg-gray-200 transition-colors flex items-center gap-1.5 shadow-md"
                >
                  <Download className="w-4 h-4" /> Download File
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {isOpenImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div
            data-lenis-prevent
            className="w-full max-w-lg bg-[#121212] border border-white/10 rounded-2xl p-6 text-white relative shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
          >
            <button
              onClick={() => setIsOpenImport(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold mb-1 flex items-center gap-2 text-white">
              <Upload className="w-5 h-5 text-gray-300" /> Import Expenses from Excel / CSV
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Upload a spreadsheet with headers: Date, Category, Amount, Payment Mode, Description, Tags.
            </p>

            <div className="space-y-4 text-xs">
              <div className="border-2 border-dashed border-white/20 hover:border-white/40 rounded-2xl p-6 text-center bg-[#181818] transition-all relative">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <FileSpreadsheet className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="font-semibold text-gray-200">
                  {importFileName ? importFileName : 'Click or Drag Excel / CSV file here'}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">Supports .xlsx and .csv files</p>
              </div>

              {importStatus && (
                <p className="text-xs font-semibold text-white text-center">{importStatus}</p>
              )}

              {/* Preview Rows Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <span className="text-gray-400 font-semibold block">Preview (First 3 rows):</span>
                  <div className="max-h-36 overflow-y-auto space-y-1 bg-[#181818] p-2 rounded-xl border border-white/10">
                    {parsedRows.slice(0, 3).map((r, idx) => (
                      <div key={idx} className="flex justify-between text-[11px] text-gray-300 py-1 border-b border-white/5">
                        <span>{r.Date || r.date || 'Today'}</span>
                        <span className="font-medium text-white">{r.Category || r.category || 'Misc'}</span>
                        <span className="font-bold text-white">₹{r.Amount || r.amount || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenImport(false)}
                  className="px-4 py-2.5 rounded-xl font-semibold text-gray-300 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePerformImport}
                  disabled={parsedRows.length === 0 || isImporting}
                  className="px-5 py-2.5 rounded-xl font-bold text-black bg-white hover:bg-gray-200 transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-md"
                >
                  {isImporting ? 'Importing...' : `Import ${parsedRows.length} Records`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
