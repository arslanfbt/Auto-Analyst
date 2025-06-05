import { BackendReport, StoredReport } from '@/components/deep-analysis/types';

/**
 * Converts a backend report format to the frontend StoredReport format
 */
export function backendReportToStoredReport(report: BackendReport): StoredReport {
  return {
    id: report.report_uuid,
    report_id: report.report_id,
    goal: report.goal,
    status: report.status,
    startTime: report.start_time,
    endTime: report.end_time || report.created_at,
    summary: report.report_summary || 'No summary available',
    deep_questions: report.deep_questions,
    deep_plan: report.deep_plan,
    summaries: report.summaries || [],
    code: report.analysis_code,
    plotly_figs: report.plotly_figures || [],
    synthesis: report.synthesis || [],
    final_conclusion: report.final_conclusion,
    html_report: report.html_report,
    duration_seconds: report.duration_seconds,
    created_at: report.created_at,
    updated_at: report.updated_at
  };
}

/**
 * Converts an array of backend reports to frontend StoredReport format
 */
export function convertBackendReports(reports: BackendReport[]): StoredReport[] {
  return reports.map(backendReportToStoredReport);
}

/**
 * Extracts user ID from session data
 */
export function getUserIdFromSession(session: any): string | null {
  if (!session?.user) return null;
  
  if ((session.user as any).sub) {
    return (session.user as any).sub;
  } else if ((session.user as any).id) {
    return (session.user as any).id;
  }
  
  return null;
} 