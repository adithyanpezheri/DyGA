let selectedImages = [];
let currentKeyword = '';
let currentGrid = 0;
const totalGrids = 3;
let currentImageSubset = [];

function fisherYatesShuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getAvatarLibrary(keyword) {
  keyword = keyword.toLowerCase();
  if (keyword.includes('robot')) return 'robohash';
  if (keyword.includes('avatar')) return 'avataaars';
  if (keyword.includes('minimal')) return 'personas';
  if (keyword.includes('identicon')) return 'identicon';
  if (keyword.includes('blockies')) return 'blockies';
  return 'dicebear';
}

function getImageSrc(library, keyword, img) {
  switch (library) {
    case 'robohash':
      return `https://robohash.org/${keyword}${img}.png`;
    case 'avataaars':
      return `https://api.dicebear.com/9.x/avataaars/png?seed=${keyword}${img}`;
    case 'personas':
      return `https://api.dicebear.com/9.x/personas/png?seed=${keyword}${img}`;
    case 'identicon':
      return `https://api.dicebear.com/9.x/identicon/png?seed=${keyword}${img}`;
    case 'blockies':
      return `https://api.dicebear.com/9.x/big-ears/png?seed=${keyword}${img}`;
    default:
      return `https://api.dicebear.com/9.x/pixel-art/png?seed=${keyword}${img}`;
  }
}

async function generateGrid(keyword, imageSubset) {
  currentKeyword = keyword;
  const library = getAvatarLibrary(keyword);
  const shuffledImages = fisherYatesShuffle(imageSubset);
  let gridHtml = '<div class="grid">';
  shuffledImages.forEach(img => {
    const src = getImageSrc(library, keyword, img);
    gridHtml += `
      <div class="grid-item">
        <img src="${src}" data-id="${img}" tabindex="0" alt="Image ${img}">
      </div>`;
  });
  gridHtml += '</div>';
  document.getElementById('grid-container').innerHTML = gridHtml;

  document.querySelectorAll('.grid img').forEach(img => {
    img.addEventListener('click', () => selectImage(img.dataset.id));
    img.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') selectImage(img.dataset.id);
    });
  });
}

function selectImage(id) {
  if (selectedImages.length < 3) {
    selectedImages.push(id);
    alert(`Selected image: ${id}`);
    if (selectedImages.length === 3) {
      document.getElementById('register-button').style.display = 'block';
    }
  } else {
    alert('You have already selected 3 images');
  }
}

async function fetchImageSubset(keyword) {
  const response = await fetch('/generate-subset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword })
  });
  const data = await response.json();
  if (data.error) {
    document.getElementById('message').textContent = data.error;
    document.getElementById('message').className = 'error';
    return null;
  }
  return data.imageSubset;
}

async function generateGridForRegister() {
  const keyword = document.getElementById('keyword').value.trim();
  if (!keyword) {
    document.getElementById('message').textContent = 'Please enter a keyword';
    document.getElementById('message').className = 'error';
    return;
  }
  const imageSubset = await fetchImageSubset(keyword);
  if (!imageSubset) return;
  currentImageSubset = imageSubset;
  document.getElementById('grid-container').style.display = 'block';
  await generateGrid(keyword, imageSubset);
}

async function registerUser() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const keyword = document.getElementById('keyword').value.trim();
  const imageSubset = currentImageSubset;
  const selectedSequence = selectedImages;

  if (!username || !password || !keyword || selectedSequence.length !== 3 || imageSubset.length === 0) {
    document.getElementById('message').textContent = 'Please complete all fields and select 3 images';
    document.getElementById('message').className = 'error';
    return;
  }

  const response = await fetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, keyword, imageSubset, selectedSequence })
  });
  const data = await response.json();
  if (data.error) {
    document.getElementById('message').textContent = data.error;
    document.getElementById('message').className = 'error';
  } else {
    document.getElementById('message').textContent = 'Registration successful! Redirecting to login...';
    document.getElementById('message').className = 'success';
    setTimeout(() => window.location.href = 'login.html', 2000);
  }
}

async function loginUser() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const keyword = document.getElementById('keyword').value.trim();

  const response = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, keyword })
  });
  const data = await response.json();
  if (data.error) {
    document.getElementById('message').textContent = data.error;
    document.getElementById('message').className = 'error';
    return;
  }

  currentImageSubset = data.imageSubset;
  selectedImages = [];
  currentGrid = 0;
  document.getElementById('grid-container').style.display = 'block';
  await generateGridForLogin(keyword, currentImageSubset);
}

async function generateGridForLogin(keyword, imageSubset) {
  currentKeyword = keyword;
  const library = getAvatarLibrary(keyword);
  const shuffledImages = fisherYatesShuffle(imageSubset);
  let gridHtml = '<div class="grid">';
  shuffledImages.forEach(img => {
    const src = getImageSrc(library, keyword, img);
    gridHtml += `
      <div class="grid-item">
        <img src="${src}" data-id="${img}" tabindex="0" alt="Image ${img}">
      </div>`;
  });
  gridHtml += '</div>';
  document.getElementById('grid-container').innerHTML = gridHtml;

  document.querySelectorAll('.grid img').forEach(img => {
    img.addEventListener('click', () => selectImageForLogin(img.dataset.id));
    img.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') selectImageForLogin(img.dataset.id);
    });
  });
}

function selectImageForLogin(id) {
  selectedImages.push(id);
  currentGrid++;
  if (currentGrid < totalGrids) {
    generateGridForLogin(currentKeyword, currentImageSubset);
  } else {
    verifySequence();
  }
}

async function verifySequence() {
  const username = document.getElementById('username').value;
  const sequence = selectedImages;

  const response = await fetch('/verify-sequence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, sequence })
  });
  const data = await response.json();
  document.getElementById('message').textContent = data.message;
  document.getElementById('message').className = data.message.includes('successful') ? 'success' : 'error';

  if (data.message === 'Authentication successful') {
    localStorage.setItem('authToken', data.token);
    setTimeout(() => window.location.href = 'dashboard.html', 1000);
  } else {
    // Show retry button on failure
    const retryButton = document.createElement('button');
    retryButton.textContent = 'Retry';
    retryButton.onclick = retryLogin;
    document.getElementById('grid-container').innerHTML = ''; // Clear grid
    document.getElementById('grid-container').appendChild(retryButton);
    document.getElementById('grid-container').style.display = 'block';
  }
}

function retryLogin() {
  selectedImages = [];
  currentGrid = 0;
  document.getElementById('grid-container').style.display = 'none';
  document.getElementById('message').textContent = '';
  loginUser(); // Restart the login process
}

async function logout() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  const response = await fetch('/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token
    }
  });
  const data = await response.json();
  if (data.message === 'Logged out successfully') {
    localStorage.removeItem('authToken');
    window.location.href = 'login.html';
  } else {
    document.getElementById('message').textContent = data.error || 'Logout failed';
    document.getElementById('message').className = 'error';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.endsWith('dashboard.html')) {
    const token = localStorage.getItem('authToken');
    if (!token) {
      window.location.href = 'login.html';
    } else {
      fetch('/dashboard.html', {
        headers: { 'Authorization': token }
      }).then(response => {
        if (!response.ok) {
          localStorage.removeItem('authToken');
          window.location.href = 'login.html';
        }
      });
    }
  }
});