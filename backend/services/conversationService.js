// backend/services/conversationService.js - ENHANCED PERSISTENCE SUPPORT
const Conversation = require('../models/mongodb/conversation.model');
const MemoryService = require('./memoryService');
const { openai } = require('../config/openai');
const mongoose = require('mongoose');

class ConversationService {
    /**
     * Create a new conversation with enhanced persistence
     */
    static async createConversation(userId, conversationData) {
        try {
            const conversation = new Conversation({
                userId,
                title: conversationData.title || 'New Conversation',
                description: conversationData.description || '',
                category: conversationData.category || 'general',
                tags: conversationData.tags || [],
                messages: [], // Start with empty messages array
                messageCount: 0,
                isActive: true,
                isPinned: conversationData.isPinned || false,
                isStarred: conversationData.isStarred || false,
                context: conversationData.context || {},
                settings: {
                    memoryEnabled: true,
                    autoSummarize: true,
                    ...conversationData.settings
                },
                analytics: {
                    messageCount: 0,
                    tokensUsed: 0,
                    engagementScore: 0
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

            console.log(`✅ Created conversation: ${conversation.title} (${conversation._id})`);
            return conversation;

        } catch (error) {
            console.error('Create conversation error:', error);
            throw error;
        }
    }

    /**
     * Get user's conversations with enhanced filtering and persistence support
     */
    static async getUserConversations(userId, options = {}) {
        try {
            const {
                category,
                tags,
                search,
                pinned,
                starred,
                limit = 50,
                offset = 0,
                sortBy = 'lastActiveAt',
                sortOrder = 'desc'
            } = options;

            // Build query with isActive instead of status
            let query = { userId, isActive: true };

            // Apply filters
            if (category) query.category = category;
            if (tags && tags.length > 0) query.tags = { $in: tags };
            if (pinned !== undefined) query.isPinned = pinned;
            if (starred !== undefined) query.isStarred = starred;

            // Handle search
            if (search) {
                query.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { tags: { $regex: search, $options: 'i' } }
                ];
            }

            const sortOptions = {};
            sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

            console.log('🔍 Querying conversations with:', query);

            // ENHANCED: Better field selection and population
            const conversations = await Conversation.find(query)
                .sort(sortOptions)
                .limit(limit)
                .skip(offset)
                .select({
                    _id: 1,
                    title: 1,
                    description: 1,
                    category: 1,
                    tags: 1,
                    messages: 1,
                    messageCount: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    lastActiveAt: 1,
                    isActive: 1,
                    isPinned: 1,
                    isStarred: 1,
                    context: 1,
                    settings: 1,
                    analytics: 1,
                    summary: 1
                })
                .lean();

            console.log(`📚 Found ${conversations.length} conversations for user ${userId}`);

            // ENHANCED: Enrich conversations with computed fields and ensure consistency
            const enrichedConversations = conversations.map(conv => {
                // Ensure messages array exists and calculate actual count
                const messages = conv.messages || [];
                const actualMessageCount = messages.length;
                
                // Get last message for preview
                const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
                
                // Generate preview text
                const preview = this.generatePreview(conv, lastMessage);
                
                return {
                    ...conv,
                    // Ensure consistent message count
                    messageCount: actualMessageCount,
                    lastMessage: lastMessage,
                    preview: preview,
                    // Ensure boolean fields are properly set with fallbacks
                    isStarred: conv.isStarred || false,
                    isPinned: conv.isPinned || false,
                    isActive: conv.isActive !== false, // Default to true
                    // Add formatted date for easier display
                    formattedDate: conv.lastActiveAt ? 
                        new Date(conv.lastActiveAt).toLocaleDateString() : 
                        new Date(conv.createdAt).toLocaleDateString(),
                    // Add relative time indicator
                    isRecent: conv.lastActiveAt ? 
                        (Date.now() - new Date(conv.lastActiveAt).getTime() < 24 * 60 * 60 * 1000) : false,
                    // Ensure analytics exist
                    analytics: conv.analytics || {
                        messageCount: actualMessageCount,
                        tokensUsed: 0,
                        engagementScore: 0
                    }
                };
            });

            const total = await Conversation.countDocuments(query);

            return {
                conversations: enrichedConversations,
                total: total,
                hasMore: (offset + limit) < total,
                metadata: {
                    query: query,
                    sortBy: sortBy,
                    sortOrder: sortOrder,
                    limit: limit,
                    offset: offset,
                    timestamp: new Date()
                }
            };

        } catch (error) {
            console.error('Get user conversations error:', error);
            
            // ENHANCED: Try migration if query fails with status-related error
            if (error.message && error.message.includes('status')) {
                console.log('🔄 Attempting conversation migration...');
                try {
                    await this.migrateConversationsToIsActive(userId);
                    // Retry the query
                    return await this.getUserConversations(userId, options);
                } catch (migrationError) {
                    console.error('Migration failed:', migrationError);
                }
            }
            
            throw error;
        }
    }

    /**
     * Get a specific conversation with enhanced persistence support
     */
    static async getConversation(conversationId, userId) {
        try {
            console.log(`🔍 Loading conversation ${conversationId} for user ${userId}`);
            
            const conversation = await Conversation.findOne({
                _id: conversationId,
                userId,
                isActive: true
            })
            .populate('context.primaryResumeId', 'name analysis.overallScore parsedData.skills')
            .populate('context.relatedJobIds', 'title company parsedData.keySkills')
            .lean();

            if (!conversation) {
                // Try with legacy status field as fallback
                const legacyConversation = await Conversation.findOne({
                    _id: conversationId,
                    userId,
                    status: { $ne: 'deleted' }
                })
                .populate('context.primaryResumeId', 'name analysis.overallScore parsedData.skills')
                .populate('context.relatedJobIds', 'title company parsedData.keySkills')
                .lean();

                if (legacyConversation) {
                    console.log('📋 Found conversation using legacy status field, migrating...');
                    await this.migrateConversationsToIsActive(userId);
                    // Continue with the found conversation
                    return this.enhanceConversationData(legacyConversation, conversationId);
                }
                
                throw new Error('Conversation not found');
            }

            const enhancedConversation = this.enhanceConversationData(conversation, conversationId);

            // Update last active time (separate query to avoid lean() conflicts)
            try {
                await Conversation.findByIdAndUpdate(conversationId, {
                    lastActiveAt: new Date()
                });
            } catch (updateError) {
                console.warn('Failed to update lastActiveAt:', updateError);
            }

            console.log(`✅ Loaded conversation: ${enhancedConversation.title} with ${enhancedConversation.messageCount} messages`);
            
            return enhancedConversation;

        } catch (error) {
            console.error('Get conversation error:', error);
            throw error;
        }
    }

    /**
     * Enhance conversation data with consistent structure
     */
    static enhanceConversationData(conversation, conversationId) {
        const messages = conversation.messages || [];
        
        return {
            ...conversation,
            messages: messages,
            messageCount: messages.length,
            isStarred: conversation.isStarred || conversation.starred || false,
            isPinned: conversation.isPinned || conversation.pinned || false,
            isActive: conversation.isActive !== false,
            settings: conversation.settings || {
                memoryEnabled: true,
                autoSummarize: true
            },
            analytics: conversation.analytics || {
                messageCount: messages.length,
                tokensUsed: 0,
                engagementScore: 0
            },
            context: conversation.context || {},
            // Ensure lastActiveAt exists
            lastActiveAt: conversation.lastActiveAt || conversation.updatedAt || conversation.createdAt
        };
    }

    /**
     * Add a message to a conversation with enhanced persistence
     */
    static async addMessage(conversationId, messageData) {
        try {
            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                throw new Error('Conversation not found');
            }

            // Create message with proper ID generation and validation
            const message = {
                id: messageData.id || new mongoose.Types.ObjectId().toString(),
                type: messageData.type,
                content: messageData.content,
                timestamp: messageData.timestamp || new Date(),
                createdAt: messageData.createdAt || new Date(),
                metadata: messageData.metadata || {}
            };

            // Validate message content
            if (!message.content || typeof message.content !== 'string') {
                throw new Error('Message content is required and must be a string');
            }

            if (!['user', 'ai', 'system'].includes(message.type)) {
                throw new Error('Invalid message type');
            }

            // Add message using the model method
            conversation.addMessage(message);

            // Update conversation metadata
            conversation.analytics.messageCount = conversation.messages.length;
            conversation.lastActiveAt = new Date();
            conversation.markModified('analytics');

            // Save conversation
            await conversation.save();

            console.log(`✅ Added ${message.type} message to conversation ${conversationId}`);

            // ENHANCED: Extract memories from user messages
            if (messageData.type === 'user' && conversation.settings?.memoryEnabled) {
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
                    console.warn('Memory extraction failed for message:', memoryError);
                }
            }

            // ENHANCED: Auto-summarize if needed
            if (conversation.settings?.autoSummarize && 
                conversation.messages.length % 20 === 0 &&
                conversation.messages.length >= 20) {
                try {
                    await this.generateConversationSummary(conversationId);
                    console.log(`📋 Auto-summarized conversation ${conversationId}`);
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
     * Update conversation metadata with persistence support
     */
    static async updateConversation(conversationId, userId, updates) {
        try {
            const allowedUpdates = [
                'title', 'description', 'category', 'tags', 'isPinned', 'isStarred', 'settings'
            ];
            
            const filteredUpdates = {};
            Object.keys(updates).forEach(key => {
                if (allowedUpdates.includes(key)) {
                    filteredUpdates[key] = updates[key];
                }
            });

            // Add timestamp
            filteredUpdates.updatedAt = new Date();

            // ENHANCED: Also update legacy fields for backward compatibility
            if (filteredUpdates.isPinned !== undefined) {
                filteredUpdates.pinned = filteredUpdates.isPinned;
            }
            if (filteredUpdates.isStarred !== undefined) {
                filteredUpdates.starred = filteredUpdates.isStarred;
            }

            const conversation = await Conversation.findOneAndUpdate(
                { _id: conversationId, userId, isActive: true },
                { $set: filteredUpdates },
                { new: true, runValidators: true }
            );

            if (!conversation) {
                throw new Error('Conversation not found');
            }

            console.log(`✅ Updated conversation ${conversationId}:`, Object.keys(filteredUpdates));
            return conversation;

        } catch (error) {
            console.error('Update conversation error:', error);
            throw error;
        }
    }

    /**
     * Delete or archive a conversation with enhanced cleanup
     */
    static async deleteConversation(conversationId, userId, permanent = false) {
        try {
            if (permanent) {
                // Permanently delete
                const result = await Conversation.findOneAndDelete({
                    _id: conversationId,
                    userId
                });
                
                if (!result) {
                    throw new Error('Conversation not found');
                }
                
                console.log(`🗑️ Permanently deleted conversation ${conversationId}`);
                return { deleted: true, permanent: true };
            } else {
                // Soft delete (mark as inactive)
                const update = { 
                    isActive: false,
                    status: 'archived', // Update legacy field too
                    updatedAt: new Date()
                };
                
                const conversation = await Conversation.findOneAndUpdate(
                    { _id: conversationId, userId, isActive: true },
                    { $set: update },
                    { new: true }
                );

                if (!conversation) {
                    throw new Error('Conversation not found');
                }

                console.log(`📦 Archived conversation ${conversationId}`);
                return conversation;
            }

        } catch (error) {
            console.error('Delete conversation error:', error);
            throw error;
        }
    }

    /**
     * Generate conversation summary
     */
    static async generateConversationSummary(conversationId) {
        try {
            const conversation = await Conversation.findById(conversationId);
            if (!conversation || !conversation.messages || conversation.messages.length < 5) {
                return null;
            }

            const recentMessages = conversation.messages.slice(-20);
            const messageText = recentMessages
                .map(m => `${m.type.toUpperCase()}: ${m.content}`)
                .join('\n');

            const systemPrompt = `Summarize this conversation concisely. Focus on:
1. Main topics discussed
2. Key insights or decisions
3. Action items or next steps
4. User's goals or challenges

Keep the summary under 200 words and extract 3-5 key topics.`;

            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: messageText }
                ],
                temperature: 0.3,
                max_tokens: 300
            });

            const summaryContent = response.choices[0].message.content.trim();
            
            // Extract key topics (simple implementation)
            const keyTopics = this.extractKeyTopicsFromSummary(summaryContent);
            
            // Update conversation with summary
            conversation.updateSummary({
                content: summaryContent,
                keyTopics: keyTopics,
                generatedAt: new Date()
            });

            await conversation.save();
            
            console.log(`📋 Generated summary for conversation ${conversationId}`);
            return {
                content: summaryContent,
                keyTopics: keyTopics
            };

        } catch (error) {
            console.error('Generate conversation summary error:', error);
            throw error;
        }
    }

    /**
     * Migration helper to convert status to isActive
     */
    static async migrateConversationsToIsActive(userId = null) {
        try {
            console.log('🔄 Starting conversation migration to isActive field...');
            
            const query = userId ? { userId } : {};
            
            // Update active conversations
            const activeResult = await Conversation.updateMany(
                { ...query, status: 'active', isActive: { $exists: false } },
                { $set: { isActive: true } }
            );

            // Update archived/deleted conversations
            const inactiveResult = await Conversation.updateMany(
                { ...query, status: { $in: ['archived', 'deleted'] }, isActive: { $exists: false } },
                { $set: { isActive: false } }
            );

            // Update pinned/starred fields
            const pinnedResult = await Conversation.updateMany(
                { ...query, pinned: true, isPinned: { $exists: false } },
                { $set: { isPinned: true } }
            );

            const starredResult = await Conversation.updateMany(
                { ...query, starred: true, isStarred: { $exists: false } },
                { $set: { isStarred: true } }
            );

            console.log(`✅ Migration completed:`, {
                activeUpdated: activeResult.modifiedCount,
                inactiveUpdated: inactiveResult.modifiedCount,
                pinnedUpdated: pinnedResult.modifiedCount,
                starredUpdated: starredResult.modifiedCount
            });

            return {
                success: true,
                activeUpdated: activeResult.modifiedCount,
                inactiveUpdated: inactiveResult.modifiedCount,
                pinnedUpdated: pinnedResult.modifiedCount,
                starredUpdated: starredResult.modifiedCount
            };

        } catch (error) {
            console.error('❌ Conversation migration failed:', error);
            throw error;
        }
    }

    /**
     * Search conversations with enhanced persistence support
     */
    static async searchAllConversations(userId, query, options = {}) {
        try {
            const { limit = 10, category, includeMessages = false } = options;
            
            // Build search query with isActive
            const searchQuery = {
                userId,
                isActive: true,
                $or: [
                    { title: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } },
                    { tags: { $regex: query, $options: 'i' } }
                ]
            };

            if (category) {
                searchQuery.category = category;
            }

            // If includeMessages is true, also search in message content
            if (includeMessages) {
                searchQuery.$or.push({
                    'messages.content': { $regex: query, $options: 'i' }
                });
            }

            const conversations = await Conversation.find(searchQuery)
                .sort({ lastActiveAt: -1 })
                .limit(limit)
                .select('title description category tags lastActiveAt messageCount createdAt isStarred isPinned')
                .lean();

            // Add search highlights and previews
            const enrichedResults = conversations.map(conv => ({
                ...conv,
                preview: this.generateSearchPreview(conv, query),
                highlights: this.findQueryHighlights(conv, query),
                matchType: this.determineMatchType(conv, query),
                // Ensure boolean fields
                isStarred: conv.isStarred || false,
                isPinned: conv.isPinned || false
            }));

            console.log(`🔍 Search for "${query}" found ${enrichedResults.length} conversations`);

            return enrichedResults;

        } catch (error) {
            console.error('Search conversations error:', error);
            return [];
        }
    }

    /**
     * Get conversation analytics with enhanced persistence
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
                        userId: new mongoose.Types.ObjectId(userId),
                        isActive: true,
                        createdAt: { $gte: dateThreshold }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalConversations: { $sum: 1 },
                        totalMessages: { $sum: { $size: { $ifNull: ['$messages', []] } } },
                        totalTokens: { $sum: { $ifNull: ['$analytics.tokensUsed', 0] } },
                        avgEngagement: { $avg: { $ifNull: ['$analytics.engagementScore', 0] } },
                        pinnedCount: {
                            $sum: { $cond: [{ $eq: [{ $ifNull: ['$isPinned', false] }, true] }, 1, 0] }
                        },
                        starredCount: {
                            $sum: { $cond: [{ $eq: [{ $ifNull: ['$isStarred', false] }, true] }, 1, 0] }
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
                userId: new mongoose.Types.ObjectId(userId),
                isActive: true,
                createdAt: { $gte: dateThreshold }
            })
            .sort({ messageCount: -1 })
            .limit(5)
            .select('title messageCount lastActiveAt')
            .lean();

            console.log(`📊 Analytics for user ${userId} (${timeframe}): ${result.totalConversations} conversations, ${result.totalMessages} messages`);

            return {
                ...result,
                categoryDistribution,
                mostActiveConversations,
                timeframe,
                avgMessagesPerConversation: result.totalConversations > 0 ? 
                    Math.round(result.totalMessages / result.totalConversations) : 0,
                generatedAt: new Date()
            };

        } catch (error) {
            console.error('Get conversation analytics error:', error);
            return {
                totalConversations: 0,
                totalMessages: 0,
                totalTokens: 0,
                avgEngagement: 0,
                pinnedCount: 0,
                starredCount: 0,
                categoryDistribution: {},
                mostActiveConversations: [],
                timeframe,
                avgMessagesPerConversation: 0,
                generatedAt: new Date(),
                error: 'Failed to load analytics'
            };
        }
    }

    // ===================================================================
    // HELPER METHODS
    // ===================================================================

    /**
     * Generate preview for conversation
     */
    static generatePreview(conversation, lastMessage = null) {
        // Try summary first
        if (conversation.summary && conversation.summary.content) {
            return conversation.summary.content.substring(0, 100) + '...';
        }

        // Try description
        if (conversation.description && conversation.description.trim()) {
            return conversation.description.substring(0, 100) + '...';
        }

        // Try last message
        const message = lastMessage || (conversation.messages && conversation.messages.length > 0 ? 
            conversation.messages[conversation.messages.length - 1] : null);
        
        if (message && message.content) {
            return message.content.substring(0, 100) + '...';
        }

        // Fallback
        return 'No content available';
    }

    /**
     * Extract key topics from summary
     */
    static extractKeyTopicsFromSummary(summaryContent) {
        // Simple keyword extraction
        const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
        const words = summaryContent.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !commonWords.has(word));

        // Count word frequency
        const wordCount = {};
        words.forEach(word => {
            wordCount[word] = (wordCount[word] || 0) + 1;
        });

        // Return top 5 most frequent words as topics
        return Object.entries(wordCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([word]) => word);
    }

    /**
     * Find query highlights in conversation content
     */
    static findQueryHighlights(conversation, query) {
        const highlights = [];
        const queryLower = query.toLowerCase();

        // Check title
        if (conversation.title && conversation.title.toLowerCase().includes(queryLower)) {
            highlights.push({
                type: 'title',
                text: conversation.title,
                position: conversation.title.toLowerCase().indexOf(queryLower)
            });
        }

        // Check description
        if (conversation.description) {
            const descLower = conversation.description.toLowerCase();
            if (descLower.includes(queryLower)) {
                const position = descLower.indexOf(queryLower);
                const start = Math.max(0, position - 30);
                const end = Math.min(conversation.description.length, position + 70);
                
                highlights.push({
                    type: 'description',
                    text: conversation.description.substring(start, end),
                    position: position
                });
            }
        }

        // Check tags
        if (conversation.tags) {
            conversation.tags.forEach(tag => {
                if (tag.toLowerCase().includes(queryLower)) {
                    highlights.push({
                        type: 'tag',
                        text: tag,
                        position: 0
                    });
                }
            });
        }

        return highlights.slice(0, 3);
    }

    /**
     * Generate search preview
     */
    static generateSearchPreview(conversation, query) {
        const queryLower = query.toLowerCase();
        
        // Try title first
        if (conversation.title && conversation.title.toLowerCase().includes(queryLower)) {
            return conversation.title;
        }
        
        // Try description
        if (conversation.description) {
            const content = conversation.description;
            const contentLower = content.toLowerCase();
            
            if (contentLower.includes(queryLower)) {
                const position = contentLower.indexOf(queryLower);
                const start = Math.max(0, position - 50);
                const end = Math.min(content.length, position + 100);
                
                return content.substring(start, end) + (end < content.length ? '...' : '');
            }
        }

        return conversation.description || 'No preview available';
    }

    /**
     * Determine match type
     */
    static determineMatchType(conversation, query) {
        const queryLower = query.toLowerCase();
        
        if (conversation.title.toLowerCase().includes(queryLower)) {
            return 'title';
        }
        
        if (conversation.description && conversation.description.toLowerCase().includes(queryLower)) {
            return 'description';
        }
        
        if (conversation.tags && conversation.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
            return 'tags';
        }
        
        return 'content';
    }
}

module.exports = ConversationService;