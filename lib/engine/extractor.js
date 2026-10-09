/**
 * Independent Per-Platform Extraction Engine
 * Extracts location/state, programming languages, and identity disclosures
 * STRICTLY SEPARATELY for GitHub and Reddit without cross-platform fusion.
 */

// Email regex including unmangling
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+(?:\s*\[\s*at\s*\]\s*|\s*\(at\)\s*|\s*@\s*)[A-Za-z0-9.-]+(?:\s*\[\s*dot\s*\]\s*|\s*\.\s*)[A-Za-z]{2,}\b/gi;
const STANDARD_EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const LOCATION_KEYWORDS = [
  { term: 'bengaluru', state: 'Karnataka', country: 'India' },
  { term: 'bangalore', state: 'Karnataka', country: 'India' },
  { term: 'mumbai', state: 'Maharashtra', country: 'India' },
  { term: 'delhi', state: 'Delhi NCR', country: 'India' },
  { term: 'san francisco', state: 'California', country: 'USA' },
  { term: 'new york', state: 'New York', country: 'USA' },
  { term: 'london', state: 'England', country: 'UK' },
  { term: 'berlin', state: 'Berlin', country: 'Germany' }
];

function calculateEvidenceConfidence(findings) {
  if (!findings.length) return 0;
  const total = findings.reduce((sum, finding) => {
    const severity = String(finding.severity || '').toLowerCase();
    const base = severity === 'high' || severity === 'critical' ? 82 : severity === 'moderate' || severity === 'medium' ? 64 : 42;
    const evidence = String(finding.evidenceSnippet || finding.description || '').length;
    const evidenceQuality = Math.min(15, Math.round(evidence / 35));
    return sum + base + evidenceQuality;
  }, 0);
  return Math.round(total / findings.length);
}

export function extractGithubAudit(githubData) {
  const findings = [];
  const languages = new Set();

  if (githubData?.repos) {
    githubData.repos.forEach((r) => {
      if (r.language && r.language !== 'Unknown') {
        languages.add(r.language);
      }
    });
  }

  let ghLocation = githubData?.location || '';
  let predictedState = 'Undisclosed';

  if (ghLocation) {
    const locLower = ghLocation.toLowerCase();
    const matchedLoc = LOCATION_KEYWORDS.find((l) => locLower.includes(l.term));
    if (matchedLoc) {
      predictedState = `${matchedLoc.state}, ${matchedLoc.country} (${ghLocation})`;
    } else {
      predictedState = ghLocation;
    }
  }

  if (githubData?.email) {
    findings.push({
      type: 'Contact Exposure',
      category: 'Exposed Email Address',
      value: githubData.email,
      severity: 'High',
      source: 'GitHub Profile',
      evidenceSnippet: `Public email address declared on GitHub profile: ${githubData.email}`,
      evidence_url: githubData.profile_url || `https://github.com/${githubData.username}`,
      confidence: 98,
      description: 'Public contact email address exposed in GitHub profile fields.',
      remediation: 'Toggle "Keep my email addresses private" in GitHub settings.'
    });
  }

  const commitEmails = (githubData?.commitEmails || []).filter((email) => !/noreply\.github\.com$/i.test(email));
  commitEmails.forEach((email) => {
    if (email === githubData.email) return;
    findings.push({
      type: 'Contact Exposure', category: 'Commit Author Email', value: email, severity: 'High',
      source: 'GitHub PushEvent', evidenceSnippet: `Public commit metadata contains author email: ${email}`,
      evidence_url: `https://github.com/${githubData.username}`, confidence: 96,
      description: 'A personal or institutional email is exposed in public Git commit metadata.',
      remediation: 'Rewrite affected commits where possible and use GitHub privacy-preserving noreply email.'
    });
  });

  if (githubData?.organizations?.length) {
    findings.push({
      type: 'Identity Exposure', category: 'Organization Affiliation', value: githubData.organizations.join(', '), severity: 'Moderate',
      source: 'GitHub Organizations', evidenceSnippet: `Public organization memberships: ${githubData.organizations.join(', ')}`,
      evidence_url: `https://github.com/${githubData.username}?tab=organizations`, confidence: 88,
      description: 'Public organization memberships can associate a pseudonymous account with an institution or employer.',
      remediation: 'Review public organization membership visibility and remove affiliations that reveal identity.'
    });
  }

  const readme = githubData?.profileReadme || '';
  const readmeEmails = readme.match(STANDARD_EMAIL_REGEX) || [];
  readmeEmails.filter((email) => !/noreply\.github\.com$/i.test(email)).forEach((email) => {
    findings.push({
      type: 'Contact Exposure', category: 'Profile README Email', value: email, severity: 'High',
      source: 'GitHub Profile README', evidenceSnippet: `Profile README exposes contact email: ${email}`,
      evidence_url: `https://github.com/${githubData.username}/${githubData.username}#readme`, confidence: 94,
      description: 'A contact email is published in the special GitHub profile README repository.',
      remediation: 'Remove or obfuscate personal contact details from the profile README.'
    });
  });

  if (githubData?.commitAuthors?.length) {
    findings.push({
      type: 'Identity Exposure', category: 'Commit Author Name', value: githubData.commitAuthors.join(', '), severity: 'Moderate',
      source: 'GitHub PushEvent', evidenceSnippet: `Commit metadata names: ${githubData.commitAuthors.join(', ')}`,
      evidence_url: `https://github.com/${githubData.username}?tab=overview`, confidence: 86,
      description: 'Commit author display names can connect a handle to a real-name identity.',
      remediation: 'Use a consistent privacy-preserving Git identity before publishing commits.'
    });
  }

  if (githubData?.commitDates?.length) {
    const hours = githubData.commitDates.map((date) => new Date(date).getUTCHours());
    const commonHours = new Set(hours).size;
    findings.push({
      type: 'Behavioral Exposure', category: 'Temporal Activity Pattern', value: `${githubData.commitDates.length} public activity timestamps`, severity: 'Low',
      source: 'GitHub Public Events', evidenceSnippet: `Analyzed ${githubData.commitDates.length} public event timestamps across ${commonHours} UTC-hour buckets.`,
      evidence_url: `https://github.com/${githubData.username}?tab=overview`, confidence: 72,
      description: 'Public event timestamps may reveal a recurring work or local-time activity window.',
      remediation: 'Treat commit and activity timestamps as public metadata when evaluating anonymity.'
    });
  }

  if (githubData?.location) {
    findings.push({
      type: 'Location Exposure',
      category: 'Geographic Location',
      value: githubData.location,
      severity: 'Moderate',
      source: 'GitHub Profile',
      evidenceSnippet: `Location declared: "${githubData.location}"`,
      evidence_url: githubData.profile_url || `https://github.com/${githubData.username}`,
      confidence: 90,
      description: 'Specific city/region location disclosed publicly on developer profile.',
      remediation: 'Clear or generalize location field in profile settings.'
    });
  }

  if (githubData?.company) {
    findings.push({
      type: 'Identity Exposure',
      category: 'Employer / Organization',
      value: githubData.company,
      severity: 'Moderate',
      source: 'GitHub Profile',
      evidenceSnippet: `Company disclosure: "${githubData.company}"`,
      evidence_url: githubData.profile_url || `https://github.com/${githubData.username}`,
      confidence: 92,
      description: 'Employer or organization affiliation disclosed on profile.',
      remediation: 'Remove company affiliation if aiming for pseudonymity.'
    });
  }

  if (githubData?.website) {
    findings.push({
      type: 'Identity Exposure',
      category: 'Personal Website / Portfolio',
      value: githubData.website,
      severity: 'Moderate',
      source: 'GitHub Profile',
      evidenceSnippet: `Linked website: ${githubData.website}`,
      evidence_url: githubData.profile_url || `https://github.com/${githubData.username}`,
      confidence: 95,
      description: 'Personal domain or blog URL cross-linked on public profile.',
      remediation: 'Ensure domain WHOIS privacy is active.'
    });
  }

  const langList = Array.from(languages);
  const detectedEmail = githubData?.email || commitEmails[0] || readmeEmails.find((email) => !/noreply\.github\.com$/i.test(email)) || '';

  return {
    platform: 'GitHub',
    username: githubData?.username || 'unknown',
    name: githubData?.name || githubData?.username,
    avatar_url: githubData?.avatar_url,
    predictedState,
    languages: langList,
    identityName: githubData?.name || githubData?.username || 'Undisclosed',
    email: detectedEmail || 'Undisclosed',
    company: githubData?.company || 'None declared',
    website: githubData?.website || 'None declared',
    findings,
    itemCount: githubData?.repos?.length || 0,
    score: findings.length > 2 ? 82 : findings.length > 0 ? 64 : 0,
    exposureLevel: findings.length > 2 ? 'High' : findings.length > 0 ? 'Moderate' : 'Low',
    confidenceScore: calculateEvidenceConfidence(findings)
  };
}

export function extractRedditAudit(redditItems, redditUsername) {
  const findings = [];
  const subreddits = new Set();
  const rdLocationsDetected = new Set();
  const locationEvidence = new Map();
  const externalLinks = new Map();
  const postingHours = [];
  const namedHandles = new Set();

  if (Array.isArray(redditItems)) {
    redditItems.forEach((item) => {
      const text = item.content || item.body || '';
      if (item.context || item.subreddit) {
        subreddits.add(item.subreddit || item.context);
      }
      if (!text) return;
      if (item.createdUtc) postingHours.push(new Date(Number(item.createdUtc) * 1000).getUTCHours());

      (text.match(/https?:\/\/[^\s)\]>]+/gi) || []).forEach((link) => {
        const cleanLink = link.replace(/[.,;:]+$/, '').replace(/svg$/i, '');
        if (!/reddit\.com|redd\.it/i.test(cleanLink)) externalLinks.set(cleanLink, item);
      });
      (text.match(/(?:github\.com|gitlab\.com|twitter\.com|x\.com|linkedin\.com|instagram\.com)\/[A-Za-z0-9_.-]+/gi) || [])
        .forEach((handle) => namedHandles.add(handle));

      // Extract emails & unmangled emails
      const rawEmails = text.match(STANDARD_EMAIL_REGEX) || [];
      const obfuscatedEmails = text.match(EMAIL_REGEX) || [];
      const allEmails = Array.from(new Set([...rawEmails, ...obfuscatedEmails]));

      allEmails.forEach((emailStr) => {
        const cleanEmail = emailStr
          .replace(/\s*\[\s*at\s*\]\s*|\s*\(at\)\s*/gi, '@')
          .replace(/\s*\[\s*dot\s*\]\s*/gi, '.')
          .replace(/\s+/g, '');

        findings.push({
          type: 'Contact Exposure',
          category: 'Un-mangled Email Leak',
          value: cleanEmail,
          severity: 'High',
          source: `Reddit (${item.subreddit || 'post'})`,
          evidenceSnippet: `Comment text snippet: "...${text.slice(Math.max(0, text.indexOf(emailStr) - 30), text.indexOf(emailStr) + emailStr.length + 30)}..."`,
          evidence_url: item.url || item.permalink,
          confidence: 96,
          description: 'Obfuscated or plain-text email address discovered in public Reddit comment.',
          remediation: 'Delete old Reddit comments containing personal email addresses.'
        });
      });

      // Extract Location & State references
      const lowerText = text.toLowerCase();
      LOCATION_KEYWORDS.forEach((locObj) => {
        if (lowerText.includes(locObj.term)) {
          rdLocationsDetected.add(`${locObj.state}, ${locObj.country}`);
          if (!locationEvidence.has(locObj.term)) locationEvidence.set(locObj.term, []);
          locationEvidence.get(locObj.term).push({
            source: `Reddit (${item.subreddit || item.context || 'post'})`,
            snippet: `Mention of location in comment: "${text.slice(0, 160)}..."`,
            url: item.url || item.permalink
          });
        }
      });

      if (item.subreddit === 'r/developersIndia' || item.context === 'r/developersIndia') {
        rdLocationsDetected.add('India (regional subreddit)');
      }
    });
  }

  let predictedState = 'Undisclosed';
  if (rdLocationsDetected.size > 0) {
    predictedState = Array.from(rdLocationsDetected).join(' / ');
  }

  const subList = Array.from(subreddits);
  const emailFinding = findings.find((f) => f.category === 'Un-mangled Email Leak');

  locationEvidence.forEach((evidence, term) => {
    const first = evidence[0];
    findings.push({
      type: 'Location Exposure', category: 'Geographic Disclosure', value: term.toUpperCase(), severity: 'Moderate',
      source: first.source,
      evidenceSnippet: `${first.snippet} (${evidence.length} matching public item${evidence.length === 1 ? '' : 's'})`,
      evidence_url: first.url, confidence: 80,
      description: `Reference to geographic region (${term}) in ${evidence.length} public Reddit item${evidence.length === 1 ? '' : 's'}.`,
      remediation: 'Avoid citing specific cities in public threads.', evidenceCount: evidence.length,
      evidenceItems: evidence.slice(0, 5)
    });
  });

  if (externalLinks.size) {
    const links = Array.from(externalLinks.keys()).slice(0, 8);
    findings.push({
      type: 'Identity Exposure', category: 'External Profile or Website Link', value: links.join(', '), severity: 'Moderate',
      source: 'Reddit public activity', evidenceSnippet: `External link found in public Reddit activity: ${links[0]}`,
      evidence_url: externalLinks.get(links[0])?.permalink, confidence: 84,
      description: 'Public links can connect a Reddit pseudonym to a portfolio, social account, or another identity.',
      remediation: 'Review external links in old posts and remove links that identify your other accounts.'
    });
  }
  if (namedHandles.size) {
    const handles = Array.from(namedHandles).slice(0, 8);
    findings.push({
      type: 'Identity Exposure', category: 'Linked Social or Developer Handle', value: handles.join(', '), severity: 'Moderate',
      source: 'Reddit public activity', evidenceSnippet: `Cross-platform handle reference found: ${handles[0]}`,
      evidence_url: externalLinks.get(`https://${handles[0]}`)?.permalink, confidence: 82,
      description: 'A public profile or developer handle mentioned in Reddit can support cross-platform account correlation.',
      remediation: 'Avoid posting direct links to accounts that you intend to keep separate.'
    });
  }
  if (postingHours.length) {
    const buckets = new Set(postingHours).size;
    findings.push({
      type: 'Behavioral Exposure', category: 'Posting Time Pattern', value: `${postingHours.length} timestamps`, severity: 'Low',
      source: 'Reddit public timestamps', evidenceSnippet: `Analyzed ${postingHours.length} public items across ${buckets} UTC-hour buckets.`,
      evidence_url: `https://www.reddit.com/user/${redditUsername}`, confidence: 72,
      description: 'Repeated posting times may reveal a routine or approximate timezone.',
      remediation: 'Treat public timestamps as identifying metadata when maintaining pseudonymity.'
    });
  }

  return {
    platform: 'Reddit',
    username: redditUsername || 'unknown',
    predictedState,
    subreddits: subList,
    revealedEmail: emailFinding ? emailFinding.value : 'None discovered',
    activitySummary: redditItems?.length ? `Analyzed ${redditItems.length} public posts and comments across ${subList.length} communities.` : 'No public Reddit activity found.',
    findings,
    itemCount: redditItems?.length || 0,
    score: findings.length > 2 ? 86 : findings.length > 0 ? 68 : 0,
    exposureLevel: findings.length > 2 ? 'High' : findings.length > 0 ? 'Moderate' : 'Low',
    confidenceScore: calculateEvidenceConfidence(findings)
  };
}

export function extractHackerNewsAudit(items, username) {
  const findings = [];
  const locations = new Set();
  const links = new Set();
  const hours = [];
  (items || []).forEach((item) => {
    const text = item.body || '';
    if (item.createdAt) hours.push(new Date(item.createdAt).getUTCHours());
    const emails = text.match(STANDARD_EMAIL_REGEX) || [];
    emails.forEach((email) => findings.push({ type: 'Contact Exposure', category: 'Hacker News Email Leak', value: email, severity: 'High', source: 'Hacker News', evidenceSnippet: `Public Hacker News text contains email: ${email}`, evidence_url: item.url, confidence: 94, description: 'An email address is exposed in public Hacker News activity.', remediation: 'Edit or remove the comment/story containing the address.' }));
    LOCATION_KEYWORDS.forEach((loc) => {
      if (text.toLowerCase().includes(loc.term)) {
        locations.add(`${loc.state}, ${loc.country}`);
        findings.push({ type: 'Location Exposure', category: 'Hacker News Location Disclosure', value: loc.term, severity: 'Moderate', source: 'Hacker News', evidenceSnippet: `Location reference found in public HN text: "${text.slice(0, 120)}..."`, evidence_url: item.url, confidence: 78, description: 'A location reference may help correlate this account with a real identity.', remediation: 'Remove unnecessary location details from public discussions.' });
      }
    });
    (text.match(/https?:\/\/[^\s)<]+/gi) || []).forEach((link) => links.add(link));
  });
  if (links.size) {
    const external = Array.from(links).filter((link) => !link.includes('news.ycombinator.com'));
    if (external.length) findings.push({ type: 'Identity Exposure', category: 'External Profile or Website Link', value: external.join(', '), severity: 'Moderate', source: 'Hacker News', evidenceSnippet: `External URL found in public submission: ${external[0]}`, evidence_url: items.find((item) => (item.body || '').includes(external[0]))?.url, confidence: 82, description: 'Links in public Hacker News posts can connect the account to another identity or website.', remediation: 'Review external links in old submissions for personal domains and profiles.' });
  }
  if (hours.length) {
    const buckets = new Set(hours).size;
    if (buckets <= 6) findings.push({ type: 'Behavioral Exposure', category: 'Posting Time Pattern', severity: 'Low', source: 'Hacker News', evidenceSnippet: `Observed ${items.length} public items across ${buckets} UTC-hour buckets.`, evidence_url: `https://news.ycombinator.com/user?id=${username}`, confidence: 74, description: 'A concentrated posting window can reveal a recurring timezone or routine.', remediation: 'Treat public timestamps as potentially identifying metadata.' });
  }
  return { platform: 'Hacker News', username: username || 'unknown', predictedState: Array.from(locations).join(' / ') || 'Undisclosed', findings, activitySummary: items?.length ? `Analyzed ${items.length} public stories and comments for concrete identifiers and metadata.` : 'No public activity found.', itemCount: items?.length || 0, score: findings.length > 2 ? 78 : findings.length ? 58 : 25, exposureLevel: findings.length > 2 ? 'High' : findings.length ? 'Moderate' : 'Low', confidenceScore: calculateEvidenceConfidence(findings) };
}

export function extractStackOverflowAudit(data, input) {
  const items = data?.items || [];
  const profile = data?.profile || {};
  const findings = [];
  const links = new Set();
  const tags = new Set();
  const hours = [];
  const profileUrl = profile.link || `https://stackoverflow.com/users/${input}`;
  if (profile.display_name) findings.push({ type: 'Identity Exposure', category: 'Public Display Name', value: profile.display_name, severity: 'Moderate', source: 'Stack Overflow Profile', evidenceSnippet: `Public display name: ${profile.display_name}`, evidence_url: profileUrl, confidence: 96, description: 'The Stack Overflow profile publicly exposes a display name that may identify or correlate the account.', remediation: 'Use a pseudonymous display name if this profile is intended to remain separate.' });
  if (profile.location) findings.push({ type: 'Location Exposure', category: 'Profile Location', value: profile.location, severity: 'Moderate', source: 'Stack Overflow Profile', evidenceSnippet: `Public profile location: ${profile.location}`, evidence_url: profileUrl, confidence: 92, description: 'A location is publicly declared on the Stack Overflow profile.', remediation: 'Clear or generalize the profile location.' });
  if (profile.website_url) findings.push({ type: 'Identity Exposure', category: 'Profile Website', value: profile.website_url, severity: 'Moderate', source: 'Stack Overflow Profile', evidenceSnippet: `Profile links to: ${profile.website_url}`, evidence_url: profileUrl, confidence: 94, description: 'A personal website can connect this Stack Overflow account to another identity.', remediation: 'Review whether the linked website reveals your real identity.' });
  if (profile.about_me) {
    const aboutEmails = profile.about_me.match(STANDARD_EMAIL_REGEX) || [];
    aboutEmails.forEach((email) => findings.push({ type: 'Contact Exposure', category: 'Profile About Email', value: email, severity: 'High', source: 'Stack Overflow Profile', evidenceSnippet: `Profile about section contains email: ${email}`, evidence_url: profileUrl, confidence: 96, description: 'The public profile about section contains an email address.', remediation: 'Remove personal contact details from the public about section.' }));
  }
  items.forEach((item) => {
    (item.body.match(STANDARD_EMAIL_REGEX) || []).forEach((email) => findings.push({ type: 'Contact Exposure', category: 'Stack Overflow Email Leak', value: email, severity: 'High', source: 'Stack Overflow', evidenceSnippet: `Public post/comment contains email: ${email}`, evidence_url: item.url, confidence: 94, description: 'An email address is exposed in public Stack Overflow activity.', remediation: 'Edit or remove the post or comment containing the email.' }));
    (item.body.match(/https?:\/\/[^\s)\]>]+/gi) || []).forEach((link) => links.add(link.replace(/[.,;:]+$/, '').replace(/svg$/i, '')));
    (item.tags || []).forEach((tag) => tags.add(tag));
    if (item.createdAt) hours.push(new Date(Number(item.createdAt) * 1000).getUTCHours());
  });
  const external = Array.from(links).filter((link) => !/stackoverflow\.com/i.test(link));
  if (external.length) findings.push({ type: 'Identity Exposure', category: 'External Profile or Website Link', value: external.join(', '), severity: 'Moderate', source: 'Stack Overflow public activity', evidenceSnippet: `External link found: ${external[0]}`, evidence_url: items.find((item) => item.body.includes(external[0]))?.url, confidence: 84, description: 'An external link can connect this Stack Overflow profile to another identity.', remediation: 'Review external links in old posts and comments.' });
  if (hours.length && new Set(hours).size <= 6) findings.push({ type: 'Behavioral Exposure', category: 'Answering Time Pattern', severity: 'Low', source: 'Stack Overflow timestamps', evidenceSnippet: `Analyzed ${hours.length} public items across ${new Set(hours).size} UTC-hour buckets.`, evidence_url: `https://stackoverflow.com/users/${input}`, confidence: 72, description: 'Repeated activity times may reveal a routine or timezone.', remediation: 'Treat public timestamps as identifying metadata.' });
  return { platform: 'Stack Overflow', username: input || 'unknown', profile, identityName: profile.display_name || 'Undisclosed', predictedState: profile.location || 'Undisclosed', website: profile.website_url || 'None declared', reputation: profile.reputation || 0, badges: profile.badge_counts || {}, tags: Array.from(tags).slice(0, 12), findings, itemCount: items.length, activitySummary: items.length ? `Analyzed ${items.length} public questions, answers, and comments.` : 'No public Stack Overflow activity found.', score: findings.length > 2 ? 78 : findings.length ? 58 : 0, exposureLevel: findings.length > 2 ? 'High' : findings.length ? 'Moderate' : 'Low', confidenceScore: calculateEvidenceConfidence(findings) };
}
