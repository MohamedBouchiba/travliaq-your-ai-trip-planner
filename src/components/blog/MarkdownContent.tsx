import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { useEffect } from "react";

type MarkdownContentProps = {
  content: string;
};

export const MarkdownContent = ({ content }: MarkdownContentProps) => {
  useEffect(() => {
    // Add IDs to headings for table of contents
    const addHeadingIds = () => {
      const headings = document.querySelectorAll("article h1, article h2, article h3");
      headings.forEach((heading) => {
        const text = heading.textContent || "";
        const id = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        heading.id = id;
      });
    };

    addHeadingIds();
  }, [content]);

  return (
    <div className="prose prose-lg max-w-none 
      prose-headings:text-travliaq-deep-blue prose-headings:font-bold prose-headings:scroll-mt-24
      prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-8
      prose-h2:text-3xl prose-h2:mb-4 prose-h2:mt-8 prose-h2:border-b prose-h2:border-border prose-h2:pb-2
      prose-h3:text-2xl prose-h3:mb-3 prose-h3:mt-6
      prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-4
      prose-a:text-travliaq-turquoise prose-a:no-underline hover:prose-a:underline prose-a:font-medium
      prose-strong:text-travliaq-deep-blue prose-strong:font-semibold
      prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
      prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
      prose-li:text-foreground prose-li:mb-2
      prose-blockquote:border-l-4 prose-blockquote:border-travliaq-turquoise prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground
      prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:text-travliaq-deep-blue prose-code:font-mono
      prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
      prose-img:rounded-lg prose-img:shadow-md prose-img:my-8
      prose-hr:border-border prose-hr:my-8
      prose-table:w-full prose-table:border-collapse
      prose-th:bg-muted prose-th:p-3 prose-th:text-left prose-th:font-semibold
      prose-td:border prose-td:border-border prose-td:p-3
    ">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {content}
      </ReactMarkdown>
    </div>
  );
};
