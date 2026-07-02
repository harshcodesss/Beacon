export type IncidentStatus = "queued" | "running" | "done" | "failed";
export type IncidentTrigger = "manual" | "action" | "api";
export type Verdict = "accept" | "reject" | "inconclusive";

export interface Hypothesis {
  id: string;
  statement: string;
  suspected_component: string;
  evidence_to_confirm: string[];
  evidence_to_refute: string[];
  prior_confidence: number;
}

export interface VerdictItem {
  hypothesis_id: string;
  verdict: Verdict;
  confidence: number;
  evidence: string[];
  reasoning: string;
}

export interface Report {
  report_md: string;
  verdicts: VerdictItem[] | null;
  hypotheses: Hypothesis[] | null;
  accuracy_meta: Record<string, unknown> | null;
  tokens_used: number;
  tool_calls_used: number;
  created_at: string;
}

export interface IncidentSummary {
  id: string;
  project_id: string;
  status: IncidentStatus;
  trigger: IncidentTrigger;
  created_at: string;
  finished_at: string | null;
}

export interface IncidentDetail extends IncidentSummary {
  project_name: string | null;
  report: Report | null;
}

export interface IncidentPage {
  items: IncidentSummary[];
  total: number;
  page: number;
  page_size: number;
}

export interface BudgetConfig {
  max_tool_calls?: number;
  max_tokens?: number;
}

export interface LogSourceConfig {
  path?: string;
  budget?: BudgetConfig;
  delivery?: "in_app" | "email";
  demo?: boolean;
  [key: string]: unknown;
}

export interface Project {
  id: string;
  name: string;
  repo_full_name: string;
  log_source_type: string;
  log_source_config: LogSourceConfig;
  created_at: string;
}

export interface AccuracyStats {
  evaluated: number;
  top1_rate: number;
  top3_rate: number;
}

export interface ProjectWithStats extends Project {
  incident_count: number;
  recent_incidents: IncidentSummary[];
  accuracy: AccuracyStats | null;
}

export interface ApiKeyMeta {
  id: string;
  created_at: string;
  last_used_at: string | null;
}

export interface ApiKeyCreated {
  id: string;
  api_key: string;
  created_at: string;
}
