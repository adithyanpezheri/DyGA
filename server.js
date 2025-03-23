const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit'); // Add rate limiting
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

const mongoUsername = process.env.MONGO_USERNAME;
const mongoPassword = process.env.MONGO_PASSWORD;
const mongoDB = process.env.MONGO_DB;
const uri = `mongodb+srv://${mongoUsername}:${mongoPassword}@userlogininfo.blmxu.mongodb.net/${mongoDB}?retryWrites=true&w=majority&appName=userlogininfo`;

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// User Schema with lockout fields
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  keywordHash: { type: String, required: true },
  imageSubset: { type: [String], required: true },
  sequenceHash: { type: String, required: true },
  authToken: { type: String, default: null },
  failedAttempts: { type: Number, default: 0 }, // Track failed attempts
  lockUntil: { type: Date, default: null } // Lockout expiration
});

const User = mongoose.model('User', userSchema);

const imagePool = Array.from({ length: 24 }, (_, i) => String(i + 1));

class PRNG {
  constructor(seed) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
}

function seededShuffle(array, prng) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(prng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Rate limiting for /login and /verify-sequence
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' }
});

const sequenceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP
  message: { error: 'Too many sequence attempts from this IP, please try again after 15 minutes' }
});

// Check if account is locked
async function checkLockout(username) {
  const user = await User.findOne({ username });
  if (user && user.lockUntil && user.lockUntil > Date.now()) {
    const timeLeft = Math.ceil((user.lockUntil - Date.now()) / 60000); // Minutes left
    return { locked: true, message: `Account locked. Try again in ${timeLeft} minutes.` };
  }
  return { locked: false };
}

async function authenticateToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).sendFile(__dirname + '/public/login.html');
  }

  try {
    const user = await User.findOne({ authToken: token });
    if (!user) {
      return res.status(401).sendFile(__dirname + '/public/login.html');
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
  }
}

app.post('/generate-subset', (req, res) => {
  const { keyword } = req.body;
  if (!keyword) return res.status(400).json({ error: 'Keyword required' });

  const keywordHash = crypto.createHash('sha256').update(keyword).digest('hex');
  const seed = parseInt(keywordHash.slice(0, 8), 16);
  const prng = new PRNG(seed);
  const imageSubset = seededShuffle(imagePool, prng).slice(0, 16);
  res.json({ imageSubset });
});

app.post('/register', async (req, res) => {
  const { username, password, keyword, imageSubset, selectedSequence } = req.body;
  if (!username || !password || !keyword || !imageSubset || !selectedSequence) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const keywordHash = await bcrypt.hash(keyword, 10);
    const sequenceString = selectedSequence.join(',');
    const sequenceHash = await bcrypt.hash(sequenceString, 10);

    const user = new User({
      username,
      passwordHash,
      keywordHash,
      imageSubset,
      sequenceHash
    });

    await user.save();
    res.json({ message: 'Registration successful' });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

app.post('/login', loginLimiter, async (req, res) => {
  const { username, password, keyword } = req.body;
  if (!username || !password || !keyword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const lockoutCheck = await checkLockout(username);
    if (lockoutCheck.locked) {
      return res.status(403).json({ error: lockoutCheck.message });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    const keywordMatch = await bcrypt.compare(keyword, user.keywordHash);
    if (!passwordMatch || !keywordMatch) {
      user.failedAttempts += 1;
      if (user.failedAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
        user.failedAttempts = 0; // Reset attempts after lockout
      }
      await user.save();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset failed attempts on successful login
    user.failedAttempts = 0;
    await user.save();
    res.json({ imageSubset: user.imageSubset });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/verify-sequence', sequenceLimiter, async (req, res) => {
  const { username, sequence } = req.body;
  if (!username || !sequence) {
    return res.status(400).json({ error: 'Username and sequence required' });
  }

  try {
    const lockoutCheck = await checkLockout(username);
    if (lockoutCheck.locked) {
      return res.status(403).json({ error: lockoutCheck.message });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const sequenceString = sequence.join(',');
    const isMatch = await bcrypt.compare(sequenceString, user.sequenceHash);
    if (isMatch) {
      const token = crypto.randomBytes(16).toString('hex');
      user.authToken = token;
      user.failedAttempts = 0; // Reset on success
      await user.save();
      res.json({ message: 'Authentication successful', token });
    } else {
      user.failedAttempts += 1;
      if (user.failedAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
        user.failedAttempts = 0;
      }
      await user.save();
      res.json({ message: 'Authentication failed' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

app.get('/dashboard.html', authenticateToken, (req, res) => {
  res.sendFile(__dirname + '/public/dashboard.html');
});

app.post('/logout', async (req, res) => {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(400).json({ error: 'No token provided' });
  }

  try {
    const user = await User.findOne({ authToken: token });
    if (user) {
      user.authToken = null;
      await user.save();
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));