import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import MonacoEditor from '@monaco-editor/react';
import styled from 'styled-components';
// @ts-ignore
import { html as beautifyHtml } from 'js-beautify';

const EditorContainer = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
`;

const EditorWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: calc(100vh - 100px);
`;

const ViewModeSelector = styled.div`
  display: flex;
  gap: 10px;
  background: #f5f7fa;
  padding: 10px;
  border-radius: 8px;
  align-items: center;
`;

const ViewModeButton = styled.button<{ active: boolean }>`
  padding: 8px 16px;
  background: ${props => props.active ? '#3b82f6' : 'white'};
  color: ${props => props.active ? 'white' : '#333'};
  border: 1px solid ${props => props.active ? '#3b82f6' : '#e1e4e8'};
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.active ? '#2563eb' : '#f5f7fa'};
  }
`;

const DualPaneContainer = styled.div<{ viewMode: string }>`
  display: ${props => props.viewMode === 'dual' ? 'flex' : 'block'};
  gap: 20px;
  flex: 1;
  overflow: hidden;
  height: 100%;
`;

const PaneWrapper = styled.div<{ isHidden?: boolean; isFullscreen?: boolean }>`
  flex: 1;
  display: ${props => props.isHidden ? 'none' : 'flex'};
  flex-direction: column;
  height: 100%;
  position: ${props => props.isFullscreen ? 'fixed' : 'relative'};
  
  ${props => props.isFullscreen && `
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: white;
    z-index: 1000;
    padding: 20px;
  `}
`;

const PaneHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background: #f5f7fa;
  border-radius: 8px 8px 0 0;
  border: 1px solid #e1e4e8;
  border-bottom: none;
`;

const PaneTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
`;

const PaneActions = styled.div`
  display: flex;
  gap: 8px;
`;

const IconButton = styled.button`
  padding: 6px;
  background: white;
  border: 1px solid #e1e4e8;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #6b7280;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f3f4f6;
    color: #333;
  }
`;

const HTMLEditorContainer = styled.div`
  flex: 1;
  border: 1px solid #e1e4e8;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
  
  .monaco-editor {
    width: 100% !important;
  }
`;

const PreviewContainer = styled.div`
  flex: 1;
  border: 1px solid #e1e4e8;
  border-radius: 0 0 8px 8px;
  overflow: auto;
  background: white;
  padding: 20px;
  
  /* Reset preview styles */
  * {
    margin-revert: revert;
    padding-revert: revert;
  }
`;

const PreviewFrame = styled.div`
  width: 100%;
  height: 100%;
  border: none;
  overflow: auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  
  &:focus {
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
  }
  
  /* Content styles */
  h1, h2, h3, h4, h5, h6 {
    margin-top: 24px;
    margin-bottom: 16px;
    font-weight: 600;
    line-height: 1.25;
  }
  
  p {
    margin-bottom: 16px;
    line-height: 1.6;
  }
  
  img {
    max-width: 100%;
    height: auto;
  }
  
  pre {
    background: #f6f8fa;
    padding: 16px;
    overflow: auto;
    border-radius: 6px;
    margin: 16px 0;
  }
  
  code {
    background: #f6f8fa;
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Consolas', 'Monaco', monospace;
  }
  
  blockquote {
    border-left: 4px solid #ddd;
    margin: 0;
    padding-left: 16px;
    color: #666;
  }
  
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 16px 0;
  }
  
  table th, table td {
    border: 1px solid #ddd;
    padding: 8px 12px;
    text-align: left;
  }
  
  table th {
    background: #f6f8fa;
    font-weight: 600;
  }
  
  ul, ol {
    margin-bottom: 16px;
    padding-left: 2em;
  }
  
  li {
    margin-bottom: 8px;
  }
`;

const TitleInput = styled.input`
  width: 100%;
  padding: 16px 20px;
  font-size: 32px;
  font-weight: 700;
  border: 1px solid #e1e4e8;
  border-radius: 12px;
  outline: none;
  transition: all 0.2s ease;
  
  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &::placeholder {
    color: #9ca3af;
  }
`;

const MetaContainer = styled.div`
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
`;

const MetaInput = styled.input`
  flex: 1;
  min-width: 200px;
  padding: 12px 16px;
  font-size: 14px;
  border: 1px solid #e1e4e8;
  border-radius: 8px;
  outline: none;
  transition: all 0.2s ease;
  
  &:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &::placeholder {
    color: #9ca3af;
  }
`;

const CustomToolbar = styled.div`
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #e1e4e8;
  margin-bottom: 10px;
`;

const ToolbarButton = styled.button`
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  
  &:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const StatusBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background: #f5f7fa;
  border-radius: 8px;
  font-size: 14px;
  color: #6b7280;
`;

const VisualToolbar = styled.div`
  display: flex;
  gap: 5px;
  padding: 10px;
  background: #f5f7fa;
  border-bottom: 1px solid #e1e4e8;
  flex-wrap: wrap;
`;

const ToolButton = styled.button<{ active?: boolean }>`
  padding: 6px 10px;
  background: ${props => props.active ? '#3b82f6' : 'white'};
  color: ${props => props.active ? 'white' : '#333'};
  border: 1px solid ${props => props.active ? '#3b82f6' : '#e1e4e8'};
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: ${props => props.active ? 600 : 500};
  transition: all 0.2s ease;
  min-width: 35px;
  
  &:hover {
    background: ${props => props.active ? '#2563eb' : '#f5f7fa'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ToolbarSeparator = styled.div`
  width: 1px;
  height: 24px;
  background: #e1e4e8;
  margin: 0 5px;
`;

const EditorContent = styled.div<{ isHidden?: boolean }>`
  flex: 1;
  border: 1px solid #e1e4e8;
  border-radius: ${props => props.isHidden ? '12px' : '0 0 8px 8px'};
  overflow: hidden;
  background: white;
  display: ${props => props.isHidden ? 'none' : 'block'};
  
  .tox-tinymce {
    border: none !important;
    height: 100% !important;
  }
  
  .tox-editor-header {
    border-bottom: 1px solid #e1e4e8 !important;
  }
  
  .tox-statusbar {
    border-top: 1px solid #e1e4e8 !important;
  }
`;

interface BlogPost {
  title: string;
  content: string;
  author: string;
  slug: string;
  tags: string;
}

type ViewMode = 'editor' | 'html' | 'preview' | 'dual';

const TinyMCEEditor: React.FC = () => {
  const [post, setPost] = useState<BlogPost>({
    title: '',
    content: '',
    author: '',
    slug: '',
    tags: ''
  });

  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('');
  const [wordCount, setWordCount] = useState<number>(0);
  const [viewMode, setViewMode] = useState<ViewMode>('dual');
  const [htmlCode, setHtmlCode] = useState<string>('');
  const [isEditorFullscreen, setIsEditorFullscreen] = useState<boolean>(false);
  const [isHtmlFullscreen, setIsHtmlFullscreen] = useState<boolean>(false);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState<boolean>(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingFromHtml = useRef<boolean>(false);
  const isUpdatingFromPreview = useRef<boolean>(false);

  // Autosave functionality
  useEffect(() => {
    const savedContent = localStorage.getItem('blog-draft');
    if (savedContent) {
      try {
        const parsed = JSON.parse(savedContent);
        setPost(parsed);
      } catch (e) {
        console.error('Failed to load saved draft:', e);
      }
    }
  }, []);

  const autoSave = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      localStorage.setItem('blog-draft', JSON.stringify(post));
      setAutoSaveStatus('Saved');
      
      setTimeout(() => {
        setAutoSaveStatus('');
      }, 2000);
    }, 1000);
  };

  useEffect(() => {
    autoSave();
  }, [post]);

  const handleCopyHTML = () => {
    navigator.clipboard.writeText(htmlCode).then(() => {
      alert('HTML content copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const handleExportHTML = () => {
    const blob = new Blob([htmlCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${post.slug || 'blog-post'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Format HTML with proper indentation
  const formatHtml = useCallback((html: string) => {
    try {
      return beautifyHtml(html, {
        indent_size: 2,
        indent_char: ' ',
        max_preserve_newlines: 1,
        preserve_newlines: true,
        wrap_line_length: 0,
        indent_inner_html: true,
        end_with_newline: true
      } as any);
    } catch (e) {
      return html;
    }
  }, []);

  // Update preview div
  const updatePreview = useCallback((html: string) => {
    if (previewRef.current && !isUpdatingFromPreview.current) {
      isUpdatingFromHtml.current = true;
      // Extract just the body content from the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const bodyContent = doc.body.innerHTML;
      previewRef.current.innerHTML = bodyContent;
      setTimeout(() => {
        isUpdatingFromHtml.current = false;
      }, 100);
    }
  }, []);

  // Update HTML from TinyMCE content
  const updateHtmlFromEditor = useCallback(() => {
    // Since we removed TinyMCE, generate HTML from post data
    const content = post.content;
      const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${post.title || 'Untitled'}</title>
    <meta name="author" content="${post.author}">
    <meta name="keywords" content="${post.tags}">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
        }
        img {
            max-width: 100%;
            height: auto;
        }
        pre {
            background: #f6f8fa;
            padding: 16px;
            overflow: auto;
            border-radius: 6px;
        }
        code {
            background: #f6f8fa;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Consolas', 'Monaco', monospace;
        }
        blockquote {
            border-left: 4px solid #ddd;
            margin: 0;
            padding-left: 16px;
            color: #666;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
        }
        table th, table td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
        }
        table th {
            background: #f6f8fa;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <article>
        <h1>${post.title}</h1>
        <div class="meta">
            <p>By ${post.author} | Tags: ${post.tags}</p>
        </div>
        ${content}
    </article>
</body>
</html>`;
      
      setHtmlCode(formatHtml(fullHtml));
      updatePreview(fullHtml);
  }, [post, formatHtml, updatePreview]);

  // Update post content from HTML code
  const updateEditorFromHtml = useCallback(() => {
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
    }
    
    updateTimerRef.current = setTimeout(() => {
      if (htmlCode && !isUpdatingFromPreview.current) {
        // Extract body content from HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlCode, 'text/html');
        const bodyContent = doc.body.innerHTML;
        
        // Update preview
        updatePreview(htmlCode);
        
        // Extract content for post state
        const article = doc.querySelector('article');
        if (article) {
          // Remove h1 and meta div as they're handled separately
          const h1 = article.querySelector('h1');
          const metaDiv = article.querySelector('.meta');
          if (h1) h1.remove();
          if (metaDiv) metaDiv.remove();
          
          const content = article.innerHTML.trim();
          setPost(prev => ({ ...prev, content }));
        }
      }
    }, 300);
  }, [htmlCode, updatePreview]);

  // Handle preview edits
  const handlePreviewEdit = useCallback(() => {
    if (previewRef.current && !isUpdatingFromHtml.current) {
      isUpdatingFromPreview.current = true;
      const content = previewRef.current.innerHTML;
      
      // Update the HTML code in Monaco editor
      const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${post.title || 'Untitled'}</title>
    <meta name="author" content="${post.author}">
    <meta name="keywords" content="${post.tags}">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
        }
        img {
            max-width: 100%;
            height: auto;
        }
        pre {
            background: #f6f8fa;
            padding: 16px;
            overflow: auto;
            border-radius: 6px;
        }
        code {
            background: #f6f8fa;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Consolas', 'Monaco', monospace;
        }
        blockquote {
            border-left: 4px solid #ddd;
            margin: 0;
            padding-left: 16px;
            color: #666;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
        }
        table th, table td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
        }
        table th {
            background: #f6f8fa;
            font-weight: 600;
        }
    </style>
</head>
<body>
${content}
</body>
</html>`;
      
      setHtmlCode(formatHtml(fullHtml));
      
      // Extract article content for post state
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      const article = doc.querySelector('article');
      if (article) {
        const h1 = article.querySelector('h1');
        const metaDiv = article.querySelector('.meta');
        if (h1) h1.remove();
        if (metaDiv) metaDiv.remove();
        
        const postContent = article.innerHTML.trim();
        setPost(prev => ({ ...prev, content: postContent }));
      }
      
      setTimeout(() => {
        isUpdatingFromPreview.current = false;
      }, 100);
    }
  }, [post.title, post.author, post.tags, formatHtml]);

  // Execute formatting commands
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    // Focus back on the preview
    if (previewRef.current) {
      previewRef.current.focus();
    }
    // Trigger input event to sync changes
    handlePreviewEdit();
  };

  // Insert link
  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      const selectedText = window.getSelection()?.toString() || url;
      document.execCommand('insertHTML', false, `<a href="${url}" target="_blank">${selectedText}</a>`);
      handlePreviewEdit();
    }
  };

  // Insert image
  const insertImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      document.execCommand('insertHTML', false, `<img src="${url}" alt="Image" />`);
      handlePreviewEdit();
    }
  };

  // Handle view mode changes
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setIsEditorFullscreen(false);
    setIsHtmlFullscreen(false);
    setIsPreviewFullscreen(false);
  };

  // Toggle fullscreen for specific pane
  const toggleFullscreen = (pane: 'editor' | 'html' | 'preview') => {
    switch(pane) {
      case 'editor':
        setIsEditorFullscreen(!isEditorFullscreen);
        setIsHtmlFullscreen(false);
        setIsPreviewFullscreen(false);
        break;
      case 'html':
        setIsHtmlFullscreen(!isHtmlFullscreen);
        setIsEditorFullscreen(false);
        setIsPreviewFullscreen(false);
        break;
      case 'preview':
        setIsPreviewFullscreen(!isPreviewFullscreen);
        setIsEditorFullscreen(false);
        setIsHtmlFullscreen(false);
        break;
    }
  };

  const insertTemplate = (type: string) => {
    let content = '';
    
    switch(type) {
      case 'blog':
        content = `<h2>Introduction</h2>
<p>Start your blog post with an engaging introduction...</p>

<h2>Main Content</h2>
<p>Develop your main points here...</p>

<h3>Subheading 1</h3>
<p>Details about your first point...</p>

<h3>Subheading 2</h3>
<p>Details about your second point...</p>

<h2>Conclusion</h2>
<p>Wrap up your thoughts and provide a call to action...</p>`;
        break;
      case 'tutorial':
        content = `<h2>What You'll Learn</h2>
<ul>
  <li>Key learning outcome 1</li>
  <li>Key learning outcome 2</li>
  <li>Key learning outcome 3</li>
</ul>

<h2>Prerequisites</h2>
<p>List any prerequisites here...</p>

<h2>Step 1: Getting Started</h2>
<p>First step instructions...</p>
<pre><code>// Example code
console.log('Hello World');</code></pre>

<h2>Step 2: Implementation</h2>
<p>Implementation details...</p>

<h2>Summary</h2>
<p>What we've accomplished...</p>`;
        break;
    }
    
    // Insert template content into the post
    setPost(prev => ({ ...prev, content: prev.content + content }));
  };

  // Initialize empty HTML content when component loads
  useEffect(() => {
    // Start with empty content instead of pre-filled template
    setHtmlCode('');
  }, []);

  // Update word count when content changes
  useEffect(() => {
    if (previewRef.current) {
      const text = previewRef.current.innerText || '';
      const words = text.trim().split(/\s+/).filter(word => word.length > 0);
      setWordCount(words.length);
    }
  }, [post.content]);

  // Handle Monaco editor layout on fullscreen changes
  useEffect(() => {
    if (monacoRef.current) {
      setTimeout(() => {
        monacoRef.current.layout();
      }, 300);
    }
  }, [isHtmlFullscreen, viewMode]);

  return (
    <EditorContainer>
      <EditorWrapper>
        <TitleInput
          type="text"
          placeholder="Enter your blog title..."
          value={post.title}
          onChange={(e) => setPost({ ...post, title: e.target.value })}
        />
        
        <MetaContainer>
          <MetaInput
            type="text"
            placeholder="Author name"
            value={post.author}
            onChange={(e) => setPost({ ...post, author: e.target.value })}
          />
          <MetaInput
            type="text"
            placeholder="URL slug (e.g., my-blog-post)"
            value={post.slug}
            onChange={(e) => setPost({ ...post, slug: e.target.value })}
          />
          <MetaInput
            type="text"
            placeholder="Tags (comma-separated)"
            value={post.tags}
            onChange={(e) => setPost({ ...post, tags: e.target.value })}
          />
        </MetaContainer>

        <ViewModeSelector>
          <span style={{ fontWeight: 600, marginRight: '10px' }}>View Mode:</span>
          <ViewModeButton 
            active={viewMode === 'html'} 
            onClick={() => handleViewModeChange('html')}
          >
            HTML Only
          </ViewModeButton>
          <ViewModeButton 
            active={viewMode === 'preview'} 
            onClick={() => handleViewModeChange('preview')}
          >
            Preview Only
          </ViewModeButton>
          <ViewModeButton 
            active={viewMode === 'dual'} 
            onClick={() => handleViewModeChange('dual')}
          >
            Dual View
          </ViewModeButton>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
            <ToolbarButton onClick={() => insertTemplate('blog')}>
              Blog Template
            </ToolbarButton>
            <ToolbarButton onClick={() => insertTemplate('tutorial')}>
              Tutorial Template
            </ToolbarButton>
            <ToolbarButton onClick={handleCopyHTML}>
              Copy HTML
            </ToolbarButton>
            <ToolbarButton onClick={handleExportHTML}>
              Export HTML
            </ToolbarButton>
          </div>
        </ViewModeSelector>

        <DualPaneContainer viewMode={viewMode}>
          {/* HTML Source Editor Pane */}
          <PaneWrapper 
            isHidden={viewMode === 'preview'}
            isFullscreen={isHtmlFullscreen}
          >
            <PaneHeader>
              <PaneTitle>HTML Source</PaneTitle>
              <PaneActions>
                <IconButton 
                  onClick={() => toggleFullscreen('html')}
                  title={isHtmlFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isHtmlFullscreen ? '✕' : '⛶'}
                </IconButton>
              </PaneActions>
            </PaneHeader>
            <HTMLEditorContainer>
              <MonacoEditor
                language="html"
                value={htmlCode}
                onChange={(value) => {
                  if (!isUpdatingFromPreview.current) {
                    setHtmlCode(value || '');
                    updateEditorFromHtml();
                  }
                }}
                onMount={(editor) => {
                  monacoRef.current = editor;
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  wordWrap: 'on',
                  theme: 'vs',
                  formatOnPaste: true,
                  formatOnType: true
                }}
              />
            </HTMLEditorContainer>
          </PaneWrapper>

          {/* Live Preview Pane */}
          <PaneWrapper 
            isHidden={viewMode === 'html'}
            isFullscreen={isPreviewFullscreen}
          >
            <PaneHeader>
              <PaneTitle>Live Preview</PaneTitle>
              <PaneActions>
                <IconButton 
                  onClick={() => toggleFullscreen('preview')}
                  title={isPreviewFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isPreviewFullscreen ? '✕' : '⛶'}
                </IconButton>
              </PaneActions>
            </PaneHeader>
            <VisualToolbar>
              <ToolButton onClick={() => execCommand('bold')} title="Bold">
                <strong>B</strong>
              </ToolButton>
              <ToolButton onClick={() => execCommand('italic')} title="Italic">
                <em>I</em>
              </ToolButton>
              <ToolButton onClick={() => execCommand('underline')} title="Underline">
                <u>U</u>
              </ToolButton>
              <ToolButton onClick={() => execCommand('strikeThrough')} title="Strikethrough">
                <s>S</s>
              </ToolButton>
              <ToolbarSeparator />
              <ToolButton onClick={() => execCommand('formatBlock', 'h1')} title="Heading 1">
                H1
              </ToolButton>
              <ToolButton onClick={() => execCommand('formatBlock', 'h2')} title="Heading 2">
                H2
              </ToolButton>
              <ToolButton onClick={() => execCommand('formatBlock', 'h3')} title="Heading 3">
                H3
              </ToolButton>
              <ToolButton onClick={() => execCommand('formatBlock', 'p')} title="Paragraph">
                P
              </ToolButton>
              <ToolbarSeparator />
              <ToolButton onClick={() => execCommand('insertUnorderedList')} title="Bullet List">
                •
              </ToolButton>
              <ToolButton onClick={() => execCommand('insertOrderedList')} title="Numbered List">
                1.
              </ToolButton>
              <ToolButton onClick={() => execCommand('indent')} title="Indent">
                →
              </ToolButton>
              <ToolButton onClick={() => execCommand('outdent')} title="Outdent">
                ←
              </ToolButton>
              <ToolbarSeparator />
              <ToolButton onClick={() => execCommand('justifyLeft')} title="Align Left">
                ≡
              </ToolButton>
              <ToolButton onClick={() => execCommand('justifyCenter')} title="Align Center">
                ≡
              </ToolButton>
              <ToolButton onClick={() => execCommand('justifyRight')} title="Align Right">
                ≡
              </ToolButton>
              <ToolbarSeparator />
              <ToolButton onClick={() => insertLink()} title="Insert Link">
                🔗
              </ToolButton>
              <ToolButton onClick={() => insertImage()} title="Insert Image">
                🖼
              </ToolButton>
              <ToolButton onClick={() => execCommand('formatBlock', 'blockquote')} title="Quote">
                "
              </ToolButton>
              <ToolButton onClick={() => execCommand('formatBlock', 'pre')} title="Code Block">
                &lt;/&gt;
              </ToolButton>
              <ToolbarSeparator />
              <ToolButton onClick={() => execCommand('removeFormat')} title="Clear Formatting">
                ✕
              </ToolButton>
              <ToolButton onClick={() => execCommand('undo')} title="Undo">
                ↶
              </ToolButton>
              <ToolButton onClick={() => execCommand('redo')} title="Redo">
                ↷
              </ToolButton>
            </VisualToolbar>
            <PreviewContainer>
              <PreviewFrame 
                ref={previewRef}
                contentEditable={true}
                onInput={handlePreviewEdit}
                suppressContentEditableWarning={true}
              />
            </PreviewContainer>
          </PaneWrapper>
        </DualPaneContainer>

        <StatusBar>
          <span>Words: {wordCount}</span>
          <span>{autoSaveStatus}</span>
        </StatusBar>
      </EditorWrapper>
    </EditorContainer>
  );
};

export default TinyMCEEditor;