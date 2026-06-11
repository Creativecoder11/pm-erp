import { Fragment, type ReactNode } from "react"
import { cn } from "@/lib/utils"

const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(INLINE_PATTERN).filter((part) => part !== "")

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`

    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>
    }

    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      )
    }

    const linkMatch = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part)
    if (linkMatch) {
      const [, label, url] = linkMatch
      const isSafeUrl = /^(https?:|mailto:)/i.test(url)
      if (isSafeUrl) {
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {label}
          </a>
        )
      }
      return <Fragment key={key}>{part}</Fragment>
    }

    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2 && !part.startsWith("**")) {
      return <em key={key}>{part.slice(1, -1)}</em>
    }

    return <Fragment key={key}>{part}</Fragment>
  })
}

interface MarkdownContentProps {
  content: string
  className?: string
}

/**
 * Minimal, dependency-free markdown renderer. Supports **bold**, *italic*,
 * `code`, [text](url) links, paragraphs, line breaks, and "- " bullet lists.
 * Builds React elements directly (no dangerouslySetInnerHTML) to avoid XSS.
 */
export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const lines = content.split("\n")
  const blocks: ReactNode[] = []
  let listItems: string[] = []
  let paragraphLines: string[] = []

  function flushList() {
    if (listItems.length === 0) return
    blocks.push(
      <ul key={`list-${blocks.length}`} className="list-disc space-y-0.5 pl-5">
        {listItems.map((item, i) => (
          <li key={i}>{renderInline(item, `list-${blocks.length}-${i}`)}</li>
        ))}
      </ul>
    )
    listItems = []
  }

  function flushParagraph() {
    if (paragraphLines.length === 0) return
    const key = `p-${blocks.length}`
    blocks.push(
      <p key={key} className="whitespace-pre-wrap">
        {paragraphLines.map((line, i) => (
          <Fragment key={i}>
            {i > 0 && <br />}
            {renderInline(line, `${key}-${i}`)}
          </Fragment>
        ))}
      </p>
    )
    paragraphLines = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    if (line.trim() === "") {
      flushParagraph()
      flushList()
      continue
    }

    const bulletMatch = /^[-*]\s+(.*)$/.exec(line.trim())
    if (bulletMatch) {
      flushParagraph()
      listItems.push(bulletMatch[1])
      continue
    }

    flushList()
    paragraphLines.push(line)
  }

  flushParagraph()
  flushList()

  if (blocks.length === 0) return null

  return <div className={cn("space-y-2 text-sm", className)}>{blocks}</div>
}
