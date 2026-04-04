import React from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'

type MarkdownViewerProps = {
  value: string;
};

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ value }) => {

  return (
    <ReactMarkdown
      rehypePlugins={[rehypeRaw, rehypeSanitize]} // HTML support with XSS sanitization
      components={{
        // Headers
        h1: ({ children }) => (
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4 mt-8 pb-2 border-b border-gray-200 dark:border-gray-700">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3 mt-7 pb-2 border-b border-gray-200 dark:border-gray-700">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 mt-6">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2 mt-5">
            {children}
          </h4>
        ),
        h5: ({ children }) => (
          <h5 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2 mt-4">
            {children}
          </h5>
        ),
        h6: ({ children }) => (
          <h6 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 mt-4 uppercase tracking-wide">
            {children}
          </h6>
        ),
        p: ({ children }) => (
          <p className="mb-2 text-gray-600 dark:text-gray-400 leading-relaxed">
            {children}
          </p>
        ),
        // Lists
        ul: ({ children }) => (
          <ul
            className={`list-disc pl-6 mb-4 space-y-1`}
          >
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol
            className={`list-decimal pl-6 mb-4 space-y-1`}
          >
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="text-gray-700 dark:text-gray-300 leading-relaxed text-base">
            {children}
          </li>
        ),

        // Text formatting
        strong: ({ children }) => (
          <strong className="font-semibold text-gray-900 dark:text-gray-100">
            {children}
          </strong>
        ),
        em: ({ children }) => (
          <em className="italic text-gray-800 dark:text-gray-200">
            {children}
          </em>
        ),
        del: ({ children }) => (
          <del className="line-through text-gray-500 dark:text-gray-500">
            {children}
          </del>
        ),
        img: ({ src, alt }) => (
          <img
            src={src}
            alt={alt || ""}
            className="my-6 mb-8 rounded-lg max-w-full min-h-72 h-auto m-auto"
          />
        ),
        code: ({ children }) => (
          <div className="my-6 mb-8 rounded-lg max-w-full h-auto p-4 bg-gray-900 text-gray-100 overflow-x-auto">
            <code className="text-gray-100 px-1 rounded font-mono">
              {children}
            </code>
          </div>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-primary underline hover:text-primary/80 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        // Tables (from remark-gfm)
        table: ({ children }) => (
          <div className="overflow-x-auto my-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-gray-50 dark:bg-gray-800">
            {children}
          </thead>
        ),
        tbody: ({ children }) => (
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {children}
          </tbody>
        ),
        tr: ({ children }) => (
          <tr className="even:bg-gray-50 dark:even:bg-gray-800/50">
            {children}
          </tr>
        ),
        th: ({ children }) => (
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
            {children}
          </td>
        ),
      }}
    >
      {value.replace(/(?<!\]\()https?:\/\/[^\s)]+/g, url => `[${url}](${url})`) || "_No content provided._"}
    </ReactMarkdown>
  )
}

export default MarkdownViewer
