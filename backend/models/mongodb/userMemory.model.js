// backend/models/mongodb/userMemory.model.js - FIXED SCHEMA FOR INSIGHTS
const mongoose = require('mongoose');

const memoryEntrySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: [
      'preference',
      'skill',
      'career_goal',
      'experience',
      'achievement',
      'challenge',
      'personality_trait',
      'communication_style',
      'work_style',
      'industry_knowledge',
      'tool_preference',
      'feedback_pattern',
      'education',           // ADDED: For degrees, certifications, etc.
      'learning_goal',       // ADDED: For things like "want to learn Python"
      'weakness'             // ADDED: For challenges like "system design interviews"
    ],
    required: true
  },
  category: {
    type: String,
    enum: [
      'personal',
      'professional',
      'technical',
      'behavioral',
      'contextual'
    ],
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.8
  },
  importance: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  source: {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation'
    },
    messageId: String,
    extractionMethod: {
      type: String,
      enum: [
        'explicit', 
        'inferred', 
        'pattern_detected', 
        'user_confirmed',
        'ai_extracted',
        'summary_extracted',
        'user_added'
      ],
      default: 'inferred'
    },
    model: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  context: {
    resumeIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume'
    }],
    jobIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    }],
    timeframe: {
      from: Date,
      to: Date
    },
    situation: String
  },
  verification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,
    verificationMethod: {
      type: String,
      enum: ['user_confirmed', 'repeated_observation', 'cross_referenced']
    },
    verificationCount: {
      type: Number,
      default: 0
    }
  },
  usage: {
    accessCount: {
      type: Number,
      default: 0
    },
    lastAccessedAt: Date,
    effectivenessRating: {
      type: Number,
      min: 1,
      max: 5
    },
    userFeedback: String
  },
  relationships: [{
    relatedMemoryId: String,
    relationshipType: {
      type: String,
      enum: ['reinforces', 'contradicts', 'builds_on', 'specifies', 'generalizes']
    },
    strength: {
      type: Number,
      min: 0,
      max: 1
    }
  }],
  decay: {
    lastReinforced: {
      type: Date,
      default: Date.now
    },
    reinforcementCount: {
      type: Number,
      default: 1
    },
    decayRate: {
      type: Number,
      default: 0.1
    }
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  _id: false
});

const userMemorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  memories: [memoryEntrySchema],
  
  // User profile intelligence derived from memories
  profile: {
    careerStage: {
      type: String,
      enum: ['student', 'entry_level', 'mid_level', 'senior_level', 'executive', 'career_changer', 'returning_professional'],
      confidence: Number
    },
    industries: [{
      name: String,
      experience_level: String,
      interest_level: Number,
      confidence: Number
    }],
    skills: [{
      name: String,
      level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'expert']
      },
      confidence: Number,
      lastMentioned: Date
    }],
    personalityTraits: [{
      trait: String,
      strength: Number,
      confidence: Number
    }],
    communicationStyle: {
      formality: {
        type: String,
        enum: ['very_formal', 'formal', 'neutral', 'casual', 'very_casual']
      },
      detail_preference: {
        type: String,
        enum: ['brief', 'moderate', 'detailed', 'comprehensive']
      },
      learning_style: {
        type: String,
        enum: ['visual', 'auditory', 'kinesthetic', 'reading']
      },
      feedback_preference: {
        type: String,
        enum: ['direct', 'gentle', 'detailed', 'actionable']
      }
    },
    goals: [{
      type: {
        type: String,
        enum: ['short_term', 'medium_term', 'long_term']
      },
      category: {
        type: String,
        enum: ['career', 'skill', 'personal', 'financial']
      },
      description: String,
      priority: Number,
      deadline: Date,
      progress: Number,
      confidence: Number
    }],
    preferences: {
      work_environment: [{
        type: String,
        preference_level: Number
      }],
      company_size: {
        type: String,
        enum: ['startup', 'small', 'medium', 'large', 'enterprise']
      },
      work_style: {
        type: String,
        enum: ['independent', 'collaborative', 'mixed']
      },
      communication_frequency: {
        type: String,
        enum: ['minimal', 'regular', 'frequent', 'constant']
      }
    }
  },

  // FIXED: Memory analytics with proper object schemas
  analytics: {
    totalMemories: {
      type: Number,
      default: 0
    },
    // FIXED: Array of objects with proper schema definition
    memoriesByType: [{
      _id: false,  // Disable _id for subdocuments
      type: {
        type: String,
        required: true
      },
      count: {
        type: Number,
        required: true
      }
    }],
    // FIXED: Array of objects with proper schema definition
    memoriesByCategory: [{
      _id: false,  // Disable _id for subdocuments
      category: {
        type: String,
        required: true
      },
      count: {
        type: Number,
        required: true
      }
    }],
    averageConfidence: {
      type: Number,
      default: 0
    },
    memoryAccuracy: {
      type: Number,
      default: 0
    },
    lastAnalyzedAt: Date,
    // FIXED: Array of insight objects with proper schema definition
    insights: [{
      _id: false,  // Disable _id for subdocuments
      type: {
        type: String,
        enum: ['pattern', 'opportunity', 'strength', 'challenge', 'recommendation'],
        required: true
      },
      description: {
        type: String,
        required: true
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1,
        required: true
      },
      actionable: {
        type: Boolean,
        required: true
      },
      generatedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },

  // Memory management settings
  settings: {
    memoryRetention: {
      type: String,
      enum: ['aggressive', 'normal', 'conservative'],
      default: 'normal'
    },
    autoDecay: {
      type: Boolean,
      default: true
    },
    requireVerification: {
      type: Boolean,
      default: false
    },
    shareInsights: {
      type: Boolean,
      default: true
    },
    maxMemories: {
      type: Number,
      default: 1000
    }
  },

  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
userMemorySchema.index({ userId: 1 });
userMemorySchema.index({ 'memories.type': 1 });
userMemorySchema.index({ 'memories.category': 1 });
userMemorySchema.index({ 'memories.importance': 1 });
userMemorySchema.index({ 'memories.tags': 1 });
userMemorySchema.index({ 'memories.isActive': 1 });
userMemorySchema.index({ 'memories.confidence': -1 });

// Instance methods
userMemorySchema.methods.addMemory = function(memoryData) {
  const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const memory = {
    id: memoryId,
    type: memoryData.type,
    category: memoryData.category,
    content: memoryData.content,
    confidence: memoryData.confidence || 0.8,
    importance: memoryData.importance || 'medium',
    source: {
      ...memoryData.source,
      timestamp: new Date()
    },
    context: memoryData.context || {},
    tags: memoryData.tags || [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // Check for similar memories to avoid duplicates
  const similarMemory = this.findSimilarMemory(memory);
  if (similarMemory) {
    return this.reinforceMemory(similarMemory.id, memory);
  }
  
  this.memories.push(memory);
  this.analytics.totalMemories = this.memories.length;
  this.lastUpdated = new Date();
  
  return memory;
};

userMemorySchema.methods.findSimilarMemory = function(newMemory) {
  return this.memories.find(existing => 
    existing.type === newMemory.type &&
    existing.category === newMemory.category &&
    this.calculateSimilarity(existing.content, newMemory.content) > 0.8
  );
};

userMemorySchema.methods.calculateSimilarity = function(content1, content2) {
  const words1 = content1.toLowerCase().split(' ');
  const words2 = content2.toLowerCase().split(' ');
  const commonWords = words1.filter(word => words2.includes(word));
  return commonWords.length / Math.max(words1.length, words2.length);
};

userMemorySchema.methods.reinforceMemory = function(memoryId, reinforcementData) {
  const memory = this.memories.find(m => m.id === memoryId);
  if (memory) {
    memory.decay.lastReinforced = new Date();
    memory.decay.reinforcementCount += 1;
    memory.confidence = Math.min(1, memory.confidence + 0.1);
    
    if (reinforcementData) {
      memory.content = reinforcementData.content || memory.content;
      memory.tags = [...new Set([...memory.tags, ...(reinforcementData.tags || [])])];
    }
    
    this.lastUpdated = new Date();
    return memory;
  }
  return null;
};

userMemorySchema.methods.getMemoriesByType = function(type, options = {}) {
  let memories = this.memories.filter(m => m.type === type && m.isActive);
  
  if (options.minConfidence) {
    memories = memories.filter(m => m.confidence >= options.minConfidence);
  }
  
  if (options.importance) {
    memories = memories.filter(m => m.importance === options.importance);
  }
  
  return memories.sort((a, b) => {
    if (options.sortBy === 'confidence') return b.confidence - a.confidence;
    if (options.sortBy === 'recent') return new Date(b.updatedAt) - new Date(a.updatedAt);
    return b.decay.reinforcementCount - a.decay.reinforcementCount;
  });
};

userMemorySchema.methods.searchMemories = function(query, options = {}) {
  const searchRegex = new RegExp(query, 'i');
  
  let memories = this.memories.filter(m => 
    m.isActive && (
      searchRegex.test(m.content) ||
      m.tags.some(tag => searchRegex.test(tag)) ||
      searchRegex.test(m.type) ||
      searchRegex.test(m.category)
    )
  );
  
  if (options.minConfidence) {
    memories = memories.filter(m => m.confidence >= options.minConfidence);
  }
  
  return memories.sort((a, b) => b.confidence - a.confidence);
};

userMemorySchema.methods.getRelevantMemories = function(context, limit = 10) {
  let relevantMemories = [];
  
  // Get memories by context tags
  if (context.tags && context.tags.length > 0) {
    const taggedMemories = this.memories.filter(m => 
      m.isActive && m.tags.some(tag => context.tags.includes(tag))
    );
    relevantMemories.push(...taggedMemories);
  }
  
  // Get memories by type/category
  if (context.types && context.types.length > 0) {
    const typedMemories = this.memories.filter(m => 
      m.isActive && context.types.includes(m.type)
    );
    relevantMemories.push(...typedMemories);
  }
  
  // Get high-importance memories
  const importantMemories = this.memories.filter(m => 
    m.isActive && ['high', 'critical'].includes(m.importance)
  );
  relevantMemories.push(...importantMemories);
  
  // Remove duplicates and sort by relevance
  const uniqueMemories = Array.from(new Set(relevantMemories.map(m => m.id)))
    .map(id => relevantMemories.find(m => m.id === id))
    .sort((a, b) => {
      const aScore = this.calculateRelevanceScore(a, context);
      const bScore = this.calculateRelevanceScore(b, context);
      return bScore - aScore;
    });
  
  return uniqueMemories.slice(0, limit);
};

userMemorySchema.methods.calculateRelevanceScore = function(memory, context) {
  let score = memory.confidence;
  
  // Boost score for importance
  const importanceBoost = {
    'critical': 0.4,
    'high': 0.3,
    'medium': 0.1,
    'low': 0
  };
  score += importanceBoost[memory.importance] || 0;
  
  // Boost score for recent reinforcement
  const daysSinceReinforced = (Date.now() - memory.decay.lastReinforced) / (1000 * 60 * 60 * 24);
  score += Math.max(0, 0.2 - (daysSinceReinforced * 0.01));
  
  // Boost score for tag matches
  if (context.tags) {
    const tagMatches = memory.tags.filter(tag => context.tags.includes(tag)).length;
    score += tagMatches * 0.1;
  }
  
  return Math.min(1, score);
};

// FIXED: Update profile method with correct object structure - PROPER VERSION
userMemorySchema.methods.updateProfile = function() {
  // Initialize analytics if it doesn't exist
  if (!this.analytics) {
    this.analytics = {
      totalMemories: 0,
      memoriesByType: [],
      memoriesByCategory: [],
      averageConfidence: 0,
      insights: []
    };
  }

  const activeMemories = this.memories.filter(m => m.isActive);
  
  // Update basic analytics
  this.analytics.totalMemories = activeMemories.length;
  this.analytics.averageConfidence = activeMemories.length > 0 
    ? activeMemories.reduce((sum, m) => sum + m.confidence, 0) / activeMemories.length 
    : 0;
  
  // FIXED: Clear existing arrays before rebuilding
  this.analytics.memoriesByType = [];
  this.analytics.memoriesByCategory = [];
  
  // Update memory counts by type as objects
  const typeGroups = activeMemories.reduce((groups, memory) => {
    groups[memory.type] = (groups[memory.type] || 0) + 1;
    return groups;
  }, {});
  
  // FIXED: Build new array properly
  for (const [type, count] of Object.entries(typeGroups)) {
    this.analytics.memoriesByType.push({ type, count });
  }
  
  // Update memory counts by category as objects  
  const categoryGroups = activeMemories.reduce((groups, memory) => {
    groups[memory.category] = (groups[memory.category] || 0) + 1;
    return groups;
  }, {});
  
  // FIXED: Build new array properly
  for (const [category, count] of Object.entries(categoryGroups)) {
    this.analytics.memoriesByCategory.push({ category, count });
  }
  
  this.analytics.lastAnalyzedAt = new Date();
  this.lastUpdated = new Date();
  
  // Mark the analytics as modified to ensure Mongoose saves it
  this.markModified('analytics');
};

userMemorySchema.methods.decayMemories = function() {
  const now = Date.now();
  let decayedCount = 0;
  
  this.memories.forEach(memory => {
    if (!memory.isActive) return;
    
    const daysSinceReinforced = (now - memory.decay.lastReinforced) / (1000 * 60 * 60 * 24);
    const decayAmount = daysSinceReinforced * memory.decay.decayRate;
    
    memory.confidence = Math.max(0.1, memory.confidence - decayAmount);
    
    // Deactivate memories with very low confidence
    if (memory.confidence < 0.2) {
      memory.isActive = false;
      decayedCount++;
    }
  });
  
  if (decayedCount > 0) {
    this.updateProfile();
  }
  
  return decayedCount;
};

// Static methods
userMemorySchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId });
};

userMemorySchema.statics.createForUser = function(userId) {
  return this.create({
    userId,
    memories: [],
    profile: {},
    analytics: {
      totalMemories: 0,
      memoriesByType: [],
      memoriesByCategory: [],
      averageConfidence: 0,
      memoryAccuracy: 0,
      insights: []
    },
    settings: {
      memoryRetention: 'normal',
      autoDecay: true,
      requireVerification: false,
      shareInsights: true,
      maxMemories: 1000
    }
  });
};

const UserMemory = mongoose.model('UserMemory', userMemorySchema);

module.exports = UserMemory;