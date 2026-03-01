import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BlogEditor from './components/BlogEditor';
import TinyMCEEditor from './components/TinyMCEEditor';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<BlogEditor />} />
          <Route path="/tiny_editor" element={<TinyMCEEditor />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
