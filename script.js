
// ==========================================================================
// 1. GERENCIAMENTO DE TELAS (NAVEGAÇÃO)
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  const views = ['feedView', 'createPostView', 'loginView', 'registerView', 'profileView'];
  
  window.switchView = (targetId) => {
    views.forEach(v => document.getElementById(v).classList.add('hidden'));
    document.getElementById(targetId).classList.remove('hidden');
    
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  };

  document.getElementById('navHome').addEventListener('click', () => { switchView('feedView'); loadPosts(); });
  document.getElementById('navCreatePost').addEventListener('click', () => switchView('createPostView'));
  document.getElementById('navLogin').addEventListener('click', () => switchView('loginView'));
  document.getElementById('navRegister').addEventListener('click', () => switchView('registerView'));
  document.getElementById('navProfile').addEventListener('click', () => { showProfile(); switchView('profileView'); });
  
  // Inicialização do sistema
  setupFirstPost();
  loadPosts();
  updateOnlineList();
});

// ==========================================================================
// 2. SISTEMA DE AUTENTICAÇÃO (LOGIN E CADASTRO)
// ==========================================================================
function getUsers() { 
  return JSON.parse(localStorage.getItem('users')) || []; 
}

const logged = JSON.parse(localStorage.getItem('loggedUser'));
if (logged) {
  document.querySelectorAll('.auth-only').forEach(el => el.classList.remove('hidden'));
  document.querySelectorAll('.guest-only').forEach(el => el.classList.add('hidden'));
}

document.getElementById('registerForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const username = document.getElementById('regUser').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPass').value;

  const users = getUsers();
  if (users.some(u => u.username === username || u.email === email)) {
    return alert('Usuário ou Email já cadastrado!');
  }

  users.push({ name, username, email, password });
  localStorage.setItem('users', JSON.stringify(users));
  alert('Conta criada com sucesso!');
  document.getElementById('registerForm').reset();
  switchView('loginView');
});

document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const userVal = document.getElementById('loginUser').value;
  const passVal = document.getElementById('loginPass').value;

  const users = getUsers();
  const found = users.find(u => u.username === userVal && u.password === passVal);

  if (found) {
    localStorage.setItem('loggedUser', JSON.stringify(found));
    window.location.reload();
  } else {
    alert('Usuário ou senha incorretos!');
  }
});

document.getElementById('navLogout').addEventListener('click', () => {
  localStorage.removeItem('loggedUser');
  window.location.reload();
});

function showProfile() {
  if (logged) {
    document.getElementById('profName').innerText = logged.name;
    document.getElementById('profUsername').innerText = `@${logged.username}`;
  }
}

// ==========================================================================
// 3. GERENCIAMENTO DE POSTS E CURTIDAS
// ==========================================================================
function getPosts() { 
  return JSON.parse(localStorage.getItem('posts')) || []; 
}

function setupFirstPost() {
  const posts = getPosts();
  if (posts.length === 0) {
    posts.push({
      author: 'Cícero Dev',
      username: 'dev-cicero',
      title: 'Bem-vindos ao Portal 1DS',
      content: 'Olá! Seja muito bem-vindo ao Portal 1DS. Este espaço foi criado para reunir apaixonados por tecnologia, programação e inovação.',
      category: 'Tecnologia',
      image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500',
      likes: 0
    });
    localStorage.setItem('posts', JSON.stringify(posts));
  }
}

document.getElementById('postForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const user = JSON.parse(localStorage.getItem('loggedUser'));
  if (!user) return alert('Faça login para criar um post!');

  const posts = getPosts();
  posts.unshift({
    author: user.name,
    username: user.username,
    title: document.getElementById('postTitle').value,
    content: document.getElementById('postContent').value,
    category: document.getElementById('postCategory').value,
    image: document.getElementById('postImage').value,
    likes: 0
  });

  localStorage.setItem('posts', JSON.stringify(posts));
  document.getElementById('postForm').reset();
  switchView('feedView');
  loadPosts();
});

function loadPosts() {
  const container = document.getElementById('postsContainer');
  if (!container) return;
  container.innerHTML = '';
  
  getPosts().forEach((post, index) => {
    container.innerHTML += `
      <div class="card">
        <div class="post-header">
          <strong>${post.author}</strong> <span>@${post.username} | ${post.category}</span>
        </div>
        <h3>${post.title}</h3>
        <p>${post.content}</p>
        ${post.image ? `<img src="${post.image}" class="post-img">` : ''}
        <div style="margin-top:0.5rem;">
          <button class="btn" onclick="likePost(${index})">👍 ${post.likes}</button>
          <button class="btn" onclick="toggleCommentBox(${index})">💬 Comentar</button>
        </div>
        <div id="commentBox-${index}" class="hidden" style="margin-top:0.8rem;">
          <input type="text" id="comInp-${index}" placeholder="Escreva um comentário...">
          <button class="btn" onclick="addComment(${index})">Enviar</button>
          <div id="commentsList-${index}" style="margin-top:0.5rem; font-size:0.9rem; display:flex; flex-direction:column; gap:4px;"></div>
        </div>
      </div>
    `;
    setTimeout(() => renderComments(index), 10);
  });
}

window.likePost = (index) => {
  const posts = getPosts();
  posts[index].likes += 1;
  localStorage.setItem('posts', JSON.stringify(posts));
  loadPosts();
};

// ==========================================================================
// 4. SISTEMA DE COMENTÁRIOS
// ==========================================================================
function getComments() { 
  return JSON.parse(localStorage.getItem('comments')) || {}; 
}

window.toggleCommentBox = (postIndex) => {
  const box = document.getElementById(`commentBox-${postIndex}`);
  box.classList.toggle('hidden');
};

window.addComment = (postIndex) => {
  const user = JSON.parse(localStorage.getItem('loggedUser'));
  if (!user) return alert('Faça login para comentar!');
  
  const input = document.getElementById(`comInp-${postIndex}`);
  if (!input.value.trim()) return;

  const allComments = getComments();
  if (!allComments[postIndex]) allComments[postIndex] = [];

  allComments[postIndex].push({
    author: user.name,
    text: input.value
  });

  localStorage.setItem('comments', JSON.stringify(allComments));
  input.value = '';
  renderComments(postIndex);
};

window.renderComments = (postIndex) => {
  const list = document.getElementById(`commentsList-${postIndex}`);
  if (!list) return;
  list.innerHTML = '';
  const postComments = getComments()[postIndex] || [];
  
  postComments.forEach(c => {
    list.innerHTML += `<div><strong>${c.author}:</strong> ${c.text}</div>`;
  });
};

// ==========================================================================
// 5. USUÁRIOS ONLINE
// ==========================================================================
function updateOnlineList() {
  const list = document.getElementById('onlineList');
  if (!list) return;
  list.innerHTML = '';

  const usersMock = [
    { name: 'Cícero Dev', status: '🟢 Online' },
    { name: 'Ana Tech', status: '🟡 Ausente' },
    { name: 'Lucas Code', status: '🟢 Online' }
  ];

  const current = JSON.parse(localStorage.getItem('loggedUser'));
  if (current) {
    list.innerHTML += `<li style="list-style:none; margin-bottom:5px;">🟢 <strong>${current.name} (Você)</strong></li>`;
  }

  usersMock.forEach(u => {
    list.innerHTML += `<li style="list-style:none; margin-bottom:5px;">${u.status === '🟢 Online' ? '🟢' : '🟡'} ${u.name}</li>`;
  });
}
