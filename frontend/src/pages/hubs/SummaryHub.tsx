import { BarChart3 } from 'lucide-react'
import { TenderHubWrapper } from './TenderHubWrapper'

export function SummaryHub() {
  return (
    <TenderHubWrapper
      toolPath="summary"
      icon={<BarChart3 size={22} />}
      title="Tender Summary"
      description="Generate a 14-field AI executive summary from uploaded tender documents."
      hint="Select a tender below. Make sure its documents are in 'Ready' status before generating."
    />
  )
}
