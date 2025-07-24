import TimeAgo from '../ui/TimeAgo'

export default function ListLogs({ logs }) {
  return (
    <div className="space-y-1 text-sm">
      {logs.map((log) => (
        <div key={log.id} className="py-1">
          <div className="text-gray-300">
            {log.message}
          </div>
          <div className="text-xs text-gray-500">
            <TimeAgo timestamp={log.timestamp} />
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