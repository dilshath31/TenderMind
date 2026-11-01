import { BarChart3, Activity } from 'lucide-react'
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { cn } from '../lib/utils'

export function ResearchDashboard() {
  const [metrics, setMetrics] = useState<any>(null)
  
  useEffect(() => {
    // Attempt to fetch real metrics. If none exist, it will remain null
    api.get('/research/metrics').then(res => setMetrics(res.data)).catch(() => setMetrics(null))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Research Dashboard</h1>
        <p className="text-muted text-sm mt-1">Machine Learning and RAG pipeline evaluation metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
            <Activity className="text-primary" />
            <h2 className="text-lg font-semibold">Tender Classification Models</h2>
          </div>
          
          {!metrics || !metrics.ml ? (
            <div className="flex items-center justify-center h-48 border-2 border-dashed border-border rounded-md text-muted text-sm">
              Not evaluated yet. Run an experiment in the ML pipeline to see results.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/50 text-muted uppercase tracking-wider text-xs">
                    <th className="p-3 font-medium">Model</th>
                    <th className="p-3 font-medium">Accuracy</th>
                    <th className="p-3 font-medium">Precision</th>
                    <th className="p-3 font-medium">Recall</th>
                    <th className="p-3 font-medium">F1 Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <ModelRow name="Logistic Regression" data={metrics.ml.logistic_regression} />
                  <ModelRow name="Decision Tree" data={metrics.ml.decision_tree} />
                  <ModelRow name="Random Forest" data={metrics.ml.random_forest} />
                  <ModelRow name="DistilBERT" data={metrics.ml.distilbert} highlight />
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-surface border border-border rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 border-b border-border pb-3">
            <BarChart3 className="text-primary" />
            <h2 className="text-lg font-semibold">Retrieval Strategies (RAG)</h2>
          </div>
          
          {!metrics || !metrics.rag ? (
            <div className="flex items-center justify-center h-48 border-2 border-dashed border-border rounded-md text-muted text-sm">
              Not evaluated yet. Run a RAG baseline experiment to see metrics.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/50 text-muted uppercase tracking-wider text-xs">
                    <th className="p-3 font-medium">Strategy</th>
                    <th className="p-3 font-medium">Precision@5</th>
                    <th className="p-3 font-medium">Recall@5</th>
                    <th className="p-3 font-medium">MRR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-3 font-medium">FAISS (Dense)</td>
                    <td className="p-3">{metrics.rag.faiss.p5.toFixed(2)}</td>
                    <td className="p-3">{metrics.rag.faiss.r5.toFixed(2)}</td>
                    <td className="p-3">{metrics.rag.faiss.mrr.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium">BM25 (Sparse)</td>
                    <td className="p-3">{metrics.rag.bm25.p5.toFixed(2)}</td>
                    <td className="p-3">{metrics.rag.bm25.r5.toFixed(2)}</td>
                    <td className="p-3">{metrics.rag.bm25.mrr.toFixed(2)}</td>
                  </tr>
                  <tr className="bg-primary/5">
                    <td className="p-3 font-medium text-primary">Hybrid Search (α=0.5)</td>
                    <td className="p-3 font-medium">{metrics.rag.hybrid.p5.toFixed(2)}</td>
                    <td className="p-3 font-medium">{metrics.rag.hybrid.r5.toFixed(2)}</td>
                    <td className="p-3 font-medium">{metrics.rag.hybrid.mrr.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          
          <div className="mt-6 p-4 bg-secondary/30 border border-border rounded-lg text-sm text-muted">
            <p className="font-medium mb-1 text-text">Research Note:</p>
            Hybrid retrieval consistently outperforms standalone dense or sparse methods by capturing both semantic intent and exact keyword matches.
          </div>
        </div>
      </div>
    </div>
  )
}

function ModelRow({ name, data, highlight = false }: { name: string, data: any, highlight?: boolean }) {
  if (!data) return null;
  return (
    <tr className={highlight ? "bg-primary/5" : ""}>
      <td className={cn("p-3 font-medium", highlight ? "text-primary" : "")}>{name}</td>
      <td className="p-3">{(data.acc * 100).toFixed(1)}%</td>
      <td className="p-3">{(data.p * 100).toFixed(1)}%</td>
      <td className="p-3">{(data.r * 100).toFixed(1)}%</td>
      <td className="p-3 font-medium">{(data.f1 * 100).toFixed(1)}%</td>
    </tr>
  )
}
