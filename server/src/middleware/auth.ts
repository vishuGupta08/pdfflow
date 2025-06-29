import { Request, Response, NextFunction } from 'express';
// import { auth } from 'firebase-admin';

// You'll need to initialize Firebase Admin SDK in your server
// npm install firebase-admin

interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    emailVerified: boolean;
  };
  userPlan?: {
    name: string;
    maxTransformations: number;
    maxFileSize: number;
    features: string[];
  };
  usage?: {
    transformations: number;
    apiCalls: number;
    storageUsed: number;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'No authentication token provided' 
      });
    }

    // Verify the Firebase ID token
    // const decodedToken = await auth().verifyIdToken(token);
    
    // Mock verification for now - replace with real Firebase Admin verification
    const decodedToken = { 
      uid: 'mock-uid', 
      email: 'user@example.com', 
      email_verified: true 
    };
    
    // Add user info to request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      emailVerified: decodedToken.email_verified || false,
    };

    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(403).json({ 
      success: false, 
      error: 'Invalid or expired token' 
    });
  }
};

// Optional authentication (for endpoints that work with/without auth)
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // const decodedToken = await auth().verifyIdToken(token);
      
      // Mock verification for now
      const decodedToken = { 
        uid: 'mock-uid', 
        email: 'user@example.com', 
        email_verified: true 
      };
      
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email || '',
        emailVerified: decodedToken.email_verified || false,
      };
    }
    // Continue regardless of auth status
    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

// Usage tracking middleware
export const trackUsage = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required for usage tracking'
    });
  }

  try {
    // Here you would check user's plan and usage
    // This is where you'd implement the freemium logic
    
    const userPlan = await getUserPlan(req.user.uid);
    const currentUsage = await getCurrentUsage(req.user.uid);

    // Check if user has exceeded their plan limits
    if (currentUsage.transformations >= userPlan.maxTransformations) {
      return res.status(429).json({
        success: false,
        error: 'Monthly transformation limit exceeded',
        upgrade_required: true,
        current_plan: userPlan.name,
        usage: currentUsage
      });
    }

    // Add plan info to request
    req.userPlan = userPlan;
    req.usage = currentUsage;

    next();
  } catch (error) {
    console.error('Usage tracking failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to track usage'
    });
  }
};

// Placeholder functions - you'd implement these with your database
async function getUserPlan(uid: string) {
  // Mock implementation - replace with real database query
  return {
    name: 'free',
    maxTransformations: 5,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    features: ['rotate', 'delete', 'extract']
  };
}

async function getCurrentUsage(uid: string) {
  // Mock implementation - replace with real database query
  return {
    transformations: 2,
    apiCalls: 15,
    storageUsed: 0
  };
} 