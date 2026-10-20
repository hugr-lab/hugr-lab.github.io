// src/components/RemoteMarkdown.js
import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from '@theme/CodeBlock';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';

export default function RemoteMarkdown({ 
  url, 
  fallback = "Loading...", 
  transform 
}) {
  // The hugr-lab.com copy serves these files itself (remoteSnapshot in docusaurus.config.ts).
  const {siteConfig} = useDocusaurusContext();
  const local = useBaseUrl('/remote' + new URL(url).pathname);
  const src = siteConfig.customFields?.docsTarget === 'ionos' ? local : url;
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetch(src)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch');
        return response.text();
      })
      .then(text => {
        setContent(transform ? transform(text) : text);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [src, transform]);
  
  if (loading) return <div className="alert alert--info">{fallback}</div>;
  if (error) return <div className="alert alert--danger">Error: {error}</div>;
  
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code(props) {
            const { children, className, node, ...rest } = props;
            const match = /language-(\w+)/.exec(className || '');
            const isBlock = node?.position &&
              node.position.start.line !== node.position.end.line;

            if (match) {
              return (
                <CodeBlock language={match[1]}>
                  {String(children).replace(/\n$/, '')}
                </CodeBlock>
              );
            }

            // Code block without language
            if (isBlock) {
              return (
                <CodeBlock>
                  {String(children).replace(/\n$/, '')}
                </CodeBlock>
              );
            }

            // Inline code
            return (
              <code className={className} {...rest}>
                {children}
              </code>
            );
          },
          pre(props) {
            const { children } = props;
            return <>{children}</>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}