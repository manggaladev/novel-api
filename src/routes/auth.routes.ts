import { Router } from 'express';
import { 
  register, 
  login, 
  refreshToken, 
  logout, 
  getMe 
} from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { auth } from '../middleware/auth.middleware';
import { 
  registerSchema, 
  loginSchema, 
  refreshTokenSchema 
} from '../validation/auth.validation';
import { authLimiter } from '../config/rateLimit';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', validate(refreshTokenSchema), refreshToken);
router.post('/logout', logout);
router.get('/me', auth, getMe);

export default router;
