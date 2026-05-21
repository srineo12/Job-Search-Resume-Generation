export default function IntegrationsPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Integrations</h1>
        <p className="text-gray-400 text-sm mt-1">API keys and service connections.</p>
      </div>

      <div className="space-y-4">
        <IntegrationCard
          icon="🤖"
          name="OpenAI"
          description="Used for job ranking and document generation."
          status="configured"
          note="API key set via environment variable."
        />
        <IntegrationCard
          icon="🕷️"
          name="Apify"
          description="Used to scrape job listings from Seek and Indeed."
          status="configured"
          note="API token set via environment variable."
        />
        <IntegrationCard
          icon="📁"
          name="Google Drive"
          description="Used to store generated resumes and cover letters."
          status="pending"
          note="OAuth connection — coming in Phase 6 when document generation is built."
        />
      </div>
    </div>
  )
}

function IntegrationCard({ icon, name, description, status, note }: {
  icon: string; name: string; description: string; status: 'configured' | 'pending' | 'error'; note: string
}) {
  const statusStyles = {
    configured: 'bg-green-900 text-green-400 border-green-800',
    pending: 'bg-yellow-900 text-yellow-400 border-yellow-800',
    error: 'bg-red-900 text-red-400 border-red-800',
  }
  const statusLabels = { configured: '✓ Configured', pending: '⏳ Pending', error: '✗ Error' }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <p className="text-white font-medium">{name}</p>
            <p className="text-gray-400 text-sm mt-0.5">{description}</p>
            <p className="text-gray-600 text-xs mt-2">{note}</p>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full border ${statusStyles[status]}`}>
          {statusLabels[status]}
        </span>
      </div>
    </div>
  )
}
