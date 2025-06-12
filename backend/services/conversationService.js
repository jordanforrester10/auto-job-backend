// backend/services/conversationService.js
const Conversation = require('../models/mongodb/conversation.model');
const MemoryService = require('./memoryService');
const { openai } = require('../config/openai');

class ConversationService {
  /**
   * Create a new conversation
   */
  static async createConversation(userId, conversationData) {
    try {
      const conversation = new Conversation({
        userId,
        title: conversationData.title || 'New Conversation',
        description: conversationData.description || '',
        category: conversationData.category || 'general',
        tags: conversationData.tags || [],
        context: conversationData.context || {},
        settings: {
          memoryEnabled: true,
          autoSummarize: true,
          ...conversationData.settings
        }
      });

      await conversation.save();

      // Add initial system message if provided
      if (conversationData.initialMessage) {
        await this.addMessage(conversation._id, {
          type: 'system',
          content: conversationData.initialMessage,
          metadata: {
            context: conversationData.context
          }
        });
      }

      return conversation;

    } catch (error) {
      console.error('Create conversation error:', error);
      throw error;
    }
  }

  /**
   * Get user's conversations with filtering and pagination
   */
  static async getUserConversations(userId, options = {}) {
    try {
      const {
        category,
        tags,
        search,
        pinned,
        starred,
        status = 'active',
        limit = 20,
        offset = 0,
        sortBy = 'lastActiveAt',
        sortOrder = 'desc'
      } = options;

      let query = { userId, status };

      // Apply filters
      if (category) query.category = category;
      if (tags && tags.length > 0) query.tags = { $in: tags };
      if (pinned !== undefined) query.pinned = pinned;
      if (starred !== undefined) query.starred = starred;

      // Handle search
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $regex: search, $options: 'i' } },
          { 'summary.keyTopics': { $regex: search, $options: 'i' } }
        ];
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const conversations = await Conversation.find(query)
        .sort(sortOptions)
        .limit(limit)
        .skip(offset)
        .populate('context.primaryResumeId', 'name analysis.overallScore')
        .populate('context.relatedJobIds', 'title company')
        .lean();

      // Add computed fields
      const enrichedConversations = conversations.map(conv => ({
        ...conv,
        messageCount: conv.messages ? conv.messages.length : 0,
        lastMessage: conv.messages && conv.messages.length > 0 
          ? conv.messages[conv.messages.length - 1] 
          : null,
        unreadCount: this.calculateUnreadCount(conv.messages),
        preview: this.generatePreview(conv)
      }));

      return {
        conversations: enrichedConversations,
        total: await Conversation.countDocuments(query),
        hasMore: (offset + limit) < await Conversation.countDocuments(query)
      };

    } catch (error) {
      console.error('Get user conversations error:', error);
      throw error;
    }
  }

  /**
   * Get a specific conversation with full message history
   */
  static async getConversation(conversationId, userId) {
    try {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        userId,
        status: { $ne: 'deleted' }
      })
      .populate('context.primaryResumeId', 'name analysis.overallScore parsedData.skills')
      .populate('context.relatedJobIds', 'title company parsedData.keySkills');

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Update last active time
      conversation.lastActiveAt = new Date();
      await conversation.save();

      return conversation;

    } catch (error) {
      console.error('Get conversation error:', error);
      throw error;
    }
  }

  /**
   * Add a message to a conversation
   */
  static async addMessage(conversationId, messageData) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const message = conversation.addMessage(messageData);
      await conversation.save();

      // Extract memories from user messages
      if (messageData.type === 'user' && conversation.settings.memoryEnabled) {
        try {
          await MemoryService.extractMemoriesFromMessage(
            conversation.userId,
            messageData.content,
            {
              conversationId: conversationId,
              messageId: message.id,
              page: messageData.metadata?.context?.page,
              category: conversation.category,
              tags: conversation.tags
            }
          );
        } catch (memoryError) {
          console.warn('Memory extraction failed:', memoryError);
          // Don't fail the message addition if memory extraction fails
        }
      }

      // Auto-summarize if needed
      if (conversation.settings.autoSummarize && 
          conversation.messages.length % 20 === 0) {
        try {
          await MemoryService.generateConversationSummary(conversationId);
        } catch (summaryError) {
          console.warn('Auto-summarization failed:', summaryError);
        }
      }

      return message;

    } catch (error) {
      console.error('Add message error:', error);
      throw error;
    }
  }

  /**
   * Update conversation metadata
   */
  static async updateConversation(conversationId, userId, updates) {
    try {
      const allowedUpdates = [
        'title', 'description', 'category', 'tags', 'pinned', 'starred', 'settings'
      ];
      
      const filteredUpdates = {};
      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          filteredUpdates[key] = updates[key];
        }
      });

      const conversation = await Conversation.findOneAndUpdate(
        { _id: conversationId, userId },
        { $set: filteredUpdates },
        { new: true, runValidators: true }
      );

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      return conversation;

    } catch (error) {
      console.error('Update conversation error:', error);
      throw error;
    }
  }

  /**
   * Delete or archive a conversation
   */
  static async deleteConversation(conversationId, userId, permanent = false) {
    try {
      const update = permanent ? 
        { status: 'deleted' } : 
        { status: 'archived' };

      const conversation = await Conversation.findOneAndUpdate(
        { _id: conversationId, userId },
        { $set: update },
        { new: true }
      );

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      return conversation;

    } catch (error) {
      console.error('Delete conversation error:', error);
      throw error;
    }
  }

  /**
   * Generate intelligent conversation title
   */
  static async generateConversationTitle(messages, context = {}) {
    try {
      if (!messages || messages.length === 0) {
        return 'New Conversation';
      }

      const recentMessages = messages.slice(0, 5); // First 5 messages
      const messageText = recentMessages
        .map(m => `${m.type}: ${m.content}`)
        .join('\n');

      const systemPrompt = `Generate a concise, descriptive title for this conversation. The title should:
1. Be 3-6 words long
2. Capture the main topic or purpose
3. Be specific and actionable
4. Use professional language

Context: This is a career assistance conversation on page "${context.page || 'unknown'}"

Return only the title, nothing else.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: messageText }
        ],
        temperature: 0.5,
        max_tokens: 50
      });

      const title = response.choices[0].message.content.trim();
      return title || 'Career Assistance';

    } catch (error) {
      console.error('Generate conversation title error:', error);
      
      // Fallback titles based on context
      const fallbackTitles = {
        'resumes': 'Resume Assistance',
        'jobs': 'Job Search Help',
        'career': 'Career Guidance',
        'interview': 'Interview Preparation'
      };

      return fallbackTitles[context.page] || 'Career Assistance';
    }
  }

/**
   * Get conversation analytics
   */
  static async getConversationAnalytics(userId, timeframe = '30d') {
    try {
      const dateThreshold = new Date();
      if (timeframe === '7d') {
        dateThreshold.setDate(dateThreshold.getDate() - 7);
      } else if (timeframe === '30d') {
        dateThreshold.setDate(dateThreshold.getDate() - 30);
      } else if (timeframe === '90d') {
        dateThreshold.setDate(dateThreshold.getDate() - 90);
      }

      const analytics = await Conversation.aggregate([
        {
          $match: {
            userId: mongoose.Types.ObjectId(userId),
            status: { $ne: 'deleted' },
            createdAt: { $gte: dateThreshold }
          }
        },
        {
          $group: {
            _id: null,
            totalConversations: { $sum: 1 },
            totalMessages: { $sum: '$analytics.messageCount' },
            totalTokens: { $sum: '$analytics.tokensUsed' },
            avgEngagement: { $avg: '$analytics.engagementScore' },
            pinnedCount: {
              $sum: { $cond: [{ $eq: ['$pinned', true] }, 1, 0] }
            },
            starredCount: {
              $sum: { $cond: [{ $eq: ['$starred', true] }, 1, 0] }
            },
            categoryCounts: { $push: '$category' }
          }
        },
        {
          $project: {
            totalConversations: 1,
            totalMessages: 1,
            totalTokens: 1,
            avgEngagement: { $round: ['$avgEngagement', 1] },
            pinnedCount: 1,
            starredCount: 1,
            categoryCounts: 1
          }
        }
      ]);

      const result = analytics[0] || {
        totalConversations: 0,
        totalMessages: 0,
        totalTokens: 0,
        avgEngagement: 0,
        pinnedCount: 0,
        starredCount: 0,
        categoryCounts: []
      };

      // Calculate category distribution
      const categoryDistribution = result.categoryCounts.reduce((acc, category) => {
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});

      // Get most active conversations
      const mostActiveConversations = await Conversation.find({
        userId,
        status: { $ne: 'deleted' },
        createdAt: { $gte: dateThreshold }
      })
      .sort({ 'analytics.messageCount': -1 })
      .limit(5)
      .select('title analytics.messageCount analytics.engagementScore lastActiveAt')
      .lean();

      return {
        ...result,
        categoryDistribution,
        mostActiveConversations,
        timeframe
      };

    } catch (error) {
      console.error('Get conversation analytics error:', error);
      throw error;
    }
  }

  /**
   * Search across all user conversations
   */
  static async searchAllConversations(userId, query, options = {}) {
    try {
      const {
        limit = 20,
        includeMessages = false,
        categories = [],
        dateRange = null
      } = options;

      let matchQuery = {
        userId,
        status: { $ne: 'deleted' },
        $text: { $search: query }
      };

      if (categories.length > 0) {
        matchQuery.category = { $in: categories };
      }

      if (dateRange) {
        matchQuery.createdAt = {
          $gte: new Date(dateRange.from),
          $lte: new Date(dateRange.to)
        };
      }

      const pipeline = [
        { $match: matchQuery },
        { $addFields: { score: { $meta: 'textScore' } } },
        { $sort: { score: { $meta: 'textScore' }, lastActiveAt: -1 } },
        { $limit: limit }
      ];

      if (!includeMessages) {
        pipeline.push({
          $project: {
            messages: 0
          }
        });
      }

      const results = await Conversation.aggregate(pipeline);

      // Highlight matching content
      const enrichedResults = await Promise.all(
        results.map(async (conv) => {
          const highlights = await this.findQueryHighlights(conv, query);
          return {
            ...conv,
            highlights,
            preview: this.generateSearchPreview(conv, query)
          };
        })
      );

      return enrichedResults;

    } catch (error) {
      console.error('Search all conversations error:', error);
      throw error;
    }
  }

  /**
   * Get conversation insights using AI
   */
  static async getConversationInsights(conversationId) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const messages = conversation.messages.slice(-30); // Last 30 messages
      const messageText = messages
        .map(m => `${m.type.toUpperCase()}: ${m.content}`)
        .join('\n');

      const systemPrompt = `Analyze this conversation and provide insights about:
1. User's communication patterns
2. Progress made toward their goals
3. Areas where they need more help
4. Suggestions for improvement
5. Key topics and themes

Format as JSON:
{
  "communicationPatterns": ["pattern1", "pattern2"],
  "progressMade": ["achievement1", "achievement2"],
  "areasNeedingHelp": ["area1", "area2"],
  "suggestions": ["suggestion1", "suggestion2"],
  "keyThemes": ["theme1", "theme2"],
  "sentiment": "positive|neutral|negative",
  "engagementLevel": "high|medium|low",
  "nextSteps": ["step1", "step2"]
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: messageText }
        ],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      });

      const insights = JSON.parse(response.choices[0].message.content);

      // Store insights in conversation
      conversation.analytics.insights = {
        ...insights,
        generatedAt: new Date()
      };

      await conversation.save();

      return insights;

    } catch (error) {
      console.error('Get conversation insights error:', error);
      throw error;
    }
  }

  /**
   * Export conversation data
   */
  static async exportConversation(conversationId, userId, format = 'json') {
    try {
      const conversation = await Conversation.findOne({
        _id: conversationId,
        userId,
        status: { $ne: 'deleted' }
      })
      .populate('context.primaryResumeId', 'name')
      .populate('context.relatedJobIds', 'title company')
      .lean();

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      if (format === 'json') {
        return {
          conversation: conversation,
          exportedAt: new Date(),
          format: 'json'
        };
      }

      if (format === 'markdown') {
        return this.convertToMarkdown(conversation);
      }

      if (format === 'txt') {
        return this.convertToPlainText(conversation);
      }

      throw new Error('Unsupported export format');

    } catch (error) {
      console.error('Export conversation error:', error);
      throw error;
    }
  }

  /**
   * Bulk operations on conversations
   */
  static async bulkUpdateConversations(userId, conversationIds, updates) {
    try {
      const allowedUpdates = ['category', 'tags', 'pinned', 'starred', 'status'];
      const filteredUpdates = {};

      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          filteredUpdates[key] = updates[key];
        }
      });

      const result = await Conversation.updateMany(
        {
          _id: { $in: conversationIds },
          userId,
          status: { $ne: 'deleted' }
        },
        { $set: filteredUpdates }
      );

      return {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      };

    } catch (error) {
      console.error('Bulk update conversations error:', error);
      throw error;
    }
  }

  // ===================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================

  /**
   * Calculate unread count for a conversation
   */
  static calculateUnreadCount(messages) {
    if (!messages || messages.length === 0) return 0;

    // Simple implementation - in real app, track read status
    const lastMessage = messages[messages.length - 1];
    return lastMessage && lastMessage.type === 'ai' ? 1 : 0;
  }

  /**
   * Generate conversation preview
   */
  static generatePreview(conversation) {
    if (conversation.summary && conversation.summary.content) {
      return conversation.summary.content.substring(0, 100) + '...';
    }

    if (conversation.messages && conversation.messages.length > 0) {
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      return lastMessage.content.substring(0, 100) + '...';
    }

    return conversation.description || 'No content yet';
  }

  /**
   * Find query highlights in conversation content
   */
  static async findQueryHighlights(conversation, query) {
    const highlights = [];
    const queryLower = query.toLowerCase();

    // Check title
    if (conversation.title.toLowerCase().includes(queryLower)) {
      highlights.push({
        type: 'title',
        text: conversation.title,
        position: conversation.title.toLowerCase().indexOf(queryLower)
      });
    }

    // Check summary
    if (conversation.summary && conversation.summary.content) {
      const summaryLower = conversation.summary.content.toLowerCase();
      if (summaryLower.includes(queryLower)) {
        const position = summaryLower.indexOf(queryLower);
        const start = Math.max(0, position - 50);
        const end = Math.min(conversation.summary.content.length, position + 100);
        
        highlights.push({
          type: 'summary',
          text: conversation.summary.content.substring(start, end),
          position: position
        });
      }
    }

    // Check recent messages
    if (conversation.messages) {
      conversation.messages.slice(-10).forEach((message, index) => {
        const contentLower = message.content.toLowerCase();
        if (contentLower.includes(queryLower)) {
          const position = contentLower.indexOf(queryLower);
          const start = Math.max(0, position - 30);
          const end = Math.min(message.content.length, position + 70);
          
          highlights.push({
            type: 'message',
            text: message.content.substring(start, end),
            messageType: message.type,
            position: position,
            messageIndex: index
          });
        }
      });
    }

    return highlights.slice(0, 3); // Limit to 3 highlights
  }

  /**
   * Generate search preview with highlighted terms
   */
  static generateSearchPreview(conversation, query) {
    const queryLower = query.toLowerCase();
    
    // Try summary first
    if (conversation.summary && conversation.summary.content) {
      const content = conversation.summary.content;
      const contentLower = content.toLowerCase();
      
      if (contentLower.includes(queryLower)) {
        const position = contentLower.indexOf(queryLower);
        const start = Math.max(0, position - 50);
        const end = Math.min(content.length, position + 100);
        
        return content.substring(start, end) + (end < content.length ? '...' : '');
      }
    }

    // Try last message
    if (conversation.messages && conversation.messages.length > 0) {
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      const content = lastMessage.content;
      const contentLower = content.toLowerCase();
      
      if (contentLower.includes(queryLower)) {
        const position = contentLower.indexOf(queryLower);
        const start = Math.max(0, position - 50);
        const end = Math.min(content.length, position + 100);
        
        return content.substring(start, end) + (end < content.length ? '...' : '');
      }
      
      // Fallback to beginning of last message
      return content.substring(0, 100) + (content.length > 100 ? '...' : '');
    }

    return conversation.description || 'No preview available';
  }

  /**
   * Convert conversation to Markdown format
   */
  static convertToMarkdown(conversation) {
    let markdown = `# ${conversation.title}\n\n`;
    
    if (conversation.description) {
      markdown += `**Description:** ${conversation.description}\n\n`;
    }

    markdown += `**Created:** ${conversation.createdAt.toISOString()}\n`;
    markdown += `**Category:** ${conversation.category}\n`;
    
    if (conversation.tags && conversation.tags.length > 0) {
      markdown += `**Tags:** ${conversation.tags.join(', ')}\n`;
    }

    markdown += `\n---\n\n`;

    if (conversation.summary && conversation.summary.content) {
      markdown += `## Summary\n\n${conversation.summary.content}\n\n`;
      
      if (conversation.summary.keyTopics && conversation.summary.keyTopics.length > 0) {
        markdown += `**Key Topics:** ${conversation.summary.keyTopics.join(', ')}\n\n`;
      }
      
      markdown += `---\n\n`;
    }

    markdown += `## Messages\n\n`;

    if (conversation.messages && conversation.messages.length > 0) {
      conversation.messages.forEach((message, index) => {
        const timestamp = message.createdAt ? 
          new Date(message.createdAt).toLocaleString() : 
          'Unknown time';
        
        markdown += `### ${message.type.toUpperCase()} (${timestamp})\n\n`;
        markdown += `${message.content}\n\n`;
        
        if (message.metadata && message.metadata.suggestions && message.metadata.suggestions.length > 0) {
          markdown += `**Suggestions:** ${message.metadata.suggestions.join(', ')}\n\n`;
        }
        
        markdown += `---\n\n`;
      });
    }

    return {
      content: markdown,
      filename: `conversation_${conversation._id}.md`,
      exportedAt: new Date(),
      format: 'markdown'
    };
  }

  /**
   * Convert conversation to plain text format
   */
  static convertToPlainText(conversation) {
    let text = `${conversation.title}\n${'='.repeat(conversation.title.length)}\n\n`;
    
    if (conversation.description) {
      text += `Description: ${conversation.description}\n\n`;
    }

    text += `Created: ${conversation.createdAt.toISOString()}\n`;
    text += `Category: ${conversation.category}\n`;
    
    if (conversation.tags && conversation.tags.length > 0) {
      text += `Tags: ${conversation.tags.join(', ')}\n`;
    }

    text += `\n${'-'.repeat(50)}\n\n`;

    if (conversation.summary && conversation.summary.content) {
      text += `SUMMARY\n${conversation.summary.content}\n\n`;
      
      if (conversation.summary.keyTopics && conversation.summary.keyTopics.length > 0) {
        text += `Key Topics: ${conversation.summary.keyTopics.join(', ')}\n\n`;
      }
      
      text += `${'-'.repeat(50)}\n\n`;
    }

    text += `MESSAGES\n\n`;

    if (conversation.messages && conversation.messages.length > 0) {
      conversation.messages.forEach((message, index) => {
        const timestamp = message.createdAt ? 
          new Date(message.createdAt).toLocaleString() : 
          'Unknown time';
        
        text += `[${message.type.toUpperCase()}] ${timestamp}\n`;
        text += `${message.content}\n`;
        
        if (message.metadata && message.metadata.suggestions && message.metadata.suggestions.length > 0) {
          text += `Suggestions: ${message.metadata.suggestions.join(', ')}\n`;
        }
        
        text += `\n${'-'.repeat(30)}\n\n`;
      });
    }

    return {
      content: text,
      filename: `conversation_${conversation._id}.txt`,
      exportedAt: new Date(),
      format: 'text'
    };
  }
}

module.exports = ConversationService;