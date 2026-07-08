// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const JWT_SECRET = 'portal1ds_secret_key_2026';

app.use(cors());
app.use(express.json());

// --- CONEXÃO COM O BANCO DE DADOS ---
mongoose.connect('mongodb://localhost:27017/portal1ds')
  .then(() => console.log('MongoDB conectado com sucesso.'))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// --- MODELOS (SCHEMAS) ---
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, default: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe' },
  bio: { type: String, default: 'Apaixonado por tecnologia!' },
  followers: { type: Number, default: 0 },
  following: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const PostSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, required: true },
  image: { type: String },
  likes: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now }
});

const CommentSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Post = mongoose.model('Post', PostSchema);
const Comment = mongoose.model('Comment', CommentSchema);

// --- SEED DO PRIMEIRO POST (dev-cicero) ---
async function seedDatabase() {
  let cicero = await User.findOne({ username: 'dev-cicero' });
  if (!cicero) {
    const hashedPassword = await bcrypt.hash('SenhaForte123!', 10);
    cicero = await User.create({
      name: 'Cícero Dev',
      username: 'dev-cicero',
      email: 'cicero@portal1ds.com',
      password: hashedPassword,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
    });
  }
  const postExists = await Post.findOne({ title: 'Bem-vindos ao Portal 1DS' });
  if (!postExists) {
    await Post.create({
      author: cicero._id,
      title: 'Bem-vindos ao Portal 1DS',
      content: 'Olá! Seja muito bem-vindo ao Portal 1DS. Este espaço foi criado para reunir apaixonados por tecnologia, programação, inteligência artificial, desenvolvimento web, aplicativos, hardware, software e inovação...',
      category: 'Tecnologia'
    });
  }
}
seedDatabase();

// --- ROTAS DA API ---

// Cadastro
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, username, email, password, avatar } = req.body;
    const userExists = await User.findOne({ $or: [{ username }, { email }] });
    if (userExists) return res.status(400).json({ error: 'Usuário ou Email já cadastrados.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, username, email, password: hashedPassword, avatar });
    res.status(201).json({ message: 'Conta criada com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Credenciais inválidas.' });
    }
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user._id, name: user.name, username: user.username, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ error: 'Erro no servidor.' });
  }
});

// Listar Posts
app.get('/api/posts', async (req, res) => {
  const posts = await Post.find().populate('author', 'name username avatar').sort({ createdAt: -1 });
  res.json(posts);
});

// Criar Post
app.post('/api/posts', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(411).json({ error: 'Não autorizado.' });
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const { title, content, category, image } = req.body;
    const newPost = await Post.create({ author: decoded.id, title, content, category, image });
    const populatedPost = await newPost.populate('author', 'name username avatar');
    
    io.emit('new_post', populatedPost); // Tempo real
    res.status(201).json(populatedPost);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar publicação.' });
  }
});

// --- SOCKET.IO (TEMPO REAL E STATUS ONLINE) ---
let onlineUsers = {};

io.on('connection', (socket) => {
  socket.on('user_connected', (user) => {
    onlineUsers[socket.id] = { ...user, status: '🟢 Online' };
    io.emit('update_online_users', Object.values(onlineUsers));
  });

  socket.on('disconnect', () => {
    delete onlineUsers[socket.id];
    io.emit('update_online_users', Object.values(onlineUsers));
  });
});

server.listen(3000, () => console.log('Servidor rodando na porta 3000'));

// js/app.js
document.addEventListener("DOMContentLoaded", () => {
  initAuth();
  initPosts();
  initOnline();

  // Sistema de Gerenciamento de Abas/Views
  const views = ['feedView', 'createPostView', 'loginView', 'registerView', 'profileView'];
  
  window.switchView = (targetViewId) => {
    views.forEach(view => {
      document.getElementById(view).classList.add('hidden');
    });
    document.getElementById(targetViewId).classList.remove('hidden');
  };

  document.getElementById('navHome').addEventListener('click', () => switchView('feedView'));
  document.getElementById('navCreatePost').addEventListener('click', () => switchView('createPostView'));
  document.getElementById('navLogin').addEventListener('click', () => switchView('loginView'));
  document.getElementById('navRegister').addEventListener('click', () => switchView('registerView'));
  document.getElementById('navProfile').addEventListener('click', () => {
    renderProfile();
    switchView('profileView');
  });
});

// js/auth.js
const API_URL = 'http://localhost:3000/api';

function initAuth() {
  updateAuthUI();

  // Evento de Login
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUser').value;
    const password = document.getElementById('loginPass').value;

    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.reload();
    } else {
      alert(data.error);
    }
  });

  // Evento de Saída (Sair)
  document.getElementById('navLogout').addEventListener('click', () => {
    localStorage.clear();
    window.location.reload();
  });
}

function updateAuthUI() {
  const token = localStorage.getItem('token');
  if (token) {
    document.querySelectorAll('.auth-only').forEach(el => el.classList.remove('hidden'));
    document.querySelectorAll('.guest-only').forEach(el => el.classList.add('hidden'));
  } else {
    document.querySelectorAll('.auth-only').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.guest-only').forEach(el => el.classList.remove('hidden'));
  }
}

function renderProfile() {
  const user = JSON.parse(localStorage.getItem('user'));
  if(user) {
    document.getElementById('profName').innerText = user.name;
    document.getElementById('profUsername').innerText = `@${user.username}`;
    document.getElementById('profAvatar').src = user.avatar;
  }
}

// js/posts.js
function initPosts() {
  loadPosts();

  // Evento de envio de post
  document.getElementById('postForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('postTitle').value;
    const content = document.getElementById('postContent').value;
    const category = document.getElementById('postCategory').value;
    const image = document.getElementById('postImage').value;

    const token = localStorage.getItem('token');

    const res = await fetch('http://localhost:3000/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, content, category, image })
    });

    if (res.ok) {
      document.getElementById('postForm').reset();
      switchView('feedView');
    }
  });
}

async function loadPosts() {
  const res = await fetch('http://localhost:3000/api/posts');
  const posts = await res.json();
  const container = document.getElementById('postsContainer');
  container.innerHTML = '';

  posts.forEach(post => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="post-header">
        <img src="${post.author.avatar}" class="avatar-img">
        <div>
          <h4>${post.author.name}</h4>
          <small>@${post.author.username} • ${post.category}</small>
        </div>
      </div>
      <h3>${post.title}</h3>
      <p>${post.content}</p>
      ${post.image ? `<img src="${post.image}" class="post-image">` : ''}
      <div class="post-actions">
        <button class="btn">👍 Curtir (${post.likes.length})</button>
        <button class="btn">💬 Comentar</button>
      </div>
    `;
    container.appendChild(card);
  });
}

// js/online.js
function initOnline() {
  // Inicializa o cliente Socket.io localmente apontando para o servidor backend
  const socket = io('http://localhost:3000');

  const user = JSON.parse(localStorage.getItem('user'));
  if (user) {
    socket.emit('user_connected', user);
  }

  socket.on('update_online_users', (users) => {
    const list = document.getElementById('onlineList');
    list.innerHTML = '';
    users.forEach(u => {
      const li = document.createElement('li');
      li.className = 'online-item';
      li.innerHTML = `<img src="${u.avatar}" class="avatar-img" style="width:30px;height:30px;"> <span>${u.name} ${u.status}</span>`;
      list.appendChild(li);
    });
  });

  // Escuta atualizações de novos posts em tempo real por outros usuários
  socket.on('new_post', () => {
    loadPosts();
  });
}
