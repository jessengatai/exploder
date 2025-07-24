import '../styles/globals.css'
import { NodeProvider } from '../contexts/NodeContext'
import { BlockchainProvider } from '../contexts/BlockchainContext'
import Layout from '../components/Layout/Layout'
 
export default function App({ Component, pageProps }) {
  return (
    <NodeProvider>
      <BlockchainProvider>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </BlockchainProvider>
    </NodeProvider>
  )
} 