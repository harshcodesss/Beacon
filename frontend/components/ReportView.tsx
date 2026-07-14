import ReactMarkdown from "react-markdown";

// Renders the raw report markdown as a readable document body. Structured
// data (verdicts, hypotheses, citations) gets its own token-chip treatment
// via VerdictHeader/HypothesisRow; this component stays a plain, reliable
// markdown-to-prose fallback so the report always renders even when the
// agent core only returns report_md.
export function ReportView({ markdown }: { markdown: string }) {
  return (
    <article className="prose prose-sm max-w-none text-[13px] leading-relaxed text-zinc-700 prose-headings:font-semibold prose-headings:text-ink prose-h1:text-lg prose-h2:mt-5 prose-h2:text-[11px] prose-h2:uppercase prose-h2:tracking-wide prose-h2:text-zinc-500 prose-code:rounded prose-code:border prose-code:border-edge prose-code:bg-surface prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:font-normal prose-code:text-zinc-700 prose-code:before:content-none prose-code:after:content-none prose-li:my-1 prose-p:leading-relaxed">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </article>
  );
}
