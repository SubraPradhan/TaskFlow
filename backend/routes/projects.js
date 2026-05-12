const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { prepare } = require('../database');
const { auth, requireProjectAccess, requireProjectAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res) => {
  let projects;
  if (req.user.role === 'admin') {
    projects = prepare(`SELECT p.*, u.name as owner_name,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
      FROM projects p JOIN users u ON p.owner_id = u.id ORDER BY p.created_at DESC`).all();
  } else {
    projects = prepare(`SELECT p.*, u.name as owner_name, pm.role as my_role,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id) as member_count
      FROM projects p JOIN users u ON p.owner_id = u.id
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      ORDER BY p.created_at DESC`).all(req.user.id);
  }
  res.json(projects);
});

router.post('/', auth, (req, res) => {
  const { name, description, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name is required' });
  const id = uuidv4();
  prepare('INSERT INTO projects (id, name, description, color, owner_id) VALUES (?, ?, ?, ?, ?)').run(id, name, description || '', color || '#6366f1', req.user.id);
  prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(id, req.user.id, 'admin');
  const project = prepare('SELECT * FROM projects WHERE id = ?').get(id);
  res.status(201).json(project);
});

router.get('/:projectId', auth, requireProjectAccess, (req, res) => {
  const project = prepare(`SELECT p.*, u.name as owner_name FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?`).get(req.params.projectId);
  const members = prepare(`SELECT u.id, u.name, u.email, u.avatar, u.role as system_role, pm.role as project_role, pm.joined_at
    FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE pm.project_id = ? ORDER BY u.name`).all(req.params.projectId);
  const stats = prepare(`SELECT COUNT(*) as total,
    SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as done,
    SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) as in_progress,
    SUM(CASE WHEN status='todo' THEN 1 ELSE 0 END) as todo,
    SUM(CASE WHEN status='review' THEN 1 ELSE 0 END) as review,
    SUM(CASE WHEN due_date < date('now') AND status != 'done' THEN 1 ELSE 0 END) as overdue
    FROM tasks WHERE project_id = ?`).get(req.params.projectId);
  res.json({ ...project, members, stats });
});

router.put('/:projectId', auth, requireProjectAccess, requireProjectAdmin, (req, res) => {
  const { name, description, color } = req.body;
  prepare('UPDATE projects SET name = ?, description = ?, color = ? WHERE id = ?').run(name, description, color, req.params.projectId);
  res.json(prepare('SELECT * FROM projects WHERE id = ?').get(req.params.projectId));
});

router.delete('/:projectId', auth, requireProjectAccess, requireProjectAdmin, (req, res) => {
  prepare('DELETE FROM tasks WHERE project_id = ?').run(req.params.projectId);
  prepare('DELETE FROM project_members WHERE project_id = ?').run(req.params.projectId);
  prepare('DELETE FROM projects WHERE id = ?').run(req.params.projectId);
  res.json({ message: 'Project deleted' });
});

router.post('/:projectId/members', auth, requireProjectAccess, requireProjectAdmin, (req, res) => {
  const { user_id, role } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });
  const user = prepare('SELECT id FROM users WHERE id = ?').get(user_id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const existing = prepare('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.projectId, user_id);
  if (existing) return res.status(409).json({ error: 'User already a member' });
  prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(req.params.projectId, user_id, role || 'member');
  res.status(201).json({ message: 'Member added' });
});

router.delete('/:projectId/members/:userId', auth, requireProjectAccess, requireProjectAdmin, (req, res) => {
  prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(req.params.projectId, req.params.userId);
  res.json({ message: 'Member removed' });
});

module.exports = router;
