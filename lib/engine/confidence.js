/**
 * Explainable Confidence Calculation Engine
 * 
 * Replaces hardcoded confidence scores with a multi-factor grounded formula:
 * C = min(99, max(20, S_base + Δ_entropy + Δ_evidence + Δ_corroboration - Δ_ambiguity))
 */

export function calculateFindingConfidence(finding = {}, occurrenceCount = 1) {
  const type = String(finding.type || '').toLowerCase();
  const category = String(finding.category || '').toLowerCase();
  const value = String(finding.value || '');
  const evidence = String(finding.evidenceSnippet || finding.description || finding.fullText || '');
  const url = String(finding.evidence_url || finding.url || '');

  // 1. Base Score (S_base)
  let sBase = 40;
  if (type.includes('contact') || category.includes('email') || /@/.test(value)) {
    sBase = 65; // Direct identifier / email
  } else if (type.includes('handle') || category.includes('username') || category.includes('linkage')) {
    sBase = 60; // Direct account pseudonym
  } else if (type.includes('identity') || category.includes('organization') || category.includes('affiliation') || category.includes('employer')) {
    sBase = 45; // Structured affiliation
  } else if (type.includes('location') || category.includes('geographic') || category.includes('state') || category.includes('city')) {
    sBase = 35; // Geographic indicator
  } else if (type.includes('behavioral') || category.includes('temporal') || category.includes('routine')) {
    sBase = 30; // Behavioral habit
  } else {
    sBase = 35;
  }

  // 2. Information Specificity / Entropy (Δ_entropy: 0 - 20)
  let deltaEntropy = 5;
  const valLower = value.toLowerCase();
  if (/@/.test(value) || /noreply/i.test(value)) {
    deltaEntropy = 20; // Personal address is globally unique
  } else if (/\b(vit|vjti|coep|spit|pict|iit|bits|nit)\b/i.test(valLower) || /(college|university|institute)/i.test(valLower)) {
    deltaEntropy = 15; // Specific university narrows candidate set
  } else if (/\b(mumbai|bengaluru|bangalore|delhi|pune|hyderabad|chennai)\b/i.test(valLower)) {
    deltaEntropy = 8; // Metropolitan city
  } else if (value.length > 25) {
    deltaEntropy = 12; // Long distinct string
  } else if (value.length > 10) {
    deltaEntropy = 8;
  } else {
    deltaEntropy = 4;
  }

  // 3. Evidence Grounding Quality (Δ_evidence: 0 - 15)
  let deltaEvidence = 0;
  if (evidence.trim().length > 15) deltaEvidence += 5;
  if (url.startsWith('http://') || url.startsWith('https://')) deltaEvidence += 5;
  if (finding.source && finding.source !== 'unknown') deltaEvidence += 5;

  // 4. Corroboration / Occurrence Frequency (Δ_corroboration: 0 - 15)
  const k = Math.max(1, Number(occurrenceCount) || 1);
  const deltaCorroboration = Math.min(15, (k - 1) * 5);

  // 5. Ambiguity Penalty (Δ_ambiguity: 0 - 25)
  let deltaAmbiguity = 0;
  const evidLower = evidence.toLowerCase();
  if (/\b(not my|friend|someone else|heard about|news)\b/i.test(evidLower)) {
    deltaAmbiguity += 20; // Disclaimed association in context
  }
  if (value.trim().length > 0 && value.trim().length < 4 && !/@/.test(value)) {
    deltaAmbiguity += 10; // Very short abbreviations
  }
  if (evidence.trim().length < 10) {
    deltaAmbiguity += 10; // Insufficient context
  }

  // Final Clamped Calculation
  const rawScore = sBase + deltaEntropy + deltaEvidence + deltaCorroboration - deltaAmbiguity;
  const finalScore = Math.min(99, Math.max(20, Math.round(rawScore)));

  return {
    confidence: finalScore,
    breakdown: {
      base: sBase,
      entropy: deltaEntropy,
      evidence: deltaEvidence,
      corroboration: deltaCorroboration,
      ambiguity: deltaAmbiguity
    }
  };
}

export function calculateLinkConfidence(link = {}) {
  const signal = String(link.signal || '').toLowerCase();
  const evidence = String(link.evidence || '');
  const url = String(link.evidence_url || '');

  let sBase = 45;
  let deltaEntropy = 5;

  if (signal.includes('exact username')) {
    sBase = 70;
    deltaEntropy = 20;
  } else if (signal.includes('email')) {
    sBase = 75;
    deltaEntropy = 20;
  } else if (signal.includes('website') || signal.includes('domain')) {
    sBase = 65;
    deltaEntropy = 18;
  } else if (signal.includes('repository')) {
    sBase = 55;
    deltaEntropy = 15;
  } else if (signal.includes('similarity')) {
    sBase = 45;
    deltaEntropy = 10;
  } else if (signal.includes('employer') || signal.includes('affiliation')) {
    sBase = 40;
    deltaEntropy = 10;
  } else if (signal.includes('location')) {
    sBase = 30;
    deltaEntropy = 5;
  }

  let deltaEvidence = 0;
  if (evidence.length > 20) deltaEvidence += 5;
  if (url.startsWith('http://') || url.startsWith('https://')) deltaEvidence += 5;

  const rawScore = sBase + deltaEntropy + deltaEvidence;
  const finalScore = Math.min(99, Math.max(25, Math.round(rawScore)));

  const confidenceTier = finalScore >= 75 ? 'High' : finalScore >= 50 ? 'Medium' : 'Low';

  return {
    confidenceScore: finalScore,
    confidenceTier,
    breakdown: {
      base: sBase,
      entropy: deltaEntropy,
      evidence: deltaEvidence
    }
  };
}

