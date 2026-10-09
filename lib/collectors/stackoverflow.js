const API = 'https://api.stackexchange.com/2.3';

function parseUserId(input) {
  const value = String(input || '').trim();
  const profile = value.match(/users\/(\d+)/i);
  return profile ? profile[1] : value.match(/^\d+$/) ? value : '';
}

export async function fetchStackOverflowActivity(input, maxItems = 100) {
  const userId = parseUserId(input);
  if (!userId) return { profile: null, items: [] };
  const params = `site=stackoverflow&pagesize=${Math.min(maxItems, 100)}&order=desc&sort=activity&filter=withbody`;
  try {
    const [profileRes, answersRes, questionsRes, commentsRes] = await Promise.all([
      fetch(`${API}/users/${userId}?site=stackoverflow`, { cache: 'no-store' }),
      fetch(`${API}/users/${userId}/answers?${params}`, { cache: 'no-store' }),
      fetch(`${API}/users/${userId}/questions?${params}`, { cache: 'no-store' }),
      fetch(`${API}/users/${userId}/comments?${params}`, { cache: 'no-store' })
    ]);
    const profile = profileRes.ok ? (await profileRes.json()).items?.[0] || null : null;
    const read = async (res) => res.ok ? (await res.json()).items || [] : [];
    const [answers, questions, comments] = await Promise.all([read(answersRes), read(questionsRes), read(commentsRes)]);
    const items = [
      ...questions.map((item) => ({ id: `q-${item.question_id}`, type: 'question', title: item.title || '', body: item.body || '', tags: item.tags || [], score: item.score || 0, createdAt: item.creation_date, url: item.link })),
      ...answers.map((item) => ({ id: `a-${item.answer_id}`, type: 'answer', title: '', body: item.body || '', score: item.score || 0, createdAt: item.creation_date, url: `https://stackoverflow.com/a/${item.answer_id}` })),
      ...comments.map((item) => ({ id: `c-${item.comment_id}`, type: 'comment', title: '', body: item.body || '', score: item.score || 0, createdAt: item.creation_date, url: item.link || `https://stackoverflow.com/questions/${item.post_id}` }))
    ].filter((item) => item.body).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    return { profile, items: Array.from(new Map(items.map((item) => [item.id, item])).values()).slice(0, maxItems) };
  } catch (error) {
    console.warn(`Stack Overflow collector warning for ${userId}:`, error.message);
    return { profile: null, items: [] };
  }
}
