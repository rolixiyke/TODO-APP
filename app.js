const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const Task = require('./models/task');  // Task model
const User = require('./models/user');  // User model
const app = express();
const port = 3000;

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/todoapp', { useNewUrlParser: true, useUnifiedTopology: true });

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Session setup
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/todoapp' })
}));

// Routes
app.get('/', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  Task.find({ userId: req.session.userId }, (err, tasks) => {
    if (err) return res.status(500).send('Error retrieving tasks');
    res.render('index', { tasks });
  });
});

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.get('/login', (req, res) => {
  res.render('login');
});

// Handle Sign Up
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const user = new User({ username, passwordHash: hash });
  await user.save();
  res.redirect('/login');
});

// Handle Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).send('User not found');
  
  const match = await bcrypt.compare(password, user.passwordHash);
  if (match) {
    req.session.userId = user._id;
    res.redirect('/');
  } else {
    res.status(400).send('Invalid credentials');
  }
});

// Add Task
app.post('/add-task', (req, res) => {
  const { description } = req.body;
  const task = new Task({
    description,
    state: 'pending',
    userId: req.session.userId
  });
  task.save((err) => {
    if (err) return res.status(500).send('Error adding task');
    res.redirect('/');
  });
});

// Change Task State
app.post('/update-task/:id', (req, res) => {
  const { state } = req.body;
  Task.findByIdAndUpdate(req.params.id, { state }, (err) => {
    if (err) return res.status(500).send('Error updating task');
    res.redirect('/');
  });
});

// Delete Task
app.post('/delete-task/:id', (req, res) => {
  Task.findByIdAndDelete(req.params.id, (err) => {
    if (err) return res.status(500).send('Error deleting task');
    res.redirect('/');
  });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
