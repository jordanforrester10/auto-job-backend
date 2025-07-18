// backend/services/companyMatching.service.js
class CompanyMatchingService {
  constructor() {
    // Common company suffixes and their variations
    this.companySuffixes = [
      'inc', 'incorporated', 'corp', 'corporation', 'company', 'co',
      'llc', 'ltd', 'limited', 'lp', 'partnership', 'pllc', 'pa',
      'group', 'holdings', 'enterprises', 'systems', 'solutions',
      'services', 'technologies', 'tech', 'international', 'intl',
      'global', 'worldwide', 'ventures', 'capital', 'partners',
      'associates', 'consulting', 'communications', 'industries',
      'manufacturing', 'development', 'research', 'institute',
      'foundation', 'organization', 'org', 'agency', 'bureau'
    ];

    // Common abbreviations and their full forms
    this.abbreviations = {
      'tech': 'technology',
      'mfg': 'manufacturing',
      'mgmt': 'management',
      'dev': 'development',
      'sys': 'systems',
      'sol': 'solutions',
      'svc': 'services',
      'svcs': 'services',
      'grp': 'group',
      'corp': 'corporation',
      'inc': 'incorporated',
      'intl': 'international',
      'natl': 'national',
      'assoc': 'associates',
      'comm': 'communications',
      'cons': 'consulting',
      'res': 'research',
      'inst': 'institute'
    };

    // Words to ignore/normalize
    this.ignoreWords = [
      'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to',
      'for', 'with', 'by', 'from', 'up', 'about', 'into', 'through',
      'during', 'before', 'after', 'above', 'below', 'between'
    ];
  }

  /**
   * Normalize company name for matching
   * @param {string} companyName - Original company name
   * @returns {string} - Normalized company name
   */
  normalizeCompanyName(companyName) {
    if (!companyName || typeof companyName !== 'string') {
      return '';
    }

    let normalized = companyName.toLowerCase().trim();

    // Remove special characters and extra spaces
    normalized = normalized
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Split into words
    let words = normalized.split(' ');

    // Remove common suffixes
    words = this.removeSuffixes(words);

    // Expand abbreviations
    words = words.map(word => this.abbreviations[word] || word);

    // Remove ignore words (but keep at least one meaningful word)
    const meaningfulWords = words.filter(word => !this.ignoreWords.includes(word));
    if (meaningfulWords.length > 0) {
      words = meaningfulWords;
    }

    // Remove empty words
    words = words.filter(word => word.length > 0);

    return words.join(' ').trim();
  }

  /**
   * Remove common company suffixes from word array
   * @param {string[]} words - Array of words
   * @returns {string[]} - Words with suffixes removed
   */
  removeSuffixes(words) {
    // Remove suffixes from the end, but keep at least one word
    while (words.length > 1 && this.companySuffixes.includes(words[words.length - 1])) {
      words.pop();
    }
    return words;
  }

  /**
   * Generate variations of a company name for matching
   * @param {string} companyName - Original company name
   * @returns {string[]} - Array of name variations
   */
  generateNameVariations(companyName) {
    const variations = new Set();
    
    // Original name
    variations.add(companyName.toLowerCase().trim());

    // Normalized version
    const normalized = this.normalizeCompanyName(companyName);
    if (normalized) {
      variations.add(normalized);
    }

    // Remove punctuation
    const noPunctuation = companyName
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    variations.add(noPunctuation);

    // Acronym version (for companies with multiple words)
    const words = noPunctuation.split(' ').filter(word => word.length > 0);
    if (words.length > 1) {
      const acronym = words
        .filter(word => !this.companySuffixes.includes(word) && !this.ignoreWords.includes(word))
        .map(word => word.charAt(0))
        .join('');
      if (acronym.length >= 2) {
        variations.add(acronym);
      }
    }

    // Without common suffixes
    const withoutSuffixes = this.normalizeCompanyName(companyName);
    if (withoutSuffixes && withoutSuffixes !== normalized) {
      variations.add(withoutSuffixes);
    }

    // Remove empty variations
    return Array.from(variations).filter(v => v && v.length > 0);
  }

  /**
   * Calculate similarity score between two company names
   * @param {string} name1 - First company name
   * @param {string} name2 - Second company name
   * @returns {number} - Similarity score (0-1)
   */
  calculateSimilarity(name1, name2) {
    if (!name1 || !name2) return 0;

    const norm1 = this.normalizeCompanyName(name1);
    const norm2 = this.normalizeCompanyName(name2);

    // Exact match
    if (norm1 === norm2) return 1;

    // Levenshtein distance based similarity
    const distance = this.levenshteinDistance(norm1, norm2);
    const maxLength = Math.max(norm1.length, norm2.length);
    const similarity = maxLength > 0 ? 1 - (distance / maxLength) : 0;

    // Boost score for word overlap
    const words1 = new Set(norm1.split(' ').filter(w => w.length > 1));
    const words2 = new Set(norm2.split(' ').filter(w => w.length > 1));
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    const wordOverlap = union.size > 0 ? intersection.size / union.size : 0;
    
    // Combined score with word overlap boost
    return Math.max(similarity, wordOverlap * 0.8);
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param {string} str1 - First string
   * @param {string} str2 - Second string
   * @returns {number} - Edit distance
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Find best matching company from a list
   * @param {string} targetCompany - Company name to match
   * @param {Array} candidateCompanies - Array of companies to search
   * @param {number} threshold - Minimum similarity threshold (default: 0.8)
   * @returns {Object|null} - Best match with score, or null if no good match
   */
  findBestMatch(targetCompany, candidateCompanies, threshold = 0.8) {
    let bestMatch = null;
    let bestScore = 0;

    const targetVariations = this.generateNameVariations(targetCompany);

    for (const candidate of candidateCompanies) {
      const candidateName = candidate.companyName || candidate.name || candidate;
      const candidateVariations = this.generateNameVariations(candidateName);

      // Check all combinations of variations
      for (const targetVar of targetVariations) {
        for (const candidateVar of candidateVariations) {
          const score = this.calculateSimilarity(targetVar, candidateVar);
          
          if (score > bestScore && score >= threshold) {
            bestScore = score;
            bestMatch = {
              company: candidate,
              score: score,
              matchedTargetVariation: targetVar,
              matchedCandidateVariation: candidateVar
            };
          }
        }
      }
    }

    return bestMatch;
  }

  /**
   * Batch match PostgreSQL companies against MongoDB H1B companies
   * @param {Array} pgCompanies - PostgreSQL companies
   * @param {Array} h1bCompanies - MongoDB H1B companies
   * @param {number} threshold - Similarity threshold
   * @returns {Array} - Array of matches
   */
  batchMatchCompanies(pgCompanies, h1bCompanies, threshold = 0.8) {
    const matches = [];
    const processed = new Set();

    console.log(`🔍 Starting batch matching of ${pgCompanies.length} PG companies against ${h1bCompanies.length} H1B companies`);

    for (let i = 0; i < pgCompanies.length; i++) {
      const pgCompany = pgCompanies[i];
      
      if (i % 100 === 0) {
        console.log(`📊 Progress: ${i}/${pgCompanies.length} (${Math.round(i/pgCompanies.length*100)}%)`);
      }

      if (!pgCompany.name || processed.has(pgCompany.name.toLowerCase())) {
        continue;
      }

      processed.add(pgCompany.name.toLowerCase());

      const match = this.findBestMatch(pgCompany.name, h1bCompanies, threshold);
      
      if (match) {
        matches.push({
          pgCompany: pgCompany,
          h1bCompany: match.company,
          similarity: match.score,
          matchDetails: {
            targetVariation: match.matchedTargetVariation,
            candidateVariation: match.matchedCandidateVariation
          }
        });

        console.log(`✅ Match found: "${pgCompany.name}" → "${match.company.companyName}" (${Math.round(match.score * 100)}%)`);
      }
    }

    console.log(`🎯 Batch matching complete: ${matches.length} matches found`);
    return matches;
  }

  /**
   * Quick lookup table for exact matches
   * @param {Array} h1bCompanies - H1B companies to create lookup for
   * @returns {Map} - Lookup map with normalized names as keys
   */
  createLookupTable(h1bCompanies) {
    const lookup = new Map();
    
    for (const h1bCompany of h1bCompanies) {
      const variations = this.generateNameVariations(h1bCompany.companyName);
      
      for (const variation of variations) {
        if (!lookup.has(variation)) {
          lookup.set(variation, []);
        }
        lookup.get(variation).push(h1bCompany);
      }
    }

    console.log(`📚 Created lookup table with ${lookup.size} normalized name variations`);
    return lookup;
  }

  /**
   * Fast lookup using pre-built table
   * @param {string} companyName - Company name to lookup
   * @param {Map} lookupTable - Pre-built lookup table
   * @returns {Array} - Array of potential matches
   */
  fastLookup(companyName, lookupTable) {
    const variations = this.generateNameVariations(companyName);
    const matches = new Set();

    for (const variation of variations) {
      const candidates = lookupTable.get(variation);
      if (candidates) {
        candidates.forEach(candidate => matches.add(candidate));
      }
    }

    return Array.from(matches);
  }
}

module.exports = new CompanyMatchingService();