import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './layouts/Layout'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { CompanyProfile } from './pages/CompanyProfile'
import { Tenders } from './pages/Tenders'
import { TenderUpload } from './pages/TenderUpload'
import { TenderChat } from './pages/TenderChat'
import { CompanyMatch } from './pages/CompanyMatch'
import { ResearchDashboard } from './pages/ResearchDashboard'
import { TenderSummary } from './pages/TenderSummary'
import { TenderCompare } from './pages/TenderCompare'
import { ReportPreview } from './pages/ReportPreview'
import { Documents } from './pages/Documents'
import { Settings } from './pages/Settings'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

// Hub pages — standalone pages with tender selector built in
import { AiChatHub }    from './pages/hubs/AiChatHub'
import { SummaryHub }   from './pages/hubs/SummaryHub'
import { MatchHub }     from './pages/hubs/MatchHub'
import { ReportHub }    from './pages/hubs/ReportHub'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="company"   element={<CompanyProfile />} />
              <Route path="tenders"   element={<Tenders />} />
              <Route path="upload"    element={<TenderUpload />} />
              <Route path="research"  element={<ResearchDashboard />} />
              <Route path="documents" element={<Documents />} />
              <Route path="settings"  element={<Settings />} />

              {/* Tenders sub-pages (with tender ID in URL) */}
              <Route path="tenders/:id/summary" element={<TenderSummary />} />
              <Route path="tenders/:id/chat"    element={<TenderChat />} />
              <Route path="tenders/:id/match"   element={<CompanyMatch />} />
              <Route path="tenders/:id/report"  element={<ReportPreview />} />
              <Route path="tenders/compare"     element={<TenderCompare />} />

              {/* AI Tool hub pages — tender selector built in, accessible from sidebar */}
              <Route path="ai/chat"    element={<AiChatHub />} />
              <Route path="ai/summary" element={<SummaryHub />} />
              <Route path="ai/match"   element={<MatchHub />} />
              <Route path="ai/report"  element={<ReportHub />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
