const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { prepare } = require('../database');
const { auth, requireProjectAccess } = require('../middleware/auth');

const router = express.Router();

router.get('/projects/:projectId/tasks', auth, requireProjectAccess, (req, res) => {
  const { status, priority, assignee_id } = req.query;
  let sql = `SELECT t.*, u1.name as assignee_name, u1.avatar as assignee_avatar, u2.name as creator_name
    FROM tasks t LEFT JOIN users u1 ON t.assignee_id = u1.id LEFT JOIN users u2 ON t.creator_id = u2.id
    WHERE t.project_id = ?`;
  const params = [req.params.projectId];
  if (status) { sql += ' AND t.status = ?'; params.push(status); }
  if (priority) { sql += ' AND t.priority = ?'; params.push(priority); }
  if (assignee_id) { sql += ' AND t.assignee_id = ?'; params.push(assignee_id); }
  sql += ' ORDER BY CASE t.priority WHEN "urgent" THEN 1 WHEN "high" THEN 2 WHEN "medium" THEN 3 ELSE 4 END, t.created_at DESC';
  res.json(prepare(sql).all(...params));
});

router.post('/projects/:projectId/tasks', auth, requireProjectAccess, (req, res) => {
  const { title, description, status, priority, assignee_id, due_date } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const id = uuidv4();
  prepare(`INSERT INTO tasks (id, title, description, status, priority, project_id, assignee_id, creator_id, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, title, description || '', status || 'todo', priority || 'medium', req.params.projectId, assignee_id || null, req.user.id, due_date || null);
  const task = prepare(`SELECT t.*, u1.name as assignee_name, u1.avatar as assignee_avatar, u2.name as creator_name
    FROM tasks t LEFT JOIN users u1 ON t.assignee_id = u1.id LEFT JOIN users u2 ON t.creator_id = u2.id WHERE t.id = ?`).get(id);
  res.status(201).json(task);
});

router.get('/tasks/:taskId', auth, (req, res) => {
  const task = prepare(`SELECT t.*, u1.name as assignee_name, u1.avatar as assignee_avatar,
    u2.name as creator_name, p.name as project_name FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id LEFT JOIN users u2 ON t.creator_id = u2.id
    LEFT JOIN projects p ON t.project_id = p.id WHERE t.id = ?`).get(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const comments = prepare(`SELECT c.*, u.name as user_name, u.avatar as user_avatar
    FROM comments c JOIN users u ON c.user_id = u.id WHERE c.task_id = ? ORDER BY c.created_at ASC`).all(req.params.taskId);
  res.json({ ...task, comments });
});

router.put('/tasks/:taskId', auth, (req, res) => {
  const { title, description, status, priority, assignee_id, due_date } = req.body;
  const task = prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  prepare(`UPDATE tasks SET title=?, description=?, status=?, priority=?, assignee_id=?, due_date=?, updated_at=datetime('now') WHERE id=?`).run(
    title ?? task.title, description ?? task.description, status ?? task.status,
    priority ?? task.priority, assignee_id !== undefined ? (assignee_id || null) : task.assignee_id,
    due_date !== undefined ? (due_date || null) : task.due_date, req.params.taskId
  );
  const updated = prepare(`SELECT t.*, u1.name as assignee_name, u1.avatar as assignee_avatar, u2.name as creator_name
    FROM tasks t LEFT JOIN users u1 ON t.assignee_id = u1.id LEFT JOIN users u2 ON t.creator_id = u2.id WHERE t.id = ?`).get(req.params.taskId);
  res.json(updated);
});

router.delete('/tasks/:taskId', auth, (req, res) => {
  const task = prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.creator_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Only creator or admin can delete' });
  prepare('DELETE FROM comments WHERE task_id = ?').run(req.params.taskId);
  prepare('DELETE FROM tasks WHERE id = ?').run(req.params.taskId);
  res.json({ message: 'Task deleted' });
});

router.post('/tasks/:taskId/comments', auth, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });
  const id = uuidv4();
  prepare('INSERT INTO comments (id, content, task_id, user_id) VALUES (?, ?, ?, ?)').run(id, content, req.params.taskId, req.user.id);
  const comment = prepare(`SELECT c.*, u.name as user_name, u.avatar as user_avatar
    FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?`).get(id);
  res.status(201).json(comment);
});

router.get('/dashboard', auth, (req, res) => {
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';
  const myTasks = isAdmin
    ? prepare(`SELECT t.*, p.name as project_name, p.color as project_color, u.name as assignee_name
        FROM tasks t JOIN projects p ON t.project_id = p.id LEFT JOIN users u ON t.assignee_id = u.id
        WHERE t.status != 'done' ORDER BY t.due_date ASC, t.created_at DESC LIMIT 20`).all()
    : prepare(`SELECT t.*, p.name as project_name, p.color as project_color
        FROM tasks t JOIN projects p ON t.project_id = p.id
        WHERE t.assignee_id = ? AND t.status != 'done' ORDER BY t.due_date ASC, t.created_at DESC LIMIT 20`).all(userId);
  const stats = isAdmin
    ? prepare(`SELECT COUNT(*) as total_tasks, SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN due_date < date('now') AND status != 'done' THEN 1 ELSE 0 END) as overdue,
        (SELECT COUNT(*) FROM projects) as total_projects, (SELECT COUNT(*) FROM users) as total_users FROM tasks`).get()
    : prepare(`SELECT COUNT(*) as total_tasks, SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN due_date < date('now') AND status != 'done' THEN 1 ELSE 0 END) as overdue,
        (SELECT COUNT(*) FROM project_members WHERE user_id = ?) as total_projects, 0 as total_users
        FROM tasks WHERE assignee_id = ?`).get(userId, userId);
  const recentActivity = isAdmin
    ? prepare(`SELECT t.id, t.title, t.status, t.updated_at, p.name as project_name, p.color as project_color
        FROM tasks t JOIN projects p ON t.project_id = p.id ORDER BY t.updated_at DESC LIMIT 10`).all()
    : prepare(`SELECT t.id, t.title, t.status, t.updated_at, p.name as project_name, p.color as project_color
        FROM tasks t JOIN projects p ON t.project_id = p.id
        JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
        ORDER BY t.updated_at DESC LIMIT 10`).all(userId);
  res.json({ myTasks, stats, recentActivity });
});

module.exports = router;
