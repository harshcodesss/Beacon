import ReactMarkdown from "react-markdown";

export function ReportView({ markdown }: { markdown: string }) {
  return (
    <article className="prose prose-zinc max-w-none prose-headings:font-semibold prose-h1:text-xl prose-h2:mt-6 prose-h2:text-base prose-h2:uppercase prose-h2:tracking-wide prose-h2:text-zinc-500 prose-code:rounded prose-code:border prose-code:border-edge prose-code:bg-surface prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:font-normal prose-code:text-zinc-700 prose-code:before:content-none prose-code:after:content-none prose-li:my-1 prose-p:leading-relaxed">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </article>
  );
}
