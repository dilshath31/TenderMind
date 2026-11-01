import { Building2 } from 'lucide-react'
import { TenderHubWrapper } from './TenderHubWrapper'

export function MatchHub() {
  return (
    <TenderHubWrapper
      toolPath="match"
      icon={<Building2 size={22} />}
      title="Eligibility Match"
      description="AI checks your company profile against all tender requirements and gives a match score."
      hint="Generate the Executive Summary for a tender first, then run Eligibility Match. Make sure your Company Profile has turnover, certifications, and GST/PAN filled in."
    />
  )
}
