// src/components/subscription/settings/BillingHistoryCard.js - FIXED DATE HANDLING
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Divider,
  Collapse,
  Paper
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CreditCard as CreditCardIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  AccessTime as AccessTimeIcon,
  ManageAccounts as ManageIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import subscriptionService from '../../../utils/subscriptionService';

const BillingHistoryCard = ({ subscription, onError, onSuccess }) => {
  const theme = useTheme();
  const [billingHistory, setBillingHistory] = useState([]);
  const [loading, setLoading] = useState({
    history: false,
    portal: false,
    downloads: {} // Track individual download states
  });
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState('');

  const currentTier = subscription?.subscriptionTier || 'free';

  // Load billing history on component mount
  useEffect(() => {
    if (currentTier !== 'free') {
      loadBillingHistory();
    }
  }, [currentTier]);

  const loadBillingHistory = async () => {
    try {
      setLoading(prev => ({ ...prev, history: true }));
      setError('');
      
      const response = await subscriptionService.getBillingHistory(10);
      console.log('🔍 Raw billing history response:', response);
      
      // Handle both response.history and response.data.history
      const historyData = response.history || response.data?.history || response.data || [];
      console.log('🔍 Processed billing history data:', historyData);
      
      setBillingHistory(historyData);
      
    } catch (error) {
      console.error('Error loading billing history:', error);
      setError('Failed to load billing history');
    } finally {
      setLoading(prev => ({ ...prev, history: false }));
    }
  };

  // Handle customer portal access
  const handleManageBilling = async () => {
    try {
      setLoading(prev => ({ ...prev, portal: true }));
      
      const portalSession = await subscriptionService.createCustomerPortalSession();
      
      // Redirect to Stripe customer portal
      window.open(portalSession.portalUrl, '_blank');
      
    } catch (error) {
      console.error('Error opening customer portal:', error);
      onError?.('Failed to open billing portal. Please try again.');
    } finally {
      setLoading(prev => ({ ...prev, portal: false }));
    }
  };

  // FIXED: Handle invoice download with actual Stripe integration
  const handleDownloadInvoice = async (invoiceId, invoiceUrl) => {
    try {
      setLoading(prev => ({ 
        ...prev, 
        downloads: { ...prev.downloads, [invoiceId]: true }
      }));

      // If we have a hosted invoice URL from Stripe, open it directly
      if (invoiceUrl) {
        window.open(invoiceUrl, '_blank');
        onSuccess?.('Invoice opened in new tab');
        return;
      }

      // Otherwise, try to fetch invoice download URL from our backend
      try {
        const response = await fetch(`/api/subscriptions/invoice/${invoiceId}/download`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.downloadUrl) {
            window.open(data.data.downloadUrl, '_blank');
            onSuccess?.('Invoice download started');
          } else {
            throw new Error('No download URL received');
          }
        } else {
          throw new Error('Failed to get invoice download URL');
        }
      } catch (apiError) {
        console.error('API download failed:', apiError);
        onError?.('Unable to download invoice. Please try using "Manage Billing" to access your invoices.');
      }
      
    } catch (error) {
      console.error('Error downloading invoice:', error);
      onError?.('Failed to download invoice. Please try again or use "Manage Billing" to access invoices.');
    } finally {
      setLoading(prev => ({ 
        ...prev, 
        downloads: { ...prev.downloads, [invoiceId]: false }
      }));
    }
  };

  // Get payment status display
  const getPaymentStatusDisplay = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'succeeded':
        return {
          label: 'Paid',
          color: 'success',
          icon: <CheckCircleIcon sx={{ fontSize: 16 }} />
        };
      case 'pending':
        return {
          label: 'Pending',
          color: 'warning',
          icon: <AccessTimeIcon sx={{ fontSize: 16 }} />
        };
      case 'failed':
      case 'canceled':
        return {
          label: 'Failed',
          color: 'error',
          icon: <ErrorIcon sx={{ fontSize: 16 }} />
        };
      default:
        return {
          label: status || 'Unknown',
          color: 'default',
          icon: <AccessTimeIcon sx={{ fontSize: 16 }} />
        };
    }
  };

  // FIXED: Format currency - check if amount needs conversion from cents
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) {
      return '$0.00';
    }
    
    // Convert to number if it's a string
    const numAmount = parseFloat(amount);
    
    // If amount is already a decimal (like 24.99), don't divide by 100
    // If amount is in cents (like 3499), divide by 100
    let finalAmount = numAmount;
    
    // Heuristic: if amount is greater than 1000 and a whole number, it's likely in cents
    if (Number.isInteger(numAmount) && numAmount > 1000) {
      finalAmount = numAmount / 100;
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(finalAmount);
  };

  // FIXED: Format date with comprehensive fallback handling
  const formatDate = (payment) => {
    console.log('🔍 Formatting date for payment:', {
      payment,
      paymentKeys: Object.keys(payment || {}),
      created: payment?.created,
      created_at: payment?.created_at,
      date: payment?.date,
      payment_date: payment?.payment_date,
      period_start: payment?.period_start,
      status_transitions: payment?.status_transitions
    });
    
    if (!payment) {
      console.warn('⚠️ No payment object provided');
      return 'Invalid Date';
    }

    // Try different date fields in order of preference
    const dateFields = [
      // Stripe invoice fields (preferred)
      payment.status_transitions?.paid_at,  // When actually paid
      payment.created,                      // When invoice was created
      payment.period_start,                 // Billing period start
      
      // Our database fields
      payment.created_at,
      payment.date,
      payment.payment_date,
      
      // Fallback to current time
      Math.floor(Date.now() / 1000)
    ];

    for (const dateValue of dateFields) {
      if (dateValue) {
        try {
          let date;
          
          // Handle different date formats
          if (typeof dateValue === 'number') {
            // Unix timestamp - check if it's in seconds or milliseconds
            if (dateValue < 1e12) {
              // Likely in seconds, convert to milliseconds
              date = new Date(dateValue * 1000);
            } else {
              // Already in milliseconds
              date = new Date(dateValue);
            }
          } else if (typeof dateValue === 'string') {
            // String date - try to parse
            date = new Date(dateValue);
          } else if (dateValue instanceof Date) {
            // Already a Date object
            date = dateValue;
          } else {
            continue; // Skip this field and try the next one
          }

          // Validate the date
          if (isNaN(date.getTime())) {
            console.warn('⚠️ Invalid date created from:', dateValue);
            continue; // Try the next field
          }

          // Format the valid date
          const formatted = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });

          console.log('✅ Date formatted successfully:', {
            sourceField: dateValue,
            formatted
          });
          return formatted;
          
        } catch (error) {
          console.warn('⚠️ Error formatting date value:', dateValue, error);
          continue; // Try the next field
        }
      }
    }

    console.error('❌ Could not format any date field for payment');
    return 'Invalid Date';
  };

  // Show loading state for paid plans
  if (currentTier !== 'free' && loading.history) {
    return (
      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            <ReceiptIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Billing History
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: 200,
            gap: 2
          }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary">
              Loading billing history...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          mb: 3
        }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
              <ReceiptIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Billing History
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentTier === 'free' 
                ? 'Track your payment history when you upgrade to a paid plan'
                : 'View and manage your payment history'
              }
            </Typography>
          </Box>

          {/* Only show Manage Billing button for paid users */}
          {currentTier !== 'free' && (
            <Button
              variant="outlined"
              startIcon={<ManageIcon />}
              onClick={handleManageBilling}
              disabled={loading.portal}
              sx={{ borderRadius: 2 }}
            >
              {loading.portal ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  Opening...
                </>
              ) : (
                'Manage Billing'
              )}
            </Button>
          )}
        </Box>

        {/* Free Plan Message - No Upgrade Button */}
        {currentTier === 'free' && (
          <Box sx={{ 
            p: 3,
            borderRadius: 2,
            backgroundColor: theme.palette.grey[50],
            border: `1px solid ${theme.palette.grey[200]}`,
            textAlign: 'center'
          }}>
            <CreditCardIcon sx={{ 
              fontSize: 48, 
              color: theme.palette.grey[400],
              mb: 2
            }} />
            <Typography variant="h6" sx={{ fontWeight: 500, mb: 1 }}>
              No Billing History
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              You're currently on the free plan. When you upgrade to a paid plan, your billing history and invoices will appear here.
            </Typography>
            
            {/* Information Box Instead of Upgrade Button */}
            <Box sx={{ 
              p: 2,
              borderRadius: 2,
              backgroundColor: theme.palette.info.light + '20',
              border: `1px solid ${theme.palette.info.light}`,
              textAlign: 'left'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <InfoIcon sx={{ 
                  fontSize: 20, 
                  color: theme.palette.info.main,
                  mr: 1
                }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.info.dark }}>
                  What you'll see here:
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, ml: 3 }}>
                • Monthly subscription payments
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, ml: 3 }}>
                • Downloadable invoices
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, ml: 3 }}>
                • Payment status tracking
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 3 }}>
                • Access to billing management portal
              </Typography>
            </Box>
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3, borderRadius: 2 }}
            action={
              <Button size="small" onClick={loadBillingHistory}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Billing History Table */}
        {currentTier !== 'free' && billingHistory.length > 0 && (
          <>
            <TableContainer component={Paper} sx={{ borderRadius: 2, border: `1px solid ${theme.palette.grey[200]}` }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: theme.palette.grey[50] }}>
                    <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Invoice</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {billingHistory.slice(0, expanded ? billingHistory.length : 5).map((payment, index) => {
                    const statusDisplay = getPaymentStatusDisplay(payment.status);
                    const isDownloading = loading.downloads[payment.id || payment.stripe_invoice_id];
                    
                    // Debug log for each payment item
                    console.log(`🔍 Payment item ${index + 1}:`, {
                      payment,
                      id: payment.id,
                      stripe_invoice_id: payment.stripe_invoice_id,
                      amount: payment.amount,
                      status: payment.status,
                      description: payment.description,
                      created: payment.created,
                      created_at: payment.created_at
                    });
                    
                    return (
                      <TableRow key={payment.id || payment.stripe_invoice_id || index} hover>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(payment)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {payment.description || `${currentTier} Plan - Monthly Subscription`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {payment.billing_reason && `Billing: ${payment.billing_reason}`}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatCurrency(payment.amount || payment.amount_paid || payment.total || 0)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={statusDisplay.icon}
                            label={statusDisplay.label}
                            size="small"
                            color={statusDisplay.color}
                            variant="outlined"
                            sx={{ borderRadius: 1 }}
                          />
                        </TableCell>
                        <TableCell>
                          {(payment.invoice_url || payment.hosted_invoice_url || payment.invoice || payment.receipt_url) ? (
                            <IconButton
                              size="small"
                              onClick={() => handleDownloadInvoice(
                                payment.id || payment.stripe_invoice_id, 
                                payment.hosted_invoice_url || payment.invoice_url || payment.receipt_url
                              )}
                              disabled={isDownloading}
                              sx={{ color: theme.palette.primary.main }}
                            >
                              {isDownloading ? (
                                <CircularProgress size={18} />
                              ) : (
                                <DownloadIcon sx={{ fontSize: 18 }} />
                              )}
                            </IconButton>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              N/A
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Expand/Collapse Button */}
            {billingHistory.length > 5 && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button
                  onClick={() => setExpanded(!expanded)}
                  startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  sx={{ borderRadius: 2 }}
                >
                  {expanded ? 'Show Less' : `Show All ${billingHistory.length} Payments`}
                </Button>
              </Box>
            )}
          </>
        )}

        {/* No History State for Paid Plans */}
        {currentTier !== 'free' && billingHistory.length === 0 && !loading.history && !error && (
          <Box sx={{ 
            p: 3,
            borderRadius: 2,
            backgroundColor: theme.palette.grey[50],
            border: `1px solid ${theme.palette.grey[200]}`,
            textAlign: 'center'
          }}>
            <ReceiptIcon sx={{ 
              fontSize: 48, 
              color: theme.palette.grey[400],
              mb: 2
            }} />
            <Typography variant="h6" sx={{ fontWeight: 500, mb: 1 }}>
              No Payment History
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your billing history will appear here once you have completed payments.
            </Typography>
          </Box>
        )}

        {/* Payment Information - Only for Paid Users */}
        {currentTier !== 'free' && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box sx={{ 
              p: 2,
              borderRadius: 2,
              backgroundColor: theme.palette.info.light + '20',
              border: `1px solid ${theme.palette.info.light}`
            }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: theme.palette.info.dark }}>
                Billing Information
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                • Monthly subscriptions are billed automatically
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                • Invoices are sent to your registered email address
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Use "Manage Billing" to update payment methods and billing details
              </Typography>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BillingHistoryCard;