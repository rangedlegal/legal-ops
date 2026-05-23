import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"

// react-pdf ships with Helvetica and Helvetica-Bold built-in
const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1e293b",
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#4f46e5",
  },
  headerLeft: {
    flex: 1,
  },
  firmName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#4f46e5",
    marginBottom: 2,
  },
  reportTitle: {
    fontSize: 11,
    color: "#475569",
  },
  headerRight: {
    alignItems: "flex-end",
  },
  clientName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
  },
  monthLabel: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
  },
  // Section headings
  sectionHeading: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    marginTop: 20,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  // Executive summary
  summaryText: {
    fontSize: 10,
    color: "#475569",
    lineHeight: 1.6,
    marginBottom: 4,
  },
  // Summary stats row
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 10,
  },
  statLabel: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  statValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
  },
  // Table
  table: {
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tableCell: {
    fontSize: 9,
    color: "#334155",
  },
  tableCellMuted: {
    fontSize: 9,
    color: "#64748b",
  },
  // Category badge
  categoryBadge: {
    backgroundColor: "#ede9fe",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  categoryBadgeText: {
    fontSize: 8,
    color: "#6d28d9",
    fontFamily: "Helvetica-Bold",
  },
  // Open tasks section
  openTaskItem: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#4f46e5",
    marginBottom: 5,
    backgroundColor: "#f8fafc",
  },
  openTaskTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
  },
  openTaskMeta: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 2,
  },
  // Category breakdown
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  categoryLabel: {
    fontSize: 9,
    color: "#334155",
  },
  categoryCount: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#4f46e5",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: "#94a3b8",
  },
  confidential: {
    fontSize: 8,
    color: "#94a3b8",
    fontFamily: "Helvetica-Bold",
  },
  noData: {
    fontSize: 9,
    color: "#94a3b8",
    fontStyle: "italic",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
})

export interface ReportTask {
  id: string
  title: string
  category: string
  status: string
  clientFacingSummary: string | null
  completedAt?: string | null
  dueDate?: string | null
  assignedTo?: { name: string | null } | null
}

export interface ReportData {
  firmName: string
  clientName: string
  month: number
  year: number
  completedTaskCount: number
  openTaskCount: number
  completedTasks: ReportTask[]
  openTasks: ReportTask[]
  categoryBreakdown: Record<string, number>
}

const CATEGORY_LABELS: Record<string, string> = {
  CONTRACT_REVIEW: "Contract Review",
  CONTRACT_DRAFTING: "Contract Drafting",
  NEGOTIATION: "Negotiation",
  EMPLOYMENT: "Employment",
  REGULATORY: "Regulatory",
  GOVERNANCE: "Governance",
  DISPUTE: "Dispute",
  GENERAL_ADVICE: "General Advice",
  ADMIN_LEGAL_OPS: "Admin / Legal Ops",
}

function getMonthLabel(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
  })
}

interface Props {
  data: ReportData
}

export function ReportDocument({ data }: Props) {
  const monthLabel = getMonthLabel(data.month, data.year)
  const generatedDate = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <Document
      title={`${data.clientName} — ${monthLabel} Legal Report`}
      author={data.firmName}
      subject="Monthly Legal Services Report"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.firmName}>{data.firmName}</Text>
            <Text style={styles.reportTitle}>Monthly Legal Services Report</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.clientName}>{data.clientName}</Text>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
          </View>
        </View>

        {/* Executive Summary */}
        <Text style={styles.sectionHeading}>Executive Summary</Text>
        <Text style={styles.summaryText}>
          This report provides a summary of legal services delivered to {data.clientName} for the period of{" "}
          {monthLabel}. During this period, {data.completedTaskCount} matter
          {data.completedTaskCount !== 1 ? "s were" : " was"} completed on your behalf. There are currently{" "}
          {data.openTaskCount} matter{data.openTaskCount !== 1 ? "s" : ""} in progress.
        </Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Completed Matters</Text>
            <Text style={styles.statValue}>{data.completedTaskCount}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>In Progress</Text>
            <Text style={styles.statValue}>{data.openTaskCount}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Categories</Text>
            <Text style={styles.statValue}>{Object.keys(data.categoryBreakdown).length}</Text>
          </View>
        </View>

        {/* Completed Tasks */}
        <Text style={styles.sectionHeading}>Completed Matters</Text>
        {data.completedTasks.length === 0 ? (
          <Text style={styles.noData}>No matters were completed this period.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Matter</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Category</Text>
            </View>
            {data.completedTasks.map((task, i) => (
              <View key={task.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <View style={{ flex: 3 }}>
                  <Text style={styles.tableCell}>{task.title}</Text>
                  {task.clientFacingSummary && (
                    <Text style={[styles.tableCellMuted, { marginTop: 2, lineHeight: 1.5 }]}>
                      {task.clientFacingSummary}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 2 }}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>
                      {CATEGORY_LABELS[task.category] ?? task.category}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Upcoming / In-Progress Tasks */}
        <Text style={styles.sectionHeading}>Matters in Progress</Text>
        {data.openTasks.length === 0 ? (
          <Text style={styles.noData}>No matters currently in progress.</Text>
        ) : (
          <View>
            {data.openTasks.map((task) => (
              <View key={task.id} style={styles.openTaskItem}>
                <Text style={styles.openTaskTitle}>{task.title}</Text>
                <Text style={styles.openTaskMeta}>
                  {CATEGORY_LABELS[task.category] ?? task.category}
                  {task.dueDate
                    ? `  ·  Due ${new Date(task.dueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`
                    : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Category Breakdown */}
        {Object.keys(data.categoryBreakdown).length > 0 && (
          <>
            <Text style={styles.sectionHeading}>Activity by Practice Area</Text>
            <View>
              {Object.entries(data.categoryBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => (
                  <View key={cat} style={styles.categoryRow}>
                    <Text style={styles.categoryLabel}>
                      {CATEGORY_LABELS[cat] ?? cat}
                    </Text>
                    <Text style={styles.categoryCount}>
                      {count} matter{count !== 1 ? "s" : ""}
                    </Text>
                  </View>
                ))}
            </View>
          </>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Generated {generatedDate} · {data.firmName}
          </Text>
          <Text style={styles.confidential}>CONFIDENTIAL</Text>
        </View>
      </Page>
    </Document>
  )
}
