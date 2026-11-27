const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const client = require('prom-client');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Prometheus metrics ----------
client.collectDefaultMetrics();
const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

app.use((req, res, next) => {
  res.on('finish', () => {
    // 'unmatched' keeps label values bounded (random 404 paths would explode cardinality)
    const route = req.route ? req.route.path : 'unmatched';
    httpRequests.inc({ method: req.method, route, status: res.statusCode });
  });
  next();
});

// ---------- Data model ----------
const Task = mongoose.model(
  'Task',
  new mongoose.Schema(
    {
      title: { type: String, required: true, trim: true },
      done: { type: Boolean, default: false },
    },
    { timestamps: true }
  )
);

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    const status = err.name === 'CastError' || err.name === 'ValidationError' ? 400 : 500;
    res.status(status).json({ error: err.message });
  });

// ---------- Routes ----------
const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db: DB_STATES[mongoose.connection.readyState],
    version: process.env.APP_VERSION || 'dev',
    uptime: Math.round(process.uptime()),
  });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

app.get('/api/tasks', wrap(async (req, res) => {
  res.json(await Task.find().sort({ createdAt: -1 }));
}));

app.post('/api/tasks', wrap(async (req, res) => {
  res.status(201).json(await Task.create({ title: req.body.title }));
}));

app.patch('/api/tasks/:id/toggle', wrap(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  task.done = !task.done;
  res.json(await task.save());
}));

app.delete('/api/tasks/:id', wrap(async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.status(204).end();
}));

module.exports = app;
