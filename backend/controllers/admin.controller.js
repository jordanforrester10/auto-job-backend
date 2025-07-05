// backend/controllers/admin.controller.js - SIMPLE FUNCTION EXPORTS
let User, Resume, Job, db;

// Try to import dependencies with error handling
try {
  User = require('../models/mongodb/user.model');
  console.log('✅ User model loaded for admin controller');
} catch (error) {
  console.error('❌ Failed to load User model:', error.message);
}

try {
  Resume = require('../models/mongodb/resume.model');
  console.log('✅ Resume model loaded for admin controller');
} catch (error) {
  console.error('❌ Failed to load Resume model:', error.message);
}

try {
  Job = require('../models/mongodb/job.model');
  console.log('✅ Job model loaded for admin controller');
} catch (error) {
  console.error('❌ Failed to load Job model:', error.message);
}

try {
  db = require('../config/postgresql');
  console.log('✅ PostgreSQL config loaded for admin controller');
} catch (error) {
  console.error('❌ Failed to load PostgreSQL config:', error.message);
}

/**
 * Get admin dashboard data
 * @route GET /api/admin/dashboard
 * @access Private (Admin only)
 */
exports.getDashboardData = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.email !== 'jordforrester@gmail.com') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    console.log('🔍 Getting admin dashboard data...');

    // Check if required models are available
    if (!User) {
      return res.status(500).json({
        success: false,
        error: 'User model not available'
      });
    }

    // Get all users with their subscription data
    const users = await User.find({})
      .select('_id email firstName lastName subscriptionTier subscriptionStatus subscriptionEndDate subscriptionStartDate cancelAtPeriodEnd createdAt')
      .sort({ createdAt: -1 });

    console.log(`📊 Found ${users.length} total users`);

    // Get additional data for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        try {
          // Get resume count
          let resumeCount = 0;
          if (Resume) {
            resumeCount = await Resume.countDocuments({ 
              userId: user._id.toString() 
            });
          }

          // Get job count
          let jobCount = 0;
          if (Job) {
            jobCount = await Job.countDocuments({ 
              userId: user._id.toString() 
            });
          }

          // Get PostgreSQL subscription data
          let pgSubscription = null;
          if (db) {
            try {
              const pgQuery = await db.query(`
                SELECT 
                  stripe_customer_id,
                  stripe_subscription_id,
                  status as pg_status,
                  current_period_start,
                  current_period_end,
                  cancel_at_period_end,
                  created_at as pg_created_at
                FROM user_subscriptions 
                WHERE user_id = $1
              `, [user._id.toString()]);

              pgSubscription = pgQuery.rows[0] || null;
            } catch (pgError) {
              console.warn(`⚠️ Could not get PG data for user ${user._id}:`, pgError.message);
            }
          }

          // Get payment history count
          let paymentCount = 0;
          let totalRevenue = 0;
          if (db) {
            try {
              const paymentQuery = await db.query(`
                SELECT 
                  COUNT(*) as payment_count,
                  COALESCE(SUM(amount), 0) as total_amount
                FROM payment_history 
                WHERE user_id = $1 AND status = 'succeeded'
              `, [user._id.toString()]);

              if (paymentQuery.rows[0]) {
                paymentCount = parseInt(paymentQuery.rows[0].payment_count) || 0;
                totalRevenue = parseFloat(paymentQuery.rows[0].total_amount) || 0;
              }
            } catch (paymentError) {
              console.warn(`⚠️ Could not get payment data for user ${user._id}:`, paymentError.message);
            }
          }

          return {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: `${user.firstName} ${user.lastName}`,
            subscriptionTier: user.subscriptionTier,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionEndDate: user.subscriptionEndDate,
            subscriptionStartDate: user.subscriptionStartDate,
            cancelAtPeriodEnd: user.cancelAtPeriodEnd,
            createdAt: user.createdAt,
            resumeCount,
            jobCount,
            paymentCount,
            totalRevenue,
            stripeCustomerId: pgSubscription?.stripe_customer_id || null,
            stripeSubscriptionId: pgSubscription?.stripe_subscription_id || null,
            pgStatus: pgSubscription?.pg_status || null,
            pgCurrentPeriodStart: pgSubscription?.current_period_start || null,
            pgCurrentPeriodEnd: pgSubscription?.current_period_end || null,
            pgCancelAtPeriodEnd: pgSubscription?.cancel_at_period_end || false
          };
        } catch (userError) {
          console.error(`❌ Error getting stats for user ${user._id}:`, userError);
          return {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: `${user.firstName} ${user.lastName}`,
            subscriptionTier: user.subscriptionTier,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionEndDate: user.subscriptionEndDate,
            subscriptionStartDate: user.subscriptionStartDate,
            cancelAtPeriodEnd: user.cancelAtPeriodEnd,
            createdAt: user.createdAt,
            resumeCount: 0,
            jobCount: 0,
            paymentCount: 0,
            totalRevenue: 0,
            error: 'Failed to load user stats'
          };
        }
      })
    );

    // Calculate summary statistics
    const summary = {
      totalUsers: users.length,
      freeUsers: usersWithStats.filter(u => u.subscriptionTier === 'free').length,
      casualUsers: usersWithStats.filter(u => u.subscriptionTier === 'casual').length,
      hunterUsers: usersWithStats.filter(u => u.subscriptionTier === 'hunter').length,
      activeSubscriptions: usersWithStats.filter(u => u.subscriptionStatus === 'active').length,
      canceledSubscriptions: usersWithStats.filter(u => u.cancelAtPeriodEnd === true).length,
      totalResumes: usersWithStats.reduce((sum, u) => sum + u.resumeCount, 0),
      totalJobs: usersWithStats.reduce((sum, u) => sum + u.jobCount, 0),
      totalRevenue: usersWithStats.reduce((sum, u) => sum + u.totalRevenue, 0),
      averageResumesPerUser: usersWithStats.length > 0 
        ? (usersWithStats.reduce((sum, u) => sum + u.resumeCount, 0) / usersWithStats.length).toFixed(2)
        : 0,
      averageJobsPerUser: usersWithStats.length > 0
        ? (usersWithStats.reduce((sum, u) => sum + u.jobCount, 0) / usersWithStats.length).toFixed(2)
        : 0
    };

    console.log('📈 Dashboard summary:', summary);

    res.status(200).json({
      success: true,
      data: {
        users: usersWithStats,
        summary,
        message: `Admin dashboard data retrieved successfully`
      }
    });

  } catch (error) {
    console.error('❌ Error getting admin dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve admin dashboard data'
    });
  }
};

/**
 * Get detailed user information
 * @route GET /api/admin/users/:userId
 * @access Private (Admin only)
 */
exports.getUserDetail = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.email !== 'jordforrester@gmail.com') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { userId } = req.params;

    if (!User) {
      return res.status(500).json({
        success: false,
        error: 'User model not available'
      });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user's resumes
    let resumes = [];
    if (Resume) {
      resumes = await Resume.find({ userId: userId.toString() })
        .select('fileName uploadDate status atsScore')
        .sort({ uploadDate: -1 });
    }

    // Get user's jobs
    let jobs = [];
    if (Job) {
      jobs = await Job.find({ userId: userId.toString() })
        .select('title company location dateAdded status matchScore')
        .sort({ dateAdded: -1 });
    }

    // Get subscription details from PostgreSQL
    let subscriptionDetails = null;
    if (db) {
      try {
        const pgQuery = await db.query(`
          SELECT * FROM user_subscriptions 
          WHERE user_id = $1
        `, [userId]);
        subscriptionDetails = pgQuery.rows[0] || null;
      } catch (pgError) {
        console.warn('Could not get subscription details:', pgError.message);
      }
    }

    // Get payment history
    let paymentHistory = [];
    if (db) {
      try {
        const paymentQuery = await db.query(`
          SELECT 
            amount,
            currency,
            status,
            billing_reason,
            created_at
          FROM payment_history 
          WHERE user_id = $1 
          ORDER BY created_at DESC
          LIMIT 10
        `, [userId]);
        paymentHistory = paymentQuery.rows;
      } catch (paymentError) {
        console.warn('Could not get payment history:', paymentError.message);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          ...user.toObject(),
          resumeCount: resumes.length,
          jobCount: jobs.length
        },
        resumes,
        jobs,
        subscriptionDetails,
        paymentHistory,
        message: 'User details retrieved successfully'
      }
    });

  } catch (error) {
    console.error('Error getting user detail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user details'
    });
  }
};

/**
 * Update user subscription (admin action)
 * @route PUT /api/admin/users/:userId/subscription
 * @access Private (Admin only)
 */
exports.updateUserSubscription = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.email !== 'jordforrester@gmail.com') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { userId } = req.params;
    const { subscriptionTier, subscriptionStatus, subscriptionEndDate } = req.body;

    if (!User) {
      return res.status(500).json({
        success: false,
        error: 'User model not available'
      });
    }

    // Update user subscription
    const updateData = {};
    if (subscriptionTier) updateData.subscriptionTier = subscriptionTier;
    if (subscriptionStatus) updateData.subscriptionStatus = subscriptionStatus;
    if (subscriptionEndDate) updateData.subscriptionEndDate = new Date(subscriptionEndDate);

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log(`✅ Admin updated subscription for user ${userId}:`, updateData);

    res.status(200).json({
      success: true,
      data: {
        user: updatedUser,
        message: 'User subscription updated successfully'
      }
    });

  } catch (error) {
    console.error('Error updating user subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user subscription'
    });
  }
};

/**
 * Get system statistics
 * @route GET /api/admin/stats
 * @access Private (Admin only)
 */
exports.getSystemStats = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.email !== 'jordforrester@gmail.com') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    if (!User) {
      return res.status(500).json({
        success: false,
        error: 'User model not available'
      });
    }

    // Get user registration trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUsers = await User.find({
      createdAt: { $gte: thirtyDaysAgo }
    }).sort({ createdAt: 1 });

    // Group by day
    const dailyRegistrations = {};
    recentUsers.forEach(user => {
      const day = user.createdAt.toISOString().split('T')[0];
      dailyRegistrations[day] = (dailyRegistrations[day] || 0) + 1;
    });

    // Get subscription conversion rates
    const totalUsers = await User.countDocuments({});
    const paidUsers = await User.countDocuments({
      subscriptionTier: { $in: ['casual', 'hunter'] }
    });

    // Get recent payments
    let recentPayments = [];
    if (db) {
      try {
        const paymentQuery = await db.query(`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as payment_count,
            SUM(amount) as daily_revenue
          FROM payment_history 
          WHERE created_at >= $1 AND status = 'succeeded'
          GROUP BY DATE(created_at)
          ORDER BY date DESC
          LIMIT 30
        `, [thirtyDaysAgo]);
        recentPayments = paymentQuery.rows;
      } catch (error) {
        console.warn('Could not get payment stats:', error.message);
      }
    }

    const stats = {
      userGrowth: {
        totalUsers,
        recentUsers: recentUsers.length,
        dailyRegistrations
      },
      subscriptions: {
        conversionRate: totalUsers > 0 ? ((paidUsers / totalUsers) * 100).toFixed(2) : 0,
        paidUsers,
        freeUsers: totalUsers - paidUsers
      },
      revenue: {
        recentPayments,
        totalRevenue: recentPayments.reduce((sum, payment) => 
          sum + parseFloat(payment.daily_revenue || 0), 0
        ).toFixed(2)
      }
    };

    res.status(200).json({
      success: true,
      data: {
        stats,
        message: 'System statistics retrieved successfully'
      }
    });

  } catch (error) {
    console.error('Error getting system stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system statistics'
    });
  }
};