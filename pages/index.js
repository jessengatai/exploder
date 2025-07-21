import Head from 'next/head'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Head>
        <title>Exploder - Ethereum Block Scanner</title>
        <meta name="description" content="Self-hosted Ethereum block scanner for local development" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Exploder</h1>
          <p className="text-xl text-gray-300 mb-8">Self-hosted Ethereum block scanner for local development</p>
          
          <div className="space-y-4">
            <Link href="/blocks" className="block w-full max-w-md mx-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
              View Blocks
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
} 