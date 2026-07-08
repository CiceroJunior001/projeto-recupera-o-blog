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
