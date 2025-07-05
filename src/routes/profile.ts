import { Router, Request, Response } from 'express';
import Profile from '../models/Profile';

const router: Router = Router();

// Temporary in-memory storage fallback
let profiles: any[] = [];

// Simple interface for ProfileData
interface ProfileData {
  user_address: string;
  positions: Array<{
    chain: string;
    apy: number;
    protocol: string;
    poolAddress: string;
  }>;
}

// @route   GET /api/profile
// @desc    Get all profiles
// @access  Public
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    // Try MongoDB first
    const mongoProfiles = await Profile.find({}).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: mongoProfiles.map(p => ({
        ...p.toObject()
      })),
      count: mongoProfiles.length,
      source: 'MongoDB'
    });
  } catch (error) {
    // Fallback to in-memory storage
    console.log('Using in-memory storage for profiles');
    res.json({
      success: true,
      data: profiles,
      count: profiles.length,
      source: 'In-memory storage',
      message: 'MongoDB not available - using temporary storage'
    });
  }
});

// @route   POST /api/profile
// @desc    Create or update user profile
// @access  Public
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_address, positions }: ProfileData = req.body;

    // Validation
    if (!user_address || !positions || !Array.isArray(positions)) {
      res.status(400).json({
        success: false,
        error: 'user_address and positions (array) are required'
      });
      return;
    }

    // Validate positions structure
    for (const position of positions) {
      if (!position.chain || typeof position.apy !== 'number' || !position.protocol || !position.poolAddress) {
        res.status(400).json({
          success: false,
          error: 'Each position must have chain, apy (number), protocol, and poolAddress'
        });
        return;
      }
    }

    try {
      // Try MongoDB first
      const result = await Profile.findOneAndUpdate(

        { user_address },
        { user_address, positions },
        { upsert: true, new: true }
      );

      console.log('POST /api/profile - MongoDB result:', result);

      res.json({
        success: true,
        data: {
          ...result.toObject()
        },
        source: 'MongoDB'
      });

    } catch (error) {
      // Fallback to in-memory storage
      console.log('Using in-memory storage for profile creation');
      const existingIndex = profiles.findIndex(p => p.user_address === user_address);
      const profileData = {
        _id: Date.now().toString(),
        user_address,
        positions,
        createdAt: existingIndex === -1 ? new Date().toISOString() : profiles[existingIndex].createdAt,
        updatedAt: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        profiles[existingIndex] = { ...profiles[existingIndex], ...profileData };
      } else {
        profiles.push(profileData);
      }

      res.json({
        success: true,
        data: profileData,
        source: 'In-memory storage',
        message: 'MongoDB not available - using temporary storage'
      });

    }
  } catch (error) {
    console.error('Error creating/updating profile:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   GET /api/profile/:user_address
// @desc    Get user profile
// @access  Public
router.get('/:user_address', async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_address } = req.params;

    try {
      // Try MongoDB first
      const profile = await Profile.findOne({ user_address });

      if (!profile) {
        res.status(404).json({
          success: false,
          error: 'Profile not found'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          ...profile.toObject()
        },
        source: 'MongoDB'
      });
    } catch (error) {
      // Fallback to in-memory storage
      console.log('Using in-memory storage for profile retrieval');
      const profile = profiles.find(p => p.user_address === user_address);

      if (!profile) {
        res.status(404).json({
          success: false,
          error: 'Profile not found'
        });
        return;
      }

      res.json({
        success: true,
        data: profile,
        source: 'In-memory storage',
        message: 'MongoDB not available - using temporary storage'
      });
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// @route   DELETE /api/profile/:user_address
// @desc    Delete user profile
// @access  Public
router.delete('/:user_address', async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_address } = req.params;

    try {
      // Try MongoDB first
      const result = await Profile.deleteOne({ user_address });

      if (result.deletedCount === 0) {
        res.status(404).json({
          success: false,
          error: 'Profile not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Profile deleted successfully',
        source: 'MongoDB'
      });
    } catch (error) {
      // Fallback to in-memory storage
      console.log('Using in-memory storage for profile deletion');
      const profileIndex = profiles.findIndex(p => p.user_address === user_address);

      if (profileIndex === -1) {
        res.status(404).json({
          success: false,
          error: 'Profile not found'
        });
        return;
      }

      profiles.splice(profileIndex, 1);

      res.json({
        success: true,
        message: 'Profile deleted successfully',
        source: 'In-memory storage',
        note: 'MongoDB not available - using temporary storage'
      });
    }
  } catch (error) {
    console.error('Error deleting profile:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

export default router;