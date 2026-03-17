import { Router } from 'express';
import { uploadAvatar } from '../config/upload';
import { auth } from '../middleware/auth.middleware';
import prisma from '../config/database';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: File upload endpoints
 */

// Upload avatar
// @ts-expect-error - multer type mismatch with express 5 types
router.post('/avatar', auth, uploadAvatar.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Update user avatar
    if (req.user) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { avatar: avatarUrl },
      });
    }

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: { avatarUrl },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
