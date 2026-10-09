/**
 * Cross-Platform Correlation Engine (Identity Exposure Graph Builder)
 * Correlates public GitHub and Reddit footprints to discover identity linkages.
 * Retains strict evidence grounding and uses explicit confidence levels (High / Medium / Low).
 */

export function buildIdentityExposureGraph(user, githubData, redditItems = [], findings = [], hackernewsItems = []) {
  const links = [];

  const ghUser = (githubData?.username || user.github_username || '').toLowerCase();
  const rdUser = (user.reddit_username || '').toLowerCase();
  const hnUser = (user.hackernews_username || '').toLowerCase();

  // 1. Username Correlation
  if (ghUser && rdUser) {
    if (ghUser === rdUser) {
      links.push({
        source_a: 'GitHub (@' + ghUser + ')',
        source_b: 'Reddit (u/' + rdUser + ')',
        signal: 'Exact Username Match',
        confidence: 'High',
        evidence: `Both accounts share the exact pseudonym handle "${ghUser}".`,
        evidence_url: githubData?.profile_url || `https://github.com/${ghUser}`,
        supporting_signals: ['Reused pseudonym across technical communities', 'Single entity namespace']
      });
    } else if (ghUser.includes(rdUser) || rdUser.includes(ghUser) || ghUser.replace(/[-_]/g, '') === rdUser.replace(/[-_]/g, '')) {
      links.push({
        source_a: 'GitHub (@' + ghUser + ')',
        source_b: 'Reddit (u/' + rdUser + ')',
        signal: 'Potential Linkage: High Username Similarity',
        confidence: 'High',
        evidence: `GitHub handle "@${ghUser}" closely matches Reddit handle "u/${rdUser}".`,
        evidence_url: `https://github.com/${ghUser}`,
        supporting_signals: ['Pseudonym variant match', 'Cross-platform alias reuse']
      });
    }
  }

  // 2. Email Address Correlation
  const ghEmail = (githubData?.email || user.email || '').toLowerCase();
  const emailFinding = findings.find((f) => f.category.includes('Email'));

  if (ghEmail && emailFinding) {
    const rdEmail = emailFinding.value.toLowerCase();
    if (ghEmail === rdEmail || rdEmail.includes(ghEmail) || ghEmail.includes(rdEmail)) {
      links.push({
        source_a: 'GitHub Commit / Profile Email',
        source_b: 'Reddit Comment Disclosure',
        signal: 'Direct Linkage: Shared Un-mangled Email Address',
        confidence: 'High',
        evidence: `Exact email match (${ghEmail}) found in GitHub profile/commit headers and Reddit comment thread.`,
        evidence_url: emailFinding.evidence_url,
        supporting_signals: ['Unique personal email identifier', 'Proof of single entity ownership']
      });
    }
  }

  // 3. Location / Region Correlation
  const ghLoc = (githubData?.location || '').toLowerCase();
  const locFinding = findings.find((f) => f.type === 'Location Exposure' && f.source.includes('Reddit'));

  if (ghLoc && locFinding) {
    const rdLoc = locFinding.value.toLowerCase();
    if (ghLoc.includes(rdLoc) || rdLoc.includes(ghLoc)) {
      links.push({
        source_a: 'GitHub Location Field',
        source_b: 'Reddit Post Content',
        signal: 'Supporting Signal: Matching Geographic Location',
        confidence: 'Medium',
        evidence: `GitHub profile declares "${githubData.location}" and Reddit activity discusses "${locFinding.value}".`,
        evidence_url: locFinding.evidence_url,
        supporting_signals: [`Co-located activity in ${locFinding.value}`, 'Geographic area overlap']
      });
    }
  }

  // 4. Company / Organization Correlation
  const ghCompany = (githubData?.company || '').toLowerCase();
  const orgFinding = findings.find((f) => f.category === 'Affiliation Mention');

  if (ghCompany && orgFinding) {
    const rdOrg = orgFinding.value.toLowerCase();
    if (ghCompany.includes(rdOrg) || rdOrg.includes(ghCompany)) {
      links.push({
        source_a: 'GitHub Company Field',
        source_b: 'Reddit Discussion Thread',
        signal: 'Supporting Signal: Shared Employer / Organization Affiliation',
        confidence: 'Medium',
        evidence: `GitHub profile lists employer "${githubData.company}" while Reddit posts reference "${orgFinding.value}".`,
        evidence_url: orgFinding.evidence_url,
        supporting_signals: ['Identical workplace context', 'Organizational overlap']
      });
    }
  }

  // 5. Technical Project / Repository Reference Correlation
  if (Array.isArray(githubData?.repos)) {
    githubData.repos.forEach((repo) => {
      const repoName = repo.name.toLowerCase();
      const repoMatch = redditItems?.find((it) => (it.content || it.body || '').toLowerCase().includes(repoName));
      if (repoMatch) {
        links.push({
          source_a: `GitHub Repository (${repo.name})`,
          source_b: `Reddit Comment (${repoMatch.context})`,
          signal: 'Potential Linkage: Cross-Referenced Open Source Project',
          confidence: 'High',
          evidence: `Reddit post in ${repoMatch.context} explicitly references GitHub repository "${repo.name}".`,
          evidence_url: repoMatch.url || repoMatch.permalink,
          supporting_signals: [`Direct project citation: ${repo.name}`, 'Overlapping technical repository ownership']
        });
      }
    });
  }

  // 6. Website / Portfolio Correlation
  const ghWeb = (githubData?.website || '').toLowerCase();
  const webMatch = redditItems?.find((it) => ghWeb && (it.content || it.body || '').toLowerCase().includes(ghWeb.replace(/https?:\/\//, '')));

  if (ghWeb && webMatch) {
    links.push({
      source_a: 'GitHub Website Field',
      source_b: 'Reddit Comment Link',
      signal: 'Direct Linkage: Shared Personal Domain / Website',
      confidence: 'High',
      evidence: `GitHub profile website (${githubData.website}) is linked directly in Reddit comment history.`,
      evidence_url: webMatch.url || webMatch.permalink,
      supporting_signals: ['Same canonical personal domain', 'Direct self-promotion link']
    });
  }

  // Hacker News signals: public external links and repeated handles can
  // connect an HN identity to the other profiles without guessing identity.
  if (hnUser && ghUser && hnUser === ghUser) {
    links.push({
      source_a: `GitHub (@${ghUser})`,
      source_b: `Hacker News (${hnUser})`,
      signal: 'Exact Username Match',
      confidence: 'High',
      evidence: `Both public profiles use the exact handle "${hnUser}".`,
      evidence_url: `https://news.ycombinator.com/user?id=${hnUser}`,
      supporting_signals: ['Reused pseudonym across technical communities']
    });
  }

  if (hnUser && Array.isArray(hackernewsItems) && githubData?.website) {
    const site = githubData.website.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    const hnMatch = hackernewsItems.find((item) => String(item.body || '').toLowerCase().includes(site));
    if (hnMatch) {
      links.push({
        source_a: 'GitHub Website / Portfolio',
        source_b: `Hacker News (${hnUser})`,
        signal: 'Direct Linkage: Shared Personal Domain / Website',
        confidence: 'High',
        evidence: `Hacker News activity references the GitHub-linked website ${githubData.website}.`,
        evidence_url: hnMatch.url || `https://news.ycombinator.com/user?id=${hnUser}`,
        supporting_signals: ['Same canonical personal domain', 'Public cross-reference']
      });
    }
  }

  return links;
}
