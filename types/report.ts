export interface ReportTask {
  id: string
  title: string
  category: string
  complexity: string
  clientFacingSummary?: string | null
  completedAt?: Date | string | null
  status: string
}

export interface ReportData {
  client: {
    id: string
    name: string
    subscriptionTier: string
    monthlyFee: number
  }
  month: number
  year: number
  completedTasks: ReportTask[]
  openTasks: ReportTask[]
  categoryBreakdown: Record<string, number>
  generatedBy?: string
  firmName?: string
}
