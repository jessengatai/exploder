import { useNode } from '../../contexts/NodeContext'
import Navbar from './Navbar'

export default function Layout({ children }) {
  const nodeInfo = useNode()

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar nodeInfo={nodeInfo} />
      <main className="mx-auto">
        {children}
      </main>
    </div>
  )
} 