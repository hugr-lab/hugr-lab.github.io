// src/components/RemoteMarkdown.js
import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import CodeBlock from '@theme/CodeBlock';

export default function RemoteMarkdown({ 
  url, 
  fallback = "Loading...", 
  transform 
}) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetch(url)
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
  }, [url, transform]);
  
  if (loading) return <div className="alert alert--info">{fallback}</div>;
  if (error) return <div className="alert alert--danger">Error: {error}</div>;
  
  return (
    <div className="markdown">
      <ReactMarkdown
        components={{
          code(props) {
            const { children, className, ...rest } = props;
            const match = /language-(\w+)/.exec(className || '');
            
            // Если это блок кода с языком
            if (match) {
              return (
                <CodeBlock 
                  language={match[1]}
                  title="" // пустой title чтобы не было лишнего заголовка
                >
                  {String(children).replace(/\n$/, '')}
                </CodeBlock>
              );
            }
            
            // Инлайн код
            return (
              <code className={className} {...rest}>
                {children}
              </code>
            );
          },
          // Для pre блоков тоже добавим обработку
          pre(props) {
            const { children } = props;
            // Если внутри pre есть code с языком, то CodeBlock уже обработает
            // Иначе просто возвращаем как есть
            return <>{children}</>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}