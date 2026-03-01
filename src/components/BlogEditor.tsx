import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// TipTap imports are no longer needed since we're using the enhanced preview mode
// import { useEditor, EditorContent } from '@tiptap/react';
// import StarterKit from '@tiptap/starter-kit';
// import Link from '@tiptap/extension-link';
// import Image from '@tiptap/extension-image';
// import TextAlign from '@tiptap/extension-text-align';
// import Color from '@tiptap/extension-color';
// import TextStyle from '@tiptap/extension-text-style';
// import Underline from '@tiptap/extension-underline';
// import Highlight from '@tiptap/extension-highlight';
// import TaskList from '@tiptap/extension-task-list';
// import TaskItem from '@tiptap/extension-task-item';
// import Table from '@tiptap/extension-table';
// import TableRow from '@tiptap/extension-table-row';
// import TableHeader from '@tiptap/extension-table-header';
// import TableCell from '@tiptap/extension-table-cell';
// import FontFamily from '@tiptap/extension-font-family';
// import Subscript from '@tiptap/extension-subscript';
// import Superscript from '@tiptap/extension-superscript';
// import HorizontalRule from '@tiptap/extension-horizontal-rule';
// import Placeholder from '@tiptap/extension-placeholder';
// import { Extension } from '@tiptap/core';
import Editor, { OnMount } from '@monaco-editor/react';
import styled from 'styled-components';
// @ts-ignore
import { html as beautifyHtml } from 'js-beautify';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// API endpoints
const BLOGS = {
  CHECK_SLUG: (slug: string) =>
    `https://skhgfkki87.execute-api.us-east-2.amazonaws.com/api/articles/check_slug_available/${slug}`,
  CREATE: 'https://skhgfkki87.execute-api.us-east-2.amazonaws.com/api/articles/create_blog',
};

const UPLOAD = {
  FILE: 'https://skhgfkki87.execute-api.us-east-2.amazonaws.com/api/upload',
};

// Extend window interface for drag functionality
declare global {
  interface Window {
    draggedElement?: HTMLElement;
  }
}

// Type for view modes
type ViewMode = 'html' | 'preview' | 'dual' | 'dualFullscreen';

// TipTap custom extensions are no longer needed
// The enhanced preview mode handles class and style preservation directly

// Custom Color Picker Component
const CustomColorPicker = styled.div`
  width: 250px;
  background: white;
  border: 1px solid #e1e4e8;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 12px;
  position: absolute;
  z-index: 1001;
`;

const ColorPickerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const ColorPickerTitle = styled.h4`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 18px;
  color: #666;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  
  &:hover {
    background: #f3f4f6;
  }
`;

const SaturationValuePicker = styled.div<{ hue: number }>`
  width: 100%;
  height: 150px;
  background: linear-gradient(to top, #000, transparent),
              linear-gradient(to right, #fff, hsl(${props => props.hue}, 100%, 50%));
  border-radius: 4px;
  position: relative;
  cursor: crosshair;
  margin-bottom: 12px;
`;

const SaturationValueHandle = styled.div<{ x: number; y: number }>`
  position: absolute;
  width: 12px;
  height: 12px;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%);
  left: ${props => props.x}%;
  top: ${props => props.y}%;
  pointer-events: none;
`;

const HuePicker = styled.div`
  width: 100%;
  height: 12px;
  background: linear-gradient(to right, 
    #ff0000 0%, 
    #ffff00 17%, 
    #00ff00 33%, 
    #00ffff 50%, 
    #0000ff 67%, 
    #ff00ff 83%, 
    #ff0000 100%);
  border-radius: 6px;
  position: relative;
  cursor: pointer;
  margin-bottom: 12px;
`;

const HueHandle = styled.div<{ position: number }>`
  position: absolute;
  width: 14px;
  height: 14px;
  background: white;
  border: 2px solid #666;
  border-radius: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  left: ${props => props.position}%;
  pointer-events: none;
`;

const ColorInputContainer = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
`;

const ColorPreview = styled.div<{ color: string }>`
  width: 40px;
  height: 40px;
  background: ${props => props.color};
  border: 1px solid #e1e4e8;
  border-radius: 4px;
`;

const ColorHexInput = styled.input`
  flex: 1;
  padding: 8px;
  border: 1px solid #e1e4e8;
  border-radius: 4px;
  font-size: 14px;
  font-family: monospace;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const PresetColors = styled.div`
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
  margin-bottom: 12px;
`;

const ColorPickerButtons = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const ColorPickerButton = styled.button<{ $primary?: boolean }>`
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => props.$primary ? `
    background: #3b82f6;
    color: white;
    border: none;
    
    &:hover {
      background: #2563eb;
    }
  ` : `
    background: white;
    color: #666;
    border: 1px solid #e1e4e8;
    
    &:hover {
      background: #f3f4f6;
    }
  `}
`;

const PresetColor = styled.button<{ color: string; selected: boolean }>`
  width: 24px;
  height: 24px;
  background: ${props => props.color};
  border: ${props => props.selected ? '2px solid #3b82f6' : '1px solid #e1e4e8'};
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  
  &:hover {
    transform: scale(1.1);
  }
`;

// Color conversion utilities
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

const rgbToHsv = (r: number, g: number, b: number): { h: number; s: number; v: number } => {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  let h = 0;
  const s = max === 0 ? 0 : delta / max;
  const v = max;
  
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
    } else if (max === g) {
      h = ((b - r) / delta + 2) / 6;
    } else {
      h = ((r - g) / delta + 4) / 6;
    }
  }
  
  return { h: h * 360, s: s * 100, v: v * 100 };
};

const hsvToRgb = (h: number, s: number, v: number): { r: number; g: number; b: number } => {
  h /= 360;
  s /= 100;
  v /= 100;
  
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  
  let r = 0, g = 0, b = 0;
  
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
};

// Table hover controls
const TableHoverControl = styled.div`
  position: absolute;
  background: #3b82f6;
  color: white;
  border-radius: 4px;
  padding: 2px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  
  &:hover {
    background: #2563eb;
  }
`;

const RowHoverControl = styled(TableHoverControl)`
  left: -25px;
  width: 20px;
  height: 20px;
  top: 50%;
  transform: translateY(-50%);
`;

const ColHoverControl = styled(TableHoverControl)`
  top: -25px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 20px;
`;

// Modern Theme Colors
const theme = {
  light: {
    bg: '#ffffff',
    surface: '#f8fafc',
    surfaceElevated: '#ffffff',
    border: '#e2e8f0',
    text: '#1e293b',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    primary: '#6366f1',
    primaryHover: '#4f46e5',
    primaryLight: '#e0e7ff',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    shadow: 'rgba(0, 0, 0, 0.08)',
    shadowHover: 'rgba(0, 0, 0, 0.12)',
  },
  dark: {
    bg: '#0f172a',
    surface: '#1e293b',
    surfaceElevated: '#334155',
    border: '#334155',
    text: '#f1f5f9',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    primary: '#818cf8',
    primaryHover: '#6366f1',
    primaryLight: '#312e81',
    success: '#34d399',
    error: '#f87171',
    warning: '#fbbf24',
    shadow: 'rgba(0, 0, 0, 0.3)',
    shadowHover: 'rgba(0, 0, 0, 0.4)',
  }
};

const EditorContainer = styled.div<{ $isDark?: boolean }>`
  max-width: 1600px;
  margin: 0 auto;
  padding: 32px 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Inter', 'SF Pro Display', sans-serif;
  background: ${props => props.$isDark ? theme.dark.bg : theme.light.bg};
  min-height: 100vh;
  transition: background 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
`;

const DualPaneContainer = styled.div<{ $hasFullscreen?: boolean; $isDualFullscreen?: boolean; $isDark?: boolean }>`
  display: flex;
  gap: ${props => props.$isDualFullscreen ? '0' : '24px'};
  height: ${props => props.$hasFullscreen ? '100%' : '1200px'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  width: 100%;
  overflow: hidden;
  position: relative;
  isolation: isolate;
  min-width: 0;
  border-radius: 16px;
  
  ${props => props.$hasFullscreen && `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${props.$isDark ? theme.dark.bg : theme.light.surface};
    z-index: 1000;
    padding: ${props.$isDualFullscreen ? '0' : '24px'};
    box-sizing: border-box;
    border-radius: 0;
  `}
`;

const ResizableDivider = styled.div<{ $isDark?: boolean }>`
  width: 8px;
  height: 100%;
  background: ${props => props.$isDark ? theme.dark.border : theme.light.border};
  cursor: col-resize;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
  flex-shrink: 0;
  border-radius: 4px;
  
  &:hover {
    background: ${props => props.$isDark ? theme.dark.primary : theme.light.primary};
    width: 10px;
    box-shadow: ${props => props.$isDark 
      ? '0 0 12px rgba(129, 140, 248, 0.4)' 
      : '0 0 12px rgba(99, 102, 241, 0.3)'};
  }
  
  &::before {
    content: '⋮';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    font-size: 18px;
    color: ${props => props.$isDark ? theme.dark.textMuted : theme.light.textMuted};
    z-index: 1;
    user-select: none;
    font-weight: 600;
  }
  
  &::after {
    content: '';
    position: absolute;
    width: 20px;
    height: 100%;
    left: -6px;
    z-index: 1;
  }
`;

const LeftPane = styled.div<{ $isFullscreen?: boolean; $isHidden?: boolean; width?: string; $isDark?: boolean }>`
  flex: ${props => props.width ? 'none' : '1'};
  width: ${props => props.width ? props.width : 'auto'};
  min-width: ${props => props.width ? '0' : 'auto'};
  display: ${props => props.$isHidden ? 'none' : 'flex'};
  flex-direction: column;
  height: 100%;
  transition: none;
  position: relative;
  contain: layout;
  overflow: hidden;
  flex-shrink: 1;
  background: ${props => props.$isDark ? theme.dark.surface : theme.light.surfaceElevated};
  border-radius: 16px;
  box-shadow: ${props => props.$isDark ? '0 4px 24px rgba(0, 0, 0, 0.4)' : '0 4px 24px rgba(0, 0, 0, 0.08)'};
  
  ${props => props.$isFullscreen && `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${props.$isDark ? theme.dark.bg : theme.light.surface};
    border-top-left-radius: 24px;
    border-top-right-radius: 24px;
    z-index: 1001;
    padding: 24px;
    box-sizing: border-box;
    box-shadow: none;
  `}
`;

const RightPane = styled.div<{ $isFullscreen?: boolean; $isHidden?: boolean; width?: string; $isDark?: boolean }>`
  flex: ${props => props.width ? 'none' : '1'};
  width: ${props => props.width ? props.width : 'auto'};
  min-width: ${props => props.width ? '0' : 'auto'};
  display: ${props => props.$isHidden ? 'none' : 'flex'};
  flex-direction: column;
  height: 100%;
  transition: none;
  overflow: hidden;
  position: relative;
  contain: layout;
  flex-shrink: 1;
  background: ${props => props.$isDark ? theme.dark.surface : theme.light.surfaceElevated};
  border-radius: 16px;
  box-shadow: ${props => props.$isDark ? '0 4px 24px rgba(0, 0, 0, 0.4)' : '0 4px 24px rgba(0, 0, 0, 0.08)'};
  
  ${props => props.$isFullscreen && `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    border-top-left-radius: 24px;
    border-top-right-radius: 24px;
    background: ${props.$isDark ? theme.dark.bg : theme.light.surface};
    z-index: 1001;
    padding: 24px;
    box-sizing: border-box;
    box-shadow: none;
  `}
  
  ${props => !props.$isFullscreen && `
    position: relative;
  `}
`;

const PreviewToolbar = styled.div`
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border: 1px solid #e1e4e8;
  border-bottom: none;
  border-radius: 12px 12px 0 0;
  background: linear-gradient(to bottom, #ffffff, #f8f9fa);
  flex-wrap: wrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const PreviewToolButton = styled.button`
  padding: 8px 14px;
  border: 1px solid #e1e4e8;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  &:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  &:active {
    background: #e5e7eb;
    transform: translateY(0);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
`;


const PreviewContainer = styled.div<{ $isFullscreen?: boolean; $isDark?: boolean }>`
  border: 1px solid ${props => props.$isDark ? theme.dark.border : theme.light.border};
  border-radius: ${props => props.$isFullscreen ? '16px' : '0 0 16px 16px'};
  height: ${props => props.$isFullscreen ? 'calc(100vh - 160px)' : 'calc(100% - 70px)'};
  overflow-y: auto;
  background: ${props => props.$isDark ? theme.dark.surfaceElevated : theme.light.surfaceElevated};
  padding: 32px;
  box-shadow: ${props => props.$isDark ? 'inset 0 2px 8px rgba(0, 0, 0, 0.2)' : 'inset 0 2px 8px rgba(0, 0, 0, 0.04)'};
  position: relative;
  z-index: 1;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  .blog-preview-content {
    min-height: 100%;
    cursor: text;
    font-size: 13px;
    outline: none;
    user-select: text;
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
  }
  
  /* Allow editing anywhere in the preview */
  .blog-preview-content * {
    user-select: text;
    -webkit-user-select: text;
    -moz-user-select: text;
    -ms-user-select: text;
  }
  
  /* Ensure all elements are clickable and editable */
  .blog-preview-content [contenteditable="true"] {
    outline: none;
    min-height: 20px;
    cursor: text;
  }
  
  /* Show cursor on hover for editable elements */
  .blog-preview-content div:hover,
  .blog-preview-content p:hover,
  .blog-preview-content span:hover,
  .blog-preview-content h1:hover,
  .blog-preview-content h2:hover,
  .blog-preview-content h3:hover,
  .blog-preview-content h4:hover,
  .blog-preview-content h5:hover,
  .blog-preview-content h6:hover {
    outline: 2px dashed rgba(59, 130, 246, 0.3);
    cursor: text;
  }
  
  /* Reset all inherited styles and apply blog styles globally */
  * {
    box-sizing: border-box;
  }
  
  .public-blog-content {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    line-height: 1.6;
    color: ${props => props.$isDark ? theme.dark.text : theme.light.text};
    background-color: ${props => props.$isDark ? theme.dark.surfaceElevated : theme.light.surfaceElevated};
  }

  .editor_blog_heading h1 {
    text-align: center;
    margin-bottom: 2rem;
    color: ${props => props.$isDark ? theme.dark.text : theme.light.text};
  }

  .editor_blog_title {
    font-size: 2.5rem;
    font-weight: 700;
    color: ${props => props.$isDark ? theme.dark.text : theme.light.text};
    margin-bottom: 0.5rem;
    line-height: 1.2;
  }

  .blog_meta {
    color: ${props => props.$isDark ? theme.dark.textSecondary : theme.light.textSecondary};
    font-size: 0.9rem;
  }

  .editor_blog_heading h2 {
    font-size: 1.8rem;
    font-weight: 600;
    color: ${props => props.$isDark ? theme.dark.text : theme.light.text};
    margin: 2.5rem 0 1rem 0;
    border-bottom: 2px solid ${props => props.$isDark ? theme.dark.primary : theme.light.primary};
    padding-bottom: 0.5rem;
  }

  .editor_blog_paragraph {
    margin-bottom: 1.5rem;
    font-size: 1.1rem;
    text-align: justify;
    color: ${props => props.$isDark ? theme.dark.text : theme.light.text};
  }

  .editor_blog_emphasis {
    font-weight: 600;
    color: ${props => props.$isDark ? theme.dark.text : theme.light.text};
  }

  .editor_blog_highlight {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 1.5rem;
    border-radius: 8px;
    margin: 2rem 0;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }

  .editor_blog_list {
    margin: 1.5rem 0;
  }

  .editor_blog_list li {
    margin-bottom: 1rem;
    padding-left: 1.5rem;
    position: relative;
  }

  .editor_blog_list li::before {
    content: "▶";
    color: ${props => props.$isDark ? theme.dark.primary : theme.light.primary};
    position: absolute;
    left: 0;
    top: 0;
  }

  .editor_blog_hr {
    height: 2px;
    background: ${props => props.$isDark 
      ? `linear-gradient(to right, ${theme.dark.primary}, ${theme.dark.success})`
      : `linear-gradient(to right, ${theme.light.primary}, ${theme.light.success})`};
    border: none;
    margin: 3rem 0;
    border-radius: 1px;
  }

  .blog_image_hero,
  .blog_image_architecture {
    text-align: center;
    margin: 2rem 0;
  }

  .blog_image_hero img,
  .blog_image_architecture img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
  
  /* Smooth drag animations */
  .blog_image {
    transition: transform 0.3s ease, margin 0.3s ease;
  }
  
  .blog_image.dragging {
    z-index: 1000;
  }
  
  .blog_video.dragging {
    z-index: 1000;
  }
  
  .blog_image img {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }

  /* Image resize toolbar removed */
  
  /* Drop zone visual feedback */
  .blog-preview-content.drag-over {
    background-color: rgba(59, 130, 246, 0.05);
    outline: 2px dashed #3b82f6;
  }

  .blog_comparison_table {
    margin: 2rem 0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }

  .blog_comparison_header {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    background: ${props => props.$isDark ? theme.dark.surface : theme.light.surface};
    color: ${props => props.$isDark ? theme.dark.text : theme.light.text};
  }

  .blog_comparison_row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    background: ${props => props.$isDark ? theme.dark.surfaceElevated : theme.light.surface};
  }

  .blog_comparison_row:nth-child(even) {
    background: ${props => props.$isDark ? theme.dark.surface : theme.light.surface};
  }

  .blog_comparison_cell {
    padding: 1rem;
    border-right: 1px solid ${props => props.$isDark ? theme.dark.border : theme.light.border};
    font-weight: 500;
    color: ${props => props.$isDark ? theme.dark.text : theme.light.text};
  }

  .blog_comparison_cell:last-child {
    border-right: none;
  }

  .blog_use_cases {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin: 2rem 0;
  }

  .blog_use_case {
    background: ${props => props.$isDark ? theme.dark.surface : theme.light.surface};
    padding: 1.5rem;
    border-radius: 8px;
    border-left: 4px solid ${props => props.$isDark ? theme.dark.primary : theme.light.primary};
  }

  .blog_use_case_title {
    font-size: 1.2rem;
    font-weight: 600;
    color: ${props => props.$isDark ? theme.dark.text : theme.light.text};
    margin-bottom: 0.5rem;
  }

  .blog_use_case_description {
    color: ${props => props.$isDark ? theme.dark.textSecondary : theme.light.textSecondary};
  }

  .blog_success_stories {
    margin: 2rem 0;
  }

  .blog_story {
    background: ${props => props.$isDark ? theme.dark.surfaceElevated : theme.light.surfaceElevated};
    border: 1px solid ${props => props.$isDark ? theme.dark.border : theme.light.border};
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1rem;
    box-shadow: ${props => props.$isDark ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.05)'};
  }

  .blog_story_company {
    font-size: 1.2rem;
    font-weight: 600;
    color: ${props => props.$isDark ? theme.dark.primary : theme.light.primary};
    margin-bottom: 0.5rem;
  }

  .blog_story_description {
    color: ${props => props.$isDark ? theme.dark.textSecondary : theme.light.textSecondary};
  }

  .editor_blog_call_to_action {
    background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
    color: white;
    padding: 2rem;
    border-radius: 8px;
    text-align: center;
    margin: 3rem 0;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }

  .blog_cta_text {
    font-size: 1.1rem;
    font-weight: 500;
  }

  .blog_footer {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid #e1e8ed;
  }

  .blog_tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .blog_tag {
    background: #3498db;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 500;
  }

  @media (max-width: 768px) {
    .editor_blog_title {
      font-size: 2rem;
    }

    .editor_blog_heading h2 {
      font-size: 1.5rem;
    }

    .blog_comparison_header,
    .blog_comparison_row {
      grid-template-columns: 1fr;
    }

    .blog_comparison_cell {
      border-right: none;
      border-bottom: 1px solid #dee2e6;
    }

    .blog_use_cases {
      grid-template-columns: 1fr;
    }

    .blog_tags {
      justify-content: center;
    }
  }
`;

const PaneHeader = styled.div<{ $isDark?: boolean }>`
  background: ${props => props.$isDark ? theme.dark.surface : theme.light.surface};
  padding: 20px 24px;
  border: 1px solid ${props => props.$isDark ? theme.dark.border : theme.light.border};
  border-bottom: none;
  border-radius: 16px 16px 0 0;
  font-weight: 600;
  color: ${props => props.$isDark ? theme.dark.text : theme.light.text};
  font-size: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.$isDark ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.04)'};
`;

const HTMLEditorContainer = styled.div<{ $isFullscreen?: boolean; $isDark?: boolean }>`
  border: 1px solid ${props => props.$isDark ? theme.dark.border : theme.light.border};
  border-radius: ${props => props.$isFullscreen ? '0 0 16px 16px' : '0 0 16px 16px'};
  height: ${props => props.$isFullscreen ? 'calc(100vh - 55px)' : '100%'};
  overflow: hidden;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.$isDark ? 'inset 0 2px 8px rgba(0, 0, 0, 0.2)' : 'inset 0 2px 8px rgba(0, 0, 0, 0.04)'};
  display: flex;
  flex-direction: column;
  z-index: 2;
  background: ${props => props.$isDark ? theme.dark.surfaceElevated : theme.light.surfaceElevated};
  ${props => props.$isFullscreen && `
    margin-top: 0;
  `}
`;

const HTMLToolbar = styled.div`
  display: flex;
  gap: 10px;
  padding: 14px 18px;
  background: linear-gradient(to bottom, #ffffff, #f8f9fa);
  border-bottom: 1px solid #e1e4e8;
  font-size: 13px;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const HTMLToolbarButton = styled.button<{ $isDark?: boolean }>`
  background: ${props => props.$isDark ? theme.dark.surfaceElevated : theme.light.surfaceElevated};
  color: ${props => props.$isDark ? theme.dark.text : theme.light.text};
  border: 2px solid ${props => props.$isDark ? theme.dark.border : theme.light.border};
  padding: 10px 16px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.$isDark ? '0 2px 4px rgba(0, 0, 0, 0.2)' : '0 2px 4px rgba(0, 0, 0, 0.06)'};
  
  &:hover {
    background: ${props => props.$isDark ? theme.dark.surface : theme.light.surface};
    border-color: ${props => props.$isDark ? theme.dark.primary : theme.light.primary};
    transform: translateY(-2px);
    box-shadow: ${props => props.$isDark 
      ? '0 4px 12px rgba(129, 140, 248, 0.3)' 
      : '0 4px 12px rgba(99, 102, 241, 0.2)'};
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const EditorToolbar = styled.div<{ $isFullscreen?: boolean; $isDark?: boolean }>`
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: ${props => props.$isDark ? theme.dark.surface : theme.light.surface};
  border: 1px solid ${props => props.$isDark ? theme.dark.border : theme.light.border};
  border-bottom: none;
  flex-wrap: wrap;
  box-shadow: ${props => props.$isDark ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.04)'};
  font-size: 14px;
  border-radius: 16px 16px 0 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

const ToolbarGroup = styled.div<{ $isDark?: boolean }>`
  display: flex;
  gap: 4px;
  align-items: center;
  border-right: 1px solid ${props => props.$isDark ? theme.dark.border : theme.light.border};
  padding-right: 8px;
  margin-right: 8px;
  
  &:last-child {
    border-right: none;
    margin-right: 0;
  }
`;

const ToolbarSelect = styled.select<{ $isDark?: boolean }>`
  padding: 10px 16px;
  padding-right: 36px;
  border: 2px solid ${props => props.$isDark ? theme.dark.border : theme.light.border};
  border-radius: 10px;
  background: ${props => props.$isDark ? theme.dark.surfaceElevated : theme.light.surfaceElevated};
  color: ${props => props.$isDark ? theme.dark.text : theme.light.text};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  min-height: 40px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.$isDark ? '0 2px 4px rgba(0, 0, 0, 0.2)' : '0 2px 4px rgba(0, 0, 0, 0.06)'};
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='${props => props.$isDark ? 'cbd5e1' : '6b7280'}' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 10px center;
  background-repeat: no-repeat;
  background-size: 20px;
  
  &:hover {
    border-color: ${props => props.$isDark ? theme.dark.primary : theme.light.primary};
    box-shadow: ${props => props.$isDark 
      ? '0 4px 12px rgba(129, 140, 248, 0.3)' 
      : '0 4px 12px rgba(99, 102, 241, 0.2)'};
    transform: translateY(-2px);
  }
  
  &:focus {
    outline: none;
    border-color: ${props => props.$isDark ? theme.dark.primary : theme.light.primary};
    box-shadow: ${props => props.$isDark 
      ? '0 0 0 4px rgba(129, 140, 248, 0.2), 0 4px 12px rgba(0, 0, 0, 0.2)' 
      : '0 0 0 4px rgba(99, 102, 241, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08)'};
  }
  
  option {
    background: ${props => props.$isDark ? theme.dark.surfaceElevated : theme.light.surfaceElevated};
    color: ${props => props.$isDark ? theme.dark.text : theme.light.text};
  }
`;

const ColorInput = styled.input`
  width: 38px;
  height: 38px;
  border: 1px solid #e1e4e8;
  border-radius: 8px;
  cursor: pointer;
  background: none;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  
  &::-webkit-color-swatch {
    border: none;
    border-radius: 6px;
  }
  
  &:hover {
    border-color: #d1d5db;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

const ColorInputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
  
  &::after {
    content: attr(data-label);
    position: absolute;
    bottom: -20px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 11px;
    color: #586069;
    white-space: nowrap;
    background: white;
    padding: 0 4px;
    border-radius: 3px;
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
  }
  
  &:hover::after {
    opacity: 1;
  }
`;

const ToolbarButton = styled.button<{ $active?: boolean; $isDark?: boolean }>`
  background: ${props => props.$active 
    ? (props.$isDark ? theme.dark.primary : theme.light.primary)
    : (props.$isDark ? theme.dark.surfaceElevated : theme.light.surfaceElevated)};
  color: ${props => props.$active 
    ? '#ffffff' 
    : (props.$isDark ? theme.dark.text : theme.light.text)};
  border: 1px solid ${props => props.$active 
    ? (props.$isDark ? theme.dark.primary : theme.light.primary)
    : (props.$isDark ? theme.dark.border : theme.light.border)};
  padding: 10px 16px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 40px;
  box-shadow: ${props => props.$active 
    ? (props.$isDark ? '0 4px 12px rgba(129, 140, 248, 0.3)' : '0 4px 12px rgba(99, 102, 241, 0.25)')
    : (props.$isDark ? '0 2px 4px rgba(0, 0, 0, 0.2)' : '0 2px 4px rgba(0, 0, 0, 0.06)')};
  
  &:hover {
    background: ${props => props.$active 
      ? (props.$isDark ? theme.dark.primaryHover : theme.light.primaryHover)
      : (props.$isDark ? theme.dark.surface : theme.light.surface)};
    border-color: ${props => props.$active 
      ? (props.$isDark ? theme.dark.primaryHover : theme.light.primaryHover)
      : (props.$isDark ? theme.dark.border : theme.light.border)};
    transform: translateY(-2px);
    box-shadow: ${props => props.$active 
      ? (props.$isDark ? '0 6px 16px rgba(129, 140, 248, 0.4)' : '0 6px 16px rgba(99, 102, 241, 0.3)')
      : (props.$isDark ? '0 4px 8px rgba(0, 0, 0, 0.3)' : '0 4px 8px rgba(0, 0, 0, 0.1)')};
  }
  
  &:active {
    transform: translateY(0);
  }
`;

// EditorWrapper is no longer needed since we removed the TipTap editor
/*
const EditorWrapper = styled.div<{ isFullscreen?: boolean }>`
  ...
`;
*/

const TitleInput = styled.input<{ $isDark?: boolean }>`
  width: 100%;
  font-size: 42px;
  font-weight: 700;
  border: none;
  outline: none;
  padding: 16px 0;
  margin-bottom: 32px;
  border-bottom: 3px solid ${props => props.$isDark ? theme.dark.border : theme.light.border};
  background: transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: ${props => props.$isDark ? theme.dark.text : theme.light.text};
  letter-spacing: -0.5px;
  
  &::placeholder {
    color: ${props => props.$isDark ? theme.dark.textMuted : theme.light.textMuted};
  }
  
  &:focus {
    border-bottom-color: ${props => props.$isDark ? theme.dark.primary : theme.light.primary};
    box-shadow: 0 4px 12px ${props => props.$isDark ? 'rgba(129, 140, 248, 0.2)' : 'rgba(99, 102, 241, 0.15)'};
  }
`;

const MetaSection = styled.div<{ $isDark?: boolean }>`
  margin-bottom: 32px;
  padding: 28px;
  background: ${props => props.$isDark ? theme.dark.surface : theme.light.surfaceElevated};
  border-radius: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  border: 1px solid ${props => props.$isDark ? theme.dark.border : theme.light.border};
  box-shadow: ${props => props.$isDark ? '0 4px 20px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.08)'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

const ViewModeSection = styled.div<{ $isDark?: boolean }>`
  margin-bottom: 24px;
  padding: 20px;
  background: ${props => props.$isDark ? theme.dark.surface : theme.light.surface};
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: ${props => props.$isDark ? '0 4px 16px rgba(0, 0, 0, 0.3)' : '0 4px 16px rgba(0, 0, 0, 0.08)'};
  border: 1px solid ${props => props.$isDark ? theme.dark.border : theme.light.border};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

const ViewModeLabel = styled.span<{ $isDark?: boolean }>`
  font-weight: 600;
  color: ${props => props.$isDark ? theme.dark.text : theme.light.text};
  margin-right: 8px;
  font-size: 15px;
`;

const ViewModeButton = styled.button<{ $active: boolean; $isDark?: boolean }>`
  padding: 10px 20px;
  border: 2px solid ${props => props.$active 
    ? (props.$isDark ? theme.dark.primary : theme.light.primary)
    : (props.$isDark ? theme.dark.border : theme.light.border)};
  background: ${props => props.$active 
    ? (props.$isDark ? theme.dark.primary : theme.light.primary)
    : (props.$isDark ? theme.dark.surfaceElevated : theme.light.surfaceElevated)};
  color: ${props => props.$active ? '#ffffff' : (props.$isDark ? theme.dark.text : theme.light.text)};
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.$active 
    ? (props.$isDark ? '0 4px 12px rgba(129, 140, 248, 0.3)' : '0 4px 12px rgba(99, 102, 241, 0.25)')
    : 'none'};
  
  &:hover {
    background: ${props => props.$active 
      ? (props.$isDark ? theme.dark.primaryHover : theme.light.primaryHover)
      : (props.$isDark ? theme.dark.surface : theme.light.surface)};
    border-color: ${props => props.$active 
      ? (props.$isDark ? theme.dark.primaryHover : theme.light.primaryHover)
      : (props.$isDark ? theme.dark.border : theme.light.border)};
    transform: translateY(-2px);
    box-shadow: ${props => props.$active 
      ? (props.$isDark ? '0 6px 16px rgba(129, 140, 248, 0.4)' : '0 6px 16px rgba(99, 102, 241, 0.3)')
      : (props.$isDark ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.08)')};
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const MetaInput = styled.input<{ $isDark?: boolean }>`
  padding: 14px 18px;
  border: 2px solid ${props => props.$isDark ? theme.dark.border : theme.light.border};
  border-radius: 12px;
  font-size: 15px;
  width: 100%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: ${props => props.$isDark ? theme.dark.surfaceElevated : theme.light.surfaceElevated};
  color: ${props => props.$isDark ? theme.dark.text : theme.light.text};
  box-shadow: ${props => props.$isDark ? '0 2px 4px rgba(0, 0, 0, 0.2)' : '0 2px 4px rgba(0, 0, 0, 0.04)'};
  
  &:focus {
    outline: none;
    border-color: ${props => props.$isDark ? theme.dark.primary : theme.light.primary};
    box-shadow: ${props => props.$isDark 
      ? '0 0 0 4px rgba(129, 140, 248, 0.2), 0 4px 12px rgba(0, 0, 0, 0.2)' 
      : '0 0 0 4px rgba(99, 102, 241, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08)'};
    transform: translateY(-2px);
  }
  
  &::placeholder {
    color: ${props => props.$isDark ? theme.dark.textMuted : theme.light.textMuted};
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 20px;
  justify-content: flex-end;
`;

const ActionButton = styled.button<{ $primary?: boolean; $isDark?: boolean }>`
  padding: 14px 32px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.$primary 
    ? (props.$isDark ? '0 4px 16px rgba(129, 140, 248, 0.3)' : '0 4px 16px rgba(99, 102, 241, 0.25)')
    : (props.$isDark ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.08)')};
  
  ${props => props.$primary ? `
    background: ${props.$isDark ? theme.dark.primary : theme.light.primary};
    color: white;
    
    &:hover {
      background: ${props.$isDark ? theme.dark.primaryHover : theme.light.primaryHover};
      transform: translateY(-2px);
      box-shadow: ${props.$isDark 
        ? '0 8px 24px rgba(129, 140, 248, 0.4)' 
        : '0 8px 24px rgba(99, 102, 241, 0.35)'};
    }
    
    &:active {
      transform: translateY(0);
    }
  ` : `
    background: ${props.$isDark ? theme.dark.surfaceElevated : theme.light.surfaceElevated};
    color: ${props.$isDark ? theme.dark.text : theme.light.text};
    border: 2px solid ${props.$isDark ? theme.dark.border : theme.light.border};
    
    &:hover {
      background: ${props.$isDark ? theme.dark.surface : theme.light.surface};
      transform: translateY(-2px);
      box-shadow: ${props.$isDark 
        ? '0 4px 16px rgba(0, 0, 0, 0.3)' 
        : '0 4px 16px rgba(0, 0, 0, 0.12)'};
    }
    
    &:active {
      transform: translateY(0);
    }
  `}
`;

const FullscreenButton = styled.button<{ $isDark?: boolean }>`
  background: ${props => props.$isDark ? theme.dark.surfaceElevated : theme.light.surfaceElevated};
  color: ${props => props.$isDark ? theme.dark.text : theme.light.text};
  border: 2px solid ${props => props.$isDark ? theme.dark.border : theme.light.border};
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  box-shadow: ${props => props.$isDark ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.1)'};
  
  &:hover {
    background: ${props => props.$isDark ? theme.dark.surface : theme.light.surface};
    border-color: ${props => props.$isDark ? theme.dark.primary : theme.light.primary};
    transform: translateY(-2px);
    box-shadow: ${props => props.$isDark 
      ? '0 6px 16px rgba(129, 140, 248, 0.4)' 
      : '0 6px 16px rgba(99, 102, 241, 0.3)'};
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const DarkModeToggle = styled.button<{ $isDark?: boolean }>`
  position: fixed;
  top: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  border: 2px solid ${props => props.$isDark ? theme.dark.border : theme.light.border};
  background: ${props => props.$isDark ? theme.dark.surfaceElevated : theme.light.surfaceElevated};
  color: ${props => props.$isDark ? theme.dark.text : theme.light.text};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  z-index: 10000;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.$isDark 
    ? '0 8px 24px rgba(0, 0, 0, 0.4)' 
    : '0 8px 24px rgba(0, 0, 0, 0.12)'};
  backdrop-filter: blur(10px);
  
  &:hover {
    transform: translateY(-4px) scale(1.05);
    box-shadow: ${props => props.$isDark 
      ? '0 12px 32px rgba(0, 0, 0, 0.5)' 
      : '0 12px 32px rgba(0, 0, 0, 0.16)'};
    border-color: ${props => props.$isDark ? theme.dark.primary : theme.light.primary};
  }
  
  &:active {
    transform: translateY(-2px) scale(1.02);
  }
`;

const ExitDualFullscreenButton = styled.button<{ $isDark?: boolean }>`
  position: fixed;
  top: 8px;
  right: 20px;
  background: ${props => props.$isDark ? theme.dark.error : theme.light.error};
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 12px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 600;
  z-index: 10001;
  box-shadow: ${props => props.$isDark 
    ? '0 4px 16px rgba(239, 68, 68, 0.4)' 
    : '0 4px 16px rgba(239, 68, 68, 0.3)'};
  
  &:hover {
    background: ${props => props.$isDark ? '#f87171' : '#dc2626'};
    transform: translateY(-2px);
    box-shadow: ${props => props.$isDark 
      ? '0 8px 24px rgba(239, 68, 68, 0.5)' 
      : '0 8px 24px rgba(239, 68, 68, 0.4)'};
  }
  
  &:active {
    transform: translateY(0);
  }
`;

interface BlogPost {
  title: string;
  content: string;
  excerpt: string;
  tags: string;
  category: string;
  slug: string;
}

const ModalOverlay = styled.div<{ $isOpen: boolean }>`
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  align-items: center;
  justify-content: center;
`;

const PreviewOverlayFullscreen = styled.div<{ $isOpen: boolean; $isDark?: boolean }>`
  display: ${props => props.$isOpen ? 'block' : 'none'};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${props => props.$isDark ? theme.dark.bg : theme.light.bg};
  z-index: 10002;
  overflow: auto;
  transition: background 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

const ExitOverlayFullscreenButton = styled.button<{ $isDark?: boolean }>`
  position: fixed;
  top: 20px;
  right: 20px;
  background: ${props => props.$isDark ? theme.dark.error : theme.light.error};
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 600;
  z-index: 10003;
  box-shadow: ${props => props.$isDark 
    ? '0 4px 16px rgba(239, 68, 68, 0.4)' 
    : '0 4px 16px rgba(239, 68, 68, 0.3)'};
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    background: #dc2626;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
  }
`;

const ModalContent = styled.div`
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 400px;
  width: 90%;
`;

const ModalTitle = styled.h3`
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
`;

const ModalText = styled.p`
  margin: 0 0 24px 0;
  color: #4b5563;
  line-height: 1.5;
`;

const ModalButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const ModalButton = styled.button<{ $variant?: 'cancel' | 'danger' }>`
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => props.$variant === 'danger' ? `
    background: #ef4444;
    color: white;
    border: none;
    
    &:hover {
      background: #dc2626;
      transform: translateY(-1px);
    }
  ` : `
    background: white;
    color: #4b5563;
    border: 1px solid #e5e7eb;
    
    &:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }
  `}
`;

// Hashtag Components
const HashtagContainer = styled.div<{ $isDark?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 10px;
  background: ${props => props.$isDark ? theme.dark.surfaceElevated : theme.light.surfaceElevated};
  border: 2px solid ${props => props.$isDark ? theme.dark.border : theme.light.border};
  border-radius: 12px;
  min-height: 52px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.$isDark ? '0 2px 4px rgba(0, 0, 0, 0.2)' : '0 2px 4px rgba(0, 0, 0, 0.04)'};
  
  &:focus-within {
    border-color: ${props => props.$isDark ? theme.dark.primary : theme.light.primary};
    box-shadow: ${props => props.$isDark 
      ? '0 0 0 4px rgba(129, 140, 248, 0.2), 0 4px 12px rgba(0, 0, 0, 0.2)' 
      : '0 0 0 4px rgba(99, 102, 241, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08)'};
    transform: translateY(-2px);
  }
`;

const HashtagChip = styled.div<{ $isDark?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: ${props => props.$isDark ? theme.dark.primaryLight : theme.light.primaryLight};
  color: ${props => props.$isDark ? theme.dark.primary : theme.light.primary};
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.$isDark ? '0 2px 8px rgba(129, 140, 248, 0.2)' : '0 2px 8px rgba(99, 102, 241, 0.15)'};
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.$isDark ? '0 4px 12px rgba(129, 140, 248, 0.3)' : '0 4px 12px rgba(99, 102, 241, 0.2)'};
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.8) translateY(-4px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
`;

const HashtagRemoveButton = styled.button`
  background: none;
  border: none;
  color: #7c3aed;
  cursor: pointer;
  font-size: 16px;
  margin-top: 5px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(124, 58, 237, 0.2);
    color: #5b21b6;
  }
`;

const HashtagInput = styled.input<{ $isDark?: boolean }>`
  border: none;
  outline: none;
  font-size: 14px;
  padding: 8px 12px;
  flex: 1;
  min-width: 120px;
  background: transparent;
  color: ${props => props.$isDark ? theme.dark.text : theme.light.text};
  font-weight: 500;
  
  &::placeholder {
    color: ${props => props.$isDark ? theme.dark.textMuted : theme.light.textMuted};
  }
`;

const SlugStatusIndicator = styled.span<{ available?: boolean }>`
  font-size: 12px;
  font-weight: 500;
  color: ${props => props.available ? '#10b981' : '#ef4444'};
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  
  &::before {
    content: '●';
    font-size: 8px;
  }
`;

const FileSizeWarning = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  background: #ff5252;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 10000;
  animation: slideIn 0.3s ease-out, fadeOut 0.3s ease-out 4.7s forwards;
  
  @keyframes slideIn {
    from {
      transform: translateX(120%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes fadeOut {
    to {
      opacity: 0;
      transform: translateX(120%);
    }
  }
`;

const FileSizeInfo = styled.div`
  font-size: 12px;
  color: #666;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  
  &::before {
    content: "ℹ";
    background: #2196f3;
    color: white;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: bold;
  }
`;

const UploadErrorToast = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  background: #f44336;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 10000;
  animation: slideIn 0.3s ease-out, fadeOut 0.3s ease-out 4.7s forwards;
  
  @keyframes slideIn {
    from {
      transform: translateX(120%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes fadeOut {
    to {
      opacity: 0;
      transform: translateX(120%);
    }
  }
`;

// ColorPicker Component
interface ColorPickerProps {
  color: string;
  onApply: (color: string) => void;
  onClose: () => void;
  title: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onApply, onClose, title }) => {
  const [hsv, setHsv] = useState(() => {
    const rgb = hexToRgb(color);
    return rgbToHsv(rgb.r, rgb.g, rgb.b);
  });
  const [hexInput, setHexInput] = useState(color);
  const [tempColor, setTempColor] = useState(color);
  const [isDraggingSV, setIsDraggingSV] = useState(false);
  const [isDraggingHue, setIsDraggingHue] = useState(false);
  const svPickerRef = useRef<HTMLDivElement>(null);
  const huePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setHexInput(hex);
    setTempColor(hex);
  }, [hsv]);

  const handleSVMouseDown = (e: React.MouseEvent) => {
    setIsDraggingSV(true);
    updateSV(e);
  };

  const updateSV = (e: React.MouseEvent | MouseEvent) => {
    if (!svPickerRef.current) return;
    
    const rect = svPickerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    setHsv(prev => ({
      ...prev,
      s: x * 100,
      v: (1 - y) * 100
    }));
  };

  const handleHueMouseDown = (e: React.MouseEvent) => {
    setIsDraggingHue(true);
    updateHue(e);
  };

  const updateHue = (e: React.MouseEvent | MouseEvent) => {
    if (!huePickerRef.current) return;
    
    const rect = huePickerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    
    setHsv(prev => ({
      ...prev,
      h: x * 360
    }));
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSV) updateSV(e);
      if (isDraggingHue) updateHue(e);
    };

    const handleMouseUp = () => {
      setIsDraggingSV(false);
      setIsDraggingHue(false);
    };

    if (isDraggingSV || isDraggingHue) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSV, isDraggingHue]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHexInput(value);
    
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      const rgb = hexToRgb(value);
      setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
    }
  };

  const presetColors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFFFFF',
    '#808080', '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#C0C0C0',
    '#FF6600', '#FF9900', '#99CC00', '#339966', '#33CCCC', '#3366FF', '#6633FF', '#CC33CC'
  ];

  return (
    <CustomColorPicker>
      <ColorPickerHeader>
        <ColorPickerTitle>{title}</ColorPickerTitle>
        <CloseButton onClick={onClose}>×</CloseButton>
      </ColorPickerHeader>
      
      <SaturationValuePicker
        ref={svPickerRef}
        hue={hsv.h}
        onMouseDown={handleSVMouseDown}
      >
        <SaturationValueHandle
          x={hsv.s}
          y={100 - hsv.v}
        />
      </SaturationValuePicker>
      
      <HuePicker
        ref={huePickerRef}
        onMouseDown={handleHueMouseDown}
      >
        <HueHandle position={(hsv.h / 360) * 100} />
      </HuePicker>
      
      <ColorInputContainer>
        <ColorPreview color={tempColor} />
        <ColorHexInput
          type="text"
          value={hexInput}
          onChange={handleHexChange}
          onClick={(e) => e.stopPropagation()}
          placeholder="#000000"
        />
      </ColorInputContainer>
      
      <PresetColors>
        {presetColors.map(presetColor => (
          <PresetColor
            key={presetColor}
            color={presetColor}
            selected={presetColor.toLowerCase() === hexInput.toLowerCase()}
            onClick={(e) => {
              e.stopPropagation();
              setHexInput(presetColor);
              const rgb = hexToRgb(presetColor);
              setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b));
            }}
          />
        ))}
      </PresetColors>
      
      <ColorPickerButtons>
        <ColorPickerButton onClick={onClose}>
          Cancel
        </ColorPickerButton>
        <ColorPickerButton $primary onClick={() => {
          onApply(tempColor);
          onClose();
        }}>
          Apply
        </ColorPickerButton>
      </ColorPickerButtons>
    </CustomColorPicker>
  );
};

const BlogEditor: React.FC = () => {
  const navigate = useNavigate();
  
  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  
  // Apply dark mode to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);
  
  // Form data state
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    htmlContent: '',
    metadata: {
      hashtags: '',
    },
    excerpt: '',
    category: ''
  });
  
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  
  // Legacy state for compatibility
  const [post, setPost] = useState<BlogPost>({
    title: '',
    content: '',
    excerpt: '',
    tags: '',
    category: '',
    slug: ''
  });
  const [htmlCode, setHtmlCode] = useState('');
  const [isUpdatingFromHtml, setIsUpdatingFromHtml] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [isPreviewOverlayFullscreen, setIsPreviewOverlayFullscreen] = useState(false);
  const [isHtmlFullscreen, setIsHtmlFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('dual');
  const [dynamicCss, setDynamicCss] = useState('');
  const [previewContentRef, setPreviewContentRef] = useState<HTMLDivElement | null>(null);
  const [isPreviewEditable, setIsPreviewEditable] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);
  const [selectedTextColor, setSelectedTextColor] = useState('#000000');
  const [selectedBgColor, setSelectedBgColor] = useState('#FFFF00');
  const [savedSelection, setSavedSelection] = useState<Range | null>(null);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    subscript: false,
    superscript: false
  });
  const [leftPaneWidth, setLeftPaneWidth] = useState('56%');
  const [rightPaneWidth, setRightPaneWidth] = useState('44%');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [fileSizeWarnings, setFileSizeWarnings] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadedVideos, setUploadedVideos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiSuccess, setApiSuccess] = useState<string | null>(null);
  const monacoEditorRef = useRef<any>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isUpdatingFromHtmlRef = useRef<boolean>(false);
  const lastCursorPositionRef = useRef<{ node: Node | null; offset: number }>({ node: null, offset: 0 });
  const lastScrollPositionRef = useRef<{ top: number; left: number }>({ top: 0, left: 0 });
  const slugCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  // TipTap editor is no longer needed since we're using the enhanced preview mode
  // The editor functionality is now integrated directly into the preview
  const editor = null;
  
  // Update upload progress indicators
  useEffect(() => {
    Object.entries(uploadProgress).forEach(([fileName, progress]) => {
      const progressBar = document.getElementById(`progress-${fileName.replace(/[^a-zA-Z0-9]/g, '-')}`);
      const progressText = document.getElementById(`progress-text-${fileName.replace(/[^a-zA-Z0-9]/g, '-')}`);
      
      if (progressBar) {
        progressBar.style.width = `${progress}%`;
      }
      if (progressText) {
        progressText.textContent = `${progress}%`;
      }
    });
  }, [uploadProgress]);
  
  // Format slug function
  const formatSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "") // Remove special characters except hyphens
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .trim(); // Remove leading/trailing spaces
  };
  
  // Check slug availability
  const checkSlugAvailability = async (slug: string) => {
    try {
      let currentSlug = slug;
      let counter = 1;
      let isAvailable = false;

      while (!isAvailable) {
        // Check if the current slug exists
        const response = await axios.get(BLOGS.CHECK_SLUG(currentSlug));

        if (response.data.available) {
          isAvailable = true;
          setSlugAvailable(true);
        } else {
          // If slug exists, append counter and try again
          currentSlug = `${slug}-${counter}`;
          counter++;
        }
      }

      return currentSlug;
    } catch (error) {
      console.error("Error checking slug availability:", error);
      return slug;
    }
  };

  // Handle hashtag input
  const handleHashtagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      const value = hashtagInput.trim();
      if (value && !hashtags.includes(value)) {
        const formattedTag = value.startsWith('#') ? value : `#${value}`;
        setHashtags([...hashtags, formattedTag]);
        setHashtagInput('');
        updateFormDataHashtags([...hashtags, formattedTag]);
      }
    } else if (e.key === 'Backspace' && !hashtagInput && hashtags.length > 0) {
      const newHashtags = hashtags.slice(0, -1);
      setHashtags(newHashtags);
      updateFormDataHashtags(newHashtags);
    }
  };
  
  const removeHashtag = (index: number) => {
    const newHashtags = hashtags.filter((_, i) => i !== index);
    setHashtags(newHashtags);
    updateFormDataHashtags(newHashtags);
  };
  
  const updateFormDataHashtags = (tags: string[]) => {
    const hashtagsString = tags.join(',');
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        hashtags: hashtagsString
      }
    }));
  };
  
  // Handle title change and auto-generate slug
  const handleTitleChange = (newTitle: string) => {
    setFormData(prev => ({ ...prev, title: newTitle }));
    setPost(prev => ({ ...prev, title: newTitle }));
    
    // Clear existing timeout
    if (slugCheckTimeoutRef.current) {
      clearTimeout(slugCheckTimeoutRef.current);
    }
    
    // If title is empty, clear the slug
    if (!newTitle) {
      setFormData(prev => ({ ...prev, slug: '' }));
      setPost(prev => ({ ...prev, slug: '' }));
      setSlugAvailable(null);
      setCheckingSlug(false);
      return;
    }
    
    // Only generate slug if current slug is empty or was auto-generated from previous title
    if (!formData.slug || formData.slug === formatSlug(formData.title) || formData.slug.match(/^[a-z0-9-]+-\d+$/)) {
      const slug = formatSlug(newTitle);
      setFormData(prev => ({ ...prev, slug }));
      setPost(prev => ({ ...prev, slug }));
      
      // Check slug availability with debounce
      setCheckingSlug(true);
      setSlugAvailable(null);
      
      slugCheckTimeoutRef.current = setTimeout(async () => {
        try {
          const availableSlug = await checkSlugAvailability(slug);
          if (availableSlug === slug) {
            setSlugAvailable(true);
          } else {
            // If slug is not available, update to the available one
            setFormData(prev => ({ ...prev, slug: availableSlug }));
            setPost(prev => ({ ...prev, slug: availableSlug }));
            setSlugAvailable(true);
          }
        } catch (error) {
          console.error("Error checking slug:", error);
          setSlugAvailable(null);
        }
        setCheckingSlug(false);
      }, 500);
    }
  };
  
  // Handle manual slug change with availability check
  const handleSlugChange = (newSlug: string) => {
    const formattedSlug = formatSlug(newSlug);
    setFormData(prev => ({ ...prev, slug: formattedSlug }));
    setPost(prev => ({ ...prev, slug: formattedSlug }));
    
    // Clear existing timeout
    if (slugCheckTimeoutRef.current) {
      clearTimeout(slugCheckTimeoutRef.current);
    }
    
    if (formattedSlug) {
      setCheckingSlug(true);
      
      // Debounce the API call by 500ms
      slugCheckTimeoutRef.current = setTimeout(async () => {
        try {
          const availableSlug = await checkSlugAvailability(formattedSlug);
          if (availableSlug === formattedSlug) {
            setSlugAvailable(true);
          } else {
            setSlugAvailable(false);
            // Show the suggested available slug to user
            setFormData(prev => ({ ...prev, slug: availableSlug }));
            setPost(prev => ({ ...prev, slug: availableSlug }));
            // Mark as available since we updated to an available slug
            setSlugAvailable(true);
          }
        } catch (error) {
          console.error("Error checking slug:", error);
          setSlugAvailable(null);
        }
        setCheckingSlug(false);
      }, 500);
    } else {
      setSlugAvailable(null);
      setCheckingSlug(false);
    }
  };

  // Handle resizing of dual fullscreen panes
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current || (viewMode as ViewMode) !== 'dualFullscreen') return;
      
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const mouseX = e.clientX - containerRect.left;
      const containerWidth = containerRect.width;
      
      const leftWidth = (mouseX / containerWidth) * 100;
      const rightWidth = 100 - leftWidth;
      
      // Limit minimum width to 20%
      if (leftWidth >= 31 && leftWidth <= 80) {
        setLeftPaneWidth(`${leftWidth}%`);
        setRightPaneWidth(`${rightWidth}%`);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, viewMode]);
  
  // Initialize htmlCode with default content if needed
  useEffect(() => {
    if (!htmlCode && post.content) {
      setHtmlCode(post.content);
      setFormData(prev => ({ ...prev, htmlContent: post.content }));
    }
  }, []);

  // Handle click outside to close color pickers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if the click is on the color picker buttons in the toolbar
      const isTextColorButton = target.closest('[title="Text Color"]');
      const isBgColorButton = target.closest('[title="Background Color"]');
      
      // Check if the click is inside any color picker container
      const colorPickerContainers = document.querySelectorAll('[style*="Select Text Color"], [style*="Select Background Color"]');
      let isInsideColorPicker = false;
      
      colorPickerContainers.forEach(container => {
        if (container.contains(target)) {
          isInsideColorPicker = true;
        }
      });
      
      // Also check for clicks on the CustomColorPicker styled component and its children
      const isInsideCustomColorPicker = target.closest('.sc-hjsuWn') || target.closest('.sc-dTvVRJ') || 
                                       target.closest('.sc-hwkwBN') || target.closest('.sc-lgpSej') ||
                                       target.closest('[class*="ColorPicker"]') ||
                                       target.closest('[class*="ColorInput"]') ||
                                       target.closest('[class*="PresetColor"]') ||
                                       target.closest('[class*="ColorHex"]') ||
                                       target.closest('div[style*="position: absolute"][style*="zIndex: 1000"]');
      
      // Only close if clicking outside both the buttons and the color pickers
      if (!isTextColorButton && !isBgColorButton && !isInsideColorPicker && !isInsideCustomColorPicker) {
        setShowTextColorPicker(false);
        setShowBgColorPicker(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Check text formatting on selection change
  useEffect(() => {
    const checkFormats = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      if (!range || range.collapsed) {
        // No selection, check current cursor position
        const parentElement = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
          ? range.commonAncestorContainer.parentElement
          : range.commonAncestorContainer as HTMLElement;
          
        if (parentElement && previewContentRef?.contains(parentElement)) {
          setActiveFormats({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            strike: document.queryCommandState('strikethrough'),
            subscript: document.queryCommandState('subscript'),
            superscript: document.queryCommandState('superscript')
          });
        }
      } else {
        // Has selection
        if (previewContentRef?.contains(range.commonAncestorContainer)) {
          setActiveFormats({
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            strike: document.queryCommandState('strikethrough'),
            subscript: document.queryCommandState('subscript'),
            superscript: document.queryCommandState('superscript')
          });
        }
      }
    };

    document.addEventListener('selectionchange', checkFormats);
    return () => document.removeEventListener('selectionchange', checkFormats);
  }, [previewContentRef]);

  // Fix Monaco Editor layout when fullscreen state changes
  useEffect(() => {
    if (!monacoEditorRef.current) return;
    
    // Manual layout updates at specific intervals to avoid ResizeObserver issues
    const timers: NodeJS.Timeout[] = [];
    
    // Immediate update
    monacoEditorRef.current.layout();
    
    // Update during transition
    timers.push(setTimeout(() => {
      if (monacoEditorRef.current) {
        monacoEditorRef.current.layout();
      }
    }, 100));
    
    // Update after transition completes
    timers.push(setTimeout(() => {
      if (monacoEditorRef.current) {
        monacoEditorRef.current.layout();
      }
    }, 350));
    
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [isHtmlFullscreen]);
  
  // Update Monaco layout when preview fullscreen changes
  useEffect(() => {
    if (monacoEditorRef.current && !isPreviewFullscreen) {
      // Give time for flex layout to stabilize
      const timer = setTimeout(() => {
        monacoEditorRef.current?.layout();
      }, 350);
      
      return () => clearTimeout(timer);
    }
  }, [isPreviewFullscreen]);

  // Handle window resize for Monaco Editor
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (monacoEditorRef.current) {
          requestAnimationFrame(() => {
            try {
              monacoEditorRef.current?.layout();
            } catch (error) {
              console.warn('Monaco layout update failed:', error);
            }
          });
        }
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (slugCheckTimeoutRef.current) {
        clearTimeout(slugCheckTimeoutRef.current);
      }
    };
  }, []);

  // Variables for auto-scrolling
  let scrollInterval: NodeJS.Timeout | null = null;
  let draggedImageElement: HTMLElement | undefined;
  
  // Helper function to set up drag handlers for a single image element
  const setupImageDragHandlersForElement = useCallback((container: HTMLElement, img: HTMLImageElement) => {
    img.draggable = true;
    img.style.cursor = 'grab';
    img.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
    
    // Add smooth transition to container for visual feedback
    container.style.transition = 'all 0.3s ease';
    
    img.ondragstart = (e) => {
      e.stopPropagation();
      window.draggedElement = container;
      draggedImageElement = container;
      e.dataTransfer!.effectAllowed = 'move';
      e.dataTransfer!.setData('text/plain', 'image-drag');
      container.style.opacity = '0.5';
      container.style.transform = 'scale(0.98)';
      img.style.cursor = 'grabbing';
      img.style.transform = 'scale(0.95)';
      img.style.boxShadow = '0 8px 20px rgba(0,0,0,0.4)';
      
      // Add class for better visual feedback
      container.classList.add('dragging');
    };
    
    img.ondragend = (e) => {
      e.stopPropagation();
      container.style.opacity = '1';
      container.style.transform = 'scale(1)';
      img.style.cursor = 'grab';
      img.style.transform = 'scale(1)';
      img.style.boxShadow = 'none';
      container.classList.remove('dragging');
      window.draggedElement = undefined;
      draggedImageElement = undefined;
      
      // Clear scroll interval if active
      if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }
    };
    
    // Add drag event to handle auto-scrolling
    img.ondrag = (e) => {
      if (!previewContentRef || !previewContentRef.parentElement) return;
      
      const scrollContainer = previewContentRef.parentElement;
      const containerRect = scrollContainer.getBoundingClientRect();
      const viewportHeight = containerRect.height;
      const scrollZoneSize = viewportHeight * 0.5; // 50% of viewport height for scroll zones
      
      // Clear existing interval
      if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }
      
      // Calculate relative position in the container
      const relativeY = e.clientY - containerRect.top;
      
      // Determine scroll speed based on distance from edge
      let scrollSpeed = 0;
      if (relativeY < scrollZoneSize && relativeY > 0) {
        // In top scroll zone - speed increases closer to edge
        const distanceRatio = 1 - (relativeY / scrollZoneSize);
        scrollSpeed = -Math.max(5, Math.min(20, distanceRatio * 20));
      } else if (relativeY > viewportHeight - scrollZoneSize && relativeY < viewportHeight) {
        // In bottom scroll zone - speed increases closer to edge
        const distanceRatio = (relativeY - (viewportHeight - scrollZoneSize)) / scrollZoneSize;
        scrollSpeed = Math.max(5, Math.min(20, distanceRatio * 20));
      }
      
      // Start scrolling if speed is set
      if (scrollSpeed !== 0) {
        scrollInterval = setInterval(() => {
          scrollContainer.scrollTop += scrollSpeed;
        }, 20);
      }
    };
    
    container.ondragover = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Only show drop zone if it's from internal drag, not file drag
      if (window.draggedElement && window.draggedElement !== container && !e.dataTransfer?.types.includes('Files')) {
        const rect = container.getBoundingClientRect();
        const relativeY = e.clientY - rect.top;
        const dropZoneHeight = Math.min(rect.height * 0.3, 50); // 30% of height or 50px max
        
        // Clear previous styles
        container.style.borderTop = 'none';
        container.style.borderBottom = 'none';
        container.style.paddingTop = '0';
        container.style.paddingBottom = '0';
        container.style.marginTop = '1rem';
        container.style.marginBottom = '1rem';
        
        // Create or get drop indicator with arrow and text
        let dropIndicator = document.getElementById('drop-indicator');
        let dropLabel = document.getElementById('drop-indicator-label');
        
        if (!dropIndicator) {
          dropIndicator = document.createElement('div');
          dropIndicator.id = 'drop-indicator';
          dropIndicator.style.cssText = `
            position: fixed;
            left: 0;
            right: 0;
            height: 4px;
            background: #3b82f6;
            background: linear-gradient(90deg, transparent 0%, #3b82f6 20%, #3b82f6 80%, transparent 100%);
            box-shadow: 0 0 20px rgba(59,130,246,0.8), 0 2px 8px rgba(59,130,246,0.6);
            pointer-events: none;
            z-index: 10000;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            border-radius: 2px;
          `;
          document.body.appendChild(dropIndicator);
          
          // Create label with arrow and text
          dropLabel = document.createElement('div');
          dropLabel.id = 'drop-indicator-label';
          dropLabel.style.cssText = `
            position: fixed;
            background: #3b82f6;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            pointer-events: none;
            z-index: 10001;
            box-shadow: 0 4px 12px rgba(59,130,246,0.4);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 6px;
          `;
          document.body.appendChild(dropLabel);
        } else {
          dropLabel = document.getElementById('drop-indicator-label');
        }
        
        // Position the indicator
        const containerRect = container.getBoundingClientRect();
        const parentRect = container.parentElement!.getBoundingClientRect();
        
        if (relativeY < dropZoneHeight) {
          // Show indicator above with "Drop Above" label
          const indicatorTop = containerRect.top + window.scrollY - 2;
          dropIndicator.style.top = `${indicatorTop}px`;
          dropIndicator.style.left = `${parentRect.left}px`;
          dropIndicator.style.width = `${parentRect.width}px`;
          dropIndicator.style.display = 'block';
          
          if (dropLabel) {
            dropLabel.innerHTML = '↑ Drop Above';
            dropLabel.style.top = `${indicatorTop - 40}px`;
            dropLabel.style.left = `${parentRect.left + (parentRect.width / 2) - 60}px`;
            dropLabel.style.display = 'flex';
          }
        } else if (relativeY > rect.height - dropZoneHeight) {
          // Show indicator below with "Drop Below" label
          const indicatorTop = containerRect.bottom + window.scrollY - 2;
          dropIndicator.style.top = `${indicatorTop}px`;
          dropIndicator.style.left = `${parentRect.left}px`;
          dropIndicator.style.width = `${parentRect.width}px`;
          dropIndicator.style.display = 'block';
          
          if (dropLabel) {
            dropLabel.innerHTML = '↓ Drop Below';
            dropLabel.style.top = `${indicatorTop + 8}px`;
            dropLabel.style.left = `${parentRect.left + (parentRect.width / 2) - 60}px`;
            dropLabel.style.display = 'flex';
          }
        } else {
          // Hide indicator if not in drop zone
          dropIndicator.style.display = 'none';
          if (dropLabel) {
            dropLabel.style.display = 'none';
          }
        }
      }
    };
    
    container.ondragleave = (e) => {
      e.stopPropagation();
      container.style.borderTop = 'none';
      container.style.borderBottom = 'none';
      container.style.paddingTop = '0';
      container.style.paddingBottom = '0';
      container.style.marginTop = '1rem';
      container.style.marginBottom = '1rem';
      
      // Hide drop indicator and label
      const dropIndicator = document.getElementById('drop-indicator');
      const dropLabel = document.getElementById('drop-indicator-label');
      if (dropIndicator) {
        dropIndicator.style.display = 'none';
      }
      if (dropLabel) {
        dropLabel.style.display = 'none';
      }
    };
    
    container.ondrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      container.style.borderTop = 'none';
      container.style.borderBottom = 'none';
      container.style.paddingTop = '0';
      container.style.paddingBottom = '0';
      container.style.marginTop = '1rem';
      container.style.marginBottom = '1rem';
      
      // Hide drop indicator and label
      const dropIndicator = document.getElementById('drop-indicator');
      const dropLabel = document.getElementById('drop-indicator-label');
      if (dropIndicator) {
        dropIndicator.style.display = 'none';
      }
      if (dropLabel) {
        dropLabel.style.display = 'none';
      }
      
      // Clear scroll interval
      if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }
      
      // Handle file drops
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        // Don't handle file drops on individual images, let the parent handle it
        return;
      }
      
      // Handle image reordering
      const dragType = e.dataTransfer?.getData('text/plain');
      if (dragType === 'image-drag' && window.draggedElement && window.draggedElement !== container) {
        const draggedEl = window.draggedElement;
        const parent = container.parentNode;
        
        // Ensure we're not dropping inside another image container and parent is valid
        if (parent && draggedEl.parentNode && 
            !draggedEl.contains(container) && 
            !container.contains(draggedEl) &&
            (parent as HTMLElement).classList?.contains('blog-preview-content')) {
          
          const rect = container.getBoundingClientRect();
          const relativeY = e.clientY - rect.top;
          const dropZoneHeight = Math.min(rect.height * 0.5, 80);
          
          try {
            // Simple reordering - remove and insert
            draggedEl.parentNode.removeChild(draggedEl);
            
            if (relativeY < dropZoneHeight) {
              // Insert before target
              parent.insertBefore(draggedEl, container);
            } else {
              // Insert after target
              parent.insertBefore(draggedEl, container.nextSibling);
            }
            
            // Update HTML and re-setup drag handlers
            updateHtmlFromPreview();
            setTimeout(() => {
              if (previewContentRef) {
                const images = previewContentRef.querySelectorAll('.blog_image');
                images.forEach((imageContainer) => {
                  const img = imageContainer.querySelector('img');
                  if (img) {
                    setupImageDragHandlersForElement(imageContainer as HTMLElement, img as HTMLImageElement);
                  }
                });
              }
            }, 10);
          } catch (error) {
            console.error('Error during image drag and drop:', error);
          }
        }
        
        // Clear the dragged element reference
        window.draggedElement = undefined;
        draggedImageElement = undefined;
      }
    };
    // Note: updateHtmlFromPreview is intentionally not in dependencies as it's used in dynamically created event handlers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewContentRef]);

  // Helper function to set up drag handlers for a single video element
  const setupVideoDragHandlersForElement = useCallback((container: HTMLElement, video: HTMLVideoElement) => {
    video.draggable = true;
    video.style.cursor = 'grab';
    video.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    
    // Add smooth transition to container for visual feedback
    container.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    
    video.ondragstart = (e) => {
      e.stopPropagation();
      window.draggedElement = container;
      e.dataTransfer!.effectAllowed = 'move';
      e.dataTransfer!.setData('text/plain', 'video-drag');
      container.style.opacity = '0.5';
      container.style.transform = 'scale(0.98)';
      video.style.cursor = 'grabbing';
      video.style.transform = 'scale(0.95)';
      video.style.boxShadow = '0 8px 20px rgba(0,0,0,0.4)';
      
      // Add class for better visual feedback
      container.classList.add('dragging');
    };
    
    video.ondragend = (e) => {
      e.stopPropagation();
      container.style.opacity = '1';
      container.style.transform = 'scale(1)';
      video.style.cursor = 'grab';
      video.style.transform = 'scale(1)';
      video.style.boxShadow = 'none';
      container.classList.remove('dragging');
      window.draggedElement = undefined;
      
      // Clear scroll interval if active
      if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }
      
      updateHtmlFromPreview();
    };
    
    // Add drag event to handle auto-scrolling (similar to images)
    video.ondrag = (e) => {
      if (!previewContentRef || !previewContentRef.parentElement) return;
      
      const scrollContainer = previewContentRef.parentElement;
      const containerRect = scrollContainer.getBoundingClientRect();
      const viewportHeight = containerRect.height;
      const scrollZoneSize = viewportHeight * 0.5; // 50% of viewport height for scroll zones
      
      // Clear existing interval
      if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }
      
      // Calculate relative position in the container
      const relativeY = e.clientY - containerRect.top;
      
      // Determine scroll speed based on distance from edge
      let scrollSpeed = 0;
      if (relativeY < scrollZoneSize && relativeY > 0) {
        // In top scroll zone - speed increases closer to edge
        const distanceRatio = 1 - (relativeY / scrollZoneSize);
        scrollSpeed = -Math.max(5, Math.min(20, distanceRatio * 20));
      } else if (relativeY > viewportHeight - scrollZoneSize && relativeY < viewportHeight) {
        // In bottom scroll zone - speed increases closer to edge
        const distanceRatio = (relativeY - (viewportHeight - scrollZoneSize)) / scrollZoneSize;
        scrollSpeed = Math.max(5, Math.min(20, distanceRatio * 20));
      }
      
      // Start scrolling if speed is set
      if (scrollSpeed !== 0) {
        scrollInterval = setInterval(() => {
          scrollContainer.scrollTop += scrollSpeed;
        }, 20);
      }
    };
    
    container.ondragover = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Only show drop zone if it's from internal drag, not file drag
      if (window.draggedElement && window.draggedElement !== container && !e.dataTransfer?.types.includes('Files')) {
        const rect = container.getBoundingClientRect();
        const relativeY = e.clientY - rect.top;
        const dropZoneHeight = Math.min(rect.height * 0.5, 80); // 50% of height or 80px max
        
        // Clear previous styles
        container.style.borderTop = 'none';
        container.style.borderBottom = 'none';
        container.style.paddingTop = '0';
        container.style.paddingBottom = '0';
        container.style.marginTop = '1rem';
        container.style.marginBottom = '1rem';
        
        // Create or get drop indicator with arrow and text (reuse same indicator as images)
        let dropIndicator = document.getElementById('drop-indicator');
        let dropLabel = document.getElementById('drop-indicator-label');
        
        if (!dropIndicator) {
          dropIndicator = document.createElement('div');
          dropIndicator.id = 'drop-indicator';
          dropIndicator.style.cssText = `
            position: fixed;
            left: 0;
            right: 0;
            height: 4px;
            background: #3b82f6;
            background: linear-gradient(90deg, transparent 0%, #3b82f6 20%, #3b82f6 80%, transparent 100%);
            box-shadow: 0 0 20px rgba(59,130,246,0.8), 0 2px 8px rgba(59,130,246,0.6);
            pointer-events: none;
            z-index: 10000;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            border-radius: 2px;
          `;
          document.body.appendChild(dropIndicator);
          
          // Create label with arrow and text
          dropLabel = document.createElement('div');
          dropLabel.id = 'drop-indicator-label';
          dropLabel.style.cssText = `
            position: fixed;
            background: #3b82f6;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            pointer-events: none;
            z-index: 10001;
            box-shadow: 0 4px 12px rgba(59,130,246,0.4);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 6px;
          `;
          document.body.appendChild(dropLabel);
        } else {
          dropLabel = document.getElementById('drop-indicator-label');
        }
        
        const containerRect = container.getBoundingClientRect();
        const parentRect = container.parentElement!.getBoundingClientRect();
        
        // Position the indicator
        if (relativeY < dropZoneHeight) {
          // Top drop zone - show "Drop Above"
          const indicatorTop = containerRect.top + window.scrollY - 2;
          dropIndicator.style.top = `${indicatorTop}px`;
          dropIndicator.style.left = `${parentRect.left}px`;
          dropIndicator.style.width = `${parentRect.width}px`;
          dropIndicator.style.display = 'block';
          
          if (dropLabel) {
            dropLabel.innerHTML = '↑ Drop Above';
            dropLabel.style.top = `${indicatorTop - 40}px`;
            dropLabel.style.left = `${parentRect.left + (parentRect.width / 2) - 60}px`;
            dropLabel.style.display = 'flex';
          }
        } else if (relativeY > rect.height - dropZoneHeight) {
          // Bottom drop zone - show "Drop Below"
          const indicatorTop = containerRect.bottom + window.scrollY - 2;
          dropIndicator.style.top = `${indicatorTop}px`;
          dropIndicator.style.left = `${parentRect.left}px`;
          dropIndicator.style.width = `${parentRect.width}px`;
          dropIndicator.style.display = 'block';
          
          if (dropLabel) {
            dropLabel.innerHTML = '↓ Drop Below';
            dropLabel.style.top = `${indicatorTop + 8}px`;
            dropLabel.style.left = `${parentRect.left + (parentRect.width / 2) - 60}px`;
            dropLabel.style.display = 'flex';
          }
        } else {
          dropIndicator.style.display = 'none';
          if (dropLabel) {
            dropLabel.style.display = 'none';
          }
        }
      }
    };
    
    container.ondragleave = () => {
      container.style.borderTop = 'none';
      container.style.borderBottom = 'none';
      container.style.paddingTop = '0';
      container.style.paddingBottom = '0';
      container.style.marginTop = '1rem';
      container.style.marginBottom = '1rem';
      
      // Hide drop indicator and label
      const dropIndicator = document.getElementById('drop-indicator');
      const dropLabel = document.getElementById('drop-indicator-label');
      if (dropIndicator) {
        dropIndicator.style.display = 'none';
      }
      if (dropLabel) {
        dropLabel.style.display = 'none';
      }
    };
    
    container.ondrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      container.style.borderTop = 'none';
      container.style.borderBottom = 'none';
      container.style.paddingTop = '0';
      container.style.paddingBottom = '0';
      container.style.marginTop = '1rem';
      container.style.marginBottom = '1rem';
      
      // Hide drop indicator and label
      const dropIndicator = document.getElementById('drop-indicator');
      const dropLabel = document.getElementById('drop-indicator-label');
      if (dropIndicator) {
        dropIndicator.style.display = 'none';
      }
      if (dropLabel) {
        dropLabel.style.display = 'none';
      }
      
      // Clear scroll interval
      if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
      }
      
      // Handle file drops
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        // Don't handle file drops on individual videos, let the parent handle it
        return;
      }
      
      // Handle video reordering
      const dragType = e.dataTransfer?.getData('text/plain');
      if ((dragType === 'video-drag' || dragType === 'image-drag' || dragType === 'component-drag') && window.draggedElement && window.draggedElement !== container) {
        const draggedEl = window.draggedElement;
        const parent = container.parentNode;
        
        // Ensure we're not dropping inside another video container and parent is valid
        if (parent && draggedEl.parentNode && 
            !draggedEl.contains(container) && 
            !container.contains(draggedEl) &&
            (parent as HTMLElement).classList?.contains('blog-preview-content')) {
          
          const rect = container.getBoundingClientRect();
          const relativeY = e.clientY - rect.top;
          const dropZoneHeight = Math.min(rect.height * 0.5, 80);
          
          try {
            // Simple reordering - remove and insert
            draggedEl.parentNode.removeChild(draggedEl);
            
            if (relativeY < dropZoneHeight) {
              // Insert before target
              parent.insertBefore(draggedEl, container);
            } else {
              // Insert after target
              parent.insertBefore(draggedEl, container.nextSibling);
            }
            
            // Update HTML and re-setup drag handlers
            updateHtmlFromPreview();
            setTimeout(() => {
              if (previewContentRef) {
                const videos = previewContentRef.querySelectorAll('.blog_video');
                videos.forEach((videoContainer) => {
                  const video = videoContainer.querySelector('video');
                  if (video) {
                    setupVideoDragHandlersForElement(videoContainer as HTMLElement, video as HTMLVideoElement);
                  }
                });
              }
            }, 10);
          } catch (error) {
            console.error('Error during video drag and drop:', error);
          }
        }
        
        // Clear the dragged element reference
        window.draggedElement = undefined;
      }
    };
  }, [previewContentRef]);

  // Component drag handlers removed

  // Drag handlers for blog_editor_abitm components removed

  // Set up drag handlers for images and file drops
  useEffect(() => {
    if (!previewContentRef) return;

    const setupImageDragHandlers = () => {
      if (!previewContentRef) return;
      
      // Select all elements with classes starting with "blog_image"
      const images = previewContentRef.querySelectorAll('[class*="blog_image"]');
      
      images.forEach((container) => {
        const img = container.querySelector('img');
        if (img) {
          // Always set up drag handlers, not just when they're missing
          // This ensures drag functionality is restored after HTML updates
          setupImageDragHandlersForElement(container as HTMLElement, img as HTMLImageElement);
          
          // Ensure delete button exists for all blog_image_* containers
          if (!container.querySelector('.delete-button')) {
            const deleteBtn = createDeleteButton(container as HTMLElement);
            container.appendChild(deleteBtn);
          }
          
          // Add delete button hover functionality
          addDeleteButtonHover(container as HTMLElement, container.querySelector('.delete-button') as HTMLElement);
        }
      });
    };

    const setupVideoDragHandlers = () => {
      if (!previewContentRef) return;
      
      const videos = previewContentRef.querySelectorAll('.blog_video');
      
      videos.forEach((container) => {
        const video = container.querySelector('video');
        if (video) {
          // Always set up drag handlers, not just when they're missing
          // This ensures drag functionality is restored after HTML updates
          setupVideoDragHandlersForElement(container as HTMLElement, video as HTMLVideoElement);
        }
      });
    };

    // Component drag handlers function removed

    // Handle file drops on the preview area
    const handleFileDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Remove drop zone indicator
      previewContentRef.classList.remove('drag-over');
      
      // Only handle file drops, not image reordering
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        
        // Filter for image and video files
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        const videoFiles = files.filter(file => file.type.startsWith('video/'));
        
        // Process image files
        if (imageFiles.length > 0) {
          // Use for...of loop instead of forEach to properly handle async operations
          for (const file of imageFiles) {
            const maxSize = 10 * 1024 * 1024; // 10MB limit
            
            // Check file size
            if (file.size > maxSize) {
              setFileSizeWarnings(prev => [...prev, file.name]);
              toast.error(`${file.name} exceeds the 10MB limit`);
              
              // Auto-hide warning after 5 seconds
              setTimeout(() => {
                setFileSizeWarnings(prev => prev.filter(name => name !== file.name));
              }, 5000);
              continue;
            }
            
            // Create temporary container with placeholder
            const tempContainer = document.createElement('div');
            tempContainer.className = 'image-upload-placeholder';
            tempContainer.style.cssText = `
              position: relative;
              margin: 1rem 0;
              padding: 20px;
              background: #f3f4f6;
              border: 2px dashed #cbd5e1;
              border-radius: 8px;
              text-align: center;
              min-height: 100px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-direction: column;
            `;
            
            tempContainer.innerHTML = `
              <div style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">Uploading ${file.name}...</div>
              <div style="width: 100%; max-width: 300px; height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden;">
                <div id="progress-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}" style="height: 100%; background: #3b82f6; width: 0%; transition: width 0.3s ease;"></div>
              </div>
              <div id="progress-text-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}" style="color: #6b7280; font-size: 12px; margin-top: 5px;">0%</div>
            `;
            
            // Insert at cursor or at the end
            if (previewContentRef) {
              previewContentRef.appendChild(tempContainer);
            }
            
            try {
              // Upload the file
              const uploadedUrl = await uploadFile(file, 'image');
              
              if (uploadedUrl) {
                // Track uploaded image URL
                setUploadedImages(prev => [...prev, uploadedUrl]);
                
                // Create actual image container
                const container = document.createElement('div');
                container.className = generateImageClassName(file.name);
                container.style.cssText = `
                  position: relative;
                  margin: 1rem 0;
                  display: block;
                  max-width: 100%;
                  clear: both;
                `;
                
                const img = document.createElement('img');
                img.src = uploadedUrl;
                img.alt = file.name;
                img.style.cssText = `
                  max-width: 100%;
                  height: auto;
                  display: block;
                  cursor: grab;
                  transition: transform 0.2s ease, box-shadow 0.2s ease;
                `;
                img.draggable = true;
                
                container.appendChild(img);
                
                // Replace placeholder with actual image
                tempContainer.replaceWith(container);
                
                // Set up drag handlers for the new image
                setupImageDragHandlersForElement(container, img);
                
                
                // Add delete button
                const deleteBtn = createDeleteButton(container);
                container.appendChild(deleteBtn);
                addDeleteButtonHover(container, deleteBtn);
                
                // Trigger HTML update
                updateHtmlFromPreview();
                
                toast.success(`Image "${file.name}" uploaded successfully`);
              } else {
                throw new Error('Upload failed: No URL returned');
              }
            } catch (error: any) {
              console.error('Upload error:', error);
              if (tempContainer.parentNode) {
                tempContainer.remove();
              }
              
              // Show error toast
              const errorMessage = error.message || `Failed to upload ${file.name}`;
              toast.error(errorMessage);
              
              // Add error to list
              setUploadErrors(prev => {
                const newErrors = [...prev];
                if (!newErrors.includes(errorMessage)) {
                  newErrors.push(errorMessage);
                }
                return newErrors;
              });
              
              // Auto-hide error after 5 seconds
              setTimeout(() => {
                setUploadErrors(prev => prev.filter(msg => msg !== errorMessage));
              }, 5000);
            }
          }
        }
        
        // Process video files
        if (videoFiles.length > 0) {
          videoFiles.forEach(async (file) => {
            const maxSize = 10 * 1024 * 1024; // 10MB limit
            
            // Check file size
            if (file.size > maxSize) {
              setFileSizeWarnings(prev => [...prev, file.name]);
              toast.error(`${file.name} exceeds the 10MB limit`);
              
              // Auto-hide warning after 5 seconds
              setTimeout(() => {
                setFileSizeWarnings(prev => prev.filter(name => name !== file.name));
              }, 5000);
              return;
            }
            
            // Create temporary container with placeholder
            const tempContainer = document.createElement('div');
            tempContainer.className = 'video-upload-placeholder';
            tempContainer.style.cssText = `
              position: relative;
              margin: 1rem 0;
              padding: 20px;
              background: #f3f4f6;
              border: 2px dashed #cbd5e1;
              border-radius: 8px;
              text-align: center;
              min-height: 100px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-direction: column;
            `;
            
            tempContainer.innerHTML = `
              <div style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">Uploading ${file.name}...</div>
              <div style="width: 100%; max-width: 300px; height: 4px; background: #e5e7eb; border-radius: 2px; overflow: hidden;">
                <div id="progress-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}" style="height: 100%; background: #3b82f6; width: 0%; transition: width 0.3s ease;"></div>
              </div>
              <div id="progress-text-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}" style="color: #6b7280; font-size: 12px; margin-top: 5px;">0%</div>
            `;
            
            // Insert at cursor or at the end
            if (previewContentRef) {
              previewContentRef.appendChild(tempContainer);
            }
            
            try {
              // Upload the file
              const uploadedUrl = await uploadFile(file, 'video');
              
              if (uploadedUrl) {
                // Track uploaded video URL
                setUploadedVideos(prev => [...prev, uploadedUrl]);
                
                // Create actual video container
                const container = document.createElement('div');
                container.className = 'blog_video';
                container.style.cssText = `
                  position: relative;
                  margin: 1rem 0;
                  display: block;
                  max-width: 100%;
                  clear: both;
                `;
                
                const video = document.createElement('video');
                video.src = uploadedUrl;
                video.controls = true;
                video.style.cssText = `
                  max-width: 100%;
                  height: auto;
                  display: block;
                  cursor: grab;
                  transition: transform 0.2s ease, box-shadow 0.2s ease;
                  background: #000;
                  border-radius: 8px;
                `;
                video.draggable = true;
                
                container.appendChild(video);
                
                // Replace placeholder with actual video
                tempContainer.replaceWith(container);
                
                // Set up drag handlers for the new video
                setupVideoDragHandlersForElement(container, video);
                
                // Add delete button
                const deleteBtn = createDeleteButton(container);
                container.appendChild(deleteBtn);
                addDeleteButtonHover(container, deleteBtn);
                
                // Trigger HTML update
                updateHtmlFromPreview();
              }
            } catch (error: any) {
              console.error('Upload error:', error);
              tempContainer.remove();
              
              // Add error to list
              setUploadErrors(prev => [...prev, `Failed to upload ${file.name}`]);
              toast.error(`Failed to upload ${file.name}`);
              
              // Auto-hide error after 5 seconds
              setTimeout(() => {
                setUploadErrors(prev => prev.filter(msg => msg !== `Failed to upload ${file.name}`));
              }, 5000);
            }
          });
        }
      }
    };
    
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Show drop zone indicator for file drops
      if (e.dataTransfer?.types.includes('Files')) {
        previewContentRef.classList.add('drag-over');
      }
    };
    
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Remove drop zone indicator
      previewContentRef.classList.remove('drag-over');
    };

    // Set up initial handlers
    setupImageDragHandlers();
    setupVideoDragHandlers();
    // Component drag handlers removed
    
    // Add file drop handlers
    previewContentRef.addEventListener('drop', handleFileDrop);
    previewContentRef.addEventListener('dragover', handleDragOver);
    previewContentRef.addEventListener('dragleave', handleDragLeave);

    // Set up mutation observer to handle newly added images, videos and components
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          setupImageDragHandlers();
          setupVideoDragHandlers();
          // Component drag handlers removed
        }
      });
    });

    observer.observe(previewContentRef, {
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();
      previewContentRef.removeEventListener('drop', handleFileDrop);
      previewContentRef.removeEventListener('dragover', handleDragOver);
      previewContentRef.removeEventListener('dragleave', handleDragLeave);
    };
  }, [previewContentRef, setupVideoDragHandlersForElement]);

  // Extract CSS when htmlCode changes and create scoped CSS for ProseMirror
  useEffect(() => {
    if (htmlCode) {
      const extractedCss = extractCssFromHtml(htmlCode);
      setDynamicCss(extractedCss);
      
      // Inject CSS globally for the visual editor with ProseMirror scoping
      const styleId = 'dynamic-blog-styles';
      let existingStyle = document.getElementById(styleId);
      
      if (existingStyle) {
        existingStyle.remove();
      }
      
      if (extractedCss) {
        // Scope CSS to ProseMirror editor
        const scopedCss = extractedCss.replace(/([^{}]+){/g, (match, selector) => {
          // Skip @media queries and keyframes
          if (selector.trim().startsWith('@')) {
            return match;
          }
          // Add .ProseMirror prefix to selectors for specificity
          const selectors = selector.split(',').map((s: string) => {
            const trimmed = s.trim();
            return `.ProseMirror ${trimmed}`;
          }).join(', ');
          return `${selectors} {`;
        });
        
        // Add !important to most CSS properties to override TipTap defaults
        const importantCss = scopedCss.replace(/([^{}]+):([^;{}]+);/g, (match, prop, value) => {
          // Skip properties that already have !important
          if (value.includes('!important')) {
            return match;
          }
          // Skip certain properties that shouldn't have !important
          const skipProps = ['content', 'animation', 'transform', 'transition'];
          const propName = prop.trim().toLowerCase();
          if (skipProps.some(skip => propName.includes(skip))) {
            return match;
          }
          return `${prop}: ${value} !important;`;
        });
        
        const styleElement = document.createElement('style');
        styleElement.id = styleId;
        styleElement.textContent = importantCss;
        document.head.appendChild(styleElement);
      }
    }
    
    // Cleanup function to remove styles when component unmounts
    return () => {
      const styleId = 'dynamic-blog-styles';
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [htmlCode]);

  const handleHtmlChange = (value: string | undefined) => {
    if (value !== undefined && value !== htmlCode) {
      setHtmlCode(value);
      isUpdatingFromHtmlRef.current = true;
      
      // Check if this is a complete HTML document
      const isCompleteHtml = value.includes('<!DOCTYPE html>') && value.includes('<html>');
      
      if (isCompleteHtml) {
        // Parse complete HTML document
        const parser = new DOMParser();
        const doc = parser.parseFromString(value, 'text/html');
        
        // Extract CSS from style tags
        const styleTags = doc.querySelectorAll('style');
        let extractedCss = '';
        styleTags.forEach(tag => {
          extractedCss += tag.textContent || '';
        });
        setDynamicCss(extractedCss);
        
        // Update preview with body content
        if (previewContentRef) {
          saveCursorPosition();
          const bodyContent = doc.body?.innerHTML || '';
          if (previewContentRef.innerHTML !== bodyContent) {
            previewContentRef.innerHTML = bodyContent;
          }
          
          setTimeout(() => {
            restoreCursorPosition();
          }, 10);
        }
      } else {
        // Handle regular content or HTML with style tags
        const extractedCss = extractCssFromHtml(value);
        setDynamicCss(extractedCss);
        
        // Update preview content - keep the full HTML with styles
        if (previewContentRef) {
          saveCursorPosition();
          
          // Create a temporary div to parse the HTML
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = value;
          
          // Find and remove style tags temporarily
          const styleTags = tempDiv.querySelectorAll('style');
          styleTags.forEach(tag => tag.remove());
          
          // Update only if content is different
          const newContent = tempDiv.innerHTML;
          if (previewContentRef.innerHTML !== newContent) {
            previewContentRef.innerHTML = newContent;
          }
          
          // Restore cursor position after a small delay
          setTimeout(() => {
            restoreCursorPosition();
            isUpdatingFromHtmlRef.current = false;
          }, 10);
        }
      }
      
      setPost(prev => ({
        ...prev,
        content: value
      }));
      
      // Update formData
      setFormData(prev => ({
        ...prev,
        htmlContent: value
      }));
    }
  };

  // Extract CSS from HTML
  const extractCssFromHtml = (html: string) => {
    const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/);
    return styleMatch ? styleMatch[1] : '';
  };

  // Extract HTML content without style tag
  const extractHtmlContent = (html: string) => {
    return html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');
  };

  // Create blob URL from file (no server upload needed)
  const uploadFile = async (file: File, fileType: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        // Create a blob URL from the file
        const blobUrl = URL.createObjectURL(file);
        console.log(`Created blob URL for ${file.name}: ${blobUrl}`);
        
        // Set progress to 100% immediately since we're using local blob
        setUploadProgress((prev) => ({
          ...prev,
          [file.name]: 100,
        }));
        
        resolve(blobUrl);
      } catch (error: any) {
        console.error(`Error creating blob URL for ${file.name}:`, error);
        setUploadProgress((prev) => ({
          ...prev,
          [file.name]: 0,
        }));
        reject(new Error(`Failed to process ${file.name}: ${error.message}`));
      }
    });
  };

  // Preview editor functions
  const insertImageInPreview = () => {
    if (!previewContentRef) {
      toast.error('Preview area not ready. Please try again.');
      return;
    }

    // Create hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true; // Enable multiple file selection
    fileInput.style.cssText = 'position: fixed; left: -9999px; opacity: 0; pointer-events: none;';
    
    const cleanup = () => {
      // Remove file input after processing
      if (fileInput.parentNode) {
        document.body.removeChild(fileInput);
      }
    };
    
    fileInput.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) {
        cleanup();
        return;
      }

      if (!previewContentRef) {
        toast.error('Preview area not available.');
        cleanup();
        return;
      }

      const maxSize = 10 * 1024 * 1024; // 10MB limit
      
      // Process each selected file
      for (const file of Array.from(files)) {
        // Check file size
        if (file.size > maxSize) {
          // Show visual warning
          const warningMsg = `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
          setFileSizeWarnings(prev => [...prev, warningMsg]);
          toast.error(`File too large: ${file.name} exceeds 10MB limit`);
          setTimeout(() => {
            setFileSizeWarnings(prev => prev.filter(f => f !== warningMsg));
          }, 5000);
          continue;
        }
        
        // Create temporary container with loading indicator
        const tempContainer = document.createElement('div');
        tempContainer.className = generateImageClassName(file.name);
        tempContainer.style.cssText = `
          position: relative;
          margin: 1rem 0;
          display: block;
          max-width: 100%;
          clear: both;
          background: #f0f0f0;
          border: 2px dashed #ccc;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
        `;
        
        const loadingText = document.createElement('div');
        const progressId = `progress-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}`;
        const progressTextId = `progress-text-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}`;
        loadingText.innerHTML = `
          <div style="font-size: 14px; color: #666; margin-bottom: 10px;">Uploading ${file.name}...</div>
          <div style="width: 100%; max-width: 300px; height: 20px; background: #e0e0e0; border-radius: 10px; overflow: hidden; margin: 0 auto;">
            <div id="${progressId}" style="width: 0%; height: 100%; background: #4CAF50; transition: width 0.3s;"></div>
          </div>
          <div id="${progressTextId}" style="font-size: 12px; color: #999; margin-top: 5px;">0%</div>
        `;
        tempContainer.appendChild(loadingText);
        
        // Insert at cursor position or at end
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(tempContainer);
          range.setStartAfter(tempContainer);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          previewContentRef.appendChild(tempContainer);
          // Focus after insertion
          previewContentRef.focus();
        }
        
        try {
          // Upload the file
          const uploadedUrl = await uploadFile(file, 'image');
          
          if (uploadedUrl) {
            // Track uploaded image URL
            setUploadedImages(prev => [...prev, uploadedUrl]);
            
            // Create actual image container
            const container = document.createElement('div');
            container.className = generateImageClassName(file.name);
            container.style.cssText = `
              position: relative;
              margin: 1rem 0;
              display: block;
              max-width: 100%;
              clear: both;
            `;
            
            const img = document.createElement('img');
            img.src = uploadedUrl;
            img.alt = file.name;
            img.style.cssText = `
              max-width: 100%;
              height: auto;
              display: block;
              cursor: grab;
              transition: transform 0.2s ease, box-shadow 0.2s ease;
            `;
            img.draggable = true;
            
            // Add drag handlers using the helper function
            setupImageDragHandlersForElement(container, img);
            
            container.appendChild(img);
            
            // Add delete button
            const deleteBtn = createDeleteButton(container);
            container.appendChild(deleteBtn);
            
            // Add delete button hover functionality
            addDeleteButtonHover(container, deleteBtn);
            
            // Replace the temporary container with the actual image
            if (tempContainer.parentNode) {
              tempContainer.parentNode.replaceChild(container, tempContainer);
            } else {
              previewContentRef.appendChild(container);
            }
            
            // Add a line break after the image for proper separation
            const br = document.createElement('br');
            if (container.parentNode) {
              container.parentNode.insertBefore(br, container.nextSibling);
            }
            
            // Update HTML
            updateHtmlFromPreview();
            
            toast.success(`Image "${file.name}" uploaded successfully`);
          } else {
            throw new Error('Upload failed: No URL returned');
          }
        } catch (error: any) {
          console.error('Error uploading image:', error);
          // Remove the temporary container
          if (tempContainer.parentNode) {
            tempContainer.remove();
          }
          
          // Show error toast
          const errorMessage = `Failed to upload ${file.name}`;
          setUploadErrors(prev => {
            const newErrors = [...prev];
            if (!newErrors.includes(errorMessage)) {
              newErrors.push(errorMessage);
            }
            return newErrors;
          });
          toast.error(errorMessage);
          
          setTimeout(() => {
            setUploadErrors(prev => prev.filter(msg => msg !== errorMessage));
          }, 5000);
        }
      }
      
      // Cleanup after processing all files
      cleanup();
    };
    
    // Handle cancellation (user closes file dialog without selecting)
    fileInput.oncancel = () => {
      cleanup();
    };
    
    // Reset value to allow re-uploading the same file
    fileInput.value = '';
    
    // Trigger file picker
    document.body.appendChild(fileInput);
    
    // Use setTimeout to ensure the input is in the DOM before clicking
    setTimeout(() => {
      fileInput.click();
    }, 0);
  };

  const insertImageLinkInPreview = () => {
    if (!previewContentRef) return;
    
    // Focus the preview panel
    previewContentRef.focus();
    
    // Create image link toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'image-link-toolbar';
    toolbar.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 1px solid #e1e4e8;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      min-width: 400px;
    `;
    toolbar.setAttribute('data-editor-ui', 'true');
    
    const title = document.createElement('div');
    title.textContent = 'Insert Image from URL';
    title.style.cssText = `
      font-weight: 600;
      margin-bottom: 12px;
      font-size: 16px;
    `;
    toolbar.appendChild(title);
    
    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.placeholder = 'Enter image URL (e.g., https://example.com/image.jpg)';
    urlInput.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #e1e4e8;
      border-radius: 4px;
      font-size: 14px;
      margin-bottom: 8px;
    `;
    toolbar.appendChild(urlInput);
    
    const altInput = document.createElement('input');
    altInput.type = 'text';
    altInput.placeholder = 'Alt text (optional)';
    altInput.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #e1e4e8;
      border-radius: 4px;
      font-size: 14px;
      margin-bottom: 12px;
    `;
    toolbar.appendChild(altInput);
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    `;
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 6px 16px;
      border: 1px solid #e1e4e8;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    cancelBtn.onclick = () => toolbar.remove();
    
    const insertBtn = document.createElement('button');
    insertBtn.textContent = 'Insert Image';
    insertBtn.style.cssText = `
      padding: 6px 16px;
      border: none;
      background: #3b82f6;
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    insertBtn.onclick = () => {
      const url = urlInput.value.trim();
      if (url) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = altInput.value || 'Image';
        img.style.cssText = `
          max-width: 100%;
          height: auto;
          display: block;
          margin: 1rem 0;
          border-radius: 8px;
        `;
        img.setAttribute('draggable', 'true');
        
        // Create container for the image
        const container = document.createElement('div');
        const filename = getFilenameFromUrl(url);
        container.className = generateImageClassName(filename);
        container.style.cssText = `
          position: relative;
          margin: 1rem 0;
          display: inline-block;
          width: 100%;
        `;
        container.appendChild(img);
        
        // Add delete button
        const deleteBtn = createDeleteButton(container);
        container.appendChild(deleteBtn);
        
        // Add delete button hover functionality
        addDeleteButtonHover(container, deleteBtn);
        
        // Note: image resize toolbar removed
        
        insertAtCursor(container);
        setupImageDragHandlersForElement(container, img);
        updateHtmlFromPreview();
      }
      toolbar.remove();
    };
    
    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(insertBtn);
    toolbar.appendChild(buttonContainer);
    
    document.body.appendChild(toolbar);
    urlInput.focus();
    
    // Allow Enter key to insert
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        insertBtn.click();
      }
    });
  };

  const insertVideoLinkInPreview = () => {
    if (!previewContentRef) return;
    
    // Focus the preview panel
    previewContentRef.focus();
    
    // Create video link toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'video-link-toolbar';
    toolbar.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 1px solid #e1e4e8;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      min-width: 400px;
    `;
    toolbar.setAttribute('data-editor-ui', 'true');
    
    const title = document.createElement('div');
    title.textContent = 'Insert Video from URL';
    title.style.cssText = `
      font-weight: 600;
      margin-bottom: 12px;
      font-size: 16px;
    `;
    toolbar.appendChild(title);
    
    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.placeholder = 'Enter video URL (YouTube, Vimeo, or direct video URL)';
    urlInput.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #e1e4e8;
      border-radius: 4px;
      font-size: 14px;
      margin-bottom: 12px;
    `;
    toolbar.appendChild(urlInput);
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    `;
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 6px 16px;
      border: 1px solid #e1e4e8;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    cancelBtn.onclick = () => toolbar.remove();
    
    const insertBtn = document.createElement('button');
    insertBtn.textContent = 'Insert Video';
    insertBtn.style.cssText = `
      padding: 6px 16px;
      border: none;
      background: #3b82f6;
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    insertBtn.onclick = () => {
      const url = urlInput.value.trim();
      if (url) {
        let videoElement: HTMLElement;
        
        // Check if it's a YouTube URL
        const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
        const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
        
        if (youtubeMatch) {
          // Create YouTube embed
          const iframe = document.createElement('iframe');
          iframe.src = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
          iframe.style.cssText = `
            width: 100%;
            max-width: 800px;
            height: 450px;
            border: none;
            border-radius: 8px;
            margin: 1rem 0;
          `;
          iframe.setAttribute('allowfullscreen', 'true');
          iframe.setAttribute('draggable', 'true');
          videoElement = iframe;
        } else if (vimeoMatch) {
          // Create Vimeo embed
          const iframe = document.createElement('iframe');
          iframe.src = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
          iframe.style.cssText = `
            width: 100%;
            max-width: 800px;
            height: 450px;
            border: none;
            border-radius: 8px;
            margin: 1rem 0;
          `;
          iframe.setAttribute('allowfullscreen', 'true');
          iframe.setAttribute('draggable', 'true');
          videoElement = iframe;
        } else {
          // Create iframe for other video URLs
          const iframe = document.createElement('iframe');
          iframe.src = url;
          iframe.style.cssText = `
            width: 100%;
            max-width: 800px;
            height: 450px;
            border: none;
            border-radius: 8px;
            margin: 1rem 0;
          `;
          iframe.setAttribute('allowfullscreen', 'true');
          iframe.setAttribute('draggable', 'true');
          videoElement = iframe;
        }
        
        // Always create a container for the iframe
        const container = document.createElement('div');
        container.className = 'blog_video';
        container.style.cssText = `
          position: relative;
          margin: 1rem 0;
          display: inline-block;
          width: 100%;
          max-width: 800px;
        `;
        container.appendChild(videoElement);
        
        // Add delete button
        const deleteBtn = createDeleteButton(container);
        container.appendChild(deleteBtn);
        
        // Add hover effect for delete button
        container.addEventListener('mouseenter', () => {
          deleteBtn.style.opacity = '1';
        });
        container.addEventListener('mouseleave', () => {
          deleteBtn.style.opacity = '0';
        });
        
        insertAtCursor(container);
        // Drag handlers removed for video link components
        updateHtmlFromPreview();
      }
      toolbar.remove();
    };
    
    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(insertBtn);
    toolbar.appendChild(buttonContainer);
    
    document.body.appendChild(toolbar);
    urlInput.focus();
    
    // Allow Enter key to insert
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        insertBtn.click();
      }
    });
  };

  const showImageRearrangeDialog = () => {
    if (!previewContentRef) return;
    
    // Get all images from the preview (all blog_image_* classes)
    const images = Array.from(previewContentRef.querySelectorAll('[class*="blog_image"] img'));
    if (images.length === 0) {
      alert('No images to rearrange');
      return;
    }
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    // Create modal dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      width: 90%;
      max-width: 800px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    `;
    
    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    `;
    
    const title = document.createElement('h2');
    title.textContent = 'Rearrange Images';
    title.style.cssText = `
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.2s;
    `;
    closeBtn.onmouseover = () => closeBtn.style.background = '#f3f4f6';
    closeBtn.onmouseout = () => closeBtn.style.background = 'none';
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // Create scrollable content area
    const contentArea = document.createElement('div');
    contentArea.style.cssText = `
      flex: 1;
      overflow-y: auto;
      margin-bottom: 20px;
      border: 1px solid #e1e4e8;
      border-radius: 8px;
      padding: 16px;
      background: #f8f9fa;
    `;
    
    // Create grid container for images
    const imageGrid = document.createElement('div');
    imageGrid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 16px;
    `;
    
    // Create image items with drag functionality
    const imageItems: { element: HTMLElement; originalIndex: number; originalSrc: string }[] = [];
    let draggedItem: HTMLElement | null = null;
    
    images.forEach((img, index) => {
      const item = document.createElement('div');
      item.style.cssText = `
        position: relative;
        background: white;
        border: 2px solid #e1e4e8;
        border-radius: 8px;
        padding: 8px;
        cursor: grab;
        transition: all 0.2s ease;
        user-select: none;
      `;
      item.draggable = true;
      item.dataset.index = String(index);
      
      const imgPreview = document.createElement('img');
      imgPreview.src = (img as HTMLImageElement).src;
      imgPreview.style.cssText = `
        width: 100%;
        height: 120px;
        object-fit: cover;
        border-radius: 4px;
        pointer-events: none;
      `;
      
      const indexLabel = document.createElement('div');
      indexLabel.style.cssText = `
        position: absolute;
        top: 4px;
        left: 4px;
        background: #3b82f6;
        color: white;
        border-radius: 4px;
        padding: 2px 8px;
        font-size: 12px;
        font-weight: 600;
      `;
      indexLabel.textContent = String(index + 1);
      
      item.appendChild(imgPreview);
      item.appendChild(indexLabel);
      
      // Drag event handlers
      item.ondragstart = (e) => {
        draggedItem = item;
        item.style.opacity = '0.5';
        item.style.cursor = 'grabbing';
      };
      
      item.ondragend = () => {
        item.style.opacity = '1';
        item.style.cursor = 'grab';
        draggedItem = null;
      };
      
      item.ondragover = (e) => {
        e.preventDefault();
        if (draggedItem && draggedItem !== item) {
          const rect = item.getBoundingClientRect();
          const midpoint = rect.left + rect.width / 2;
          if (e.clientX < midpoint) {
            item.style.borderLeft = '4px solid #3b82f6';
            item.style.borderRight = '2px solid #e1e4e8';
          } else {
            item.style.borderRight = '4px solid #3b82f6';
            item.style.borderLeft = '2px solid #e1e4e8';
          }
        }
      };
      
      item.ondragleave = () => {
        item.style.borderLeft = '2px solid #e1e4e8';
        item.style.borderRight = '2px solid #e1e4e8';
      };
      
      item.ondrop = (e) => {
        e.preventDefault();
        item.style.borderLeft = '2px solid #e1e4e8';
        item.style.borderRight = '2px solid #e1e4e8';
        
        if (draggedItem && draggedItem !== item) {
          const draggedIndex = parseInt(draggedItem.dataset.index!);
          const targetIndex = parseInt(item.dataset.index!);
          const rect = item.getBoundingClientRect();
          const midpoint = rect.left + rect.width / 2;
          const insertBefore = e.clientX < midpoint;
          
          // Reorder the items
          const allItems = Array.from(imageGrid.children);
          const draggedEl = allItems[draggedIndex];
          const targetEl = allItems[targetIndex];
          
          if (insertBefore) {
            imageGrid.insertBefore(draggedEl, targetEl);
          } else {
            imageGrid.insertBefore(draggedEl, targetEl.nextSibling);
          }
          
          // Update indices
          Array.from(imageGrid.children).forEach((child, idx) => {
            (child as HTMLElement).dataset.index = String(idx);
            const label = child.querySelector('div');
            if (label) label.textContent = String(idx + 1);
          });
        }
      };
      
      imageGrid.appendChild(item);
      imageItems.push({ element: item, originalIndex: index, originalSrc: (img as HTMLImageElement).src });
    });
    
    contentArea.appendChild(imageGrid);
    
    // Create footer with action buttons
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    `;
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #e1e4e8;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    `;
    cancelBtn.onmouseover = () => cancelBtn.style.background = '#f3f4f6';
    cancelBtn.onmouseout = () => cancelBtn.style.background = 'white';
    cancelBtn.onclick = () => overlay.remove();
    
    const applyBtn = document.createElement('button');
    applyBtn.textContent = 'Apply Changes';
    applyBtn.style.cssText = `
      padding: 8px 16px;
      border: none;
      background: #3b82f6;
      color: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    `;
    applyBtn.onmouseover = () => applyBtn.style.background = '#2563eb';
    applyBtn.onmouseout = () => applyBtn.style.background = '#3b82f6';
    applyBtn.onclick = () => {
      // Get the new order by reading the current order of items in the grid
      const currentOrder = Array.from(imageGrid.children).map(child => {
        const imgElement = child.querySelector('img') as HTMLImageElement;
        return imgElement.src;
      });
      
      // Get all image containers in the preview (all blog_image_* classes)
      const imageContainers = Array.from(previewContentRef.querySelectorAll('[class*="blog_image"]'));
      
      // Create a mapping from old src to new container
      const containerMapping = new Map<string, Element>();
      currentOrder.forEach(src => {
        const container = imageContainers.find(container => {
          const img = container.querySelector('img') as HTMLImageElement;
          return img && img.src === src;
        });
        if (container) {
          containerMapping.set(src, container);
        }
      });
      
      // Create a clone of all image containers to preserve their original position info
      const imageClones = imageContainers.map(container => ({
        clone: container.cloneNode(true) as Element,
        originalSrc: (container.querySelector('img') as HTMLImageElement)?.src || ''
      }));
      
      // Now update each image container in place with the new ordered content
      imageContainers.forEach((container, index) => {
        if (index < currentOrder.length) {
          const newSrc = currentOrder[index];
          
          // Find the clone that has this src
          const sourceClone = imageClones.find(item => item.originalSrc === newSrc);
          
          if (sourceClone && container.parentNode) {
            // Replace the container's content with the clone's content
            container.innerHTML = sourceClone.clone.innerHTML;
            
            // Update the image src and any attributes
            const img = container.querySelector('img') as HTMLImageElement;
            const sourceImg = sourceClone.clone.querySelector('img') as HTMLImageElement;
            if (img && sourceImg) {
              img.src = sourceImg.src;
              img.alt = sourceImg.alt;
              
              // Re-setup drag handlers for this image
              setupImageDragHandlersForElement(container as HTMLElement, img);
            }
          }
        }
      });
      
      updateHtmlFromPreview();
      overlay.remove();
    };
    
    footer.appendChild(cancelBtn);
    footer.appendChild(applyBtn);
    
    // Close on clicking outside
    closeBtn.onclick = () => overlay.remove();
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
    
    // Assemble dialog
    dialog.appendChild(header);
    dialog.appendChild(contentArea);
    dialog.appendChild(footer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  };

  const showVideoRearrangeDialog = () => {
    if (!previewContentRef) return;
    
    // Get all videos/iframes from the preview
    const videos = Array.from(previewContentRef.querySelectorAll('.blog_video iframe, .blog_video video'));
    if (videos.length === 0) {
      alert('No videos to rearrange');
      return;
    }
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    // Create modal dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      width: 90%;
      max-width: 800px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    `;
    
    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    `;
    
    const title = document.createElement('h2');
    title.textContent = 'Rearrange Videos';
    title.style.cssText = `
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.2s;
    `;
    closeBtn.onmouseover = () => closeBtn.style.background = '#f3f4f6';
    closeBtn.onmouseout = () => closeBtn.style.background = 'none';
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    // Create scrollable content area
    const contentArea = document.createElement('div');
    contentArea.style.cssText = `
      flex: 1;
      overflow-y: auto;
      margin-bottom: 20px;
      border: 1px solid #e1e4e8;
      border-radius: 8px;
      padding: 16px;
      background: #f8f9fa;
    `;
    
    // Create list container for videos
    const videoList = document.createElement('div');
    videoList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;
    
    // Create video items with drag functionality
    const videoItems: { element: HTMLElement; originalIndex: number; container: HTMLElement }[] = [];
    let draggedItem: HTMLElement | null = null;
    
    videos.forEach((video, index) => {
      const item = document.createElement('div');
      item.style.cssText = `
        display: flex;
        align-items: center;
        background: white;
        border: 2px solid #e1e4e8;
        border-radius: 8px;
        padding: 12px;
        cursor: grab;
        transition: all 0.2s ease;
        user-select: none;
      `;
      item.draggable = true;
      item.dataset.index = String(index);
      
      const handle = document.createElement('div');
      handle.style.cssText = `
        margin-right: 12px;
        color: #9ca3af;
        font-size: 20px;
      `;
      handle.textContent = '☰';
      
      const preview = document.createElement('div');
      preview.style.cssText = `
        width: 120px;
        height: 80px;
        background: #000;
        border-radius: 4px;
        margin-right: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 32px;
        flex-shrink: 0;
        position: relative;
        overflow: hidden;
      `;
      
      // Try to show video thumbnail if possible
      if (video.tagName === 'VIDEO') {
        const videoElement = video as HTMLVideoElement;
        const thumbnailCanvas = document.createElement('canvas');
        thumbnailCanvas.width = 120;
        thumbnailCanvas.height = 80;
        const ctx = thumbnailCanvas.getContext('2d');
        if (ctx && videoElement.videoWidth > 0) {
          ctx.drawImage(videoElement, 0, 0, 120, 80);
          preview.style.backgroundImage = `url(${thumbnailCanvas.toDataURL()})`;
          preview.style.backgroundSize = 'cover';
          preview.style.backgroundPosition = 'center';
        }
      } else {
        // For iframes, try to get thumbnail from src URL if it's YouTube, Vimeo, etc.
        const src = (video as HTMLIFrameElement).src;
        if (src.includes('youtube.com') || src.includes('youtu.be')) {
          let videoId = '';
          if (src.includes('youtube.com/embed/')) {
            videoId = src.split('youtube.com/embed/')[1].split('?')[0];
          } else if (src.includes('youtu.be/')) {
            videoId = src.split('youtu.be/')[1].split('?')[0];
          }
          if (videoId) {
            const thumbnail = document.createElement('img');
            thumbnail.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
            thumbnail.style.cssText = `
              width: 100%;
              height: 100%;
              object-fit: cover;
            `;
            thumbnail.onerror = () => {
              preview.textContent = '▶';
            };
            preview.appendChild(thumbnail);
          } else {
            preview.textContent = '▶';
          }
        } else {
          preview.textContent = '▶';
        }
      }
      
      // Add play overlay
      const playOverlay = document.createElement('div');
      playOverlay.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: rgba(255, 255, 255, 0.9);
        font-size: 24px;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
        pointer-events: none;
      `;
      playOverlay.textContent = '▶';
      preview.appendChild(playOverlay);
      
      const info = document.createElement('div');
      info.style.cssText = `
        flex: 1;
      `;
      
      const videoTitle = document.createElement('div');
      videoTitle.style.cssText = `
        font-weight: 600;
        margin-bottom: 4px;
      `;
      videoTitle.textContent = `Video ${index + 1}`;
      
      const videoUrl = document.createElement('div');
      videoUrl.style.cssText = `
        font-size: 12px;
        color: #6b7280;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;
      
      if (video.tagName === 'IFRAME') {
        videoUrl.textContent = (video as HTMLIFrameElement).src;
      } else {
        videoUrl.textContent = (video as HTMLVideoElement).src;
      }
      
      info.appendChild(videoTitle);
      info.appendChild(videoUrl);
      
      item.appendChild(handle);
      item.appendChild(preview);
      item.appendChild(info);
      
      // Drag event handlers
      item.ondragstart = (e) => {
        draggedItem = item;
        item.style.opacity = '0.5';
        item.style.cursor = 'grabbing';
      };
      
      item.ondragend = () => {
        item.style.opacity = '1';
        item.style.cursor = 'grab';
        draggedItem = null;
      };
      
      item.ondragover = (e) => {
        e.preventDefault();
        if (draggedItem && draggedItem !== item) {
          const rect = item.getBoundingClientRect();
          const midpoint = rect.top + rect.height / 2;
          if (e.clientY < midpoint) {
            item.style.borderTop = '4px solid #3b82f6';
            item.style.borderBottom = '2px solid #e1e4e8';
          } else {
            item.style.borderBottom = '4px solid #3b82f6';
            item.style.borderTop = '2px solid #e1e4e8';
          }
        }
      };
      
      item.ondragleave = () => {
        item.style.borderTop = '2px solid #e1e4e8';
        item.style.borderBottom = '2px solid #e1e4e8';
      };
      
      item.ondrop = (e) => {
        e.preventDefault();
        item.style.borderTop = '2px solid #e1e4e8';
        item.style.borderBottom = '2px solid #e1e4e8';
        
        if (draggedItem && draggedItem !== item) {
          const draggedIndex = parseInt(draggedItem.dataset.index!);
          const targetIndex = parseInt(item.dataset.index!);
          const rect = item.getBoundingClientRect();
          const midpoint = rect.top + rect.height / 2;
          const insertBefore = e.clientY < midpoint;
          
          // Reorder the items
          const allItems = Array.from(videoList.children);
          const draggedEl = allItems[draggedIndex];
          const targetEl = allItems[targetIndex];
          
          if (insertBefore) {
            videoList.insertBefore(draggedEl, targetEl);
          } else {
            videoList.insertBefore(draggedEl, targetEl.nextSibling);
          }
          
          // Update indices
          Array.from(videoList.children).forEach((child, idx) => {
            (child as HTMLElement).dataset.index = String(idx);
            const titleEl = child.querySelector('div > div');
            if (titleEl) titleEl.textContent = `Video ${idx + 1}`;
          });
        }
      };
      
      videoList.appendChild(item);
      const videoContainer = video.closest('.blog_video') as HTMLElement;
      videoItems.push({ element: item, originalIndex: index, container: videoContainer });
    });
    
    contentArea.appendChild(videoList);
    
    // Create footer with action buttons
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    `;
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #e1e4e8;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    `;
    cancelBtn.onmouseover = () => cancelBtn.style.background = '#f3f4f6';
    cancelBtn.onmouseout = () => cancelBtn.style.background = 'white';
    cancelBtn.onclick = () => overlay.remove();
    
    const applyBtn = document.createElement('button');
    applyBtn.textContent = 'Apply Changes';
    applyBtn.style.cssText = `
      padding: 8px 16px;
      border: none;
      background: #3b82f6;
      color: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    `;
    applyBtn.onmouseover = () => applyBtn.style.background = '#2563eb';
    applyBtn.onmouseout = () => applyBtn.style.background = '#3b82f6';
    applyBtn.onclick = () => {
      // Get the new order by reading the current order of items in the list
      const currentOrder = Array.from(videoList.children).map(child => {
        const urlElement = child.querySelector('div:last-child > div:last-child') as HTMLElement;
        return urlElement ? urlElement.textContent || '' : '';
      });
      
      // Get all video containers in the preview
      const videoContainers = Array.from(previewContentRef.querySelectorAll('.blog_video'));
      
      // Map the current order to the actual containers
      const orderedContainers: Element[] = [];
      currentOrder.forEach(url => {
        const container = videoContainers.find(container => {
          const iframe = container.querySelector('iframe') as HTMLIFrameElement;
          const video = container.querySelector('video') as HTMLVideoElement;
          const actualUrl = iframe ? iframe.src : (video ? video.src : '');
          return actualUrl === url;
        });
        if (container) {
          orderedContainers.push(container);
        }
      });
      
      // Remove all video containers
      videoContainers.forEach(container => container.remove());
      
      // Re-insert in new order at the end of the content
      orderedContainers.forEach(container => {
        previewContentRef.appendChild(container);
      });
      
      updateHtmlFromPreview();
      overlay.remove();
    };
    
    footer.appendChild(cancelBtn);
    footer.appendChild(applyBtn);
    
    // Close on clicking outside
    closeBtn.onclick = () => overlay.remove();
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
    
    // Assemble dialog
    dialog.appendChild(header);
    dialog.appendChild(contentArea);
    dialog.appendChild(footer);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  };

  const insertVideoInPreview = () => {
    // Create hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'video/*';
    fileInput.multiple = true; // Enable multiple file selection
    fileInput.style.display = 'none';
    
    fileInput.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0 && previewContentRef) {
        const maxSize = 10 * 1024 * 1024; // 10MB limit
        
        // Process each selected file
        for (const file of Array.from(files)) {
          // Check file size
          if (file.size > maxSize) {
            // Show visual warning
            setFileSizeWarnings(prev => [...prev, `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`]);
            setTimeout(() => {
              setFileSizeWarnings(prev => prev.filter(f => f !== `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`));
            }, 5000);
            continue;
          }
          
          // Create temporary container with loading indicator
          const tempContainer = document.createElement('div');
          tempContainer.className = 'blog_video';
          tempContainer.style.cssText = `
            position: relative;
            margin: 1rem 0;
            display: block;
            max-width: 100%;
            clear: both;
            background: #f0f0f0;
            border: 2px dashed #ccc;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
          `;
          
          const loadingText = document.createElement('div');
          loadingText.innerHTML = `
            <div style="font-size: 14px; color: #666; margin-bottom: 10px;">Uploading ${file.name}...</div>
            <div style="width: 100%; height: 20px; background: #e0e0e0; border-radius: 10px; overflow: hidden;">
              <div id="progress-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}" style="width: 0%; height: 100%; background: #4CAF50; transition: width 0.3s;"></div>
            </div>
            <div id="progress-text-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}" style="font-size: 12px; color: #999; margin-top: 5px;">0%</div>
          `;
          tempContainer.appendChild(loadingText);
          
          // Insert at cursor position or at end
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(tempContainer);
          } else {
            previewContentRef.appendChild(tempContainer);
          }
          
          try {
            // Upload the file
            const uploadedUrl = await uploadFile(file, 'video');
            
            if (uploadedUrl) {
              // Track uploaded video URL
              setUploadedVideos(prev => [...prev, uploadedUrl]);
              // Create actual video container
              const container = document.createElement('div');
              container.className = 'blog_video';
              container.style.cssText = `
                position: relative;
                margin: 1rem 0;
                display: block;
                max-width: 100%;
                clear: both;
              `;
              
              const video = document.createElement('video');
              video.src = uploadedUrl;
              video.controls = true;
              video.style.cssText = `
                max-width: 100%;
                height: auto;
                display: block;
                cursor: grab;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                background: #000;
                border-radius: 8px;
              `;
              video.draggable = true;
              
              // Add drag handlers using the helper function
              setupVideoDragHandlersForElement(container, video);
              
              container.appendChild(video);
              
              // Add delete button
              const deleteBtn = createDeleteButton(container);
              container.appendChild(deleteBtn);
              addDeleteButtonHover(container, deleteBtn);
              
              // Replace the temporary container with the actual video
              tempContainer.parentNode?.replaceChild(container, tempContainer);
              
              // Add a line break after the video for proper separation
              const br = document.createElement('br');
              if (container.parentNode) {
                container.parentNode.insertBefore(br, container.nextSibling);
              }
              
              // Update HTML
              updateHtmlFromPreview();
            }
          } catch (error: any) {
            console.error('Error uploading video:', error);
            // Remove the temporary container
            tempContainer.remove();
            
            // Show error toast
            const errorMessage = `Failed to upload ${file.name}`;
            setUploadErrors(prev => [...prev, errorMessage]);
            setTimeout(() => {
              setUploadErrors(prev => prev.filter(msg => msg !== errorMessage));
            }, 5000);
          }
        }
      }
    };
    
    // Reset value to allow re-uploading the same file
    fileInput.value = '';
    
    // Trigger file picker
    document.body.appendChild(fileInput);
    fileInput.click();
    
    // Remove after a delay to ensure the file dialog has opened
    setTimeout(() => {
      if (fileInput.parentNode) {
        document.body.removeChild(fileInput);
      }
    }, 100);
  };

  // Helper function to create a delete button for any element
  const createDeleteButton = (element: HTMLElement) => {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-button';
    deleteBtn.setAttribute('data-editor-ui', 'true'); // Mark as editor UI element
    deleteBtn.innerHTML = '✕';
    deleteBtn.style.cssText = `
      position: absolute;
      top: -20px;
      right: -8px;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      cursor: pointer;
      font-size: 18px;
      font-weight: bold;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      line-height: 1;
      transform: translate(50%, -50%);
    `;
    deleteBtn.contentEditable = 'false';
    deleteBtn.setAttribute('contenteditable', 'false');
    deleteBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      element.remove();
      updateHtmlFromPreview();
    };
    return deleteBtn;
  };

  // Helper function to add hover effect for delete button
  const addDeleteButtonHover = (container: HTMLElement, deleteBtn: HTMLElement) => {
    container.addEventListener('mouseenter', () => {
      (deleteBtn as HTMLElement).style.opacity = '1';
    });
    container.addEventListener('mouseleave', () => {
      (deleteBtn as HTMLElement).style.opacity = '0';
    });
  };

  // Helper function to generate a clean class name from filename
  const generateImageClassName = (filename: string): string => {
    // Remove file extension and clean the filename
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
    // Replace spaces, special characters with underscores and make lowercase
    const cleanName = nameWithoutExt
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
    
    return `blog_image_${cleanName}`;
  };

  // Helper function to extract filename from URL
  const getFilenameFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop() || 'image';
      
      // If no extension, add a generic one
      if (!filename.includes('.')) {
        return filename + '.jpg';
      }
      
      return filename;
    } catch {
      // If URL parsing fails, create a generic filename
      return 'image_' + Date.now() + '.jpg';
    }
  };

  // Image resize toolbar functions removed

  const createAdvancedTable = (rows: number = 3, cols: number = 3) => {
    const container = document.createElement('div');
    container.className = 'advanced-table-container';
    container.style.cssText = `
      position: relative;
      margin: 2rem 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      overflow: visible;
    `;

    // Create table wrapper for scrolling
    const tableWrapper = document.createElement('div');
    tableWrapper.style.cssText = `
      overflow-x: auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    `;

    // Create the table
    const table = document.createElement('table');
    table.className = 'editor_blog_table';
    table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      background: white;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
      border-radius: 12px;
      transition: all 0.3s ease;
    `;

    // Create table ID
    const tableId = 'adv_table_' + Date.now();
    table.id = tableId;


    // Create the advanced cell with row/column controls
    const createAdvancedCell = (type: 'th' | 'td', content: string, rowIndex: number, colIndex: number) => {
      const cell = document.createElement(type);
      cell.className = 'blog_table_cell';
      cell.setAttribute('contenteditable', 'true');
      cell.style.cssText = `
        padding: 12px 16px;
        border: 1px solid #e5e7eb;
        background: ${type === 'th' ? '#f9fafb' : 'white'};
        min-width: 120px;
        font-weight: ${type === 'th' ? '600' : 'normal'};
        color: ${type === 'th' ? '#111827' : '#374151'};
        transition: all 0.2s ease;
        position: relative;
        overflow: visible;
      `;
      cell.textContent = content;
      cell.dataset.row = String(rowIndex);
      cell.dataset.col = String(colIndex);

      // Cell controls (shown on hover) - positioned inside cell
      const cellControls = document.createElement('div');
      cellControls.className = 'cell-controls';
      cellControls.setAttribute('contenteditable', 'false');
      cellControls.style.cssText = `
        position: absolute;
        top: -40px;
        left: 50%;
        transform: translateX(-50%);
        display: none;
        gap: 4px;
        background: white;
        padding: 6px;
        border-radius: 8px;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
        z-index: 99999;
        flex-direction: row;
        border: 1px solid #e5e7eb;
        pointer-events: auto;
        white-space: nowrap;
      `;

      // Add row above button
      const addRowAboveBtn = document.createElement('button');
      addRowAboveBtn.innerHTML = '⬆️';
      addRowAboveBtn.title = 'Add row above';
      addRowAboveBtn.style.cssText = `
        padding: 4px 8px;
        font-size: 12px;
        border: 1px solid #e5e7eb;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
      `;
      addRowAboveBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Direct inline function call
        addTableRow(table, rowIndex, 'before');
      };

      // Add row below button
      const addRowBelowBtn = document.createElement('button');
      addRowBelowBtn.innerHTML = '⬇️';
      addRowBelowBtn.title = 'Add row below';
      addRowBelowBtn.style.cssText = addRowAboveBtn.style.cssText;
      addRowBelowBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Direct inline function call
        addTableRow(table, rowIndex, 'after');
      };

      // Add column left button
      const addColLeftBtn = document.createElement('button');
      addColLeftBtn.innerHTML = '⬅️';
      addColLeftBtn.title = 'Add column left';
      addColLeftBtn.style.cssText = addRowAboveBtn.style.cssText;
      addColLeftBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Direct inline function call
        addTableColumn(table, colIndex, 'before');
      };

      // Add column right button
      const addColRightBtn = document.createElement('button');
      addColRightBtn.innerHTML = '➡️';
      addColRightBtn.title = 'Add column right';
      addColRightBtn.style.cssText = addRowAboveBtn.style.cssText;
      addColRightBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Direct inline function call
        addTableColumn(table, colIndex, 'after');
      };

      // Delete row button
      const deleteRowBtn = document.createElement('button');
      deleteRowBtn.innerHTML = '🗑️';
      deleteRowBtn.title = 'Delete row';
      deleteRowBtn.style.cssText = addRowAboveBtn.style.cssText;
      deleteRowBtn.style.background = '#fee2e2';
      deleteRowBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const row = cell.parentElement;
        const tbody = row?.parentElement;
        if (tbody && tbody.children.length > 1) {
          row?.remove();
          updateHtmlFromPreview();
        }
      };

      // Delete column button
      const deleteColBtn = document.createElement('button');
      deleteColBtn.innerHTML = '❌';
      deleteColBtn.title = 'Delete column';
      deleteColBtn.style.cssText = addRowAboveBtn.style.cssText;
      deleteColBtn.style.background = '#fef2f2';
      deleteColBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const currentColIndex = parseInt(cell.dataset.col || '0');
        const rows = table.querySelectorAll('tr');
        
        // Check if there's more than one column
        if (rows[0] && rows[0].children.length > 1) {
          rows.forEach(row => {
            const cellToRemove = row.children[currentColIndex];
            if (cellToRemove) {
              cellToRemove.remove();
            }
          });
          
          // Update column indices for remaining cells
          rows.forEach((row, rowIdx) => {
            Array.from(row.children).forEach((cell, colIdx) => {
              (cell as HTMLElement).dataset.col = String(colIdx);
            });
          });
          
          updateHtmlFromPreview();
        }
      };

      cellControls.appendChild(addRowAboveBtn);
      cellControls.appendChild(addRowBelowBtn);
      cellControls.appendChild(addColLeftBtn);
      cellControls.appendChild(addColRightBtn);
      cellControls.appendChild(deleteRowBtn);
      cellControls.appendChild(deleteColBtn);

      // Add controls to the cell itself for better positioning
      cell.style.position = 'relative';
      cell.style.overflow = 'visible';
      cell.appendChild(cellControls);

      // Show controls on hover - simplified
      cell.addEventListener('mouseenter', () => {
        // Add cell hover effect
        if (!cell.matches(':focus')) {
          cell.style.background = type === 'th' ? '#f3f4f6' : '#f9fafb';
          cell.style.transform = 'scale(1.01)';
        }
        
        // Hide all other cell controls first
        document.querySelectorAll('.cell-controls').forEach(control => {
          if (control !== cellControls) {
            (control as HTMLElement).style.display = 'none';
          }
        });
        
        // Show this cell's controls
        cellControls.style.display = 'flex';
      });

      cell.addEventListener('mouseleave', (e) => {
        // Remove cell hover effect
        if (!cell.matches(':focus')) {
          cell.style.background = type === 'th' ? '#f9fafb' : 'white';
          cell.style.transform = 'scale(1)';
        }
        
        // Hide controls when leaving cell (unless going to controls)
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (!cellControls.contains(relatedTarget)) {
          setTimeout(() => {
            if (!cell.matches(':hover')) {
              cellControls.style.display = 'none';
            }
          }, 100);
        }
      });

      // Keep controls visible when hovering over them
      cellControls.addEventListener('mouseenter', () => {
        cellControls.style.display = 'flex';
      });
      
      cellControls.addEventListener('mouseleave', () => {
        setTimeout(() => {
          if (!cell.matches(':hover')) {
            cellControls.style.display = 'none';
          }
        }, 100);
      });

      cell.addEventListener('focus', () => {
        cell.style.outline = '2px solid #3b82f6';
        cell.style.outlineOffset = '-2px';
        cell.style.background = type === 'th' ? '#eff6ff' : '#f0f9ff';
        cell.style.transform = 'scale(1.02)';
      });

      cell.addEventListener('blur', () => {
        cell.style.outline = 'none';
        cell.style.background = type === 'th' ? '#f9fafb' : 'white';
        cell.style.transform = 'scale(1)';
        updateHtmlFromPreview();
      });
      
      // Ensure cell is clickable and focusable
      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        cell.focus();
      });

      return cell;
    };

    // Create table body
    const tbody = document.createElement('tbody');

    // Add initial rows and columns
    for (let i = 0; i < rows; i++) {
      const row = document.createElement('tr');
      for (let j = 0; j < cols; j++) {
        const isHeader = i === 0;
        const content = isHeader ? `Header ${j + 1}` : `Cell ${i}-${j + 1}`;
        const cell = createAdvancedCell(isHeader ? 'th' : 'td', content, i, j);
        row.appendChild(cell);
      }
      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    tableWrapper.appendChild(table);

    // Table controls header
    const tableControls = document.createElement('div');
    tableControls.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding: 8px 12px;
      background: #f3f4f6;
      border-radius: 6px;
    `;

    const tableTitle = document.createElement('div');
    tableTitle.style.cssText = `
      font-weight: 600;
      color: #374151;
      font-size: 14px;
    `;
    // Remove Advanced Table text - table title removed

    const tableActions = document.createElement('div');
    tableActions.style.cssText = `
      display: flex;
      gap: 8px;
    `;

    // Clear table button
    const clearTableBtn = document.createElement('button');
    clearTableBtn.innerHTML = '🧹 Clear';
    clearTableBtn.style.cssText = `
      padding: 6px 12px;
      font-size: 13px;
      border: 1px solid #e5e7eb;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    `;
    clearTableBtn.onclick = () => {
      table.querySelectorAll('td, th').forEach(cell => {
        cell.textContent = '';
        // Ensure cells remain editable after clearing
        (cell as HTMLElement).setAttribute('contenteditable', 'true');
      });
      updateHtmlFromPreview();
    };

    tableActions.appendChild(clearTableBtn);
    // Only add actions, remove title
    tableControls.appendChild(tableActions);

    // Make controls hover-based and repositioned
    tableControls.style.cssText = `
      position: absolute;
      top: -20px;
      right: 20px;
      display: flex;
      gap: 8px;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
      z-index: 100;
    `;
    
    // Show/hide controls on container hover
    container.addEventListener('mouseenter', () => {
      tableControls.style.opacity = '1';
      tableControls.style.visibility = 'visible';
    });
    
    container.addEventListener('mouseleave', () => {
      tableControls.style.opacity = '0';
      tableControls.style.visibility = 'hidden';
    });

    container.appendChild(tableControls);
    container.appendChild(tableWrapper);

    // Helper functions for advanced table operations
    const addTableRow = (table: HTMLTableElement, afterIndex: number, position: 'before' | 'after') => {
      const tbody = table.querySelector('tbody');
      if (!tbody) return;

      const rows = tbody.querySelectorAll('tr');
      const targetRow = rows[afterIndex];
      if (!targetRow) return;

      const newRow = document.createElement('tr');
      const colCount = targetRow.children.length;
      const newRowIndex = position === 'before' ? afterIndex : afterIndex + 1;

      for (let i = 0; i < colCount; i++) {
        const cell = createAdvancedCell('td', 'New cell', newRowIndex, i);
        newRow.appendChild(cell);
      }

      if (position === 'before') {
        targetRow.parentNode?.insertBefore(newRow, targetRow);
      } else {
        targetRow.parentNode?.insertBefore(newRow, targetRow.nextSibling);
      }

      // Update row indices for all cells and ensure they are editable
      const updatedRows = tbody.querySelectorAll('tr');
      updatedRows.forEach((row, rowIdx) => {
        row.querySelectorAll('th, td').forEach((cell, colIdx) => {
          const cellElement = cell as HTMLElement;
          cellElement.dataset.row = String(rowIdx);
          cellElement.dataset.col = String(colIdx);
          cellElement.setAttribute('contenteditable', 'true');
        });
      });

      updateHtmlFromPreview();
    };

    const addTableColumn = (table: HTMLTableElement, afterIndex: number, position: 'before' | 'after') => {
      const rows = table.querySelectorAll('tr');
      const insertIndex = position === 'before' ? afterIndex : afterIndex + 1;

      rows.forEach((row, rowIndex) => {
        const isHeader = rowIndex === 0;
        const cell = createAdvancedCell(isHeader ? 'th' : 'td', isHeader ? 'New Header' : 'New cell', rowIndex, insertIndex);

        const cells = row.children;
        if (insertIndex >= cells.length) {
          row.appendChild(cell);
        } else {
          row.insertBefore(cell, cells[insertIndex]);
        }
      });

      // Update column indices for all cells and ensure they are editable
      const tbody = table.querySelector('tbody');
      if (tbody) {
        tbody.querySelectorAll('tr').forEach((row, rowIdx) => {
          row.querySelectorAll('th, td').forEach((cell, colIdx) => {
            const cellElement = cell as HTMLElement;
            cellElement.dataset.row = String(rowIdx);
            cellElement.dataset.col = String(colIdx);
              cellElement.setAttribute('contenteditable', 'true');
          });
        });
      }

      updateHtmlFromPreview();
    };

    // Make these functions available to the cell controls
    (table as any).__addTableRow = addTableRow;
    (table as any).__addTableColumn = addTableColumn;

    // Add delete button for the entire table
    const deleteBtn = createDeleteButton(container);
    container.appendChild(deleteBtn);
    addDeleteButtonHover(container, deleteBtn);

    return container;
  };


  const createWorkingTable = (rows: number = 3, cols: number = 3) => {
    const container = document.createElement('div');
    container.className = 'working-table-container';
    container.style.cssText = `
      position: relative;
      margin: 1.5rem 0;
      padding: 30px 30px 10px 30px;
      overflow: visible;
    `;

    // Create the table
    const table = document.createElement('table');
    table.className = 'editor_blog_table working-table';
    table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      background: white;
      border: 1px solid #e1e5e9;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    `;

    // Create a unique ID for this table
    const tableId = 'table_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    table.id = tableId;

    const createCell = (type: 'th' | 'td', content: string) => {
      const cell = document.createElement(type);
      cell.className = 'editor_blog_table_cell';
      cell.style.cssText = `
        padding: 12px;
        border: 1px solid #e1e5e9;
        background: ${type === 'th' ? '#f8f9fa' : 'white'};
        min-width: 100px;
        vertical-align: top;
      `;
      cell.textContent = content;
      
      cell.addEventListener('focus', () => {
        cell.style.outline = '2px solid #3b82f6';
        cell.style.outlineOffset = '-2px';
      });
      
      cell.addEventListener('blur', () => {
        cell.style.outline = 'none';
        updateHtmlFromPreview();
      });
      
      return cell;
    };

    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (let i = 0; i < cols; i++) {
      headerRow.appendChild(createCell('th', `Header ${i + 1}`));
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create body
    const tbody = document.createElement('tbody');
    for (let i = 0; i < rows - 1; i++) {
      const row = document.createElement('tr');
      for (let j = 0; j < cols; j++) {
        row.appendChild(createCell('td', `Cell ${i + 1}-${j + 1}`));
      }
      tbody.appendChild(row);
    }
    table.appendChild(tbody);

    // Create toolbar with working buttons
    const toolbar = document.createElement('div');
    toolbar.className = 'table-toolbar';
    toolbar.setAttribute('data-editor-ui', 'true'); // Mark as editor UI element
    toolbar.contentEditable = 'false';
    toolbar.setAttribute('contenteditable', 'false');
    toolbar.style.cssText = `
      position: absolute;
      top: -50px;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #f8f9fa;
      border: 1px solid #e1e5e9;
      border-radius: 6px;
      font-size: 12px;
      opacity: 0;
      transition: opacity 0.2s ease;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
      z-index: 100;
      pointer-events: none;
    `;

    // Helper function to add row buttons to each row
    const addRowButtons = (row: HTMLElement, rowIndex: number) => {
      const targetTable = table;
      const rowButtonContainer = document.createElement('div');
      rowButtonContainer.className = 'row-button-container';
      rowButtonContainer.setAttribute('data-editor-ui', 'true');
      rowButtonContainer.contentEditable = 'false';
      rowButtonContainer.style.cssText = `
        position: absolute;
        left: -30px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        align-items: center;
        opacity: 0;
        transition: opacity 0.2s ease;
      `;
      
      const addRowButton = document.createElement('button');
      addRowButton.textContent = '+';
      addRowButton.style.cssText = `
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 1px solid #22c55e;
        background: #dcfce7;
        color: #15803d;
        font-size: 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
      `;
      
      addRowButton.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Show before/after menu
        const menu = document.createElement('div');
        menu.style.cssText = `
          position: absolute;
          left: 30px;
          top: -30px;
          background: white;
          border: 1px solid #e1e4e8;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        `;
        
        const beforeBtn = document.createElement('button');
        beforeBtn.textContent = 'Before';
        beforeBtn.style.cssText = `
          padding: 8px 16px;
          border: none;
          background: white;
          cursor: pointer;
          text-align: left;
          font-size: 14px;
        `;
        beforeBtn.onmouseover = () => beforeBtn.style.background = '#f3f4f6';
        beforeBtn.onmouseout = () => beforeBtn.style.background = 'white';
        beforeBtn.onclick = () => {
          const tbody = targetTable.querySelector('tbody') || targetTable;
          const colCount = row.children.length;
          const newRow = document.createElement('tr');
          for (let i = 0; i < colCount; i++) {
            newRow.appendChild(createCell('td', 'New cell'));
          }
          row.parentNode?.insertBefore(newRow, row);
          const setupFunc = (window as any)[`setupTableInteractivity_${tableId}`];
          if (setupFunc) setupFunc();
          updateHtmlFromPreview();
          menu.remove();
        };
        
        const afterBtn = document.createElement('button');
        afterBtn.textContent = 'After';
        afterBtn.style.cssText = `
          padding: 8px 16px;
          border: none;
          background: white;
          cursor: pointer;
          text-align: left;
          font-size: 14px;
          border-top: 1px solid #e1e4e8;
        `;
        afterBtn.onmouseover = () => afterBtn.style.background = '#f3f4f6';
        afterBtn.onmouseout = () => afterBtn.style.background = 'white';
        afterBtn.onclick = () => {
          const tbody = targetTable.querySelector('tbody') || targetTable;
          const colCount = row.children.length;
          const newRow = document.createElement('tr');
          for (let i = 0; i < colCount; i++) {
            newRow.appendChild(createCell('td', 'New cell'));
          }
          row.parentNode?.insertBefore(newRow, row.nextSibling);
          const setupFunc = (window as any)[`setupTableInteractivity_${tableId}`];
          if (setupFunc) setupFunc();
          updateHtmlFromPreview();
          menu.remove();
        };
        
        menu.appendChild(beforeBtn);
        menu.appendChild(afterBtn);
        rowButtonContainer.appendChild(menu);
        
        // Remove menu when clicking outside
        setTimeout(() => {
          document.addEventListener('click', function removeMenu(e) {
            if (!menu.contains(e.target as Node)) {
              menu.remove();
              document.removeEventListener('click', removeMenu);
            }
          });
        }, 0);
      };
      
      rowButtonContainer.appendChild(addRowButton);
      row.style.position = 'relative';
      row.appendChild(rowButtonContainer);
      
      // Show/hide on hover
      row.addEventListener('mouseenter', () => {
        rowButtonContainer.style.opacity = '1';
      });
      row.addEventListener('mouseleave', () => {
        rowButtonContainer.style.opacity = '0';
      });
    };

    // Helper function to add column buttons to cells
    const addColumnButtons = (cell: HTMLElement, cellIndex: number) => {
      const targetTable = table;
      const colButtonContainer = document.createElement('div');
      colButtonContainer.className = 'col-button-container';
      colButtonContainer.setAttribute('data-editor-ui', 'true');
      colButtonContainer.contentEditable = 'false';
      colButtonContainer.style.cssText = `
        position: absolute;
        top: -30px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        opacity: 0;
        transition: opacity 0.2s ease;
      `;
      
      const addColButton = document.createElement('button');
      addColButton.textContent = '+';
      addColButton.style.cssText = `
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 1px solid #22c55e;
        background: #dcfce7;
        color: #15803d;
        font-size: 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
      `;
      
      addColButton.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Show before/after menu
        const menu = document.createElement('div');
        menu.style.cssText = `
          position: absolute;
          left: -30px;
          top: 30px;
          background: white;
          border: 1px solid #e1e4e8;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        `;
        
        const beforeBtn = document.createElement('button');
        beforeBtn.textContent = 'Before';
        beforeBtn.style.cssText = `
          padding: 8px 16px;
          border: none;
          background: white;
          cursor: pointer;
          text-align: left;
          font-size: 14px;
        `;
        beforeBtn.onmouseover = () => beforeBtn.style.background = '#f3f4f6';
        beforeBtn.onmouseout = () => beforeBtn.style.background = 'white';
        beforeBtn.onclick = () => {
          const rows = targetTable.querySelectorAll('tr');
          rows.forEach((row) => {
            const cells = Array.from(row.children);
            const isHeader = row.parentElement?.tagName === 'THEAD';
            const newCell = createCell(isHeader ? 'th' : 'td', isHeader ? 'New Header' : 'New cell');
            if (cellIndex < cells.length) {
              row.insertBefore(newCell, cells[cellIndex]);
            }
          });
          const setupFunc = (window as any)[`setupTableInteractivity_${tableId}`];
          if (setupFunc) setupFunc();
          updateHtmlFromPreview();
          menu.remove();
        };
        
        const afterBtn = document.createElement('button');
        afterBtn.textContent = 'After';
        afterBtn.style.cssText = `
          padding: 8px 16px;
          border: none;
          background: white;
          cursor: pointer;
          text-align: left;
          font-size: 14px;
          border-top: 1px solid #e1e4e8;
        `;
        afterBtn.onmouseover = () => afterBtn.style.background = '#f3f4f6';
        afterBtn.onmouseout = () => afterBtn.style.background = 'white';
        afterBtn.onclick = () => {
          const rows = targetTable.querySelectorAll('tr');
          rows.forEach((row) => {
            const cells = Array.from(row.children);
            const isHeader = row.parentElement?.tagName === 'THEAD';
            const newCell = createCell(isHeader ? 'th' : 'td', isHeader ? 'New Header' : 'New cell');
            if (cellIndex < cells.length - 1) {
              row.insertBefore(newCell, cells[cellIndex + 1]);
            } else {
              row.appendChild(newCell);
            }
          });
          const setupFunc = (window as any)[`setupTableInteractivity_${tableId}`];
          if (setupFunc) setupFunc();
          updateHtmlFromPreview();
          menu.remove();
        };
        
        menu.appendChild(beforeBtn);
        menu.appendChild(afterBtn);
        colButtonContainer.appendChild(menu);
        
        // Remove menu when clicking outside
        setTimeout(() => {
          document.addEventListener('click', function removeMenu(e) {
            if (!menu.contains(e.target as Node)) {
              menu.remove();
              document.removeEventListener('click', removeMenu);
            }
          });
        }, 0);
      };
      
      colButtonContainer.appendChild(addColButton);
      cell.style.position = 'relative';
      cell.appendChild(colButtonContainer);
      
      // Show/hide on hover
      cell.addEventListener('mouseenter', () => {
        colButtonContainer.style.opacity = '1';
      });
      cell.addEventListener('mouseleave', () => {
        colButtonContainer.style.opacity = '0';
      });
    };

    // Global functions that will definitely work
    (window as any)[`addRow_${tableId}`] = () => {
      console.log('Adding row to table:', tableId);
      const targetTable = document.getElementById(tableId);
      if (!targetTable) return;
      
      const tbody = targetTable.querySelector('tbody') || targetTable;
      const headerRow = targetTable.querySelector('thead tr') || targetTable.querySelector('tr');
      const colCount = headerRow?.children.length || 3;
      
      const newRow = document.createElement('tr');
      for (let i = 0; i < colCount; i++) {
        newRow.appendChild(createCell('td', 'New cell'));
      }
      tbody.appendChild(newRow);
      const setupFunc = (window as any)[`setupTableInteractivity_${tableId}`];
      if (setupFunc) setupFunc();
      updateHtmlFromPreview();
    };

    (window as any)[`addCol_${tableId}`] = () => {
      console.log('Adding column to table:', tableId);
      const targetTable = document.getElementById(tableId);
      if (!targetTable) return;
      
      const rows = targetTable.querySelectorAll('tr');
      rows.forEach((row) => {
        const isHeader = row.parentElement?.tagName === 'THEAD';
        const newCell = createCell(isHeader ? 'th' : 'td', isHeader ? 'Header' : 'Cell');
        row.appendChild(newCell);
      });
      const setupFunc = (window as any)[`setupTableInteractivity_${tableId}`];
      if (setupFunc) setupFunc();
      updateHtmlFromPreview();
    };

    (window as any)[`removeRow_${tableId}`] = () => {
      console.log('Removing row from table:', tableId);
      const targetTable = document.getElementById(tableId);
      if (!targetTable) return;
      
      const tbody = targetTable.querySelector('tbody');
      const rows = tbody?.querySelectorAll('tr') || targetTable.querySelectorAll('tr');
      if (rows.length > 1) {
        rows[rows.length - 1].remove();
        updateHtmlFromPreview();
      }
    };

    (window as any)[`removeCol_${tableId}`] = () => {
      console.log('Removing column from table:', tableId);
      const targetTable = document.getElementById(tableId);
      if (!targetTable) return;
      
      const rows = targetTable.querySelectorAll('tr');
      const firstRow = rows[0];
      if (firstRow && firstRow.children.length > 1) {
        rows.forEach(row => {
          if (row.children.length > 0) {
            row.removeChild(row.children[row.children.length - 1]);
          }
        });
        updateHtmlFromPreview();
      }
    };

    (window as any)[`toggleBorders_${tableId}`] = () => {
      console.log('Toggling borders for table:', tableId);
      const targetTable = document.getElementById(tableId);
      if (!targetTable) return;
      
      const cells = targetTable.querySelectorAll('th, td');
      const hasBorders = (targetTable as HTMLTableElement).style.borderCollapse === 'collapse';
      
      if (hasBorders) {
        (targetTable as HTMLTableElement).style.borderCollapse = 'separate';
        (targetTable as HTMLTableElement).style.borderSpacing = '0';
        cells.forEach(cell => (cell as HTMLElement).style.border = 'none');
      } else {
        (targetTable as HTMLTableElement).style.borderCollapse = 'collapse';
        cells.forEach(cell => (cell as HTMLElement).style.border = '1px solid #e1e5e9');
      }
      updateHtmlFromPreview();
    };

    (window as any)[`toggleHeader_${tableId}`] = () => {
      console.log('Toggling header for table:', tableId);
      const targetTable = document.getElementById(tableId);
      if (!targetTable) return;
      
      const thead = targetTable.querySelector('thead');
      if (thead) {
        // Remove header
        thead.remove();
        console.log('Header removed');
      } else {
        // Add header
        const newThead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const firstRow = targetTable.querySelector('tr');
        const colCount = firstRow?.children.length || 3;
        
        for (let i = 0; i < colCount; i++) {
          const th = document.createElement('th');
          th.className = 'blog_comparison_cell';
          th.style.cssText = `
            padding: 12px;
            border: 1px solid #e1e5e9;
            background: #f8f9fa;
            min-width: 100px;
            vertical-align: top;
          `;
          th.textContent = `Header ${i + 1}`;
          
          th.addEventListener('focus', () => {
            th.style.outline = '2px solid #3b82f6';
            th.style.outlineOffset = '-2px';
          });
          
          th.addEventListener('blur', () => {
            th.style.outline = 'none';
            updateHtmlFromPreview();
          });
          
          headerRow.appendChild(th);
        }
        newThead.appendChild(headerRow);
        targetTable.insertBefore(newThead, targetTable.firstChild);
        console.log('Header added');
      }
      updateHtmlFromPreview();
    };

    (window as any)[`alignLeft_${tableId}`] = () => {
      console.log('Aligning left for table:', tableId);
      const targetTable = document.getElementById(tableId);
      if (!targetTable) return;
      
      const cells = targetTable.querySelectorAll('th, td');
      cells.forEach(cell => (cell as HTMLElement).style.textAlign = 'left');
      updateHtmlFromPreview();
    };

    (window as any)[`alignCenter_${tableId}`] = () => {
      console.log('Aligning center for table:', tableId);
      const targetTable = document.getElementById(tableId);
      if (!targetTable) return;
      
      const cells = targetTable.querySelectorAll('th, td');
      cells.forEach(cell => (cell as HTMLElement).style.textAlign = 'center');
      updateHtmlFromPreview();
    };

    (window as any)[`alignRight_${tableId}`] = () => {
      console.log('Aligning right for table:', tableId);
      const targetTable = document.getElementById(tableId);
      if (!targetTable) return;
      
      const cells = targetTable.querySelectorAll('th, td');
      cells.forEach(cell => (cell as HTMLElement).style.textAlign = 'right');
      updateHtmlFromPreview();
    };

    // Create buttons with robust event handlers
    const createButton = (text: string, functionName: string, style?: string) => {
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.style.cssText = style || 'padding: 4px 8px; border: 1px solid #d0d7de; border-radius: 4px; background: white; cursor: pointer;';
      btn.contentEditable = 'false';
      btn.setAttribute('contenteditable', 'false');
      
      // Use both onclick attribute and event listener for reliability
      btn.setAttribute('onclick', `try { window.${functionName}(); } catch(e) { console.error('Table button error:', e); } return false;`);
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          const fn = (window as any)[functionName];
          if (typeof fn === 'function') {
            fn();
          } else {
            console.error(`Function ${functionName} not found on window`);
          }
        } catch (error) {
          console.error('Error executing table function:', error);
        }
      });
      
      btn.onmousedown = (e) => e.preventDefault();
      return btn;
    };

    const addRowBtn = createButton('+ Row', `addRow_${tableId}`, 'padding: 4px 8px; border: 1px solid #22c55e; border-radius: 4px; background: #dcfce7; cursor: pointer; color: #15803d;');
    const addColBtn = createButton('+ Col', `addCol_${tableId}`, 'padding: 4px 8px; border: 1px solid #22c55e; border-radius: 4px; background: #dcfce7; cursor: pointer; color: #15803d;');
    const removeRowBtn = createButton('- Row', `removeRow_${tableId}`, 'padding: 4px 8px; border: 1px solid #ef4444; border-radius: 4px; background: #fef2f2; cursor: pointer; color: #dc2626;');
    const removeColBtn = createButton('- Col', `removeCol_${tableId}`, 'padding: 4px 8px; border: 1px solid #ef4444; border-radius: 4px; background: #fef2f2; cursor: pointer; color: #dc2626;');
    const borderToggle = createButton('🔲 Borders', `toggleBorders_${tableId}`);
    const headerToggle = createButton('📋 Header', `toggleHeader_${tableId}`);
    const alignLeftBtn = createButton('⬅️', `alignLeft_${tableId}`);
    const alignCenterBtn = createButton('↔️', `alignCenter_${tableId}`);
    const alignRightBtn = createButton('➡️', `alignRight_${tableId}`);

    toolbar.appendChild(addRowBtn);
    toolbar.appendChild(addColBtn);
    toolbar.appendChild(removeRowBtn);
    toolbar.appendChild(removeColBtn);
    toolbar.appendChild(document.createTextNode(' | '));
    toolbar.appendChild(borderToggle);
    toolbar.appendChild(headerToggle);
    toolbar.appendChild(document.createTextNode(' | '));
    toolbar.appendChild(alignLeftBtn);
    toolbar.appendChild(alignCenterBtn);
    toolbar.appendChild(alignRightBtn);

    // Function to setup table interactivity - make it globally accessible
    const setupTableInteractivity = () => {
      // Clear existing buttons
      const existingButtons = table.querySelectorAll('.row-button-container, .col-button-container');
      existingButtons.forEach(btn => btn.remove());
      
      // Add row buttons
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach((row, index) => {
        addRowButtons(row as HTMLElement, index);
      });
      
      // Add column buttons to header cells only
      const headerCells = table.querySelectorAll('thead th');
      headerCells.forEach((cell, index) => {
        addColumnButtons(cell as HTMLElement, index);
      });
    };
    
    // Store the function reference globally for this table
    (window as any)[`setupTableInteractivity_${tableId}`] = setupTableInteractivity;

    container.appendChild(table);
    container.appendChild(toolbar);
    
    // Set up initial interactivity
    setTimeout(() => {
      setupTableInteractivity();
    }, 0);
    
    // Add delete button
    const deleteBtn = createDeleteButton(container);
    container.appendChild(deleteBtn);
    
    // Add hover effect for both toolbar and delete button
    container.addEventListener('mouseenter', () => {
      toolbar.style.opacity = '1';
      toolbar.style.pointerEvents = 'auto';
      deleteBtn.style.opacity = '1';
    });
    container.addEventListener('mouseleave', () => {
      toolbar.style.opacity = '0';
      toolbar.style.pointerEvents = 'none';
      deleteBtn.style.opacity = '0';
    });
    
    // Setup table hover controls
    setupTableHoverControls(table, container);
    
    return container;
  };

  const setupTableHoverControls = (table: HTMLTableElement, container: HTMLElement) => {
    // Add hover controls on table cells
    const addHoverControls = () => {
      const rows = table.querySelectorAll('tr');
      
      rows.forEach((row, rowIndex) => {
        // Add row hover control
        const cells = row.querySelectorAll('th, td');
        if (cells.length > 0) {
          const firstCell = cells[0] as HTMLElement;
          firstCell.style.position = 'relative';
          
          const rowControl = document.createElement('div');
          rowControl.innerHTML = '+';
          rowControl.style.cssText = `
            position: absolute;
            background: #3b82f6;
            color: white;
            border-radius: 4px;
            padding: 2px 6px;
            cursor: pointer;
            opacity: 0;
            transition: opacity 0.2s;
            z-index: 1000;
            font-size: 12px;
            font-weight: bold;
            left: -25px;
            top: 50%;
            transform: translateY(-50%);
            pointer-events: none;
          `;
          rowControl.setAttribute('data-editor-ui', 'true');
          firstCell.appendChild(rowControl);
          
          row.addEventListener('mouseenter', () => {
            rowControl.style.opacity = '1';
            rowControl.style.pointerEvents = 'auto';
          });
          
          row.addEventListener('mouseleave', () => {
            rowControl.style.opacity = '0';
            rowControl.style.pointerEvents = 'none';
          });
          
          rowControl.addEventListener('click', (e) => {
            e.stopPropagation();
            insertRowAfter(table, rowIndex);
            updateHtmlFromPreview();
          });
        }
        
        // Add column hover controls on first row
        if (rowIndex === 0) {
          cells.forEach((cell, colIndex) => {
            const cellEl = cell as HTMLElement;
            cellEl.style.position = 'relative';
            
            const colControl = document.createElement('div');
            colControl.innerHTML = '+';
            colControl.style.cssText = `
              position: absolute;
              background: #3b82f6;
              color: white;
              border-radius: 4px;
              padding: 2px 6px;
              cursor: pointer;
              opacity: 0;
              transition: opacity 0.2s;
              z-index: 1000;
              font-size: 12px;
              font-weight: bold;
              top: -25px;
              left: 50%;
              transform: translateX(-50%);
              pointer-events: none;
            `;
            colControl.setAttribute('data-editor-ui', 'true');
            cellEl.appendChild(colControl);
            
            cellEl.addEventListener('mouseenter', () => {
              colControl.style.opacity = '1';
              colControl.style.pointerEvents = 'auto';
            });
            
            cellEl.addEventListener('mouseleave', () => {
              colControl.style.opacity = '0';
              colControl.style.pointerEvents = 'none';
            });
            
            colControl.addEventListener('click', (e) => {
              e.stopPropagation();
              insertColumnAfter(table, colIndex);
              updateHtmlFromPreview();
            });
          });
        }
      });
    };
    
    // Initial setup
    addHoverControls();
    
    // Re-add controls when table structure changes
    const observer = new MutationObserver(() => {
      // Remove old controls
      table.querySelectorAll('[data-editor-ui]').forEach(el => el.remove());
      // Re-add controls
      addHoverControls();
    });
    
    observer.observe(table, { 
      childList: true, 
      subtree: true,
      attributes: false,
      characterData: false
    });
  };

  const insertRowAfter = (table: HTMLTableElement, afterIndex: number) => {
    const rows = table.querySelectorAll('tr');
    const targetRow = rows[afterIndex];
    const newRow = document.createElement('tr');
    const colCount = targetRow.querySelectorAll('th, td').length;
    
    for (let i = 0; i < colCount; i++) {
      const cell = document.createElement('td');
      cell.className = 'editor_blog_table_cell';
      cell.style.cssText = `
        padding: 12px;
        border: 1px solid #e1e5e9;
        background: white;
        min-width: 100px;
        vertical-align: top;
      `;
      cell.textContent = 'New Cell';
      
      // Add event listener for blur
      cell.addEventListener('blur', () => {
        updateHtmlFromPreview();
      });
      
      newRow.appendChild(cell);
    }
    
    if (targetRow.nextSibling) {
      targetRow.parentNode?.insertBefore(newRow, targetRow.nextSibling);
    } else {
      targetRow.parentNode?.appendChild(newRow);
    }
  };

  const insertColumnAfter = (table: HTMLTableElement, afterIndex: number) => {
    const rows = table.querySelectorAll('tr');
    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll('th, td');
      const targetCell = cells[afterIndex];
      const isHeader = row.parentNode?.nodeName === 'THEAD';
      const newCell = document.createElement(isHeader ? 'th' : 'td');
      newCell.className = 'editor_blog_table_cell';
      newCell.style.cssText = `
        padding: 12px;
        border: 1px solid #e1e5e9;
        background: ${isHeader ? '#f8f9fa' : 'white'};
        min-width: 100px;
        vertical-align: top;
      `;
      newCell.textContent = isHeader ? 'New Header' : 'New Cell';
      
      // Add event listener for blur
      newCell.addEventListener('blur', () => {
        updateHtmlFromPreview();
      });
      
      if (targetCell.nextSibling) {
        targetCell.parentNode?.insertBefore(newCell, targetCell.nextSibling);
      } else {
        targetCell.parentNode?.appendChild(newCell);
      }
    });
  };

  // Save cursor and scroll position
  const saveCursorPosition = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      lastCursorPositionRef.current = {
        node: range.startContainer,
        offset: range.startOffset
      };
    }
    
    // Save scroll position
    if (previewContentRef && previewContentRef.parentElement) {
      lastScrollPositionRef.current = {
        top: previewContentRef.parentElement.scrollTop,
        left: previewContentRef.parentElement.scrollLeft
      };
    }
  };

  // Restore cursor and scroll position
  // Removed modification toolbar functionality
  
  const restoreCursorPosition = () => {
    // Restore scroll position first
    if (previewContentRef && previewContentRef.parentElement) {
      previewContentRef.parentElement.scrollTop = lastScrollPositionRef.current.top;
      previewContentRef.parentElement.scrollLeft = lastScrollPositionRef.current.left;
    }
    
    // Then restore cursor position
    if (lastCursorPositionRef.current.node && previewContentRef) {
      try {
        const selection = window.getSelection();
        const range = document.createRange();
        
        // Check if the node still exists in the DOM
        if (previewContentRef.contains(lastCursorPositionRef.current.node)) {
          range.setStart(lastCursorPositionRef.current.node, lastCursorPositionRef.current.offset);
          range.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      } catch (e) {
        // Silently fail if cursor position cannot be restored
      }
    }
  };

  // Process pasted HTML to handle editor_blog_ classes
  const processPastedHtml = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Find all elements with editor_blog_ classes
    const editorElements = tempDiv.querySelectorAll('[class*="editor_blog_"]');
    editorElements.forEach((element) => {
      if (element instanceof HTMLElement) {
        // Make them contenteditable
        
        // Wrap in container with delete button if not already wrapped
        if (!element.parentElement?.classList.contains('editor-component-container')) {
          const container = document.createElement('div');
          container.className = 'editor-component-container';
          container.style.cssText = 'position: relative; margin: 1rem 0;';
          
          // Clone the element
          const clonedElement = element.cloneNode(true) as HTMLElement;
          
          // Create delete button
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'delete-button';
          deleteBtn.innerHTML = '×';
          deleteBtn.style.cssText = `
            position: absolute;
            top: -10px;
            right: -10px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #ef4444;
            color: white;
            border: none;
            cursor: pointer;
            display: none;
            z-index: 1000;
            font-size: 18px;
            line-height: 1;
          `;
          
          // Replace element with container
          element.parentNode?.replaceChild(container, element);
          container.appendChild(clonedElement);
          container.appendChild(deleteBtn);
        }
      }
    });
    
    return tempDiv.innerHTML;
  };

  const updateHtmlFromPreview = () => {
    if (previewContentRef && !isUpdatingFromHtmlRef.current) {
      saveCursorPosition();
      let newContent = previewContentRef.innerHTML;
      
      // Clean up the HTML by removing table toolbars and other UI elements
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = newContent;
      
      // Remove all elements marked as editor UI
      const editorUIElements = tempDiv.querySelectorAll('[data-editor-ui="true"]');
      editorUIElements.forEach(elem => elem.remove());
      
      // Remove all table toolbars
      const toolbars = tempDiv.querySelectorAll('.table-toolbar');
      toolbars.forEach(toolbar => toolbar.remove());
      
      // Remove all link toolbars
      const linkToolbars = tempDiv.querySelectorAll('.link-toolbar');
      linkToolbars.forEach(toolbar => toolbar.remove());
      
      // Remove all cell context menus if any exist
      const contextMenus = tempDiv.querySelectorAll('.cell-context-menu');
      contextMenus.forEach(menu => menu.remove());
      
      // Remove all delete buttons (they shouldn't be in the final HTML)
      const deleteButtons = tempDiv.querySelectorAll('.delete-button');
      deleteButtons.forEach(btn => btn.remove());
      
      // Image resize toolbars removed
      
      // Remove all elements with inline onclick handlers
      const elementsWithOnclick = tempDiv.querySelectorAll('[onclick]');
      elementsWithOnclick.forEach(elem => {
        elem.removeAttribute('onclick');
      });
      
      // Remove all button elements that are part of UI controls
      const uiButtons = tempDiv.querySelectorAll('button');
      uiButtons.forEach(btn => {
        // Check if this button is part of a table control or other UI element
        if (btn.textContent && (btn.textContent.includes('➕') || btn.textContent.includes('➖') || 
            btn.textContent.includes('🔲') || btn.textContent.includes('📐') ||
            btn.textContent.includes('◀') || btn.textContent.includes('▶') ||
            btn.textContent.includes('▲') || btn.textContent.includes('▼'))) {
          btn.remove();
        }
      });
      
      // Also remove working-table-container wrappers but keep the tables
      const tableContainers = tempDiv.querySelectorAll('.working-table-container');
      tableContainers.forEach(container => {
        const table = container.querySelector('table');
        if (table && container.parentNode) {
          // Replace the container with just the table
          container.parentNode.replaceChild(table, container);
        }
      });
      
      // Remove any remaining container divs that wrap UI elements
      const containers = tempDiv.querySelectorAll('div[style*="position: relative"]');
      containers.forEach(container => {
        // Check if this is a UI container by looking for specific patterns
        const hasTable = container.querySelector('table');
        const hasButtons = container.querySelectorAll('button').length > 0;
        if (hasTable && hasButtons) {
          // This is likely a table container with controls, keep only the table
          if (container.parentNode) {
            container.parentNode.replaceChild(hasTable, container);
          }
        }
      });
      
      // Get cleaned content
      newContent = tempDiv.innerHTML;
      
      // Check if current htmlCode is a complete HTML document
      const isCompleteHtml = htmlCode.includes('<!DOCTYPE html>') && (htmlCode.includes('<style>') || htmlCode.includes('<head>'));
      
      if (isCompleteHtml) {
        // Parse existing HTML to preserve structure and style tags
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlCode, 'text/html');
        
        // Update only the body content, preserve head and style tags
        const bodyContent = doc.querySelector('body');
        if (bodyContent) {
          // Extract content from the div wrapper if it exists
          const contentDiv = tempDiv.querySelector('.public-blog-content, .blog_container, body > div');
          const actualContent = contentDiv ? contentDiv.outerHTML : newContent;
          
          bodyContent.innerHTML = actualContent;
          
          // Reconstruct complete HTML with preserved styling
          const completeHtml = `<!DOCTYPE html>\n<html lang="${doc.documentElement.lang || 'en'}">\n<head>\n${doc.head.innerHTML}\n</head>\n<body>\n${bodyContent.innerHTML}\n</body>\n</html>`;
          
          setHtmlCode(completeHtml);
        }
      } else {
        // Handle regular content or extract CSS if available
        const extractedCss = extractCssFromHtml(htmlCode);
        const fullHtml = extractedCss ? 
          `<style>\n${extractedCss}\n</style>\n${newContent}` : 
          newContent;
        setHtmlCode(fullHtml);
      }
      
      // Re-setup drag handlers after HTML update
      setTimeout(() => {
        if (previewContentRef) {
          const images = previewContentRef.querySelectorAll('.blog_image');
          images.forEach((container) => {
            const img = container.querySelector('img');
            if (img) {
              setupImageDragHandlersForElement(container as HTMLElement, img as HTMLImageElement);
            }
          });
        }
      }, 10);
    }
  };

  const insertAtCursor = (element: HTMLElement) => {
    if (!previewContentRef) return;
    
    // Ensure we have the correct preview content div
    const previewDiv = document.querySelector('.blog-preview-content') as HTMLDivElement;
    if (!previewDiv || previewDiv !== previewContentRef) {
      console.error('Preview content div not found or mismatch');
      return;
    }
    
    // Make sure we're only inserting into the preview panel
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // Check if the selection is within the preview content
      const commonAncestor = range.commonAncestorContainer;
      const targetNode = commonAncestor.nodeType === Node.TEXT_NODE ? commonAncestor.parentNode : commonAncestor;
      
      // Verify that the target is inside the preview content ref
      // Also check that we're not in any toolbar, button, or UI element
      let currentNode = targetNode as Node;
      let isValidTarget = false;
      
      while (currentNode && currentNode !== document.body) {
        if (currentNode === previewContentRef) {
          isValidTarget = true;
          break;
        }
        // Check if we're inside any UI element
        if (currentNode instanceof HTMLElement) {
          if (currentNode.hasAttribute('data-editor-ui') || 
              currentNode.classList.contains('table-toolbar') ||
              currentNode.classList.contains('delete-button') ||
              currentNode.tagName === 'BUTTON' ||
              currentNode.contentEditable === 'false') {
            isValidTarget = false;
            break;
          }
        }
        currentNode = currentNode.parentNode as Node;
      }
      
      if (!isValidTarget) {
        // If not valid, insert at the end of preview content (not the beginning)
        previewContentRef.appendChild(element);
        
        // Add space after element and position cursor there
        const textNode = document.createTextNode('\u200B');
        element.parentNode?.insertBefore(textNode, element.nextSibling);
        
        const newRange = document.createRange();
        newRange.setStart(textNode, 0);
        newRange.collapse(true);
        
        const newSelection = window.getSelection();
        newSelection?.removeAllRanges();
        newSelection?.addRange(newRange);
        
        previewContentRef.focus();
        updateHtmlFromPreview();
        return;
      }
      
      // There's an active selection in the preview - insert at that position
      range.insertNode(element);
      // Move cursor after the element, not inside it
      const textNode = document.createTextNode('\u200B'); // Zero-width space
      element.parentNode?.insertBefore(textNode, element.nextSibling);
      range.setStart(textNode, 1);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Focus the preview container to ensure cursor is visible
      previewContentRef.focus();
    } else {
      // No active selection - insert at the end of preview content
      previewContentRef.appendChild(element);
      
      // Add space after element and position cursor there
      const textNode = document.createTextNode('\u200B');
      element.parentNode?.insertBefore(textNode, element.nextSibling);
      
      previewContentRef.focus();
      const newSelection = window.getSelection();
      if (newSelection) {
        const newRange = document.createRange();
        newRange.setStart(textNode, 0);
        newRange.collapse(true);
        newSelection.removeAllRanges();
        newSelection.addRange(newRange);
      }
    }
    updateHtmlFromPreview();
  };

  // Advanced table management functions
  const addAdvancedTableRow = (table: HTMLTableElement) => {
    const tbody = table.querySelector('tbody') || table;
    const headerRow = table.querySelector('thead tr') || table.querySelector('tr');
    const colCount = headerRow?.children.length || 3;
    
    const newRow = document.createElement('tr');
    for (let i = 0; i < colCount; i++) {
      const td = document.createElement('td');
      td.className = 'blog_comparison_cell';
      td.style.cssText = `
        padding: 12px;
        border: 1px solid #e1e5e9;
        background: white;
        min-width: 100px;
        vertical-align: top;
      `;
      td.textContent = 'New cell';
      td.addEventListener('blur', updateHtmlFromPreview);
      td.addEventListener('focus', () => {
        td.style.outline = '2px solid #3b82f6';
        td.style.outlineOffset = '-2px';
      });
      td.addEventListener('blur', () => {
        td.style.outline = 'none';
        updateHtmlFromPreview();
      });
      newRow.appendChild(td);
    }
    tbody.appendChild(newRow);
    updateHtmlFromPreview();
  };

  const addAdvancedTableColumn = (table: HTMLTableElement) => {
    const rows = table.querySelectorAll('tr');
    rows.forEach((row, index) => {
      const isHeader = row.parentElement?.tagName === 'THEAD';
      const cell = document.createElement(isHeader ? 'th' : 'td');
      cell.className = 'editor_blog_table_cell';
      cell.style.cssText = `
        padding: 12px;
        border: 1px solid #e1e5e9;
        background: ${isHeader ? '#f8f9fa' : 'white'};
        min-width: 100px;
        vertical-align: top;
        position: relative;
      `;
      cell.textContent = isHeader ? 'New Header' : 'New cell';
      
      cell.addEventListener('focus', () => {
        cell.style.outline = '2px solid #3b82f6';
        cell.style.outlineOffset = '-2px';
      });
      cell.addEventListener('blur', () => {
        cell.style.outline = 'none';
        updateHtmlFromPreview();
      });
      
      row.appendChild(cell);
    });
    updateHtmlFromPreview();
  };

  const removeAdvancedTableRow = (table: HTMLTableElement) => {
    const tbody = table.querySelector('tbody');
    const rows = tbody?.querySelectorAll('tr') || table.querySelectorAll('tr');
    if (rows.length > 1) {
      rows[rows.length - 1].remove();
      updateHtmlFromPreview();
    }
  };

  const removeAdvancedTableColumn = (table: HTMLTableElement) => {
    const rows = table.querySelectorAll('tr');
    const firstRow = rows[0];
    if (firstRow && firstRow.children.length > 1) {
      rows.forEach(row => {
        if (row.children.length > 0) {
          row.removeChild(row.children[row.children.length - 1]);
        }
      });
      updateHtmlFromPreview();
    }
  };

  const showCellContextMenu = (e: MouseEvent, cell: HTMLElement, table: HTMLTableElement) => {
    // Remove any existing context menu
    const existingMenu = document.querySelector('.cell-context-menu');
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement('div');
    menu.className = 'cell-context-menu';
    menu.style.cssText = `
      position: fixed;
      top: ${e.clientY}px;
      left: ${e.clientX}px;
      background: white;
      border: 1px solid #e1e5e9;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 1000;
      padding: 4px 0;
      min-width: 150px;
    `;

    const menuItems = [
      { text: '📄 Insert Row Above', action: () => insertRowAbove(cell, table) },
      { text: '📄 Insert Row Below', action: () => insertRowBelow(cell, table) },
      { text: '📄 Insert Column Left', action: () => insertColumnLeft(cell, table) },
      { text: '📄 Insert Column Right', action: () => insertColumnRight(cell, table) },
      { text: '---', action: null },
      { text: '🎨 Bold Text', action: () => toggleCellBold(cell) },
      { text: '🎨 Italic Text', action: () => toggleCellItalic(cell) },
      { text: '🎨 Background Color', action: () => setCellBackground(cell) },
      { text: '---', action: null },
      { text: '🗑️ Delete Row', action: () => deleteRow(cell, table) },
      { text: '🗑️ Delete Column', action: () => deleteColumn(cell, table) }
    ];

    menuItems.forEach(item => {
      if (item.text === '---') {
        const divider = document.createElement('div');
        divider.style.cssText = 'height: 1px; background: #e1e5e9; margin: 4px 8px;';
        menu.appendChild(divider);
      } else {
        const menuItem = document.createElement('div');
        menuItem.textContent = item.text;
        menuItem.style.cssText = `
          padding: 8px 12px;
          cursor: pointer;
          font-size: 13px;
          color: #374151;
        `;
        menuItem.addEventListener('mouseenter', () => {
          menuItem.style.background = '#f3f4f6';
        });
        menuItem.addEventListener('mouseleave', () => {
          menuItem.style.background = 'transparent';
        });
        menuItem.addEventListener('click', () => {
          if (item.action) item.action();
          menu.remove();
        });
        menu.appendChild(menuItem);
      }
    });

    document.body.appendChild(menu);

    // Remove menu on click outside
    setTimeout(() => {
      document.addEventListener('click', () => menu.remove(), { once: true });
    }, 0);
  };

  const startColumnResize = (e: MouseEvent, cell: HTMLElement) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = cell.offsetWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = startWidth + (e.clientX - startX);
      if (newWidth > 50) { // Minimum width
        cell.style.width = newWidth + 'px';
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      updateHtmlFromPreview();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Context menu helper functions
  const insertRowAbove = (cell: HTMLElement, table: HTMLTableElement) => {
    const row = cell.closest('tr');
    if (row) {
      const newRow = row.cloneNode(true) as HTMLTableRowElement;
      newRow.querySelectorAll('td, th').forEach(cell => {
        (cell as HTMLElement).textContent = 'New cell';
      });
      row.parentNode?.insertBefore(newRow, row);
      updateHtmlFromPreview();
    }
  };

  const insertRowBelow = (cell: HTMLElement, table: HTMLTableElement) => {
    const row = cell.closest('tr');
    if (row) {
      const newRow = row.cloneNode(true) as HTMLTableRowElement;
      newRow.querySelectorAll('td, th').forEach(cell => {
        (cell as HTMLElement).textContent = 'New cell';
      });
      row.parentNode?.insertBefore(newRow, row.nextSibling);
      updateHtmlFromPreview();
    }
  };

  const insertColumnLeft = (cell: HTMLElement, table: HTMLTableElement) => {
    const cellIndex = Array.from(cell.parentNode?.children || []).indexOf(cell);
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      const isHeader = row.parentElement?.tagName === 'THEAD';
      const newCell = document.createElement(isHeader ? 'th' : 'td');
      newCell.className = cell.className;
      newCell.style.cssText = cell.style.cssText;
      newCell.textContent = isHeader ? 'Header' : 'Cell';
      row.insertBefore(newCell, row.children[cellIndex]);
    });
    updateHtmlFromPreview();
  };

  const insertColumnRight = (cell: HTMLElement, table: HTMLTableElement) => {
    const cellIndex = Array.from(cell.parentNode?.children || []).indexOf(cell);
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      const isHeader = row.parentElement?.tagName === 'THEAD';
      const newCell = document.createElement(isHeader ? 'th' : 'td');
      newCell.className = cell.className;
      newCell.style.cssText = cell.style.cssText;
      newCell.textContent = isHeader ? 'Header' : 'Cell';
      row.insertBefore(newCell, row.children[cellIndex + 1]);
    });
    updateHtmlFromPreview();
  };

  const toggleCellBold = (cell: HTMLElement) => {
    cell.style.fontWeight = cell.style.fontWeight === 'bold' ? 'normal' : 'bold';
    updateHtmlFromPreview();
  };

  const toggleCellItalic = (cell: HTMLElement) => {
    cell.style.fontStyle = cell.style.fontStyle === 'italic' ? 'normal' : 'italic';
    updateHtmlFromPreview();
  };

  const setCellBackground = (cell: HTMLElement) => {
    const colors = ['#ffffff', '#f8f9fa', '#e3f2fd', '#e8f5e8', '#fff3e0', '#fce4ec'];
    const currentIndex = colors.indexOf(cell.style.backgroundColor) || 0;
    const nextIndex = (currentIndex + 1) % colors.length;
    cell.style.backgroundColor = colors[nextIndex];
    updateHtmlFromPreview();
  };

  const deleteRow = (cell: HTMLElement, table: HTMLTableElement) => {
    const row = cell.closest('tr');
    const tbody = table.querySelector('tbody');
    const allRows = tbody ? tbody.querySelectorAll('tr') : table.querySelectorAll('tr');
    if (row && allRows.length > 1) {
      row.remove();
      updateHtmlFromPreview();
    }
  };

  const deleteColumn = (cell: HTMLElement, table: HTMLTableElement) => {
    const cellIndex = Array.from(cell.parentNode?.children || []).indexOf(cell);
    const rows = table.querySelectorAll('tr');
    if (rows[0]?.children.length > 1) {
      rows.forEach(row => {
        if (row.children[cellIndex]) {
          row.removeChild(row.children[cellIndex]);
        }
      });
      updateHtmlFromPreview();
    }
  };

  // Old table functions - commented out in favor of advanced table
  /*
  const addTableRow = (table: HTMLTableElement) => {
    const tbody = table.querySelector('tbody');
    const headerRow = table.querySelector('thead tr');
    const colCount = headerRow?.children.length || 3;
    
    if (tbody) {
      const newRow = document.createElement('tr');
      newRow.className = 'blog_comparison_row';
      
      for (let i = 0; i < colCount; i++) {
        const td = document.createElement('td');
        td.className = 'blog_comparison_cell';
          td.textContent = 'New cell';
        td.addEventListener('blur', updateHtmlFromPreview);
        newRow.appendChild(td);
      }
      tbody.appendChild(newRow);
      updateHtmlFromPreview();
    }
  };

  const addTableColumn = (table: HTMLTableElement) => {
    const rows = table.querySelectorAll('tr');
    rows.forEach((row, index) => {
      const isHeader = index === 0;
      const cell = document.createElement(isHeader ? 'th' : 'td');
      cell.className = 'editor_blog_table_cell';
      cell.textContent = isHeader ? 'New Header' : 'New cell';
      cell.addEventListener('blur', updateHtmlFromPreview);
      row.appendChild(cell);
    });
    updateHtmlFromPreview();
  };

  const removeTableRow = (table: HTMLTableElement) => {
    const tbody = table.querySelector('tbody');
    const rows = tbody?.querySelectorAll('tr');
    if (rows && rows.length > 1) {
      rows[rows.length - 1].remove();
      updateHtmlFromPreview();
    }
  };

  const removeTableColumn = (table: HTMLTableElement) => {
    const rows = table.querySelectorAll('tr');
    const firstRow = rows[0];
    if (firstRow && firstRow.children.length > 1) {
      rows.forEach(row => {
        if (row.children.length > 0) {
          row.removeChild(row.children[row.children.length - 1]);
        }
      });
      updateHtmlFromPreview();
    }
  };
  */

  const insertTableInPreview = () => {
    const table = createAdvancedTable(3, 3);
    insertAtCursor(table);
    // Drag handlers removed for table components
  };

  const insertLinkInPreview = () => {
    if (!previewContentRef) return;
    
    // Always focus the preview panel first
    previewContentRef.focus();
    
    // Check if preview panel is empty and add a placeholder if needed
    const isEmpty = !previewContentRef.textContent?.trim() && 
                   (!previewContentRef.innerHTML.trim() || previewContentRef.innerHTML.trim() === '<br>');
    
    const selection = window.getSelection();
    const hasSelection = selection && selection.rangeCount > 0 && !selection.isCollapsed;
    
    if (isEmpty || !hasSelection) {
      // Add a placeholder text for the link
      const placeholder = document.createElement('span');
      placeholder.textContent = 'Link text';
      placeholder.setAttribute('data-placeholder', 'true');
      
      if (isEmpty) {
        previewContentRef.appendChild(placeholder);
      } else {
        // Insert at cursor position
        const range = selection?.getRangeAt(0) || document.createRange();
        range.insertNode(placeholder);
      }
      
      // Select the placeholder text
      const range = document.createRange();
      range.selectNodeContents(placeholder);
      const newSelection = window.getSelection();
      newSelection?.removeAllRanges();
      newSelection?.addRange(range);
    }
    
    const updatedSelection = window.getSelection();
    if (!updatedSelection || updatedSelection.rangeCount === 0) return;
    
    const range = updatedSelection.getRangeAt(0);
    const selectedText = updatedSelection.toString();
    
    // Check if selection is already a link
    let isLink = false;
    let existingLink: HTMLAnchorElement | null = null;
    const parentElement = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentElement
      : range.commonAncestorContainer as HTMLElement;
    
    // Find if we're inside a link or have a link selected
    let currentNode: HTMLElement | null = parentElement;
    while (currentNode && currentNode !== previewContentRef) {
      if (currentNode.tagName === 'A') {
        isLink = true;
        existingLink = currentNode as HTMLAnchorElement;
        break;
      }
      currentNode = currentNode.parentElement;
    }
    
    // Create link toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'link-toolbar';
    toolbar.setAttribute('data-editor-ui', 'true');
    toolbar.setAttribute('contenteditable', 'false');
    toolbar.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid #e1e5e9;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.1);
      padding: 12px;
      z-index: 1000;
      display: flex;
      gap: 8px;
      align-items: center;
      top: 60px;
    `;
    
    // Prevent toolbar from interfering with contentEditable
    toolbar.addEventListener('mousedown', (e) => {
      if (e.target === urlInput || e.target === newTabCheckbox) {
        return; // Allow interaction with input elements
      }
      e.preventDefault();
    });
    
    // Create a container for inputs
    const inputsContainer = document.createElement('div');
    inputsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;
    
    // Link text input
    const linkTextInput = document.createElement('input');
    linkTextInput.type = 'text';
    linkTextInput.placeholder = 'Link text...';
    linkTextInput.value = existingLink ? existingLink.textContent || '' : selectedText;
    linkTextInput.style.cssText = `
      padding: 6px 10px;
      border: 1px solid #d0d7de;
      border-radius: 4px;
      font-size: 14px;
      width: 250px;
      outline: none;
    `;
    
    // URL input
    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.placeholder = 'Enter URL...';
    urlInput.value = existingLink ? existingLink.href : '';
    urlInput.style.cssText = `
      padding: 6px 10px;
      border: 1px solid #d0d7de;
      border-radius: 4px;
      font-size: 14px;
      width: 250px;
      outline: none;
    `;
    // Add event listeners for both inputs
    [linkTextInput, urlInput].forEach(input => {
      input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          e.preventDefault();
          applyLink();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          toolbar.remove();
        }
      });
      input.addEventListener('keyup', (e) => e.stopPropagation());
      input.addEventListener('keypress', (e) => e.stopPropagation());
      input.addEventListener('input', (e) => e.stopPropagation());
    });
    
    // Open in new tab checkbox
    const newTabContainer = document.createElement('label');
    newTabContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: #586069;
    `;
    const newTabCheckbox = document.createElement('input');
    newTabCheckbox.type = 'checkbox';
    newTabCheckbox.checked = existingLink ? existingLink.target === '_blank' : true;
    const newTabLabel = document.createTextNode('New tab');
    newTabContainer.appendChild(newTabCheckbox);
    newTabContainer.appendChild(newTabLabel);
    
    // Apply button
    const applyBtn = document.createElement('button');
    applyBtn.textContent = '✓';
    applyBtn.style.cssText = `
      padding: 6px 12px;
      background: #0969da;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    `;
    
    // Unlink button (only show if already a link)
    const unlinkBtn = document.createElement('button');
    unlinkBtn.textContent = '🔗 Unlink';
    unlinkBtn.style.cssText = `
      padding: 6px 12px;
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      display: ${isLink ? 'block' : 'none'};
    `;
    
    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '✕';
    cancelBtn.style.cssText = `
      padding: 6px 12px;
      background: #f3f4f6;
      color: #586069;
      border: 1px solid #d0d7de;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    
    const applyLink = () => {
      const url = urlInput.value.trim();
      if (!url) {
        toast.error('Please enter a URL');
        return;
      }
      
      // Get current selection (might have changed)
      let currentSelection = window.getSelection();
      if (!currentSelection || currentSelection.rangeCount === 0) {
        // If no selection, try to find the placeholder or create one
        const placeholder = previewContentRef.querySelector('[data-placeholder="true"]');
        if (placeholder) {
          const newRange = document.createRange();
          newRange.selectNodeContents(placeholder);
          currentSelection = window.getSelection();
          if (currentSelection) {
            currentSelection.removeAllRanges();
            currentSelection.addRange(newRange);
          }
        } else {
          toast.error('Please select text to link');
          return;
        }
      }
      
      if (!currentSelection || currentSelection.rangeCount === 0) {
        toast.error('Please select text to link');
        return;
      }
      
      const currentRange = currentSelection.getRangeAt(0);
      const currentSelectedText = currentSelection.toString();
      
      // Ensure URL has protocol
      let finalUrl = url;
      if (!url.match(/^https?:\/\//i) && !url.match(/^mailto:/i) && !url.match(/^tel:/i)) {
        finalUrl = 'https://' + url;
      }
      
      if (isLink && existingLink) {
        // Update existing link
        existingLink.href = finalUrl;
        const linkText = linkTextInput.value.trim() || existingLink.textContent || finalUrl;
        existingLink.textContent = linkText;
        if (newTabCheckbox.checked) {
          existingLink.target = '_blank';
          existingLink.rel = 'noopener noreferrer';
        } else {
          existingLink.removeAttribute('target');
          existingLink.removeAttribute('rel');
        }
      } else {
        // Create new link
        const link = document.createElement('a');
        link.href = finalUrl;
        link.className = 'editor_blog_link';
        link.style.cssText = 'color: #0969da; text-decoration: underline; cursor: pointer;';
        if (newTabCheckbox.checked) {
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        }
        
        const linkText = linkTextInput.value.trim() || currentSelectedText || finalUrl;
        link.textContent = linkText;
        
        // Delete selected content or placeholder
        try {
          // Check if we're replacing a placeholder
          const placeholder = currentRange.commonAncestorContainer.nodeType === Node.TEXT_NODE
            ? currentRange.commonAncestorContainer.parentElement
            : currentRange.commonAncestorContainer as HTMLElement;
          
          if (placeholder?.getAttribute('data-placeholder') === 'true') {
            placeholder.parentNode?.replaceChild(link, placeholder);
          } else if (currentSelectedText) {
            currentRange.deleteContents();
            currentRange.insertNode(link);
          } else {
            // No selection, just insert the link
            currentRange.insertNode(link);
          }
        } catch (error) {
          console.error('Error inserting link:', error);
          // Fallback: just append the link
          previewContentRef.appendChild(link);
        }
      }
      
      if (currentSelection) {
        currentSelection.removeAllRanges();
      }
      updateHtmlFromPreview();
      toolbar.remove();
      toast.success('Link created successfully');
    };
    
    const unlink = () => {
      if (existingLink) {
        const text = document.createTextNode(existingLink.textContent || '');
        existingLink.parentNode?.replaceChild(text, existingLink);
        updateHtmlFromPreview();
      }
      toolbar.remove();
    };
    
    applyBtn.addEventListener('click', applyLink);
    unlinkBtn.addEventListener('click', unlink);
    cancelBtn.addEventListener('click', () => toolbar.remove());
    
    // Assemble inputs
    inputsContainer.appendChild(linkTextInput);
    inputsContainer.appendChild(urlInput);
    
    // Assemble toolbar
    toolbar.appendChild(inputsContainer);
    toolbar.appendChild(newTabContainer);
    toolbar.appendChild(applyBtn);
    if (isLink) toolbar.appendChild(unlinkBtn);
    toolbar.appendChild(cancelBtn);
    
    // Position toolbar horizontally aligned with selection
    const rect = range.getBoundingClientRect();
    const containerRect = previewContentRef.getBoundingClientRect();
    toolbar.style.left = `${rect.left - containerRect.left}px`;
    
    previewContentRef.appendChild(toolbar);
    
    // Focus URL input and select all text if updating existing link
    urlInput.focus();
    if (existingLink) {
      urlInput.select();
    }
    
    // Remove toolbar on outside click
    const handleOutsideClick = (e: MouseEvent) => {
      if (!toolbar.contains(e.target as Node)) {
        toolbar.remove();
        document.removeEventListener('click', handleOutsideClick);
      }
    };
    setTimeout(() => document.addEventListener('click', handleOutsideClick), 0);
  };

  const addHeadingInPreview = (level: number) => {
    if (previewContentRef) {
      // Create container for heading with delete button
      const container = document.createElement('div');
      container.style.cssText = `
        position: relative;
        margin: 1rem 0;
      `;
      
      const heading = document.createElement(`h${level}`);
      heading.className = 'editor_blog_heading';
      heading.textContent = `Heading ${level}`;
      
      container.appendChild(heading);
      
      // Add delete button
      const deleteBtn = createDeleteButton(container);
      container.appendChild(deleteBtn);
      addDeleteButtonHover(container, deleteBtn);
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.insertNode(container);
        selection.removeAllRanges();
      } else {
        // Focus the contentEditable div and insert at cursor
        previewContentRef.focus();
        const selection = window.getSelection();
        if (selection) {
          const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : document.createRange();
          if (selection.rangeCount === 0) {
            range.selectNodeContents(previewContentRef);
            range.collapse(false); // Move to end if no cursor position
          }
          range.insertNode(container);
          range.setStartAfter(container);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          previewContentRef.appendChild(container);
        }
      }
      
      // Update HTML code
      const newContent = previewContentRef.innerHTML;
      const extractedCss = extractCssFromHtml(htmlCode);
      const fullHtml = extractedCss ? 
        `<style>\n${extractedCss}\n</style>\n${newContent}` : 
        newContent;
      setHtmlCode(fullHtml);
    }
  };

  const createEnhancedParagraph = () => {
    const container = document.createElement('div');
    container.className = 'enhanced-paragraph-container';
    container.style.cssText = `
      position: relative;
      margin: 1rem 0;
    `;

    const paragraph = document.createElement('p');
    paragraph.className = 'editor_blog_paragraph';
    paragraph.style.cssText = `
      margin: 0;
      padding: 12px;
      border: 1px solid transparent;
      border-radius: 6px;
      min-height: 24px;
      transition: all 0.2s ease;
    `;
    paragraph.textContent = 'Start writing your paragraph here...';

    // Enhanced paragraph features
    paragraph.addEventListener('focus', () => {
      paragraph.style.border = '1px solid #3b82f6';
      paragraph.style.backgroundColor = '#fafbfc';
      if (paragraph.textContent === 'Start writing your paragraph here...') {
        paragraph.textContent = '';
      }
      showParagraphToolbar(container, paragraph);
    });

    paragraph.addEventListener('blur', () => {
      paragraph.style.border = '1px solid transparent';
      paragraph.style.backgroundColor = 'transparent';
      if ((paragraph.textContent || '').trim() === '') {
        paragraph.textContent = 'Start writing your paragraph here...';
        paragraph.style.color = '#9ca3af';
      } else {
        paragraph.style.color = 'inherit';
      }
      hideParagraphToolbar(container);
      updateHtmlFromPreview();
    });

    // Auto-grow and typing features
    paragraph.addEventListener('input', () => {
      updateHtmlFromPreview();
    });

    // Keyboard shortcuts
    paragraph.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault();
            toggleParagraphBold(paragraph);
            break;
          case 'i':
            e.preventDefault();
            toggleParagraphItalic(paragraph);
            break;
          case 'u':
            e.preventDefault();
            toggleParagraphUnderline(paragraph);
            break;
        }
      }
      
      // Enter creates new paragraph
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        createNewParagraphAfter(container);
      }
    });

    container.appendChild(paragraph);
    
    // Add delete button
    const deleteBtn = createDeleteButton(container);
    container.appendChild(deleteBtn);
    addDeleteButtonHover(container, deleteBtn);
    
    return container;
  };

  const showParagraphToolbar = (container: HTMLElement, paragraph: HTMLElement) => {
    // Remove any existing toolbar
    const existingToolbar = container.querySelector('.paragraph-toolbar');
    if (existingToolbar) existingToolbar.remove();

    const toolbar = document.createElement('div');
    toolbar.className = 'paragraph-toolbar';
    toolbar.style.cssText = `
      position: absolute;
      top: -45px;
      left: 0;
      background: white;
      border: 1px solid #e1e5e9;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 4px;
      display: flex;
      gap: 4px;
      z-index: 100;
    `;

    const buttons = [
      { text: 'B', action: () => toggleParagraphBold(paragraph), title: 'Bold (Ctrl+B)' },
      { text: 'I', action: () => toggleParagraphItalic(paragraph), title: 'Italic (Ctrl+I)' },
      { text: 'U', action: () => toggleParagraphUnderline(paragraph), title: 'Underline (Ctrl+U)' },
      { text: '🎨', action: () => cycleParagraphStyle(paragraph), title: 'Change Style' },
      { text: '⬅️', action: () => setParagraphAlign(paragraph, 'left'), title: 'Align Left' },
      { text: '↔️', action: () => setParagraphAlign(paragraph, 'center'), title: 'Align Center' },
      { text: '➡️', action: () => setParagraphAlign(paragraph, 'right'), title: 'Align Right' }
    ];

    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.textContent = btn.text;
      button.title = btn.title;
      button.style.cssText = `
        padding: 6px 8px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        font-size: 12px;
        font-weight: ${btn.text === 'B' ? 'bold' : btn.text === 'I' ? 'italic' : 'normal'};
        text-decoration: ${btn.text === 'U' ? 'underline' : 'none'};
      `;
      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = '#f3f4f6';
      });
      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = 'white';
      });
      button.addEventListener('click', btn.action);
      toolbar.appendChild(button);
    });

    container.appendChild(toolbar);
  };

  const hideParagraphToolbar = (container: HTMLElement) => {
    setTimeout(() => {
      const toolbar = container.querySelector('.paragraph-toolbar');
      if (toolbar) toolbar.remove();
    }, 200); // Delay to allow clicking toolbar buttons
  };

  const toggleParagraphBold = (paragraph: HTMLElement) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      document.execCommand('bold');
    } else {
      paragraph.style.fontWeight = paragraph.style.fontWeight === 'bold' ? 'normal' : 'bold';
    }
    updateHtmlFromPreview();
  };

  const toggleParagraphItalic = (paragraph: HTMLElement) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      document.execCommand('italic');
    } else {
      paragraph.style.fontStyle = paragraph.style.fontStyle === 'italic' ? 'normal' : 'italic';
    }
    updateHtmlFromPreview();
  };

  const toggleParagraphUnderline = (paragraph: HTMLElement) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      document.execCommand('underline');
    } else {
      paragraph.style.textDecoration = paragraph.style.textDecoration === 'underline' ? 'none' : 'underline';
    }
    updateHtmlFromPreview();
  };

  const cycleParagraphStyle = (paragraph: HTMLElement) => {
    const styles = [
      { class: 'blog_paragraph', name: 'Normal' },
      { class: 'blog_emphasis', name: 'Emphasis' },
      { class: 'blog_highlight', name: 'Highlight' },
      { class: 'blog_quote', name: 'Quote' }
    ];
    
    const currentIndex = styles.findIndex(style => paragraph.classList.contains(style.class));
    const nextIndex = (currentIndex + 1) % styles.length;
    
    // Remove all style classes
    styles.forEach(style => paragraph.classList.remove(style.class));
    
    // Add new style class
    paragraph.className = styles[nextIndex].class;
    updateHtmlFromPreview();
  };

  const setParagraphAlign = (paragraph: HTMLElement, align: string) => {
    paragraph.style.textAlign = align;
    updateHtmlFromPreview();
  };

  const createNewParagraphAfter = (container: HTMLElement) => {
    const newParagraph = createEnhancedParagraph();
    container.parentNode?.insertBefore(newParagraph, container.nextSibling);
    
    // Focus the new paragraph
    const p = newParagraph.querySelector('p');
    if (p) {
      p.focus();
    }
    
    updateHtmlFromPreview();
  };

  const insertParagraphInPreview = () => {
    const paragraph = createEnhancedParagraph();
    insertAtCursor(paragraph);
  };

  const createEnhancedList = (ordered: boolean = false) => {
    // Create container for list with delete button
    const container = document.createElement('div');
    container.style.cssText = `
      position: relative;
      margin: 1rem 0;
    `;
    
    const list = document.createElement(ordered ? 'ol' : 'ul');
    list.className = 'editor_blog_list';
    list.style.cssText = `
      position: relative;
      margin: 1.5rem 0;
      padding-left: 2rem;
      list-style: ${ordered ? 'decimal' : 'disc'};
    `;
    
    // Create initial list items
    for (let i = 1; i <= 3; i++) {
      const listItem = document.createElement('li');
      // No need for class, using li element directly
      listItem.contentEditable = 'false';
      listItem.textContent = `List item ${i}`;
      listItem.addEventListener('blur', updateHtmlFromPreview);
      
      // Handle Enter key to create new list item
      listItem.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const newItem = document.createElement('li');
          // No need for class, using li element directly
          newItem.textContent = 'New item';
          newItem.addEventListener('blur', updateHtmlFromPreview);
          addListItemHandlers(newItem);
          
          // Insert after current item
          if (listItem.nextSibling) {
            list.insertBefore(newItem, listItem.nextSibling);
          } else {
            list.appendChild(newItem);
          }
          
          // Focus new item
          newItem.focus();
          updateHtmlFromPreview();
        } else if (e.key === 'Backspace' && listItem.textContent === '') {
          e.preventDefault();
          if (list.children.length > 1) {
            const prevItem = listItem.previousElementSibling;
            list.removeChild(listItem);
            if (prevItem) {
              (prevItem as HTMLElement).focus();
            }
            updateHtmlFromPreview();
          }
        }
      });
      
      list.appendChild(listItem);
    }
    
    // Add list controls
    const controls = document.createElement('div');
    controls.className = 'list-controls';
    controls.style.cssText = `
      position: absolute;
      top: -35px;
      right: 40px;
      display: none;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 1000;
    `;
    
    const addItemBtn = document.createElement('button');
    addItemBtn.textContent = '+ Item';
    addItemBtn.style.cssText = 'margin: 2px; padding: 4px 8px; border: 1px solid #ccc; border-radius: 2px; background: #f9f9f9; cursor: pointer; font-size: 12px;';
    addItemBtn.onclick = () => addListItem(list);
    
    const toggleTypeBtn = document.createElement('button');
    toggleTypeBtn.textContent = ordered ? '→ Bullets' : '→ Numbers';
    toggleTypeBtn.style.cssText = 'margin: 2px; padding: 4px 8px; border: 1px solid #ccc; border-radius: 2px; background: #f0f0f0; cursor: pointer; font-size: 12px;';
    toggleTypeBtn.onclick = () => toggleListType(list);
    
    controls.appendChild(addItemBtn);
    controls.appendChild(toggleTypeBtn);
    
    // Show controls on list hover
    list.addEventListener('mouseenter', () => {
      controls.style.display = 'block';
    });
    list.addEventListener('mouseleave', () => {
      controls.style.display = 'none';
    });
    
    list.appendChild(controls);
    
    // Add list to container
    container.appendChild(list);
    
    // Add delete button
    const deleteBtn = createDeleteButton(container);
    container.appendChild(deleteBtn);
    addDeleteButtonHover(container, deleteBtn);
    
    return container;
  };

  const addListItemHandlers = (listItem: HTMLLIElement) => {
    listItem.addEventListener('keydown', (e) => {
      const list = listItem.parentElement;
      if (!list) return;
      
      if (e.key === 'Enter') {
        e.preventDefault();
        const newItem = document.createElement('li');
        // No need for class, using li element directly
        newItem.textContent = 'New item';
        newItem.addEventListener('blur', updateHtmlFromPreview);
        addListItemHandlers(newItem);
        
        if (listItem.nextSibling) {
          list.insertBefore(newItem, listItem.nextSibling);
        } else {
          list.appendChild(newItem);
        }
        
        newItem.focus();
        updateHtmlFromPreview();
      } else if (e.key === 'Backspace' && listItem.textContent === '') {
        e.preventDefault();
        if (list.querySelectorAll('li').length > 1) {
          const prevItem = listItem.previousElementSibling;
          list.removeChild(listItem);
          if (prevItem && prevItem.tagName === 'LI') {
            (prevItem as HTMLElement).focus();
          }
          updateHtmlFromPreview();
        }
      }
    });
  };

  const addListItem = (list: HTMLElement) => {
    const newItem = document.createElement('li');
    // No need for class, using li element directly
    newItem.textContent = 'New item';
    newItem.addEventListener('blur', updateHtmlFromPreview);
    addListItemHandlers(newItem);
    
    // Insert before controls
    const controls = list.querySelector('.list-controls');
    if (controls) {
      list.insertBefore(newItem, controls);
    } else {
      list.appendChild(newItem);
    }
    
    newItem.focus();
    updateHtmlFromPreview();
  };

  const toggleListType = (list: HTMLElement) => {
    const isOrdered = list.tagName.toLowerCase() === 'ol';
    const container = list.parentElement;
    if (!container) return;
    
    // Create new list with opposite type
    const newList = document.createElement(isOrdered ? 'ul' : 'ol');
    newList.className = list.className;
    newList.style.cssText = list.style.cssText;
    
    // Copy all list items (not controls)
    const listItems: HTMLElement[] = [];
    Array.from(list.children).forEach(child => {
      if (!child.classList.contains('list-controls') && child.tagName === 'LI') {
        listItems.push(child.cloneNode(true) as HTMLElement);
      }
    });
    
    // Replace the old list with the new one
    list.replaceWith(newList);
    
    // Add back all list items
    listItems.forEach(item => {
      newList.appendChild(item);
      item.addEventListener('blur', updateHtmlFromPreview);
      addListItemHandlers(item as HTMLLIElement);
    });
    
    // Re-add the controls
    const controls = document.createElement('div');
    controls.className = 'list-controls';
    controls.style.cssText = `
      position: absolute;
      top: -35px;
      right: 40px;
      display: none;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 1000;
    `;
    
    const addItemBtn = document.createElement('button');
    addItemBtn.textContent = '+ Item';
    addItemBtn.style.cssText = 'margin: 2px; padding: 4px 8px; border: 1px solid #ccc; border-radius: 2px; background: #f9f9f9; cursor: pointer; font-size: 12px;';
    addItemBtn.onclick = () => addListItem(newList);
    
    const toggleTypeBtn = document.createElement('button');
    toggleTypeBtn.textContent = isOrdered ? '→ Numbers' : '→ Bullets';
    toggleTypeBtn.style.cssText = 'margin: 2px; padding: 4px 8px; border: 1px solid #ccc; border-radius: 2px; background: #f0f0f0; cursor: pointer; font-size: 12px;';
    toggleTypeBtn.onclick = () => toggleListType(newList);
    
    controls.appendChild(addItemBtn);
    controls.appendChild(toggleTypeBtn);
    
    // Show controls on list hover
    newList.addEventListener('mouseenter', () => {
      controls.style.display = 'block';
    });
    newList.addEventListener('mouseleave', () => {
      controls.style.display = 'none';
    });
    
    newList.appendChild(controls);
    
    updateHtmlFromPreview();
  };

  const insertListInPreview = (ordered: boolean = false) => {
    const list = createEnhancedList(ordered);
    insertAtCursor(list);
    // Drag handlers removed for list components
  };

  const insertBlockquoteInPreview = () => {
    // Create container for blockquote with delete button
    const container = document.createElement('div');
    container.style.cssText = `
      position: relative;
      margin: 1rem 0;
    `;
    
    const blockquote = document.createElement('blockquote');
    blockquote.className = 'editor_blog_quote';
    blockquote.textContent = 'This is a blockquote. Click to edit.';
    blockquote.style.cssText = `
      border-left: 4px solid #3b82f6;
      padding-left: 1.5rem;
      margin: 1.5rem 0;
      font-style: italic;
      color: #6b7280;
    `;
    blockquote.addEventListener('blur', updateHtmlFromPreview);
    
    container.appendChild(blockquote);
    
    // Add delete button
    const deleteBtn = createDeleteButton(container);
    container.appendChild(deleteBtn);
    addDeleteButtonHover(container, deleteBtn);
    
    insertAtCursor(container);
    // Drag handlers removed for quote components
  };

  const createEnhancedCodeBlock = (language: string = 'javascript') => {
    const container = document.createElement('div');
    container.className = 'enhanced-code-block';
    container.style.cssText = `
      position: relative;
      margin: 1rem 0;
      border: 1px solid #e1e5e9;
      border-radius: 6px;
      background: #f6f8fa;
    `;
    
    // Language selector and controls
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #f1f3f4;
      border-bottom: 1px solid #e1e5e9;
      border-radius: 6px 6px 0 0;
      font-size: 12px;
      color: #586069;
    `;
    
    const languageSelect = document.createElement('select');
    languageSelect.style.cssText = `
      padding: 2px 6px;
      border: 1px solid #d0d7de;
      border-radius: 3px;
      background: white;
      font-size: 12px;
    `;
    
    const languages = [
      'javascript', 'typescript', 'python', 'java', 'html', 'css', 'sql', 
      'bash', 'json', 'xml', 'php', 'ruby', 'go', 'rust', 'cpp', 'csharp'
    ];
    
    languages.forEach(lang => {
      const option = document.createElement('option');
      option.value = lang;
      option.textContent = lang.charAt(0).toUpperCase() + lang.slice(1);
      option.selected = lang === language;
      languageSelect.appendChild(option);
    });
    
    languageSelect.addEventListener('change', () => {
      code.className = `language-${languageSelect.value}`;
      updateHtmlFromPreview();
    });
    
    const copyBtn = document.createElement('button');
    copyBtn.textContent = '📋 Copy';
    copyBtn.style.cssText = `
      padding: 4px 8px;
      border: 1px solid #d0d7de;
      border-radius: 3px;
      background: white;
      cursor: pointer;
      font-size: 12px;
    `;
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(code.textContent || '');
      copyBtn.textContent = '✅ Copied!';
      setTimeout(() => copyBtn.textContent = '📋 Copy', 1000);
    };
    
    header.appendChild(languageSelect);
    header.appendChild(copyBtn);
    
    // Code editor area
    const pre = document.createElement('pre');
    pre.className = 'editor_blog_code';
    pre.style.cssText = `
      margin: 0;
      padding: 16px;
      background: #f6f8fa;
      border-radius: 0 0 6px 6px;
      overflow: auto;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 14px;
      line-height: 1.45;
    `;
    
    const code = document.createElement('code');
    code.className = `language-${language}`;
    code.contentEditable = 'false';
    code.style.cssText = `
      background: transparent;
      border: none;
      outline: none;
      color: #24292f;
      white-space: pre;
      word-wrap: break-word;
    `;
    
    const examples: Record<string, string> = {
      javascript: 'function greetUser(name) {\n  console.log("Hello, " + name + "!");\n  return "Welcome " + name;\n}',
      typescript: 'interface User {\n  name: string;\n  age: number;\n}\n\nfunction greetUser(user: User): string {\n  return "Hello, " + user.name + "!";\n}',
      python: 'def greet_user(name: str) -> str:\n    """Greet a user by name"""\n    print(f"Hello, {name}!")\n    return f"Welcome {name}"',
      html: '<div class="container">\n  <h1>Welcome</h1>\n  <p>This is a sample HTML snippet.</p>\n</div>',
      css: '.container {\n  max-width: 1200px;\n  margin: 0 auto;\n  padding: 20px;\n}\n\n.title {\n  color: #333;\n  font-size: 2rem;\n}',
      sql: 'SELECT users.name, posts.title\nFROM users\nINNER JOIN posts ON users.id = posts.user_id\nWHERE posts.published = true\nORDER BY posts.created_at DESC;'
    };
    
    code.textContent = examples[language] || `// ${language} code example\nconsole.log("Hello World!");`;
    code.addEventListener('blur', updateHtmlFromPreview);
    
    // Handle Tab key for proper indentation
    code.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const tabNode = document.createTextNode('  ');
          range.insertNode(tabNode);
          range.setStartAfter(tabNode);
          range.setEndAfter(tabNode);
          sel.removeAllRanges();
          sel.addRange(range);
          updateHtmlFromPreview();
        }
      }
    });
    
    pre.appendChild(code);
    container.appendChild(header);
    container.appendChild(pre);
    
    // Add delete button
    const deleteBtn = createDeleteButton(container);
    container.appendChild(deleteBtn);
    addDeleteButtonHover(container, deleteBtn);
    
    return container;
  };

  const insertCodeBlockInPreview = () => {
    const codeBlock = createEnhancedCodeBlock();
    insertAtCursor(codeBlock);
    // Set up drag handlers after insertion
    // Drag handlers removed for code components
  };

  const insertDividerInPreview = () => {
    // Create container for divider with delete button
    const container = document.createElement('div');
    container.style.cssText = `
      position: relative;
      margin: 1rem 0;
    `;
    
    const hr = document.createElement('hr');
    hr.className = 'editor_blog_hr';
    hr.style.cssText = `
      height: 2px;
      background: linear-gradient(to right, #3498db, #2ecc71);
      border: none;
      margin: 3rem 0;
      border-radius: 1px;
    `;
    
    container.appendChild(hr);
    
    // Add delete button
    const deleteBtn = createDeleteButton(container);
    container.appendChild(deleteBtn);
    addDeleteButtonHover(container, deleteBtn);
    
    insertAtCursor(container);
    // Drag handlers removed for HR components
  };

  const insertHighlightBoxInPreview = () => {
    const container = document.createElement('div');
    container.style.cssText = `
      position: relative;
      margin: 1rem 0;
    `;
    
    const highlightBox = document.createElement('div');
    highlightBox.className = 'editor_blog_highlight';
    highlightBox.innerHTML = '<p>This is a highlighted content box. Click to edit this text and make it stand out from your regular content.</p>';
    highlightBox.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1.5rem;
      border-radius: 8px;
      margin: 2rem 0;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    `;
    
    container.appendChild(highlightBox);
    
    // Add delete button
    const deleteBtn = createDeleteButton(container);
    container.appendChild(deleteBtn);
    addDeleteButtonHover(container, deleteBtn);
    
    insertAtCursor(container);
    // Drag handlers removed for highlight components
  };

  const insertCallToActionInPreview = () => {
    const container = document.createElement('div');
    container.style.cssText = `
      position: relative;
      margin: 1rem 0;
    `;
    
    const cta = document.createElement('div');
    cta.className = 'editor_blog_call_to_action';
    cta.innerHTML = '<p class="blog_cta_text">Ready to get started? Take action now and transform your workflow!</p>';
    cta.style.cssText = `
      background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
      color: white;
      padding: 2rem;
      border-radius: 8px;
      text-align: center;
      margin: 3rem 0;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    `;
    
    container.appendChild(cta);
    
    // Add delete button
    const deleteBtn = createDeleteButton(container);
    container.appendChild(deleteBtn);
    addDeleteButtonHover(container, deleteBtn);
    
    insertAtCursor(container);
    // Drag handlers removed for CTA components
  };

  const insertTwoColumnLayoutInPreview = () => {
    const container = document.createElement('div');
    container.style.cssText = `
      position: relative;
      margin: 1rem 0;
    `;
    
    const twoColumnContainer = document.createElement('div');
    twoColumnContainer.className = 'editor_blog_2col';
    twoColumnContainer.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin: 2rem 0;
    `;
    twoColumnContainer.innerHTML = `
      <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px; min-height: 150px;" contenteditable="true">
        <h4>Left Column</h4>
        <p>This is the left column content. Click to edit and add your content here.</p>
      </div>
      <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px; min-height: 150px;" contenteditable="true">
        <h4>Right Column</h4>
        <p>This is the right column content. Click to edit and add your content here.</p>
      </div>
    `;
    
    container.appendChild(twoColumnContainer);
    
    // Add delete button
    const deleteBtn = createDeleteButton(container);
    container.appendChild(deleteBtn);
    addDeleteButtonHover(container, deleteBtn);
    
    insertAtCursor(container);
    // Drag handlers removed for 2-column components
  };


  const formatHtml = () => {
    try {
      const formatted = beautifyHtml(htmlCode, {
        indent_size: 2,
        wrap_line_length: 0,
        preserve_newlines: true,
        max_preserve_newlines: 2,
        end_with_newline: true
      });
      setHtmlCode(formatted);
    } catch (e) {
      // Fallback: basic formatting
      const formatted = htmlCode
        .replace(/></g, '>\n<')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n');
      setHtmlCode(formatted);
    }
  };

  // These functions are no longer needed as they were specific to TipTap editor
  // The functionality is now integrated directly into the enhanced preview mode

  // Process HTML for publishing - set contenteditable to false
  const cleanHtmlForPublishing = (html: string): string => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Set all contenteditable attributes to false (not remove)
    const editableElements = tempDiv.querySelectorAll('[contenteditable]');
    editableElements.forEach(element => {
      element.setAttribute('contenteditable', 'false');
    });
    
    // Remove editor-specific containers but keep the content
    const editorContainers = tempDiv.querySelectorAll('.editor-component-container');
    editorContainers.forEach(container => {
      const content = container.querySelector('[class*="editor_blog_"]');
      if (content && container.parentNode) {
        container.parentNode.replaceChild(content, container);
      }
    });
    
    // Remove delete buttons
    const deleteButtons = tempDiv.querySelectorAll('.delete-button');
    deleteButtons.forEach(btn => btn.remove());
    
    // Remove modification toolbars
    const toolbars = tempDiv.querySelectorAll('.editor-modification-toolbar');
    toolbars.forEach(toolbar => toolbar.remove());
    
    // Remove data-editor-ui attributes
    const editorUiElements = tempDiv.querySelectorAll('[data-editor-ui]');
    editorUiElements.forEach(element => {
      element.removeAttribute('data-editor-ui');
    });
    
    return tempDiv.innerHTML;
  };

  const handleSave = async () => {
    // Enhanced validation for required fields
    if (
      !formData.title ||
      !formData.slug ||
      !htmlCode ||
      !hashtags.length
    ) {
      setApiError("All fields are required");
      toast.error("All fields are required");
      return;
    }

    try {
      setIsLoading(true);
      setApiError(null);

      console.log("Save Draft Operation Started");
      // Clean HTML for publishing - remove all editor-specific attributes
      let processedContent = cleanHtmlForPublishing(htmlCode);
      
      // Extract styles and content
      const styleMatch = processedContent.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
      const styles = styleMatch ? styleMatch[1] : '';
      const contentOnly = processedContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim();
      
      // Format as complete HTML document
      let processedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${formData.title || ''}</title>
</head>
<body>
${contentOnly}
<style>${styles}</style>
</body>
</html>`;

      // Replace images
      // if (uploadedImages.length > 0) {
      //   const imgRegex = /<img[^>]+src\s*=\s*['"]([^'"]+)['"][^>]*>/g;
      //   let imgIndex = 0;
      //   processedHtml = processedHtml.replace(imgRegex, (match, src) => {
      //     // Skip if src is already a full URL (already uploaded)
      //     if (src.startsWith('http://') || src.startsWith('https://')) {
      //       return match;
      //     }
          
      //     const altMatch = match.match(/alt\s*=\s*['"]([^'"]*)['"]/);
      //     const alt = altMatch ? altMatch[1] : "Blog image";

      //     if (imgIndex < uploadedImages.length) {
      //       const newSrc = uploadedImages[imgIndex];
      //       imgIndex++;
      //       return `<img src="${newSrc}" alt="${alt}" style="max-width: 100%; height: auto;">`;
      //     }
      //     return match;
      //   });
      // }

      // Replace videos - first handle iframe video containers
      // if (uploadedVideos.length > 0) {
      //   let videoIndex = 0;

      //   // Replace video containers that have iframes
      //   // const videoContainerRegex =
      //   //   /<div class="video-container">\s*<iframe[^>]*>[^<]*<\/iframe>\s*<\/div>/g;
      //   // processedHtml = processedHtml.replace(videoContainerRegex, (match) => {
      //   //   if (videoIndex < uploadedVideos.length) {
      //   //     const videoUrl = uploadedVideos[videoIndex];
      //   //     videoIndex++;
      //   //     return `<div class="video-container">
      //   //       <video controls style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;">
      //   //         <source src="${videoUrl}" type="video/mp4">
      //   //         Your browser does not support the video tag.
      //   //       </video>
      //   //     </div>`;
      //   //   }
      //   //   return match;
      //   // });

      //   // Replace any remaining standalone iframes
      //   // const iframeRegex = /<iframe[^>]*>[^<]*<\/iframe>/g;
      //   // processedHtml = processedHtml.replace(iframeRegex, (match) => {
      //   //   if (videoIndex < uploadedVideos.length) {
      //   //     const videoUrl = uploadedVideos[videoIndex];
      //   //     videoIndex++;
      //   //     return `<video controls style="width: 100%; height: auto;">
      //   //       <source src="${videoUrl}" type="video/mp4">
      //   //       Your browser does not support the video tag.
      //   //     </video>`;
      //   //   }
      //   //   return match;
      //   // });
      // }

      const response = await axios.post(
        BLOGS.CREATE,
        {
          title: formData.title,
          slug: formData.slug,
          htmlContent: processedHtml,
          metadata: {
            ...formData.metadata,
            hashtags: hashtags.join(',')
          },
          images: uploadedImages,
          videos: uploadedVideos,
        }
      );

      console.log("Created Response", response);
      const slug = response.data.slug;

      setApiSuccess("Blog Created successfully!");
      toast.success("Blog Created successfully!");
      // setTimeout(() => {
      //   navigate(`/draft-articles/${username}/${slug}`);
      // }, 2000);
    } catch (error: any) {
      console.error("Error saving draft:", error);
      setApiError(
        error.response?.data?.error ||
        "Failed to save draft. Please try again."
      );
      toast.error("Failed to save draft. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = () => {
    // Prepare the data for publishing
    const dataToPublish = {
      ...formData,
      htmlContent: htmlCode,
      metadata: {
        ...formData.metadata,
        hashtags: hashtags.join(',')
      }
    };
    
    console.log('Publishing post:', dataToPublish);
    alert('Post published! (This is a demo - check console for data)');
  };

  // Generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/--+/g, '-') // Replace multiple hyphens with single hyphen
      .trim();
  };

  return (
    <EditorContainer $isDark={isDarkMode}>
      <DarkModeToggle 
        $isDark={isDarkMode}
        onClick={() => setIsDarkMode(!isDarkMode)}
        title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {isDarkMode ? '☀️' : '🌙'}
      </DarkModeToggle>
      <ToastContainer position="top-right" autoClose={3000} />
      {(viewMode as ViewMode) === 'dualFullscreen' && (
        <ExitDualFullscreenButton 
          $isDark={isDarkMode}
          onClick={() => {
            setViewMode('dual' as ViewMode);
            setIsPreviewFullscreen(false);
            setIsHtmlFullscreen(false);
          }}>
          Exit Dual Full Screen
        </ExitDualFullscreenButton>
      )}
      
      {!isPreviewFullscreen && !isHtmlFullscreen && (viewMode as ViewMode) !== 'dualFullscreen' && (
        <>
          <TitleInput
            $isDark={isDarkMode}
            type="text"
            placeholder="Enter post title..."
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
          />
          
          <MetaSection $isDark={isDarkMode}>
            <div>
              <label style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                marginBottom: '8px', 
                marginLeft: '5px', 
                display: 'block', 
                color: isDarkMode ? theme.dark.text : theme.light.text 
              }}>
                Hashtags
              </label>
              <HashtagContainer $isDark={isDarkMode}>
                {hashtags.map((tag, index) => (
                  <HashtagChip key={index} $isDark={isDarkMode}>
                    {tag}
                    <HashtagRemoveButton onClick={() => removeHashtag(index)}>
                      ×
                    </HashtagRemoveButton>
                  </HashtagChip>
                ))}
                <HashtagInput
                  $isDark={isDarkMode}
                  type="text"
                  placeholder={hashtags.length === 0 ? "Add hashtags..." : ""}
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyDown={handleHashtagInputKeyDown}
                />
              </HashtagContainer>
            </div>
            <div>
              <label style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                marginBottom: '8px', 
                display: 'flex', 
                alignItems: 'center',
                color: isDarkMode ? theme.dark.text : theme.light.text 
              }}>
                URL Slug
                {checkingSlug && (
                  <span style={{ marginLeft: '8px', fontSize: '12px', color: isDarkMode ? theme.dark.textMuted : theme.light.textMuted }}>
                    Checking availability...
                  </span>
                )}
                {!checkingSlug && slugAvailable !== null && (
                  <SlugStatusIndicator available={slugAvailable}>
                    {slugAvailable ? 'Available' : 'Already taken'}
                  </SlugStatusIndicator>
                )}
              </label>
              <MetaInput
                $isDark={isDarkMode}
                type="text"
                placeholder="URL slug (e.g., my-blog-post)"
                value={formData.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
              />
            </div>
          </MetaSection>
          
          <ViewModeSection $isDark={isDarkMode}>
            <ViewModeLabel $isDark={isDarkMode}>View Mode:</ViewModeLabel>
            <ViewModeButton 
              $active={viewMode === 'html'}
              $isDark={isDarkMode}
              onClick={() => setViewMode('html' as ViewMode)}
            >
              HTML Only
            </ViewModeButton>
            <ViewModeButton 
              $active={viewMode === 'preview'}
              $isDark={isDarkMode}
              onClick={() => setViewMode('preview' as ViewMode)}
            >
              Preview Only
            </ViewModeButton>
            <ViewModeButton 
              $active={viewMode === 'dual'}
              $isDark={isDarkMode}
              onClick={() => setViewMode('dual' as ViewMode)}
            >
              Dual View
            </ViewModeButton>
            <ViewModeButton 
              $active={(viewMode as ViewMode) === 'dualFullscreen'}
              $isDark={isDarkMode}
              onClick={() => {
                setViewMode('dualFullscreen' as ViewMode);
                setIsPreviewFullscreen(true);
                setIsHtmlFullscreen(true);
              }}
            >
              Dual Full Screen
            </ViewModeButton>
          </ViewModeSection>
        </>
      )}

      <DualPaneContainer 
        ref={containerRef}
        $hasFullscreen={isPreviewFullscreen || isHtmlFullscreen}
        $isDualFullscreen={(viewMode as ViewMode) === 'dualFullscreen'}
        $isDark={isDarkMode}
      >
        {((viewMode as ViewMode) !== 'html' || (viewMode as ViewMode) === 'dualFullscreen') && (
          <LeftPane 
            $isFullscreen={isPreviewFullscreen && (viewMode as ViewMode) !== 'dualFullscreen'} 
            $isHidden={isHtmlFullscreen && (viewMode as ViewMode) !== 'dualFullscreen'}
            width={(viewMode as ViewMode) === 'dualFullscreen' ? leftPaneWidth : undefined}
            $isDark={isDarkMode}
          >
          <PaneHeader $isDark={isDarkMode}>
            <span>👁️ Enhanced Preview</span>
            <FullscreenButton $isDark={isDarkMode} onClick={() => {
              if ((viewMode as ViewMode) === 'dualFullscreen') {
                setIsPreviewOverlayFullscreen(!isPreviewOverlayFullscreen);
              } else {
                setIsPreviewFullscreen(!isPreviewFullscreen);
              }
            }}>
              {((viewMode as ViewMode) === 'dualFullscreen' && isPreviewOverlayFullscreen) || ((viewMode as ViewMode) !== 'dualFullscreen' && isPreviewFullscreen) ? '🔲 Exit Fullscreen' : '🔳 Fullscreen'}
            </FullscreenButton>
          </PaneHeader>
          <>
              <EditorToolbar $isFullscreen={isPreviewFullscreen} $isDark={isDarkMode}>
                <ToolbarGroup $isDark={isDarkMode}>
                  <ToolbarSelect
                    $isDark={isDarkMode}
                    onChange={(e) => {
                      if (e.target.value === 'paragraph') {
                        insertParagraphInPreview();
                      } else {
                        const level = parseInt(e.target.value.replace('h', ''));
                        addHeadingInPreview(level);
                      }
                    }}
                    title="Insert Paragraph or Heading"
                  >
                    <option value="">Insert Element</option>
                    <option value="paragraph">Paragraph</option>
                    <option value="h1">Heading 1</option>
                    <option value="h2">Heading 2</option>
                    <option value="h3">Heading 3</option>
                    <option value="h4">Heading 4</option>
                    <option value="h5">Heading 5</option>
                    <option value="h6">Heading 6</option>
                  </ToolbarSelect>
                  
                  <ToolbarSelect
                    $isDark={isDarkMode}
                    onChange={(e) => {
                      if (e.target.value && previewContentRef) {
                        const selection = window.getSelection();
                        if (selection && selection.rangeCount > 0) {
                          document.execCommand('fontName', false, e.target.value);
                          updateHtmlFromPreview();
                        }
                      }
                    }}
                  >
                    <option value="">Font Family</option>
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Courier New">Courier New</option>
                  </ToolbarSelect>
                </ToolbarGroup>

                <ToolbarGroup $isDark={isDarkMode}>
                  <ToolbarButton
                    $active={activeFormats.bold}
                    $isDark={isDarkMode}
                    onClick={() => {
                      const selection = window.getSelection();
                      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
                        document.execCommand('bold');
                        updateHtmlFromPreview();
                      }
                    }}
                    title="Bold (Ctrl+B)"
                  >
                    <strong>B</strong>
                  </ToolbarButton>
                  <ToolbarButton
                    $active={activeFormats.italic}
                    $isDark={isDarkMode}
                    onClick={() => {
                      const selection = window.getSelection();
                      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
                        document.execCommand('italic');
                        updateHtmlFromPreview();
                      }
                    }}
                    title="Italic (Ctrl+I)"
                  >
                    <em>I</em>
                  </ToolbarButton>
                  <ToolbarButton
                    $active={activeFormats.underline}
                    $isDark={isDarkMode}
                    onClick={() => {
                      const selection = window.getSelection();
                      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
                        document.execCommand('underline');
                        updateHtmlFromPreview();
                      }
                    }}
                    title="Underline (Ctrl+U)"
                  >
                    <u>U</u>
                  </ToolbarButton>
                  <ToolbarButton
                    $active={activeFormats.strike}
                    $isDark={isDarkMode}
                    onClick={() => {
                      const selection = window.getSelection();
                      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
                        document.execCommand('strikethrough');
                        updateHtmlFromPreview();
                      }
                    }}
                    title="Strikethrough"
                  >
                    <s>S</s>
                  </ToolbarButton>
                  <ToolbarButton
                    $active={activeFormats.subscript}
                    $isDark={isDarkMode}
                    onClick={() => {
                      const selection = window.getSelection();
                      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
                        document.execCommand('subscript');
                        updateHtmlFromPreview();
                      }
                    }}
                    title="Subscript"
                  >
                    X<sub>2</sub>
                  </ToolbarButton>
                  <ToolbarButton
                    $active={activeFormats.superscript}
                    $isDark={isDarkMode}
                    onClick={() => {
                      const selection = window.getSelection();
                      if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
                        document.execCommand('superscript');
                        updateHtmlFromPreview();
                      }
                    }}
                    title="Superscript"
                  >
                    X<sup>2</sup>
                  </ToolbarButton>
                </ToolbarGroup>

                <ToolbarGroup $isDark={isDarkMode}>
                  <ToolbarButton
                    $isDark={isDarkMode}
                    onClick={() => {
                      // Save current selection before showing color picker
                      const selection = window.getSelection();
                      if (selection && selection.rangeCount > 0) {
                        setSavedSelection(selection.getRangeAt(0).cloneRange());
                      }
                      setShowTextColorPicker(!showTextColorPicker);
                      setShowBgColorPicker(false);
                    }}
                    title="Text Color"
                    style={{ 
                      backgroundColor: showTextColorPicker ? '#e5e7eb' : 'transparent',
                      position: 'relative' 
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      🎨 Text Color
                      <span 
                        style={{ 
                          width: '16px', 
                          height: '16px', 
                          backgroundColor: selectedTextColor,
                          border: '1px solid #ccc',
                          borderRadius: '2px',
                          display: 'inline-block'
                        }} 
                      />
                    </span>
                  </ToolbarButton>
                  <ToolbarButton
                    $isDark={isDarkMode}
                    onClick={() => {
                      // Save current selection before showing color picker
                      const selection = window.getSelection();
                      if (selection && selection.rangeCount > 0) {
                        setSavedSelection(selection.getRangeAt(0).cloneRange());
                      }
                      setShowBgColorPicker(!showBgColorPicker);
                      setShowTextColorPicker(false);
                    }}
                    title="Background Color"
                    style={{ 
                      backgroundColor: showBgColorPicker ? '#e5e7eb' : 'transparent',
                      position: 'relative' 
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      🖌️ Background
                      <span 
                        style={{ 
                          width: '16px', 
                          height: '16px', 
                          backgroundColor: selectedBgColor,
                          border: '1px solid #ccc',
                          borderRadius: '2px',
                          display: 'inline-block'
                        }} 
                      />
                    </span>
                  </ToolbarButton>
                  
                </ToolbarGroup>

                <ToolbarGroup $isDark={isDarkMode}>
                  <ToolbarButton
                    $isDark={isDarkMode}
                    onClick={() => {
                      document.execCommand('justifyLeft');
                      updateHtmlFromPreview();
                    }}
                    title="Align Left"
                  >
                    ⬅️
                  </ToolbarButton>
                  <ToolbarButton
                    $isDark={isDarkMode}
                    onClick={() => {
                      document.execCommand('justifyCenter');
                      updateHtmlFromPreview();
                    }}
                    title="Align Center"
                  >
                    ↔️
                  </ToolbarButton>
                  <ToolbarButton
                    $isDark={isDarkMode}
                    onClick={() => {
                      document.execCommand('justifyRight');
                      updateHtmlFromPreview();
                    }}
                    title="Align Right"
                  >
                    ➡️
                  </ToolbarButton>
                  <ToolbarButton
                    $isDark={isDarkMode}
                    onClick={() => {
                      document.execCommand('justifyFull');
                      updateHtmlFromPreview();
                    }}
                    title="Justify"
                  >
                    ⬌
                  </ToolbarButton>
                </ToolbarGroup>

                <ToolbarGroup $isDark={isDarkMode}>
                  <ToolbarButton
                    $isDark={isDarkMode}
                    onClick={() => insertListInPreview(false)}
                    title="Insert Bullet List"
                  >
                    • List
                  </ToolbarButton>
                  <ToolbarButton
                    $isDark={isDarkMode}
                    onClick={() => insertListInPreview(true)}
                    title="Insert Numbered List"
                  >
                    1. List
                  </ToolbarButton>
                  <ToolbarButton
                    $isDark={isDarkMode}
                    onClick={() => insertBlockquoteInPreview()}
                    title="Insert Blockquote"
                  >
                    💬 Quote
                  </ToolbarButton>
                  <ToolbarButton
                    $isDark={isDarkMode}
                    onClick={() => insertCodeBlockInPreview()}
                    title="Insert Code Block"
                  >
                    {'</>'} Code
                  </ToolbarButton>
                  <ToolbarButton $isDark={isDarkMode} onClick={insertLinkInPreview} title="Insert Link">
                    🔗 Link
                  </ToolbarButton>
                </ToolbarGroup>

                <ToolbarGroup $isDark={isDarkMode}>
                  <ToolbarButton $isDark={isDarkMode} onClick={() => insertHighlightBoxInPreview()} title="Insert Highlight Box">
                    🌟 Highlight
                  </ToolbarButton>
                  <ToolbarButton $isDark={isDarkMode} onClick={() => insertCallToActionInPreview()} title="Insert Call to Action">
                    📢 CTA
                  </ToolbarButton>
                  <ToolbarButton $isDark={isDarkMode} onClick={() => insertTwoColumnLayoutInPreview()} title="Insert Two Column Layout">
                    📐 2-Col
                  </ToolbarButton>
                  <ToolbarButton $isDark={isDarkMode} onClick={insertTableInPreview} title="Insert Table">
                    📊 Table
                  </ToolbarButton>
                  <ToolbarButton $isDark={isDarkMode} onClick={() => insertDividerInPreview()} title="Insert Horizontal Rule">
                    ➖ HR
                  </ToolbarButton>
                </ToolbarGroup>

                <ToolbarGroup $isDark={isDarkMode}>
                  <ToolbarButton $isDark={isDarkMode} onClick={insertImageInPreview} title="Insert Image">
                    🖼️ Image
                  </ToolbarButton>
                  <ToolbarButton $isDark={isDarkMode} onClick={insertImageLinkInPreview} title="Insert Image from URL">
                    🔗 Image Link
                  </ToolbarButton>
                  <ToolbarButton $isDark={isDarkMode} onClick={showImageRearrangeDialog} title="Rearrange Images">
                    📷 Image Reoder
                  </ToolbarButton>
                  <ToolbarButton $isDark={isDarkMode} onClick={insertVideoInPreview} title="Insert Video">
                    🎥 Video
                  </ToolbarButton>
                  <ToolbarButton $isDark={isDarkMode} onClick={insertVideoLinkInPreview} title="Insert Video from URL">
                    🔗 Video Link
                  </ToolbarButton>
                  <ToolbarButton $isDark={isDarkMode} onClick={showVideoRearrangeDialog} title="Rearrange Videos">
                    🎬 Video Reorder
                  </ToolbarButton>
                  <FileSizeInfo>Max file size: 10MB</FileSizeInfo>
                </ToolbarGroup>

                <ToolbarGroup $isDark={isDarkMode}>
                  <ToolbarButton $isDark={isDarkMode} onClick={() => {
                    document.execCommand('undo');
                    updateHtmlFromPreview();
                  }} title="Undo (Ctrl+Z)">
                    ↶ Undo
                  </ToolbarButton>
                  <ToolbarButton $isDark={isDarkMode} onClick={() => {
                    document.execCommand('redo');
                    updateHtmlFromPreview();
                  }} title="Redo (Ctrl+Y)">
                    ↷ Redo
                  </ToolbarButton>
                  <ToolbarButton 
                    $isDark={isDarkMode}
                    onClick={() => {
                      setShowClearModal(true);
                    }}
                    title="Clear All Content"
                  >
                    🧹 Clear All
                  </ToolbarButton>
                </ToolbarGroup>

              </EditorToolbar>
              <PreviewContainer $isFullscreen={isPreviewFullscreen} $isDark={isDarkMode}>
                <style dangerouslySetInnerHTML={{ __html: `
                  ${extractCssFromHtml(htmlCode)}
                  /* Enhanced cursor placement styles */
                  .blog-preview-content {
                    min-height: 500px;
                    outline: none;
                    position: relative;
                  }
                  .blog-preview-content:empty::before {
                    content: 'Click here to start typing...';
                    color: #9ca3af;
                    font-style: italic;
                  }
                  .blog-preview-content * {
                    min-height: 1em;
                  }
                  .blog-preview-content div:empty::before,
                  .blog-preview-content p:empty::before,
                  .blog-preview-content span:empty::before {
                    content: '\\200B';
                  }
                  /* Editor component container styles */
                  .editor-component-container {
                    position: relative;
                    margin: 1rem 0;
                  }
                  .editor-component-container:hover .delete-button {
                    display: block !important;
                  }
                  [class*="editor_blog_"] {
                    cursor: text;
                    position: relative;
                  }
                  [class*="editor_blog_"]:hover {
                    outline: 2px dashed rgba(59, 130, 246, 0.3);
                    outline-offset: 4px;
                  }
                ` }} />
                <div 
                  className="blog-preview-content"
                  ref={(el) => {
                    setPreviewContentRef(el);
                    if (el && !isUpdatingFromHtmlRef.current) {
                      // Set initial content from HTML if available
                      if (el.innerHTML === '' && htmlCode.trim() !== '') {
                        el.innerHTML = extractHtmlContent(htmlCode);
                      }
                    }
                  }}
                  contentEditable={true}
                  suppressContentEditableWarning={true}
                  onClick={(e) => {
                    const clickedElement = e.target as HTMLElement;
                    const target = e.currentTarget;
                    
                    // Check if element has editor_blog_ class prefix
                    const hasEditorClass = (element: HTMLElement) => {
                      return Array.from(element.classList).some(className => 
                        className.startsWith('editor_blog_')
                      );
                    };
                    
                    // Find the nearest element with editor_blog_ class
                    let editableComponent = clickedElement;
                    while (editableComponent && editableComponent !== target) {
                      if (hasEditorClass(editableComponent)) {
                        break;
                      }
                      editableComponent = editableComponent.parentElement as HTMLElement;
                    }
                    
                    // Make editor_blog_ elements editable
                    if (editableComponent && hasEditorClass(editableComponent)) {
                      editableComponent.focus();
                      
                      // Add a blur handler that only updates styles
                      const handleComponentBlur = () => {
                        updateHtmlFromPreview();
                        editableComponent.removeEventListener('blur', handleComponentBlur);
                      };
                      editableComponent.addEventListener('blur', handleComponentBlur);
                    }
                    
                    // Allow clicking anywhere to place cursor and start typing
                    target.focus();
                    
                    // If clicking on empty area, ensure cursor is placed
                    if (target.innerHTML.trim() === '' || target.innerHTML === '<br>') {
                      const range = document.createRange();
                      const sel = window.getSelection();
                      range.selectNodeContents(target);
                      range.collapse(false);
                      sel?.removeAllRanges();
                      sel?.addRange(range);
                    }
                  }}
                  onKeyDown={(e) => {
                    const selection = window.getSelection();
                    
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      
                      // Insert a new line without formatting
                      if (selection && selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        
                        // Create a new paragraph
                        const br = document.createElement('br');
                        const br2 = document.createElement('br');
                        
                        // Insert the line breaks
                        range.deleteContents();
                        range.insertNode(br2);
                        range.insertNode(br);
                        
                        // Move cursor after the line breaks
                        range.setStartAfter(br2);
                        range.setEndAfter(br2);
                        selection.removeAllRanges();
                        selection.addRange(range);
                        
                        // Clear any active formatting
                        document.execCommand('removeFormat');
                        
                        // Reset active formats
                        setActiveFormats({
                          bold: false,
                          italic: false,
                          underline: false,
                          strike: false,
                          subscript: false,
                          superscript: false
                        });
                        
                        updateHtmlFromPreview();
                      }
                    } else if (!e.ctrlKey && !e.metaKey && e.key.length === 1) {
                      // For regular typing, ensure no formatting is applied if nothing is selected
                      if (selection && selection.isCollapsed) {
                        // Clear any active formatting states before typing
                        const formatCommands = ['bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript'];
                        formatCommands.forEach(cmd => {
                          if (document.queryCommandState(cmd)) {
                            document.execCommand(cmd, false);
                          }
                        });
                      }
                    }
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Handle file drops
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      const maxSize = 10 * 1024 * 1024; // 10MB limit
                      
                      for (const file of Array.from(files)) {
                        if (file.type.startsWith('image/')) {
                          // Check file size
                          if (file.size > maxSize) {
                            const warningMsg = `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
                            setFileSizeWarnings(prev => [...prev, warningMsg]);
                            toast.error(`File too large: ${file.name} exceeds 10MB limit`);
                            setTimeout(() => {
                              setFileSizeWarnings(prev => prev.filter(f => f !== warningMsg));
                            }, 5000);
                            continue;
                          }
                          
                          // Create temporary container with loading indicator
                          const tempContainer = document.createElement('div');
                          tempContainer.className = generateImageClassName(file.name);
                          tempContainer.style.cssText = `
                            position: relative;
                            margin: 1rem 0;
                            display: block;
                            max-width: 100%;
                            clear: both;
                            background: #f0f0f0;
                            border: 2px dashed #ccc;
                            border-radius: 8px;
                            padding: 20px;
                            text-align: center;
                          `;
                          
                          const progressId = `progress-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}`;
                          const progressTextId = `progress-text-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}`;
                          tempContainer.innerHTML = `
                            <div style="font-size: 14px; color: #666; margin-bottom: 10px;">Uploading ${file.name}...</div>
                            <div style="width: 100%; max-width: 300px; height: 20px; background: #e0e0e0; border-radius: 10px; overflow: hidden; margin: 0 auto;">
                              <div id="${progressId}" style="width: 0%; height: 100%; background: #4CAF50; transition: width 0.3s;"></div>
                            </div>
                            <div id="${progressTextId}" style="font-size: 12px; color: #999; margin-top: 5px;">0%</div>
                          `;
                          
                          // Insert at drop position
                          const range = document.caretRangeFromPoint(e.clientX, e.clientY);
                          if (range && previewContentRef) {
                            try {
                              range.insertNode(tempContainer);
                            } catch {
                              previewContentRef.appendChild(tempContainer);
                            }
                          } else if (previewContentRef) {
                            previewContentRef.appendChild(tempContainer);
                          }
                          
                          try {
                            // Upload the file
                            const uploadedUrl = await uploadFile(file, 'image');
                            
                            if (uploadedUrl) {
                              // Track uploaded image URL
                              setUploadedImages(prev => [...prev, uploadedUrl]);
                              
                              // Create actual image container
                              const container = document.createElement('div');
                              container.className = generateImageClassName(file.name);
                              container.style.cssText = `
                                position: relative;
                                margin: 1rem 0;
                                display: block;
                                max-width: 100%;
                                clear: both;
                              `;
                              
                              const img = document.createElement('img');
                              img.src = uploadedUrl;
                              img.alt = file.name;
                              img.style.cssText = `
                                max-width: 100%;
                                height: auto;
                                display: block;
                                cursor: grab;
                                transition: transform 0.2s ease, box-shadow 0.2s ease;
                              `;
                              img.draggable = true;
                              
                              // Add drag handlers using the helper function
                              setupImageDragHandlersForElement(container, img);
                              
                              container.appendChild(img);
                              
                              // Add delete button
                              const deleteBtn = createDeleteButton(container);
                              container.appendChild(deleteBtn);
                              
                              // Add delete button hover functionality
                              addDeleteButtonHover(container, deleteBtn);
                              
                              // Replace the temporary container with the actual image
                              if (tempContainer.parentNode) {
                                tempContainer.parentNode.replaceChild(container, tempContainer);
                              } else if (previewContentRef) {
                                previewContentRef.appendChild(container);
                              }
                              
                              // Add a line break after the image for proper separation
                              const br = document.createElement('br');
                              if (container.parentNode) {
                                container.parentNode.insertBefore(br, container.nextSibling);
                              }
                              
                              // Update HTML
                              updateHtmlFromPreview();
                              
                              toast.success(`Image "${file.name}" uploaded successfully`);
                            } else {
                              throw new Error('Upload failed: No URL returned');
                            }
                          } catch (error: any) {
                            console.error('Error uploading image:', error);
                            // Remove the temporary container
                            if (tempContainer.parentNode) {
                              tempContainer.remove();
                            }
                            
                            // Show error toast
                            const errorMessage = `Failed to upload ${file.name}`;
                            setUploadErrors(prev => {
                              const newErrors = [...prev];
                              if (!newErrors.includes(errorMessage)) {
                                newErrors.push(errorMessage);
                              }
                              return newErrors;
                            });
                            toast.error(errorMessage);
                            
                            setTimeout(() => {
                              setUploadErrors(prev => prev.filter(msg => msg !== errorMessage));
                            }, 5000);
                          }
                        } else if (file.type.startsWith('video/')) {
                          // Handle video files similarly
                          toast.info('Video upload from drag-and-drop is supported. Please use the video upload button.');
                        }
                      }
                    }
                    
                    // Handle dragged elements (for reordering)
                    const dragType = e.dataTransfer.getData('text/plain');
                    if (dragType === 'image-drag' && window.draggedElement) {
                      // This drop is handled by the image containers themselves
                      // Just clear the dragged element reference
                      window.draggedElement = undefined;
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'copy';
                  }}
                  onInput={(e) => {
                    // Skip if we're updating from HTML to prevent loops
                    if (isUpdatingFromHtmlRef.current) return;
                    
                    let newContent = e.currentTarget.innerHTML;
                    
                    // Process any editor_blog_ elements that might have been added
                    const editorElements = e.currentTarget.querySelectorAll('[class*="editor_blog_"]');
                    editorElements.forEach(element => {
                      if (element instanceof HTMLElement && !element.hasAttribute('contenteditable')) {
                                      }
                    });
                    
                    // Save cursor position
                    saveCursorPosition();
                    
                    // Clear existing timeout
                    if (updateTimeoutRef.current) {
                      clearTimeout(updateTimeoutRef.current);
                    }
                    
                    // Debounce the update
                    updateTimeoutRef.current = setTimeout(() => {
                      const extractedCss = extractCssFromHtml(htmlCode);
                      const fullHtml = extractedCss ? 
                        `<style>\n${extractedCss}\n</style>\n${newContent}` : 
                        newContent;
                      setHtmlCode(fullHtml);
                      
                      // After updating, restore cursor position
                      setTimeout(() => {
                        restoreCursorPosition();
                      }, 10);
                    }, 500); // Increased debounce time for better stability
                  }}
                  onPaste={(e) => {
                    // Process pasted HTML content
                    e.preventDefault();
                    const clipboardData = e.clipboardData;
                    const pastedHtml = clipboardData.getData('text/html') || clipboardData.getData('text/plain');
                    
                    // Process the pasted HTML to handle editor_blog_ classes
                    const processedHtml = processPastedHtml(pastedHtml);
                    
                    // Insert at cursor position
                    const selection = window.getSelection();
                    if (selection && selection.rangeCount > 0) {
                      const range = selection.getRangeAt(0);
                      range.deleteContents();
                      const tempDiv = document.createElement('div');
                      tempDiv.innerHTML = processedHtml;
                      const fragment = document.createDocumentFragment();
                      while (tempDiv.firstChild) {
                        fragment.appendChild(tempDiv.firstChild);
                      }
                      range.insertNode(fragment);
                    }
                    
                    // Re-attach handlers for delete buttons
                    setTimeout(() => {
                      if (!e.currentTarget) return;
                      
                      const deleteButtons = e.currentTarget.querySelectorAll('.delete-button');
                      deleteButtons.forEach(btn => {
                        btn.addEventListener('click', (event) => {
                          event.stopPropagation();
                          const container = (event.target as HTMLElement).parentElement;
                          container?.remove();
                          updateHtmlFromPreview();
                        });
                      });
                      
                      // Make editor_blog_ elements editable
                      const editorElements = e.currentTarget.querySelectorAll('[class*="editor_blog_"]');
                      editorElements.forEach(element => {
                        if (element instanceof HTMLElement) {
                          // Elements are already editable
                        }
                      });
                      
                      updateHtmlFromPreview();
                    }, 10);
                  }}
                  onFocus={(e) => {
                    // Ensure cursor can be placed anywhere
                    const target = e.currentTarget;
                    if (target.innerHTML === '' || target.innerHTML === '<br>') {
                      // Add a zero-width space to allow cursor placement
                      target.innerHTML = '​';
                      const range = document.createRange();
                      const sel = window.getSelection();
                      range.selectNodeContents(target);
                      range.collapse(false);
                      sel?.removeAllRanges();
                      sel?.addRange(range);
                    }
                  }}
                  onBlur={(e) => {
                    // Handle blog_editor_abitm elements losing focus
                    const relatedTarget = e.relatedTarget as HTMLElement | null;
                    const currentTarget = e.currentTarget;
                    
                    // Check if focus is moving outside the preview content
                    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
                      // Make all blog_editor_abitm elements non-editable
                      const editableComponents = currentTarget.querySelectorAll('.blog_editor_abitm[contenteditable="true"]');
                      editableComponents.forEach((element) => {
                        if (element instanceof HTMLElement) {
                          element.contentEditable = 'false';
                        }
                      });
                    }
                    
                    const newContent = e.currentTarget.innerHTML;
                    const extractedCss = extractCssFromHtml(htmlCode);
                    const fullHtml = extractedCss ? 
                      `<style>\n${extractedCss}\n</style>\n${newContent}` : 
                      newContent;
                    setHtmlCode(fullHtml);
                  }}
                  style={{ outline: 'none' }}
                />
              </PreviewContainer>
            </>
          </LeftPane>
        )}
        
        {(viewMode as ViewMode) === 'dualFullscreen' && (
          <ResizableDivider $isDark={isDarkMode} onMouseDown={handleMouseDown} />
        )}
        
        {((viewMode as ViewMode) !== 'preview' || (viewMode as ViewMode) === 'dualFullscreen') && (
          <RightPane 
            $isFullscreen={isHtmlFullscreen && (viewMode as ViewMode) !== 'dualFullscreen'} 
            $isHidden={isPreviewFullscreen && (viewMode as ViewMode) !== 'dualFullscreen'}
            width={(viewMode as ViewMode) === 'dualFullscreen' ? rightPaneWidth : undefined}
            $isDark={isDarkMode}
          >
          <PaneHeader $isDark={isDarkMode}>
            <span>📝 HTML Source</span>
            {(viewMode as ViewMode) !== 'dualFullscreen' && (
              <FullscreenButton $isDark={isDarkMode} onClick={() => setIsHtmlFullscreen(!isHtmlFullscreen)}>
                {isHtmlFullscreen ? '🔲 Exit Fullscreen' : '🔳 Fullscreen'}
              </FullscreenButton>
            )}
          </PaneHeader>
          <HTMLEditorContainer $isFullscreen={isHtmlFullscreen} $isDark={isDarkMode}>
            <HTMLToolbar data-editor-ui="true">
              <HTMLToolbarButton $isDark={isDarkMode} onClick={formatHtml}>
                🎨 Format HTML
              </HTMLToolbarButton>
              <HTMLToolbarButton $isDark={isDarkMode} onClick={() => setHtmlCode('')}>
                🗑️ Clear
              </HTMLToolbarButton>
              <HTMLToolbarButton $isDark={isDarkMode} onClick={async (event) => {
                try {
                  // Check if clipboard API is available
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(htmlCode);
                  } else {
                    // Fallback method using execCommand
                    const textArea = document.createElement('textarea');
                    textArea.value = htmlCode;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-999999px';
                    textArea.style.top = '-999999px';
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    
                    try {
                      document.execCommand('copy');
                    } catch (err) {
                      console.error('Fallback copy failed:', err);
                      throw new Error('Copy failed');
                    } finally {
                      document.body.removeChild(textArea);
                    }
                  }
                  
                  // Show temporary success feedback
                  const button = event?.currentTarget as HTMLButtonElement;
                  if (button) {
                    const originalText = button.textContent;
                    button.textContent = '✅ Copied!';
                    setTimeout(() => {
                      button.textContent = originalText;
                    }, 1500);
                  }
                } catch (err) {
                  console.error('Failed to copy text: ', err);
                  alert('Failed to copy to clipboard. Please try again.');
                }
              }}>
                📋 Copy
              </HTMLToolbarButton>
              <span style={{ 
                marginLeft: 'auto', 
                fontSize: '11px', 
                color: isDarkMode ? theme.dark.textMuted : theme.light.textMuted 
              }}>
                Lines: {htmlCode.split('\n').length} | Chars: {htmlCode.length}
              </span>
            </HTMLToolbar>
            <Editor
              height={isHtmlFullscreen ? 'calc(100vh - 140px)' : 'calc(100% - 60px)'}
              defaultLanguage="html"
              value={htmlCode}
              onChange={handleHtmlChange}
              theme={isDarkMode ? 'vs-dark' : 'vs'}
              onMount={(editor) => {
                monacoEditorRef.current = editor;
                
                // Prevent drag and drop into the editor
                const editorDom = editor.getDomNode();
                if (editorDom) {
                  editorDom.addEventListener('drop', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  });
                  editorDom.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  });
                }
                
                // Set up a single ResizeObserver
                if (!resizeObserverRef.current) {
                  resizeObserverRef.current = new ResizeObserver(() => {
                    // Use requestIdleCallback if available, otherwise requestAnimationFrame
                    const callback = () => {
                      if (monacoEditorRef.current) {
                        monacoEditorRef.current.layout();
                      }
                    };
                    
                    if ('requestIdleCallback' in window) {
                      (window as any).requestIdleCallback(callback);
                    } else {
                      requestAnimationFrame(callback);
                    }
                  });
                }
                
                // Observe the container
                const container = editor.getContainerDomNode();
                if (container && container.parentElement) {
                  resizeObserverRef.current.observe(container.parentElement);
                }
                
                // Initial layout
                setTimeout(() => {
                  editor.layout();
                }, 100);
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 16,
                lineNumbers: 'on',
                wordWrap: 'on',
                automaticLayout: false, // Disable automatic layout to prevent conflicts
                scrollBeyondLastLine: false,
                theme: 'vs-light',
                formatOnPaste: true,
                formatOnType: true,
                autoIndent: 'full',
                tabSize: 2,
                insertSpaces: true,
                renderLineHighlight: 'all',
                renderWhitespace: 'boundary',
                showFoldingControls: 'always',
                folding: true,
                foldingStrategy: 'indentation',
                bracketPairColorization: { enabled: true },
                guides: {
                  bracketPairs: true,
                  indentation: true
                },
                lineHeight: 24,
                padding: { top: 16, bottom: 16 }
              }}
            />
          </HTMLEditorContainer>
          </RightPane>
        )}
      </DualPaneContainer>

      
      <ModalOverlay $isOpen={showClearModal} onClick={() => setShowClearModal(false)}>
        <ModalContent onClick={(e) => e.stopPropagation()}>
          <ModalTitle>Clear All Content</ModalTitle>
          <ModalText>
            This will clear all the modifications done till now. Are you sure you want to continue?
          </ModalText>
          <ModalButtons>
            <ModalButton onClick={() => setShowClearModal(false)}>
              Cancel
            </ModalButton>
            <ModalButton 
              $variant="danger"
              onClick={() => {
                if (previewContentRef) {
                  previewContentRef.innerHTML = '';
                  setHtmlCode('');
                  setPost(prev => ({ ...prev, content: '' }));
                }
                setShowClearModal(false);
              }}
            >
              Clear
            </ModalButton>
          </ModalButtons>
        </ModalContent>
      </ModalOverlay>

      {/* Text Color Picker */}
      {showTextColorPicker && (
        <div style={{
          position: 'absolute',
          top: '235px',
          left: '238px',
          zIndex: 1000
        }}>
          <ColorPicker
            color={selectedTextColor}
            title="Select Text Color"
            onApply={(color) => {
              setSelectedTextColor(color);
              if (savedSelection && previewContentRef) {
                const selection = window.getSelection();
                if (selection) {
                  selection.removeAllRanges();
                  selection.addRange(savedSelection);
                  document.execCommand('styleWithCSS', false, 'true');
                  document.execCommand('foreColor', false, color);
                }
              }
              updateHtmlFromPreview();
            }}
            onClose={() => setShowTextColorPicker(false)}
          />
        </div>
      )}

      {/* Background Color Picker */}
      {showBgColorPicker && (
        <div style={{
          position: 'absolute',
          top: '235px',
          left: '238px',
          zIndex: 1000
        }}>
          <ColorPicker
            color={selectedBgColor}
            title="Select Background Color"
            onApply={(color) => {
              setSelectedBgColor(color);
              if (savedSelection && previewContentRef) {
                const selection = window.getSelection();
                if (selection) {
                  selection.removeAllRanges();
                  selection.addRange(savedSelection);
                  document.execCommand('styleWithCSS', false, 'true');
                  document.execCommand('hiliteColor', false, color);
                }
              }
              updateHtmlFromPreview();
            }}
            onClose={() => setShowBgColorPicker(false)}
          />
        </div>
      )}
      
      {/* File Size Warnings */}
      {fileSizeWarnings.map((warning, index) => (
        <FileSizeWarning key={`${warning}-${index}`} style={{ top: `${20 + index * 60}px` }}>
          <span>⚠️</span>
          <span>File too large: {warning}</span>
        </FileSizeWarning>
      ))}
      
      {/* Upload Error Toasts */}
      {uploadErrors.map((error, index) => (
        <UploadErrorToast key={`${error}-${index}`} style={{ top: `${20 + fileSizeWarnings.length * 60 + index * 60}px` }}>
          <span>❌</span>
          <span>{error}</span>
        </UploadErrorToast>
      ))}
      
      {/* Preview Overlay Fullscreen for Dual Mode */}
      {isPreviewOverlayFullscreen && (viewMode as ViewMode) === 'dualFullscreen' && (
        <PreviewOverlayFullscreen $isOpen={true} $isDark={isDarkMode}>
          <ExitOverlayFullscreenButton $isDark={isDarkMode} onClick={() => setIsPreviewOverlayFullscreen(false)}>
            <span>🔲</span>
            <span>Exit Fullscreen</span>
          </ExitOverlayFullscreenButton>
          <div style={{
            padding: '20px',
            maxWidth: '100%',
            margin: '0 auto',
            paddingTop: '80px'
          }}>
            <EditorToolbar $isFullscreen={true} $isDark={isDarkMode}>
              <ToolbarGroup $isDark={isDarkMode}>
                <ToolbarSelect
                  $isDark={isDarkMode}
                  onChange={(e) => {
                    if (e.target.value === 'paragraph') {
                      insertParagraphInPreview();
                    } else {
                      const level = parseInt(e.target.value.replace('h', ''));
                      addHeadingInPreview(level);
                    }
                  }}
                  title="Insert Paragraph or Heading"
                >
                  <option value="">Insert Element</option>
                  <option value="paragraph">Paragraph</option>
                  <option value="h1">Heading 1</option>
                  <option value="h2">Heading 2</option>
                  <option value="h3">Heading 3</option>
                  <option value="h4">Heading 4</option>
                  <option value="h5">Heading 5</option>
                  <option value="h6">Heading 6</option>
                </ToolbarSelect>
                
                <ToolbarSelect
                  $isDark={isDarkMode}
                  onChange={(e) => {
                    if (e.target.value) {
                      const selection = window.getSelection();
                      if (selection && selection.rangeCount > 0) {
                        document.execCommand('fontName', false, e.target.value);
                        updateHtmlFromPreview();
                      }
                    }
                  }}
                  title="Font Family"
                >
                  <option value="">Font Family</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="Helvetica, sans-serif">Helvetica</option>
                  <option value="Times New Roman, serif">Times New Roman</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="Verdana, sans-serif">Verdana</option>
                  <option value="Courier New, monospace">Courier New</option>
                  <option value="Impact, sans-serif">Impact</option>
                  <option value="Comic Sans MS, cursive">Comic Sans MS</option>
                </ToolbarSelect>
                
                <ToolbarSelect
                  $isDark={isDarkMode}
                  onChange={(e) => {
                    if (e.target.value) {
                      const selection = window.getSelection();
                      if (selection && selection.rangeCount > 0) {
                        document.execCommand('fontSize', false, e.target.value);
                        updateHtmlFromPreview();
                      }
                    }
                  }}
                  title="Font Size"
                >
                  <option value="">Font Size</option>
                  <option value="1">8px</option>
                  <option value="2">10px</option>
                  <option value="3">12px</option>
                  <option value="4">14px</option>
                  <option value="5">18px</option>
                  <option value="6">24px</option>
                  <option value="7">36px</option>
                </ToolbarSelect>
                
                <ToolbarButton
                  onClick={() => {
                    const selection = window.getSelection();
                    if (selection && selection.rangeCount > 0) {
                      setActiveFormats(prev => ({ ...prev, bold: !prev.bold }));
                      document.execCommand('bold');
                      updateHtmlFromPreview();
                    }
                  }}
                  title="Bold"
                  $active={activeFormats.bold}
                >
                  <strong>B</strong>
                </ToolbarButton>
                
                <ToolbarButton
                  onClick={() => {
                    const selection = window.getSelection();
                    if (selection && selection.rangeCount > 0) {
                      setActiveFormats(prev => ({ ...prev, italic: !prev.italic }));
                      document.execCommand('italic');
                      updateHtmlFromPreview();
                    }
                  }}
                  title="Italic"
                  $active={activeFormats.italic}
                >
                  <em>I</em>
                </ToolbarButton>
                
                <ToolbarButton
                  onClick={() => {
                    const selection = window.getSelection();
                    if (selection && selection.rangeCount > 0) {
                      setActiveFormats(prev => ({ ...prev, underline: !prev.underline }));
                      document.execCommand('underline');
                      updateHtmlFromPreview();
                    }
                  }}
                  title="Underline"
                  $active={activeFormats.underline}
                >
                  <u>U</u>
                </ToolbarButton>
                
                <ToolbarButton
                  onClick={() => {
                    const selection = window.getSelection();
                    if (selection && selection.rangeCount > 0) {
                      setActiveFormats(prev => ({ ...prev, strike: !prev.strike }));
                      document.execCommand('strikeThrough');
                      updateHtmlFromPreview();
                    }
                  }}
                  title="Strikethrough"
                  $active={activeFormats.strike}
                >
                  <s>S</s>
                </ToolbarButton>
              </ToolbarGroup>
              
              <ToolbarGroup>
                <ToolbarButton
                  onClick={() => insertCallToActionInPreview()}
                  title="Add Call to Action"
                >
                  📢 CTA
                </ToolbarButton>
                
                <ToolbarButton
                  onClick={() => insertHighlightBoxInPreview()}
                  title="Add Highlight"
                >
                  🌟 Highlight
                </ToolbarButton>
                
                <ToolbarButton
                  onClick={() => insertBlockquoteInPreview()}
                  title="Add Quote"
                >
                  💬 Quote  
                </ToolbarButton>
                
                <ToolbarButton
                  onClick={() => insertCallToActionInPreview()}
                  title="Add Button"
                >
                  🔘 Button
                </ToolbarButton>
                
                <ToolbarButton
                  onClick={() => insertHighlightBoxInPreview()}
                  title="Add Alert"
                >
                  ⚠️ Alert
                </ToolbarButton>
                
                <ToolbarButton
                  onClick={() => insertCodeBlockInPreview()}
                  title="Add Code Block"
                >
                  💻 Code
                </ToolbarButton>
              </ToolbarGroup>
            </EditorToolbar>
            <style dangerouslySetInnerHTML={{ __html: `
              ${extractCssFromHtml(htmlCode)}
              .preview-overlay-content {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                width: 100%;
                min-height: calc(100vh - 200px);
                padding: 20px;
                box-sizing: border-box;
                outline: none;
                position: relative;
              }
              .preview-overlay-content:empty::before {
                content: 'Click here to start typing...';
                color: #9ca3af;
                font-style: italic;
              }
              .preview-overlay-content * {
                min-height: 1em;
              }
              .preview-overlay-content div:empty::before,
              .preview-overlay-content p:empty::before,
              .preview-overlay-content span:empty::before {
                content: '\\200B';
              }
              [class*="editor_blog_"] {
                cursor: text;
                position: relative;
              }
              [class*="editor_blog_"]:hover {
                outline: 2px dashed rgba(59, 130, 246, 0.3);
                outline-offset: 4px;
              }
              /* Editor component container styles */
              .editor-component-container {
                position: relative;
                margin: 1rem 0;
              }
              .editor-component-container:hover .delete-button {
                display: block !important;
              }
            ` }} />
            <div
              className="preview-overlay-content"
              contentEditable={true}
              suppressContentEditableWarning={true}
              dangerouslySetInnerHTML={{ __html: previewContentRef?.innerHTML || '' }}
              onInput={(e) => {
                // Sync changes back to the main preview
                if (previewContentRef) {
                  previewContentRef.innerHTML = e.currentTarget.innerHTML;
                  updateHtmlFromPreview();
                }
              }}
              onFocus={(e) => {
                // Ensure cursor can be placed anywhere
                const target = e.currentTarget;
                if (target.innerHTML === '' || target.innerHTML === '<br>') {
                  target.innerHTML = '​';
                  const range = document.createRange();
                  const sel = window.getSelection();
                  range.selectNodeContents(target);
                  range.collapse(false);
                  sel?.removeAllRanges();
                  sel?.addRange(range);
                }
              }}
            />
          </div>
        </PreviewOverlayFullscreen>
      )}
    </EditorContainer>
  );
};

export default BlogEditor;