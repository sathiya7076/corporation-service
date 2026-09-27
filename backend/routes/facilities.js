import express from 'express';
import Facility from '../models/Facility.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// IMPORTANT: Specific routes MUST come before parameterized routes
// @route   GET /api/facilities/types/list
// @desc    Get facility types
// @access  Public
router.get('/types/list', (req, res) => {
  const facilityTypes = [
    {
      value: 'recycling_center',
      label: 'Recycling Center',
      description: 'Processes recyclable materials like plastic, paper, glass'
    },
    {
      value: 'scrap_shop',
      label: 'Scrap Shop',
      description: 'Buys and processes metal scraps and electronic waste'
    },
    {
      value: 'waste_treatment_plant',
      label: 'Waste Treatment Plant',
      description: 'Treats and processes various types of waste'
    },
    {
      value: 'composting_facility',
      label: 'Composting Facility',
      description: 'Converts organic waste into compost'
    },
    {
      value: 'transfer_station',
      label: 'Transfer Station',
      description: 'Temporary storage and sorting of waste'
    },
    {
      value: 'landfill',
      label: 'Landfill',
      description: 'Final disposal site for non-recyclable waste'
    },
    {
      value: 'hazardous_waste_facility',
      label: 'Hazardous Waste Facility',
      description: 'Specialized handling of dangerous waste materials'
    },
    {
      value: 'e_waste_center',
      label: 'E-Waste Center',
      description: 'Electronic waste recycling and disposal'
    }
  ];

  res.json({
    success: true,
    data: {
      types: facilityTypes
    }
  });
});

// @route   GET /api/facilities
// @desc    Get all facilities
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { 
      type, 
      wasteType, 
      longitude, 
      latitude, 
      radius = 10000,
      limit = 50 
    } = req.query;

    console.log('Fetching facilities with params:', { type, wasteType, longitude, latitude, radius, limit });

    let query = { isActive: true };
    
    // Filter by facility type
    if (type && type !== 'all') {
      query.type = type;
    }
    
    // Filter by accepted waste types
    if (wasteType && wasteType !== 'all') {
      query.acceptedWasteTypes = wasteType;
    }

    let facilities;

    // Geospatial query if coordinates provided
    if (longitude && latitude) {
      console.log('Using geospatial query');
      facilities = await Facility.find({
        ...query,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            $maxDistance: parseInt(radius)
          }
        }
      })
      .limit(parseInt(limit))
      .populate('manager', 'name email');
    } else {
      console.log('Using regular query (no location)');
      facilities = await Facility.find(query)
        .limit(parseInt(limit))
        .populate('manager', 'name email');
    }

    console.log(`Found ${facilities.length} facilities`);

    res.json({
      success: true,
      data: {
        facilities: facilities.map(facility => {
          const facilityObj = facility.toObject();
          
          // Calculate distance if coordinates provided
          if (longitude && latitude) {
            const [facLng, facLat] = facility.location.coordinates;
            const userLng = parseFloat(longitude);
            const userLat = parseFloat(latitude);
            
            // Haversine formula for distance calculation
            const R = 6371; // Earth's radius in km
            const dLat = (facLat - userLat) * Math.PI / 180;
            const dLng = (facLng - userLng) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                     Math.cos(userLat * Math.PI / 180) * Math.cos(facLat * Math.PI / 180) *
                     Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distance = R * c;
            
            facilityObj.distance = Math.round(distance * 100) / 100; // Round to 2 decimal places
          }
          
          return facilityObj;
        })
      }
    });
  } catch (error) {
    console.error('Get facilities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch facilities',
      error: error.message
    });
  }
});

// @route   GET /api/facilities/:id
// @desc    Get single facility
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const facility = await Facility.findOne({
      _id: req.params.id,
      isActive: true
    })
    .populate('manager', 'name email phone')
    .populate('reviews.user', 'name');

    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    res.json({
      success: true,
      data: {
        facility
      }
    });
  } catch (error) {
    console.error('Get facility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch facility'
    });
  }
});

// @route   POST /api/facilities/:id/review
// @desc    Add facility review
// @access  Private
router.post('/:id/review', authenticate, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const facility = await Facility.findById(req.params.id);
    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    // Check if user already reviewed
    const existingReview = facility.reviews.find(
      review => review.user.toString() === req.user._id.toString()
    );

    if (existingReview) {
      // Update existing review
      existingReview.rating = rating;
      existingReview.comment = comment;
      existingReview.date = new Date();
    } else {
      // Add new review
      facility.reviews.push({
        user: req.user._id,
        rating,
        comment
      });
    }

    // Recalculate average rating
    const totalRating = facility.reviews.reduce((sum, review) => sum + review.rating, 0);
    facility.rating.average = totalRating / facility.reviews.length;
    facility.rating.count = facility.reviews.length;

    await facility.save();
    await facility.populate('reviews.user', 'name');

    res.json({
      success: true,
      message: 'Review added successfully',
      data: {
        facility
      }
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add review'
    });
  }
});

export default router;