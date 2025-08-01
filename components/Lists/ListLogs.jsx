export default function ListLogs({ logs }) {
  return (
    <div className="space-y-1 text-sm">
      {logs.map((log) => (
        <div key={log.id} className="py-1">
          <div className="text-slate-500">
            {log.message}
          </div>
        </div>
      ))}
      {logs.length === 0 && (
        <div className="text-center py-4 text-gray-400">
          No logs yet
        </div>
      )}
    </div>
  )
} 