// backend/services/memoryService.js
const { openai } = require('../config/openai');
const UserMemory = require('../models/mongodb/userMemory.model');
const Conversation = require('../models/mongodb/conversation.model');
const Resume = require('../models/mongodb/resume.model');
const Job = require('../models/mongodb/job.model');

class MemoryService {
  /**
   * Extract memories from a conversation message using AI
   */
  static async extractMemoriesFromMessage(userId, message, conversationContext = {}) {
    try {
      const userMemory = await UserMemory.findByUserId(userId) || 
                        await UserMemory.createForUser(userId);

      // Get existing memories for context
      const existingMemories = userMemory.getRelevantMemories({
        types: ['preference', 'skill', 'career_goal', 'personality_trait'],
        tags: conversationContext.tags || []
      }, 5);

      const systemPrompt = this.buildMemoryExtractionPrompt(existingMemories, conversationContext);
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      });

      const extractedData = JSON.parse(response.choices[0].message.content);
      const memories = [];

      // Process extracted memories
      if (extractedData.memories && extractedData.memories.length > 0) {
        for (const memoryData of extractedData.memories) {
          const memory = await this.addMemoryToUser(userId, {
            ...memoryData,
            source: {
              conversationId: conversationContext.conversationId,
              messageId: conversationContext.messageId,
              extractionMethod: 'ai_extracted',
              model: 'gpt-4-turbo-preview'
            },
            context: conversationContext
          });
          memories.push(memory);
        }
      }

      return {
        memories,
        insights: extractedData.insights || [],
        profileUpdates: extractedData.profileUpdates || {}
      };

    } catch (error) {
      console.error('Memory extraction error:', error);
      return { memories: [], insights: [], profileUpdates: {} };
    }
  }

  /**
   * Add a memory to user's memory system
   */
  static async addMemoryToUser(userId, memoryData) {
    try {
      let userMemory = await UserMemory.findByUserId(userId);
      
      if (!userMemory) {
        userMemory = await UserMemory.createForUser(userId);
      }

      const memory = userMemory.addMemory(memoryData);
      await userMemory.save();

      return memory;

    } catch (error) {
      console.error('Add memory error:', error);
      throw error;
    }
  }

  /**
   * Get relevant memories for AI context
   */
  static async getRelevantMemoriesForContext(userId, context) {
    try {
      const userMemory = await UserMemory.findByUserId(userId);
      if (!userMemory) return [];

      const relevantMemories = userMemory.getRelevantMemories(context, 15);
      
      // Update access count for retrieved memories
      relevantMemories.forEach(memory => {
        memory.usage.accessCount += 1;
        memory.usage.lastAccessedAt = new Date();
      });

      await userMemory.save();

      return relevantMemories;

    } catch (error) {
      console.error('Get relevant memories error:', error);
      return [];
    }
  }

  /**
   * Build context for AI assistant using memories
   */
  static async buildAIContext(userId, currentContext = {}) {
    try {
      const userMemory = await UserMemory.findByUserId(userId);
      if (!userMemory) return '';

      // Get different types of relevant memories
      const personalityMemories = userMemory.getMemoriesByType('personality_trait', { 
        minConfidence: 0.6, 
        sortBy: 'confidence' 
      }).slice(0, 3);

      const preferenceMemories = userMemory.getMemoriesByType('preference', { 
        minConfidence: 0.6, 
        sortBy: 'recent' 
      }).slice(0, 5);

      const skillMemories = userMemory.getMemoriesByType('skill', { 
        minConfidence: 0.7, 
        sortBy: 'confidence' 
      }).slice(0, 5);

      const goalMemories = userMemory.getMemoriesByType('career_goal', { 
        minConfidence: 0.6, 
        sortBy: 'recent' 
      }).slice(0, 3);

      // Build context string
      let context = '\n=== USER MEMORY CONTEXT ===\n';

      if (personalityMemories.length > 0) {
        context += '\nPersonality & Communication Style:\n';
        personalityMemories.forEach(memory => {
          context += `- ${memory.content} (confidence: ${Math.round(memory.confidence * 100)}%)\n`;
        });
      }

      if (preferenceMemories.length > 0) {
        context += '\nPreferences & Work Style:\n';
        preferenceMemories.forEach(memory => {
          context += `- ${memory.content} (confidence: ${Math.round(memory.confidence * 100)}%)\n`;
        });
      }

      if (skillMemories.length > 0) {
        context += '\nSkills & Experience:\n';
        skillMemories.forEach(memory => {
          context += `- ${memory.content} (confidence: ${Math.round(memory.confidence * 100)}%)\n`;
        });
      }

      if (goalMemories.length > 0) {
        context += '\nCareer Goals & Aspirations:\n';
        goalMemories.forEach(memory => {
          context += `- ${memory.content} (confidence: ${Math.round(memory.confidence * 100)}%)\n`;
        });
      }

      // Add profile insights
      if (userMemory.profile && Object.keys(userMemory.profile).length > 0) {
        context += '\nUser Profile Insights:\n';
        
        if (userMemory.profile.careerStage) {
          context += `- Career Stage: ${userMemory.profile.careerStage}\n`;
        }
        
        if (userMemory.profile.communicationStyle) {
          const style = userMemory.profile.communicationStyle;
          context += `- Communication Preference: ${style.formality || 'neutral'} formality, ${style.detail_preference || 'moderate'} detail level\n`;
        }
      }

      context += '\n=== END MEMORY CONTEXT ===\n\n';
      context += 'IMPORTANT: Use this memory context to personalize your responses, but don\'t explicitly mention that you\'re using memory unless directly asked about it.\n';

      return context;

    } catch (error) {
      console.error('Build AI context error:', error);
      return '';
    }
  }

  /**
   * Update user profile based on conversation patterns
   */
  static async updateUserProfile(userId, conversationData) {
    try {
      const userMemory = await UserMemory.findByUserId(userId);
      if (!userMemory) return;

      // Analyze conversation patterns
      const analysis = await this.analyzeConversationPatterns(conversationData);
      
      // Update profile based on analysis
      if (analysis.communicationStyle) {
        userMemory.profile.communicationStyle = {
          ...userMemory.profile.communicationStyle,
          ...analysis.communicationStyle
        };
      }

      if (analysis.skills && analysis.skills.length > 0) {
        userMemory.profile.skills = userMemory.profile.skills || [];
        analysis.skills.forEach(skill => {
          const existingSkill = userMemory.profile.skills.find(s => s.name === skill.name);
          if (existingSkill) {
            existingSkill.confidence = Math.max(existingSkill.confidence, skill.confidence);
            existingSkill.lastMentioned = new Date();
          } else {
            userMemory.profile.skills.push({
              ...skill,
              lastMentioned: new Date()
            });
          }
        });
      }

      await userMemory.save();

    } catch (error) {
      console.error('Update user profile error:', error);
    }
  }

  /**
   * Generate conversation summary with memory extraction
   */
  static async generateConversationSummary(conversationId) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) throw new Error('Conversation not found');

      const messages = conversation.messages.slice(-20); // Last 20 messages
      const messageText = messages.map(m => `${m.type.toUpperCase()}: ${m.content}`).join('\n');

      const systemPrompt = `You are an AI assistant that creates intelligent conversation summaries with memory extraction.

Analyze this conversation and provide:
1. A concise summary of what was discussed
2. Key topics covered
3. Action items or outcomes
4. Important memories that should be retained about the user
5. User preferences or patterns observed

Format your response as JSON:
{
  "summary": "Brief summary of the conversation",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "actionItems": ["action1", "action2"],
  "outcomes": ["outcome1", "outcome2"],
  "memories": [
    {
      "type": "preference|skill|career_goal|personality_trait|etc",
      "category": "personal|professional|technical|behavioral|contextual",
      "content": "What you learned about the user",
      "confidence": 0.8,
      "importance": "low|medium|high|critical",
      "tags": ["tag1", "tag2"]
    }
  ],
  "insights": ["insight1", "insight2"]
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: messageText }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const summaryData = JSON.parse(response.choices[0].message.content);

      // Update conversation with summary
      conversation.updateSummary({
        content: summaryData.summary,
        keyTopics: summaryData.keyTopics || [],
        actionItems: summaryData.actionItems || [],
        outcomes: summaryData.outcomes || []
      });

      await conversation.save();

      // Extract and store memories
      if (summaryData.memories && summaryData.memories.length > 0) {
        for (const memoryData of summaryData.memories) {
          await this.addMemoryToUser(conversation.userId, {
            ...memoryData,
            source: {
              conversationId: conversationId,
              extractionMethod: 'summary_extracted',
              model: 'gpt-4-turbo-preview'
            }
          });
        }
      }

      return summaryData;

    } catch (error) {
      console.error('Generate conversation summary error:', error);
      throw error;
    }
  }

  /**
   * Search memories with intelligent ranking
   */
  static async searchMemories(userId, query, options = {}) {
    try {
      const userMemory = await UserMemory.findByUserId(userId);
      if (!userMemory) return [];

      // First, do a basic text search
      let memories = userMemory.searchMemories(query, options);

      // If we have few results, use AI for semantic search
      if (memories.length < 5) {
        const semanticMemories = await this.semanticMemorySearch(userMemory, query);
        memories = [...memories, ...semanticMemories];
        
        // Remove duplicates
        memories = memories.filter((memory, index, self) => 
          index === self.findIndex(m => m.id === memory.id)
        );
      }

      // Rank memories by relevance
      return memories.sort((a, b) => {
        const aScore = this.calculateSearchRelevance(a, query);
        const bScore = this.calculateSearchRelevance(b, query);
        return bScore - aScore;
      });

    } catch (error) {
      console.error('Search memories error:', error);
      return [];
    }
  }

  /**
   * Perform memory cleanup and optimization
   */
  static async performMemoryMaintenance(userId) {
    try {
      const userMemory = await UserMemory.findByUserId(userId);
      if (!userMemory) return;

      // Decay old memories
      const decayedCount = userMemory.decayMemories();

      // Merge similar memories
      const mergedCount = await this.mergeSimilarMemories(userMemory);

      // Update profile
      userMemory.updateProfile();

      await userMemory.save();

      return {
        decayedMemories: decayedCount,
        mergedMemories: mergedCount,
        totalMemories: userMemory.analytics.totalMemories
      };

    } catch (error) {
      console.error('Memory maintenance error:', error);
      return null;
    }
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  /**
   * Build system prompt for memory extraction
   */
  static buildMemoryExtractionPrompt(existingMemories, context) {
    let prompt = `You are an AI memory extraction system. Analyze user messages to extract meaningful memories about their preferences, skills, goals, personality, and work style.

EXISTING MEMORIES (to avoid duplicates):
${existingMemories.map(m => `- ${m.type}: ${m.content}`).join('\n')}

CONTEXT:
- Page: ${context.page || 'unknown'}
- Category: ${context.category || 'general'}

Extract memories in this JSON format:
{
  "memories": [
    {
      "type": "preference|skill|career_goal|experience|achievement|challenge|personality_trait|communication_style|work_style|industry_knowledge|tool_preference|feedback_pattern",
      "category": "personal|professional|technical|behavioral|contextual",
      "content": "Clear, specific statement about the user",
      "confidence": 0.1-1.0,
      "importance": "low|medium|high|critical",
      "tags": ["relevant", "tags"]
    }
  ],
  "insights": ["Observable patterns or insights about the user"],
  "profileUpdates": {
    "communicationStyle": {
      "formality": "very_formal|formal|neutral|casual|very_casual",
      "detail_preference": "brief|moderate|detailed|comprehensive"
    }
  }
}

Only extract memories that are:
1. Specific and actionable
2. Likely to be useful for future conversations
3. Not duplicating existing memories
4. Expressed with reasonable confidence

IMPORTANT: Only extract memories if the user message contains clear, specific information. Don't infer too much from brief responses.`;

    return prompt;
  }

  /**
   * Analyze conversation patterns
   */
  static async analyzeConversationPatterns(conversationData) {
    try {
      // Simple pattern analysis - can be enhanced with ML
      const analysis = {
        communicationStyle: {},
        skills: [],
        preferences: []
      };

      // Analyze message length patterns
      const avgMessageLength = conversationData.userMessages?.reduce((sum, msg) => 
        sum + msg.content.length, 0) / (conversationData.userMessages?.length || 1);

      if (avgMessageLength < 50) {
        analysis.communicationStyle.detail_preference = 'brief';
      } else if (avgMessageLength > 200) {
        analysis.communicationStyle.detail_preference = 'detailed';
      } else {
        analysis.communicationStyle.detail_preference = 'moderate';
      }

      // Analyze formality
      const formalWords = ['please', 'thank you', 'would you', 'could you'];
      const casualWords = ['hey', 'thanks', 'cool', 'awesome'];
      
      let formalCount = 0;
      let casualCount = 0;

      conversationData.userMessages?.forEach(msg => {
        const content = msg.content.toLowerCase();
        formalWords.forEach(word => {
          if (content.includes(word)) formalCount++;
        });
        casualWords.forEach(word => {
          if (content.includes(word)) casualCount++;
        });
      });

      if (formalCount > casualCount) {
        analysis.communicationStyle.formality = 'formal';
      } else if (casualCount > formalCount) {
        analysis.communicationStyle.formality = 'casual';
      } else {
        analysis.communicationStyle.formality = 'neutral';
      }

      return analysis;

    } catch (error) {
      console.error('Analyze conversation patterns error:', error);
      return {};
    }
  }

/**
 * Semantic memory search using AI - FIXED VERSION
 */
static async semanticMemorySearch(userMemory, query) {
  try {
    const allMemories = userMemory.memories.filter(m => m.isActive);
    if (allMemories.length === 0) {
      return [];
    }

    const memoryContents = allMemories.map(m => `${m.id}: ${m.content}`).join('\n');

    const systemPrompt = `Find memories that are semantically related to the user's query, even if they don't contain exact keywords.

MEMORIES:
${memoryContents}

USER QUERY: ${query}

Return ONLY a JSON array of memory IDs that are relevant: ["memory_id_1", "memory_id_2"]
If no memories are relevant, return an empty array: []`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      temperature: 0.3,
      max_tokens: 200,
      response_format: { type: 'json_object' }
    });

    console.log('🔍 Semantic search response:', response.choices[0].message.content);

    // FIXED: Proper JSON parsing and validation
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response.choices[0].message.content);
    } catch (parseError) {
      console.warn('Failed to parse semantic search response:', parseError);
      return [];
    }

    // FIXED: Handle different response formats
    let relevantIds = [];
    if (Array.isArray(parsedResponse)) {
      relevantIds = parsedResponse;
    } else if (parsedResponse.ids && Array.isArray(parsedResponse.ids)) {
      relevantIds = parsedResponse.ids;
    } else if (parsedResponse.results && Array.isArray(parsedResponse.results)) {
      relevantIds = parsedResponse.results;
    } else if (parsedResponse.relevant_memories && Array.isArray(parsedResponse.relevant_memories)) {
      // FIXED: Handle the actual response format the AI is using
      relevantIds = parsedResponse.relevant_memories;
    } else {
      console.warn('Unexpected semantic search response format:', parsedResponse);
      return [];
    }

    // FIXED: Ensure relevantIds is an array before using includes
    if (!Array.isArray(relevantIds)) {
      console.warn('relevantIds is not an array:', relevantIds);
      return [];
    }

    console.log('✅ Found relevant memory IDs:', relevantIds);
    const foundMemories = allMemories.filter(m => relevantIds.includes(m.id));
    console.log('✅ Returning', foundMemories.length, 'relevant memories');
    
    return foundMemories;

  } catch (error) {
    console.error('Semantic memory search error:', error);
    return [];
  }
}

  /**
   * Calculate search relevance score
   */
  static calculateSearchRelevance(memory, query) {
    const queryLower = query.toLowerCase();
    const contentLower = memory.content.toLowerCase();
    
    let score = memory.confidence;

    // Exact phrase match
    if (contentLower.includes(queryLower)) {
      score += 0.5;
    }

    // Word matches
    const queryWords = queryLower.split(' ');
    const contentWords = contentLower.split(' ');
    const matchedWords = queryWords.filter(word => contentWords.includes(word));
    score += (matchedWords.length / queryWords.length) * 0.3;

    // Tag matches
    const tagMatches = memory.tags.filter(tag => 
      tag.includes(queryLower) || queryLower.includes(tag)
    );
    score += tagMatches.length * 0.2;

    // Importance boost
    const importanceBoost = {
      'critical': 0.3,
      'high': 0.2,
      'medium': 0.1,
      'low': 0
    };
    score += importanceBoost[memory.importance] || 0;

    return Math.min(score, 1);
  }

  /**
   * Merge similar memories to reduce redundancy
   */
  static async mergeSimilarMemories(userMemory) {
    let mergedCount = 0;
    const memoriesToRemove = [];

    for (let i = 0; i < userMemory.memories.length; i++) {
      for (let j = i + 1; j < userMemory.memories.length; j++) {
        const memory1 = userMemory.memories[i];
        const memory2 = userMemory.memories[j];

        if (memory1.type === memory2.type && 
            memory1.category === memory2.category &&
            userMemory.calculateSimilarity(memory1.content, memory2.content) > 0.85) {
          
          // Merge the memories
          const strongerMemory = memory1.confidence >= memory2.confidence ? memory1 : memory2;
          const weakerMemory = memory1.confidence < memory2.confidence ? memory1 : memory2;

          strongerMemory.confidence = Math.min(1, strongerMemory.confidence + 0.1);
          strongerMemory.decay.reinforcementCount += weakerMemory.decay.reinforcementCount;
          strongerMemory.tags = [...new Set([...strongerMemory.tags, ...weakerMemory.tags])];

          memoriesToRemove.push(weakerMemory.id);
          mergedCount++;
        }
      }
    }

    // Remove merged memories
    userMemory.memories = userMemory.memories.filter(m => !memoriesToRemove.includes(m.id));

    return mergedCount;
  }
}

module.exports = MemoryService;