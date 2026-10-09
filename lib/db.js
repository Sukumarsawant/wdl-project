import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'weblab_db.json');

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) return true;
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function loadDatabase() {
  ensureDirectoryExistence(DB_FILE);
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [],
      github_data: [],
      reddit_data: [],
      exposure_findings: [],
      identity_links: [],
      session: null
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
    return initialData;
  }
  try {
    const content = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(content);
    if (!parsed.session) parsed.session = null;
    return parsed;
  } catch (err) {
    return {
      users: [],
      github_data: [],
      reddit_data: [],
      exposure_findings: [],
      identity_links: [],
      session: null
    };
  }
}

function saveDatabase(db) {
  ensureDirectoryExistence(DB_FILE);
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

export function getDatabase() {
  return loadDatabase();
}

export function getCurrentUser() {
  const db = loadDatabase();
  if (db.session && db.session.userId && db.session.explicitLogin === true) {
    const user = db.users.find((u) => u.id === db.session.userId);
    if (user) return user;
  }
  return null;
}

export function setCurrentSession(userId) {
  const db = loadDatabase();
  db.session = { userId, explicitLogin: true };
  saveDatabase(db);
}

export function clearSession() {
  const db = loadDatabase();
  db.session = null;
  db.users = db.users.filter((u) => u.id !== 'usr_current');
  saveDatabase(db);
}

export function updateUserHandles(userId, githubUsername = '', redditUsername = '', hackernewsUsername = '', stackoverflowUsername = '') {
  const db = loadDatabase();
  const cleanGh = (githubUsername || '').replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, '').replace(/^@/, '').trim();
  const cleanRd = (redditUsername || '').replace(/^(?:https?:\/\/)?(?:www\.)?reddit\.com\/(?:u|user)\//i, '').replace(/^(?:@|\/?u\/)/i, '').split('/')[0].trim();
  const cleanHn = (hackernewsUsername || '').replace(/^@/, '').split('/')[0].trim();
  const cleanSo = String(stackoverflowUsername || '').trim();

  let targetId = userId || 'usr_current';
  let user = db.users.find((u) => u.id === targetId);

  const displayName = cleanGh ? `@${cleanGh}` : cleanRd ? `u/${cleanRd}` : 'Authenticated User';
  const avatarUrl = cleanGh 
    ? `https://github.com/${cleanGh}.png` 
    : `https://www.redditstatic.com/avatars/defaults/v2/avatar_default_1.png`;

  if (!user) {
    user = {
      id: targetId,
      github_username: cleanGh,
      reddit_username: cleanRd,
      hackernews_username: cleanHn,
      stackoverflow_username: cleanSo,
      name: displayName,
      email: cleanGh ? `${cleanGh}@users.noreply.github.com` : '',
      avatar_url: avatarUrl,
      created_at: new Date().toISOString()
    };
    db.users.push(user);
  } else {
    user.github_username = cleanGh;
    user.reddit_username = cleanRd;
    user.hackernews_username = cleanHn;
    user.stackoverflow_username = cleanSo;
    user.name = displayName;
    user.avatar_url = avatarUrl;
  }

  db.session = { userId: user.id, explicitLogin: true };
  saveDatabase(db);
  return user;
}

export function getUserById(userId) {
  const db = loadDatabase();
  return db.users.find((u) => u.id === userId) || null;
}

export function setGithubOAuthConnected(userId, connected = true) {
  const db = loadDatabase();
  const user = db.users.find((entry) => entry.id === userId);
  if (!user) return null;
  user.github_oauth_connected = Boolean(connected);
  saveDatabase(db);
  return user;
}

export function saveGithubData(userId, data) {
  const db = loadDatabase();
  db.github_data = db.github_data.filter((g) => g.user_id !== userId);
  const record = {
    user_id: userId,
    ...data,
    updated_at: new Date().toISOString()
  };
  db.github_data.push(record);
  saveDatabase(db);
  return record;
}

export function getGithubData(userId) {
  const db = loadDatabase();
  return db.github_data.find((g) => g.user_id === userId) || null;
}

export function saveRedditData(userId, items) {
  const db = loadDatabase();
  db.reddit_data = db.reddit_data.filter((r) => r.user_id !== userId);
  const records = items.map((it) => ({
    user_id: userId,
    post_comment_id: it.id,
    subreddit: it.context || 'general',
    title: it.title || '',
    content: it.body || '',
    url: it.permalink || '',
    timestamp: it.createdUtc,
    created_at: new Date().toISOString()
  }));
  db.reddit_data.push(...records);
  saveDatabase(db);
  return records;
}

export function getRedditData(userId) {
  const db = loadDatabase();
  return db.reddit_data.filter((r) => r.user_id === userId);
}

export function saveExposureFindings(userId, findings) {
  const db = loadDatabase();
  db.exposure_findings = db.exposure_findings.filter((f) => f.user_id !== userId);
  const records = findings.map((f, idx) => ({
    id: `finding_${userId}_${idx + 1}`,
    user_id: userId,
    type: f.type || f.category || 'Identity Exposure',
    value: f.value || f.evidenceSnippet || '',
    severity: f.severity || f.riskLevel || 'Moderate',
    source: f.source || 'Engine',
    evidence_url: f.evidence_url || f.permalink || '',
    confidence: f.confidence || f.confidenceScore || 75,
    description: f.description || '',
    remediation: f.remediation || ''
  }));
  db.exposure_findings.push(...records);
  saveDatabase(db);
  return records;
}

export function getExposureFindings(userId) {
  const db = loadDatabase();
  return db.exposure_findings.filter((f) => f.user_id === userId);
}

export function saveIdentityLinks(userId, links) {
  const db = loadDatabase();
  db.identity_links = db.identity_links.filter((l) => l.user_id !== userId);
  const records = links.map((l, idx) => ({
    id: `link_${userId}_${idx + 1}`,
    user_id: userId,
    source_a: l.source_a || 'GitHub',
    source_b: l.source_b || 'Reddit',
    signal: l.signal,
    confidence: l.confidence,
    evidence: l.evidence,
    evidence_url: l.evidence_url || '',
    supporting_signals: l.supporting_signals || []
  }));
  db.identity_links.push(...records);
  saveDatabase(db);
  return records;
}

export function getIdentityLinks(userId) {
  const db = loadDatabase();
  return db.identity_links.filter((l) => l.user_id === userId);
}
