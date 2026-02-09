const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3456;
const DIST_DIR = path.join(__dirname, 'dist');

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Handle /programs page
app.get('/programs', (req, res) => {
  const filePath = path.join(DIST_DIR, 'programs.html');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/html');
    res.send(fs.readFileSync(filePath));
  } else {
    res.status(404).send('Programs page not found');
  }
});

// Handle /program/:owner/:repo routes (with slashes)
app.get('/program/:owner/:repo', (req, res) => {
  const owner = req.params.owner;
  const repo = req.params.repo;
  const fullPath = `${owner}/${repo}`;
  const encodedId = encodeURIComponent(fullPath);
  const filePath = path.join(DIST_DIR, 'program', `${encodedId}.html`);
  
  console.log(`Looking for program: ${fullPath} -> ${encodedId}.html`);
  console.log(`Full path: ${filePath}`);
  
  if (fs.existsSync(filePath)) {
    console.log(`Found! Serving: ${filePath}`);
    res.setHeader('Content-Type', 'text/html');
    res.send(fs.readFileSync(filePath));
  } else {
    console.error(`File not found: ${filePath}`);
    const notFoundPath = path.join(DIST_DIR, '404.html');
    if (fs.existsSync(notFoundPath)) {
      res.setHeader('Content-Type', 'text/html');
      res.status(404).send(fs.readFileSync(notFoundPath));
    } else {
      res.status(404).send(`Program not found: ${fullPath}`);
    }
  }
});

// Handle /program/:id routes for encoded paths
app.get('/program/:id', (req, res) => {
  const id = req.params.id;
  // URL encode the id to match the file name
  const encodedId = encodeURIComponent(id);
  const filePath = path.join(DIST_DIR, 'program', `${encodedId}.html`);
  
  console.log(`Looking for program: ${id} -> ${encodedId}.html`);
  
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'text/html');
    res.send(fs.readFileSync(filePath));
  } else {
    console.error(`File not found: ${filePath}`);
    const notFoundPath = path.join(DIST_DIR, '404.html');
    if (fs.existsSync(notFoundPath)) {
      res.setHeader('Content-Type', 'text/html');
      res.status(404).send(fs.readFileSync(notFoundPath));
    } else {
      res.status(404).send(`Program not found: ${id}`);
    }
  }
});

// Serve static files from dist directory
app.use(express.static(DIST_DIR));

// Handle client-side routing for other routes
app.get(/.*/, (req, res) => {
  const cleanPath = req.path.replace(/^\//, '').replace(/\/$/, '');
  const htmlPath = path.join(DIST_DIR, `${cleanPath}.html`);
  
  if (cleanPath && fs.existsSync(htmlPath)) {
    res.setHeader('Content-Type', 'text/html');
    res.send(fs.readFileSync(htmlPath));
  } else {
    const indexPath = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html');
      res.send(fs.readFileSync(indexPath));
    } else {
      res.status(404).send('Not found');
    }
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${DIST_DIR}`);
  console.log(`🔧 Health check: http://localhost:${PORT}/health`);
});
