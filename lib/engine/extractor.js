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

  if (Array.isArray(redditItems)) {
    redditItems.forEach((item) => {
      const text = item.content || item.body || '';
      if (item.context || item.subreddit) {
        subreddits.add(item.subreddit || item.context);
      }
      if (!text) return;

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
          findings.push({
            type: 'Location Exposure',
            category: 'Geographic Disclosure',
            value: locObj.term.toUpperCase(),
            severity: 'Moderate',
            source: `Reddit (${item.subreddit || 'post'})`,
            evidenceSnippet: `Mention of location in comment: "${text.slice(0, 100)}..."`,
            evidence_url: item.url || item.permalink,
            confidence: 80,
            description: `Reference to geographic region (${locObj.term}) in community discussions.`,
            remediation: 'Avoid citing specific cities in public threads.'
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

  return {
    platform: 'Reddit',
    username: redditUsername || 'unknown',
    predictedState,
    subreddits: subList,
    revealedEmail: emailFinding ? emailFinding.value : 'None discovered',
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
