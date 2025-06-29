// backend/middleware/usage.middleware.js
const usageService = require('../services/usage.service');
const User = require('../models/mongodb/user.model');

class UsageMiddleware {
  /**
   * Check usage limit before allowing action
   * @param {string} action - Action to check (e.g., 'resumeUploads', 'jobImports')
   * @param {number} quantity - Quantity needed (default: 1)
   */
  static checkUsageLimit(action, quantity = 1) {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        // For dynamic quantity, check if it's specified in request body or params
        let actualQuantity = quantity;
        if (req.body?.quantity && typeof req.body.quantity === 'number') {
          actualQuantity = req.body.quantity;
        } else if (req.params?.quantity && !isNaN(parseInt(req.params.quantity))) {
          actualQuantity = parseInt(req.params.quantity);
        }

        const usageCheck = await usageService.checkUsageLimit(userId, action, actualQuantity);

        if (!usageCheck.allowed) {
          return res.status(403).json({
            success: false,
            error: 'Usage limit exceeded',
            details: {
              action,
              reason: usageCheck.reason,
              current: usageCheck.current,
              limit: usageCheck.limit,
              plan: usageCheck.plan,
              upgradeRequired: true,
              recommendedPlan: usageService.getRecommendedPlan(action)
            }
          });
        }

        // Store usage check result for potential tracking later
        req.usageCheck = usageCheck;
        req.usageAction = action;
        req.usageQuantity = actualQuantity;

        next();
      } catch (error) {
        console.error('Usage limit check error:', error);
        res.status(500).json({
          success: false,
          error: 'Usage verification failed'
        });
      }
    };
  }

  /**
   * Track usage after successful action
   * @param {string} action - Action to track
   * @param {number} quantity - Quantity to track (default: 1)
   * @param {Function} metadataExtractor - Function to extract metadata from request
   */
  static trackUsage(action, quantity = 1, metadataExtractor = null) {
    return async (req, res, next) => {
      // Store original res.json to intercept successful responses
      const originalJson = res.json;
      
      res.json = async function(body) {
        try {
          // Only track usage on successful responses
          if (body && body.success !== false && res.statusCode < 400) {
            const userId = req.user?.id;
            if (userId) {
              // Use quantity from previous usage check or default
              let actualQuantity = req.usageQuantity || quantity;
              
              // Extract metadata if extractor function provided
              let metadata = {};
              if (metadataExtractor && typeof metadataExtractor === 'function') {
                try {
                  metadata = metadataExtractor(req, res, body);
                } catch (extractorError) {
                  console.error('Error extracting metadata:', extractorError);
                }
              }

              try {
                const usageResult = await usageService.trackUsage(
                  userId, 
                  action, 
                  actualQuantity, 
                  metadata
                );

                // Add usage information to response
                if (body && typeof body === 'object') {
                  body.usage = {
                    action,
                    tracked: actualQuantity,
                    remaining: usageResult.remaining,
                    stats: usageResult.usageStats
                  };
                }
              } catch (trackingError) {
                console.error(`Error tracking usage for ${action}:`, trackingError);
                // Don't fail the response for tracking errors
              }
            }
          }
        } catch (error) {
          console.error('Usage tracking middleware error:', error);
        }

        // Call original res.json
        return originalJson.call(this, body);
      };

      next();
    };
  }

  /**
   * Combined middleware: check limit then track usage
   * @param {string} action - Action to check and track
   * @param {number} quantity - Quantity (default: 1)
   * @param {Function} metadataExtractor - Function to extract metadata
   */
  static checkAndTrack(action, quantity = 1, metadataExtractor = null) {
    return [
      this.checkUsageLimit(action, quantity),
      this.trackUsage(action, quantity, metadataExtractor)
    ];
  }

  /**
   * Validate multiple usage requirements
   * @param {Array} requirements - Array of {action, quantity} objects
   */
  static checkMultipleUsageLimits(requirements) {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        const failedChecks = [];
        const passedChecks = [];

        for (const { action, quantity = 1 } of requirements) {
          const usageCheck = await usageService.checkUsageLimit(userId, action, quantity);
          
          if (!usageCheck.allowed) {
            failedChecks.push({
              action,
              reason: usageCheck.reason,
              current: usageCheck.current,
              limit: usageCheck.limit
            });
          } else {
            passedChecks.push(usageCheck);
          }
        }

        if (failedChecks.length > 0) {
          return res.status(403).json({
            success: false,
            error: 'Usage limits exceeded',
            details: {
              failedChecks,
              upgradeRequired: true
            }
          });
        }

        req.multipleUsageChecks = passedChecks;
        next();
      } catch (error) {
        console.error('Multiple usage limits check error:', error);
        res.status(500).json({
          success: false,
          error: 'Usage verification failed'
        });
      }
    };
  }

  /**
   * Track multiple usage items
   * @param {Array} trackingItems - Array of {action, quantity, metadataExtractor} objects
   */
  static trackMultipleUsage(trackingItems) {
    return async (req, res, next) => {
      const originalJson = res.json;
      
      res.json = async function(body) {
        try {
          if (body && body.success !== false && res.statusCode < 400) {
            const userId = req.user?.id;
            if (userId) {
              const trackingResults = [];

              for (const { action, quantity = 1, metadataExtractor } of trackingItems) {
                try {
                  let metadata = {};
                  if (metadataExtractor && typeof metadataExtractor === 'function') {
                    metadata = metadataExtractor(req, res, body);
                  }

                  const usageResult = await usageService.trackUsage(
                    userId, 
                    action, 
                    quantity, 
                    metadata
                  );

                  trackingResults.push({
                    action,
                    tracked: quantity,
                    remaining: usageResult.remaining
                  });
                } catch (trackingError) {
                  console.error(`Error tracking usage for ${action}:`, trackingError);
                }
              }

              if (body && typeof body === 'object' && trackingResults.length > 0) {
                body.usageTracked = trackingResults;
              }
            }
          }
        } catch (error) {
          console.error('Multiple usage tracking error:', error);
        }

        return originalJson.call(this, body);
      };

      next();
    };
  }

  /**
   * Add usage warnings to response
   */
  static addUsageWarnings() {
    return async (req, res, next) => {
      const originalJson = res.json;
      
      res.json = async function(body) {
        try {
          const userId = req.user?.id;
          if (userId && body && body.success !== false) {
            const warnings = await usageService.getUsageWarnings(userId);
            
            if (warnings.length > 0) {
              if (typeof body === 'object') {
                body.usageWarnings = warnings;
              }
            }
          }
        } catch (error) {
          console.error('Error adding usage warnings:', error);
        }

        return originalJson.call(this, body);
      };

      next();
    };
  }

  /**
   * Middleware for AI Assistant specific usage tracking
   * Tracks both conversations and messages
   */
  static trackAIUsage() {
    return async (req, res, next) => {
      const originalJson = res.json;
      
      res.json = async function(body) {
        try {
          if (body && body.success !== false && res.statusCode < 400) {
            const userId = req.user?.id;
            if (userId) {
              // Extract AI usage metadata from request/response
              const isNewConversation = req.body?.newConversation || false;
              const messageCount = 1; // Each request is typically one message
              const tokensUsed = body.tokensUsed || 0;
              const costUsd = body.costUsd || 0;
              const conversationId = body.conversationId || req.body?.conversationId;
              const featureType = req.body?.featureType || 'general';

              const trackingActions = [];

              // Track new conversation
              if (isNewConversation) {
                trackingActions.push({
                  action: 'aiConversations',
                  quantity: 1,
                  metadata: {
                    conversationId,
                    featureType,
                    tokensUsed,
                    costUsd
                  }
                });
              }

              // Always track messages
              trackingActions.push({
                action: 'aiMessagesTotal',
                quantity: messageCount,
                metadata: {
                  conversationId,
                  featureType,
                  tokensUsed,
                  costUsd
                }
              });

              // Track usage
              for (const { action, quantity, metadata } of trackingActions) {
                try {
                  await usageService.trackUsage(userId, action, quantity, metadata);
                } catch (trackingError) {
                  console.error(`Error tracking AI usage for ${action}:`, trackingError);
                }
              }

              // Add AI usage info to response
              if (body && typeof body === 'object') {
                body.aiUsageTracked = {
                  conversationTracked: isNewConversation,
                  messagesTracked: messageCount,
                  tokensUsed,
                  costUsd
                };
              }
            }
          }
        } catch (error) {
          console.error('AI usage tracking error:', error);
        }

        return originalJson.call(this, body);
      };

      next();
    };
  }

  /**
   * Rate limiting based on usage
   * @param {string} action - Action to rate limit
   * @param {number} maxPerHour - Maximum allowed per hour
   */
  static rateLimitByUsage(action, maxPerHour = 10) {
    const userHourlyUsage = new Map();

    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        const now = Date.now();
        const hourKey = `${userId}-${Math.floor(now / (1000 * 60 * 60))}`;
        
        const currentHourUsage = userHourlyUsage.get(hourKey) || 0;
        
        if (currentHourUsage >= maxPerHour) {
          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            details: {
              action,
              maxPerHour,
              currentUsage: currentHourUsage,
              resetTime: new Date(Math.ceil(now / (1000 * 60 * 60)) * (1000 * 60 * 60))
            }
          });
        }

        // Increment usage
        userHourlyUsage.set(hourKey, currentHourUsage + 1);

        // Clean up old entries periodically
        if (Math.random() < 0.01) { // 1% chance
          const cutoff = Math.floor(now / (1000 * 60 * 60)) - 24; // Keep last 24 hours
          for (const [key] of userHourlyUsage) {
            if (key.includes('-') && parseInt(key.split('-')[1]) < cutoff) {
              userHourlyUsage.delete(key);
            }
          }
        }

        next();
      } catch (error) {
        console.error('Usage-based rate limiting error:', error);
        res.status(500).json({
          success: false,
          error: 'Rate limiting check failed'
        });
      }
    };
  }

  /**
   * Validate usage for specific routes based on request parameters
   */
  static validateUsageFromRequest(actionExtractor, quantityExtractor = () => 1) {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        let action, quantity;
        
        try {
          action = actionExtractor(req);
          quantity = quantityExtractor(req);
        } catch (extractorError) {
          return res.status(400).json({
            success: false,
            error: 'Invalid request parameters for usage validation'
          });
        }

        const validation = await usageService.validateUsage(userId, action, quantity);

        if (!validation.valid) {
          return res.status(403).json({
            success: false,
            error: 'Usage limit exceeded',
            details: {
              action,
              reason: validation.reason,
              current: validation.current,
              limit: validation.limit,
              upgradeRequired: validation.upgradeRequired,
              recommendedPlan: validation.recommendedPlan
            }
          });
        }

        req.validatedUsage = { action, quantity, validation };
        next();
      } catch (error) {
        console.error('Request-based usage validation error:', error);
        res.status(500).json({
          success: false,
          error: 'Usage validation failed'
        });
      }
    };
  }

  /**
   * Middleware to inject current usage stats into response
   */
  static injectUsageStats() {
    return async (req, res, next) => {
      const originalJson = res.json;
      
      res.json = async function(body) {
        try {
          const userId = req.user?.id;
          if (userId && body && body.success !== false) {
            const usageStats = await usageService.getUserUsageStats(userId);
            
            if (body && typeof body === 'object') {
              body.currentUsage = usageStats;
            }
          }
        } catch (error) {
          console.error('Error injecting usage stats:', error);
        }

        return originalJson.call(this, body);
      };

      next();
    };
  }

  /**
   * Log usage activity for monitoring
   */
  static logUsageActivity(action) {
    return (req, res, next) => {
      const originalJson = res.json;
      
      res.json = function(body) {
        if (body && body.success !== false && res.statusCode < 400) {
          const userId = req.user?.id;
          if (userId) {
            console.log(`Usage Activity: ${action} - User: ${userId} - Method: ${req.method} ${req.originalUrl}`);
          }
        }
        
        return originalJson.call(this, body);
      };

      next();
    };
  }

  /**
   * Prevent usage tracking on failed requests
   */
  static skipTrackingOnError() {
    return (req, res, next) => {
      const originalJson = res.json;
      
      res.json = function(body) {
        // Mark response for usage tracking middleware
        if (body && (body.success === false || res.statusCode >= 400)) {
          res.skipUsageTracking = true;
        }
        
        return originalJson.call(this, body);
      };

      next();
    };
  }

  /**
   * Conditional usage tracking based on response
   */
  static conditionalTrack(action, condition = null) {
    return async (req, res, next) => {
      const originalJson = res.json;
      
      res.json = async function(body) {
        try {
          if (!res.skipUsageTracking && body && body.success !== false && res.statusCode < 400) {
            const userId = req.user?.id;
            if (userId) {
              // Check condition if provided
              let shouldTrack = true;
              if (condition && typeof condition === 'function') {
                shouldTrack = condition(req, res, body);
              }

              if (shouldTrack) {
                try {
                  await usageService.trackUsage(userId, action, 1);
                } catch (trackingError) {
                  console.error(`Error in conditional tracking for ${action}:`, trackingError);
                }
              }
            }
          }
        } catch (error) {
          console.error('Conditional usage tracking error:', error);
        }

        return originalJson.call(this, body);
      };

      next();
    };
  }
}

module.exports = UsageMiddleware;