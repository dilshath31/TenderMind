import { MessageSquareText } from 'lucide-react'
import { TenderHubWrapper } from './TenderHubWrapper'

export function AiChatHub() {
  return (
    <TenderHubWrapper
      toolPath="chat"
      icon={<MessageSquareText size={22} />}
      title="AI Chat"
      description="Ask questions about any tender document and get instant AI-powered answers."
      hint="Select a tender below. The AI will answer from the uploaded documents only."
    />
  )
}
