"use client"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

// El modelo responde en Markdown. Sin renderizarlo, los asteriscos de las negritas
// y los guiones de las listas aparecen crudos en la burbuja.
// No se habilita HTML embebido: la respuesta del modelo se trata como texto, no como marcado.
export function CopilotAnswer({text}:{text:string}){
 return <div className="text-sm leading-relaxed"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{
  p:({children})=><p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
  strong:({children})=><strong className="font-semibold text-foreground">{children}</strong>,
  em:({children})=><em className="italic">{children}</em>,
  ul:({children})=><ul className="mb-2 flex list-disc flex-col gap-1 pl-5 last:mb-0">{children}</ul>,
  ol:({children})=><ol className="mb-2 flex list-decimal flex-col gap-1 pl-5 last:mb-0">{children}</ol>,
  li:({children})=><li className="leading-relaxed marker:text-muted-foreground">{children}</li>,
  code:({children})=><code className="rounded bg-background/70 px-1 py-0.5 font-mono text-[0.85em] text-primary">{children}</code>,
  pre:({children})=><pre className="mb-2 overflow-x-auto rounded-lg border bg-background/70 p-3 font-mono text-xs last:mb-0">{children}</pre>,
  a:({href,children})=><a href={href} className="text-primary underline underline-offset-2">{children}</a>,
  blockquote:({children})=><blockquote className="mb-2 border-l-2 border-primary/40 pl-3 text-muted-foreground last:mb-0">{children}</blockquote>,
  hr:()=><hr className="my-3 border-border"/>,
  // El prompt pide no usar encabezados; si aparecen, se degradan a texto destacado.
  h1:({children})=><p className="mb-1 font-semibold">{children}</p>,
  h2:({children})=><p className="mb-1 font-semibold">{children}</p>,
  h3:({children})=><p className="mb-1 font-semibold">{children}</p>,
  table:({children})=><div className="mb-2 overflow-x-auto last:mb-0"><table className="w-full border-collapse text-xs">{children}</table></div>,
  th:({children})=><th className="border-b px-2 py-1 text-left font-medium">{children}</th>,
  td:({children})=><td className="border-b border-border/50 px-2 py-1">{children}</td>,
 }}>{text}</ReactMarkdown></div>
}
