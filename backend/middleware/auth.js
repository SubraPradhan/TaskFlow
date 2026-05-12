const jwt = require('jsonwebtoken');
const { prepare } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-secret-key-change-in-production';

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    req.user = user;
    next();
  } catch { return res.status(401).json({ error: 'Invalid token' }); }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

const requireProjectAccess = (req, res, next) => {
  const projectId = req.params.projectId || req.body.project_id;
  if (!projectId) return next();
  const membership = prepare('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, req.user.id);
  const project = prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!membership && req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
  req.project = project;
  req.membership = membership;
  next();
};

const requireProjectAdmin = (req, res, next) => {
  if (req.user.role === 'admin') return next();
  if (!req.membership || req.membership.role !== 'admin') return res.status(403).json({ error: 'Project admin access required' });
  next();
};

module.exports = { auth, requireAdmin, requireProjectAccess, requireProjectAdmin, JWT_SECRET };
