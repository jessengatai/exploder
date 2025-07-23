import '../styles/globals.css'
import { NodeProvider } from '../contexts/NodeContext'
import Layout from '../components/Layout/Layout'
 
export default function App({ Component, pageProps }) {
  return (
    <NodeProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </NodeProvider>
  )
} 