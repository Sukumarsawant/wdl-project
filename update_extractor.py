import re
from pathlib import Path

path = Path('lib/engine/extractor.js')
content = path.read_text(encoding='utf-8')

# Ensure import
if "from './confidence.js'" not in content:
    content = "import { calculateFindingConfidence } from './confidence.js';\n" + content

# Replace calculateEvidenceConfidence
old_calc_pattern = re.compile(
    r'function calculateEvidenceConfidence\(findings\) \{[\s\S]*?return Math\.round\(total / findings\.length\);\s*\}',
    re.MULTILINE
)

new_calc = """function calculateEvidenceConfidence(findings) {
  if (!findings || !findings.length) return 0;
  const total = findings.reduce((sum, finding) => {
    return sum + (finding.confidence || 0);
  }, 0);
  return Math.round(total / findings.length);
}

function attachConfidence(finding, count = 1) {
  const result = calculateFindingConfidence(finding, count);
  return {
    ...finding,
    confidence: result.confidence,
    confidenceBreakdown: result.breakdown
  };
}"""

content = old_calc_pattern.sub(new_calc, content)

# Now replace findings.push(...) with attachConfidence(...) or calculateFindingConfidence
# In extractGithubAudit:
# replace `findings.push({` with `findings.push(attachConfidence({` and matching close `});` with `}));`
# Better: let's scan where findings.push is called, or at the end of each extractor:
# findings = findings.map(f => attachConfidence(f));

# Let's inspect each extractor function in extractor.js:
# In extractGithubAudit:
# replace `return {` with `const processedFindings = findings.map(f => attachConfidence(f));\n  return {`
# and update findings: processedFindings, confidenceScore: calculateEvidenceConfidence(processedFindings)

content = re.sub(
    r'(\s+)return \{\s+platform:\s*\'GitHub\',',
    r'\1const processedFindings = findings.map(f => attachConfidence(f));\n\1return {\n\1  platform: \'GitHub\',',
    content
)

content = re.sub(
    r'findings,\s*itemCount: githubData\?\.repos\?\.length \|\| 0,\s*score: findings\.length > 2 \? 82 : findings\.length > 0 \? 64 : 0,\s*exposureLevel: findings\.length > 2 \? \'High\' : findings\.length > 0 \? \'Moderate\' : \'Low\',\s*confidenceScore: calculateEvidenceConfidence\(findings\)',
    'findings: processedFindings,\n    itemCount: githubData?.repos?.length || 0,\n    score: processedFindings.length > 2 ? 82 : processedFindings.length > 0 ? 64 : 0,\n    exposureLevel: processedFindings.length > 2 ? \'High\' : processedFindings.length > 0 ? \'Moderate\' : \'Low\',\n    confidenceScore: calculateEvidenceConfidence(processedFindings)',
    content
)

# For Reddit:
content = re.sub(
    r'(\s+)return \{\s+platform:\s*\'Reddit\',',
    r'\1const processedFindings = findings.map(f => attachConfidence(f, f.evidenceCount || 1));\n\1return {\n\1  platform: \'Reddit\',',
    content
)

content = re.sub(
    r'findings,\s*itemCount: redditItems\?\.length \|\| 0,\s*score: findings\.length > 2 \? 86 : findings\.length > 0 \? 68 : 0,\s*exposureLevel: findings\.length > 2 \? \'High\' : findings\.length > 0 \? \'Moderate\' : \'Low\',\s*confidenceScore: calculateEvidenceConfidence\(findings\)',
    'findings: processedFindings,\n    itemCount: redditItems?.length || 0,\n    score: processedFindings.length > 2 ? 86 : processedFindings.length > 0 ? 68 : 0,\n    exposureLevel: processedFindings.length > 2 ? \'High\' : processedFindings.length > 0 ? \'Moderate\' : \'Low\',\n    confidenceScore: calculateEvidenceConfidence(processedFindings)',
    content
)

# For Hacker News:
content = re.sub(
    r'return \{ platform: \'Hacker News\', username: username \|\| \'unknown\', predictedState: Array\.from\(locations\)\.join\(\' / \'॥ \|\| \'Undisclosed\', findings, activitySummary: items\?\.length \? `Analyzed \$\{items\.length\} public stories and comments for concrete identifiers and metadata\.` : \'No public activity found\.\', itemCount: items\?\.length \|\| 0, score: findings\.length > 2 \? 78 : findings\.length \? 58 : 25, exposureLevel: findings\.length > 2 \? \'High\' : findings\.length \? \'Moderate\' : \'Low\', confidenceScore: calculateEvidenceConfidence\(findings\) \};',
    '''const processedFindings = findings.map(f => attachConfidence(f));
  return { platform: 'Hacker News', username: username || 'unknown', predictedState: Array.from(locations).join(' / ') || 'Undisclosed', findings: processedFindings, activitySummary: items?.length ? `Analyzed ${items.length} public stories and comments for concrete identifiers and metadata.` : 'No public activity found.', itemCount: items?.length || 0, score: processedFindings.length > 2 ? 78 : processedFindings.length ? 58 : 25, exposureLevel: processedFindings.length > 2 ? 'High' : processedFindings.length ? 'Moderate' : 'Low', confidenceScore: calculateEvidenceConfidence(processedFindings) };''',
    content
)

# For Stack Overflow:
content = re.sub(
    r'return \{ platform: \'Stack Overflow\', username: input \|\| \'unknown\', profile, identityName: profile\.display_name \|\| \'Undisclosed\', predictedState: profile\.location \|\| \'Undisclosed\', website: profile\.website_url \|\| \'None declared\', reputation: profile\.reputation \|\| 0, badges: profile\.badge_counts \|\| \{\}, tags: Array\.from\(tags\)\.slice\(0, 12\), findings, itemCount: items\.length, activitySummary: items\.length \? `Analyzed \$\{items\.length\} public questions, answers, and comments\.` : \'No public Stack Overflow activity found\.\', score: findings\.length > 2 \? 78 : findings\.length \? 58 : 0, exposureLevel: findings\.length > 2 \? \'High\' : findings\.length \? \'Moderate\' : \'Low\', confidenceScore: calculateEvidenceConfidence\(findings\) \};',
    '''const processedFindings = findings.map(f => attachConfidence(f));
  return { platform: 'Stack Overflow', username: input || 'unknown', profile, identityName: profile.display_name || 'Undisclosed', predictedState: profile.location || 'Undisclosed', website: profile.website_url || 'None declared', reputation: profile.reputation || 0, badges: profile.badge_counts || {}, tags: Array.from(tags).slice(0, 12), findings: processedFindings, itemCount: items.length, activitySummary: items.length ? `Analyzed ${items.length} public questions, answers, and comments.` : 'No public Stack Overflow activity found.', score: processedFindings.length > 2 ? 78 : processedFindings.length ? 58 : 0, exposureLevel: processedFindings.length > 2 ? 'High' : processedFindings.length ? 'Moderate' : 'Low', confidenceScore: calculateEvidenceConfidence(processedFindings) };''',
    content
)

path.write_text(content, encoding='utf-8')
print("Successfully updated extractor.js")

