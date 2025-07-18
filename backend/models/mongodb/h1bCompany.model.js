// backend/models/mongodb/h1bCompany.model.js
const mongoose = require('mongoose');

const h1bCompanySchema = new mongoose.Schema({
  // Company identification
  companyName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  website: {
    type: String,
    trim: true
  },
  
  // Company details
  foundedYear: {
    type: Number
  },
  ticker: {
    type: String,
    trim: true
  },
  revenue: {
    type: Number // in thousands USD
  },
  revenueRange: {
    type: String,
    trim: true
  },
  employees: {
    type: Number
  },
  employeeRange: {
    type: String,
    trim: true
  },
  
  // Industry information
  primaryIndustry: {
    type: String,
    trim: true,
    index: true
  },
  primarySubIndustry: {
    type: String,
    trim: true
  },
  allIndustries: [{
    type: String,
    trim: true
  }],
  allSubIndustries: [{
    type: String,
    trim: true
  }],
  sicCodes: [{
    type: String,
    trim: true
  }],
  naicsCodes: [{
    type: String,
    trim: true
  }],
  
  // Location information
  headquarters: {
    phone: String,
    fax: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      fullAddress: String
    }
  },
  numberOfLocations: {
    type: Number,
    default: 1
  },
  
  // Social and web presence
  socialProfiles: {
    linkedin: String,
    facebook: String,
    twitter: String
  },
  
  // Company structure
  ownershipType: {
    type: String,
    trim: true
  },
  businessModel: {
    type: String,
    trim: true
  },
  isAcquired: {
    type: Boolean,
    default: false
  },
  parentCompany: {
    id: String,
    name: String,
    relationship: String
  },
  
  // Funding information
  totalFunding: {
    type: Number // in thousands USD
  },
  recentFunding: {
    amount: Number, // in thousands USD
    round: String,
    date: Date,
    investors: [String]
  },
  allInvestors: [String],
  
  // H1B specific data
  h1bData: {
    isActive: {
      type: Boolean,
      default: true
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    dataSource: {
      type: String,
      default: 'CSV_IMPORT'
    },
    queryName: {
      type: String,
      trim: true
    }
  },
  
  // Search optimization
  searchableNames: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Indexes for better search performance
h1bCompanySchema.index({ companyName: 'text', 'searchableNames': 'text' });
h1bCompanySchema.index({ primaryIndustry: 1 });
h1bCompanySchema.index({ 'headquarters.address.state': 1 });
h1bCompanySchema.index({ 'headquarters.address.city': 1 });
h1bCompanySchema.index({ 'h1bData.isActive': 1 });
h1bCompanySchema.index({ employeeRange: 1 });
h1bCompanySchema.index({ revenueRange: 1 });

// Pre-save middleware to update timestamps and searchable names
h1bCompanySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Create searchable variations of company name
  if (this.companyName) {
    const searchableNames = new Set();
    
    // Add original name
    searchableNames.add(this.companyName.toLowerCase());
    
    // Add variations without common suffixes
    const cleanName = this.companyName
      .replace(/\b(inc|corp|corporation|llc|ltd|limited|co|company)\b\.?/gi, '')
      .trim()
      .toLowerCase();
    
    if (cleanName && cleanName !== this.companyName.toLowerCase()) {
      searchableNames.add(cleanName);
    }
    
    // Add variations without punctuation
    const noPunctuation = this.companyName
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    
    if (noPunctuation && noPunctuation !== this.companyName.toLowerCase()) {
      searchableNames.add(noPunctuation);
    }
    
    this.searchableNames = Array.from(searchableNames);
  }
  
  next();
});

// Static methods for searching
h1bCompanySchema.statics.findByCompanyName = function(companyName) {
  if (!companyName) return null;
  
  const searchName = companyName.toLowerCase().trim();
  
  return this.findOne({
    $or: [
      { companyName: new RegExp(escapeRegex(companyName), 'i') },
      { searchableNames: new RegExp(escapeRegex(searchName), 'i') }
    ],
    'h1bData.isActive': true,
    isActive: true
  });
};

h1bCompanySchema.statics.searchCompanies = function(searchTerm, filters = {}) {
  const query = {
    'h1bData.isActive': true,
    isActive: true
  };
  
  if (searchTerm) {
    query.$or = [
      { companyName: new RegExp(escapeRegex(searchTerm), 'i') },
      { searchableNames: new RegExp(escapeRegex(searchTerm), 'i') },
      { primaryIndustry: new RegExp(escapeRegex(searchTerm), 'i') }
    ];
  }
  
  // Apply additional filters
  if (filters.industry) {
    query.primaryIndustry = new RegExp(escapeRegex(filters.industry), 'i');
  }
  
  if (filters.state) {
    query['headquarters.address.state'] = new RegExp(escapeRegex(filters.state), 'i');
  }
  
  if (filters.city) {
    query['headquarters.address.city'] = new RegExp(escapeRegex(filters.city), 'i');
  }
  
  if (filters.employeeRange) {
    query.employeeRange = filters.employeeRange;
  }
  
  return this.find(query).sort({ companyName: 1 });
};

// Helper function to escape regex special characters
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

// Virtual for formatted address
h1bCompanySchema.virtual('formattedAddress').get(function() {
  if (!this.headquarters?.address) return '';
  
  const addr = this.headquarters.address;
  const parts = [addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean);
  return parts.join(', ');
});

// Ensure virtual fields are serialized
h1bCompanySchema.set('toJSON', { virtuals: true });
h1bCompanySchema.set('toObject', { virtuals: true });

const H1BCompany = mongoose.model('H1BCompany', h1bCompanySchema);

module.exports = H1BCompany;