import React, { useState, useEffect, useCallback } from 'react';
import { DocumentRecord, DocumentStatus } from '../../../../shared/types';
import { api } from '../../services/api';
import { FileText, PlusCircle, Search, RefreshCw, Trash2 } from 'lucide-react';

export const MockDocuments: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [docNumber, setDocNumber] = useState<string>('');
  const [holderName, setHolderName] = useState<string>('');
  const [nationality, setNationality] = useState<string>('IND');
  const [dob, setDob] = useState<string>('1990-01-01');
  const [gender, setGender] = useState<string>('F');
  const [issueDate, setIssueDate] = useState<string>('2021-01-01');
  const [expiryDate, setExpiryDate] = useState<string>('2031-01-01');
  const [docStatus, setDocStatus] = useState<DocumentStatus>('ACTIVE');
  const [notes, setNotes] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.documents.list({
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined
      });
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await api.documents.create({
        document_number: docNumber,
        document_type: 'PASSPORT',
        holder_name: holderName,
        nationality,
        date_of_birth: dob,
        gender,
        issue_date: issueDate,
        expiry_date: expiryDate,
        status: docStatus,
        notes
      });
      setShowAddModal(false);
      setDocNumber('');
      setHolderName('');
      setNotes('');
      loadDocuments();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create document');
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: DocumentStatus) => {
    try {
      await api.documents.update(id, { status: newStatus });
      loadDocuments();
    } catch (err: any) {
      alert(err.message || 'Update failed');
    }
  };

  const handleDelete = async (id: number, number: string) => {
    if (confirm(`Are you sure you want to delete record ${number}?`)) {
      try {
        await api.documents.delete(id);
        loadDocuments();
      } catch (err: any) {
        alert(err.message || 'Delete failed');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-600">
              Central Identity Database Registry
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Mock Documents Registry</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain fictional government records, register Interpol/blacklist notices, and configure specimen profiles.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Register New Document</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by doc #, name or nationality..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadDocuments()}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-slate-50 text-slate-700 font-semibold"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="BLACKLISTED">BLACKLISTED</option>
            <option value="SUSPICIOUS">SUSPICIOUS</option>
          </select>

          <button
            onClick={loadDocuments}
            className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <span>Loading document registry...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4">Document #</th>
                  <th className="py-3 px-4">Holder Name</th>
                  <th className="py-3 px-4">Country</th>
                  <th className="py-3 px-4">DOB</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Registry Status</th>
                  <th className="py-3 px-4">Notes / Flags</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {d.document_number}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{d.holder_name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{d.nationality}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{d.date_of_birth}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{d.expiry_date}</td>
                    <td className="py-3.5 px-4">
                      <select
                        value={d.status}
                        onChange={(e) => handleUpdateStatus(d.id, e.target.value as DocumentStatus)}
                        className="text-[11px] font-bold py-1 px-2 border rounded-md bg-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="EXPIRED">EXPIRED</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                        <option value="BLACKLISTED">BLACKLISTED</option>
                        <option value="SUSPICIOUS">SUSPICIOUS</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px] truncate max-w-[200px]">
                      {d.notes || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(d.id, d.document_number)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Document Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center">
                <PlusCircle className="w-5 h-5 mr-2 text-blue-600" />
                Register Mock Identity Document
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                {actionError}
              </div>
            )}

            <form onSubmit={handleAddDocument} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Passport Number</label>
                  <input
                    type="text"
                    required
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value.toUpperCase())}
                    placeholder="P94821037"
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Holder Full Name</label>
                  <input
                    type="text"
                    required
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value.toUpperCase())}
                    placeholder="ANANYA VERMA"
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nationality (3-letter)</label>
                  <input
                    type="text"
                    required
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value.toUpperCase())}
                    placeholder="IND"
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="F">F (Female)</option>
                    <option value="M">M (Male)</option>
                    <option value="X">X (Other)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Initial Status</label>
                <select
                  value={docStatus}
                  onChange={(e) => setDocStatus(e.target.value as DocumentStatus)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="BLACKLISTED">BLACKLISTED (Interpol Flag)</option>
                  <option value="SUSPICIOUS">SUSPICIOUS</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Flag Reasons</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Security profile details or reason for alert..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
