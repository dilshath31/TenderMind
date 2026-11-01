import { BookOpen } from 'lucide-react'
import { TenderHubWrapper } from './TenderHubWrapper'

export function ReportHub() {
  return (
    <TenderHubWrapper
      toolPath="report"
      icon={<BookOpen size={22} />}
      title="Analysis Report"
      description="View and print a full compliance report combining the executive summary and eligibility results."
      hint="Run Executive Summary and Eligibility Match for a tender first, then open the Analysis Report."
    />
  )
}
