import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { logsAPI } from '../services/logsApi';
import { AlertTriangle, X, Filter, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorEntry {
  id: string;
  user_id: string | null;
  page: string | null;
  error_type: string;
  message: string;
  stack: string | null;
  metadata: Record<string, unknown> | null;
  user_agent: string | null;
  created_at: string;
}

export default function AdminLogs() {
  const [levelFilter, setLevelFilter] = useState('');
  const [pageFilter, setPageFilter] = useState('');
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-logs', levelFilter, pageFilter, limit, offset],
    queryFn: () => logsAPI.getClientErrors({ level: levelFilter, from: undefined, to: undefined, limit, offset }),
    refetchInterval: 30000,
  });

  const errors: ErrorEntry[] = data?.data?.errors || [];
  const total: number = data?.data?.total || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Error Logs</h1>
          <p className="text-gray-500">Client-side error telemetry ({total} total)</p>
        </div>
        <button onClick={() => refetch()} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          Refresh
        </button>
      </div>

      <div className="flex gap-4 items-center bg-white p-4 rounded-xl shadow-sm">
        <Filter className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Filter by error type (e.g. error, warn)"
          value={levelFilter}
          onChange={(e) => { setLevelFilter(e.target.value); setOffset(0); }}
          className="px-3 py-2 border rounded-lg"
        />
        <input
          type="text"
          placeholder="Filter by page"
          value={pageFilter}
          onChange={(e) => { setPageFilter(e.target.value); setOffset(0); }}
          className="px-3 py-2 border rounded-lg"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : errors.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No client errors captured yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {errors.map((err) => (
                <>
                  <tr key={err.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        err.error_type === 'error' ? 'bg-red-100 text-red-700' :
                        err.error_type === 'warn' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {err.error_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{err.page || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{err.message}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(err.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpandedId(expandedId === err.id ? null : err.id)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        {expandedId === err.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                  {expandedId === err.id && (
                    <tr>
                      <td colSpan={5} className="px-4 py-3 bg-gray-50">
                        <div className="space-y-2 text-sm">
                          {err.stack && (
                            <div>
                              <p className="font-medium text-gray-700">Stack:</p>
                              <pre className="mt-1 p-2 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto whitespace-pre-wrap">{err.stack}</pre>
                            </div>
                          )}
                          {err.metadata && (
                            <div>
                              <p className="font-medium text-gray-700">Metadata:</p>
                              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs">{JSON.stringify(err.metadata, null, 2)}</pre>
                            </div>
                          )}
                          {err.user_agent && <p className="text-gray-500 text-xs">User Agent: {err.user_agent}</p>}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > limit && (
        <div className="flex justify-center gap-4">
          <button
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - limit))}
            className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-gray-500">
            Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
          </span>
          <button
            disabled={offset + limit >= total}
            onClick={() => setOffset(offset + limit)}
            className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}