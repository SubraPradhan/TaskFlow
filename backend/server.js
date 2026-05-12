const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./database');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json());

initDb().then(() => {
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/projects', require('./routes/projects'));
  app.use('/api', require('./routes/tasks'));
  app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/dist')));
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/dist/index.html')));
  }

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`TaskFlow server running on port ${PORT}`));
}).catch(err => { console.error('DB init failed:', err); process.exit(1); });
