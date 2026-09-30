const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const cloudinary = require('cloudinary').v2;

// Explicitly load root .env file
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

/**
 * Storage Service Abstraction Layer
 * Supports 'local' storage for dev and 'cloudinary' for production cloud storage.
 */
class StorageService {
  constructor() {
    const rawProvider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase().trim();
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME ? process.env.CLOUDINARY_CLOUD_NAME.trim() : '';
    
    if (rawProvider === 'cloudinary' && cloudName && !cloudName.startsWith('YOUR_')) {
      this.provider = 'cloudinary';
      cloudinary.config({
        cloud_name: cloudName,
        api_key: process.env.CLOUDINARY_API_KEY ? process.env.CLOUDINARY_API_KEY.trim() : '',
        api_secret: process.env.CLOUDINARY_API_SECRET ? process.env.CLOUDINARY_API_SECRET.trim() : '',
        secure: true
      });
      console.log('☁️ StorageService initialized with Cloudinary provider.');
    } else {
      this.provider = 'local';
      this.localUploadDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads');
      if (!fs.existsSync(this.localUploadDir)) {
        fs.mkdirSync(this.localUploadDir, { recursive: true });
      }
      console.log(`📁 StorageService initialized with Local Disk provider (${this.localUploadDir}).`);
    }
  }

  /**
   * Upload an image file
   * @param {Object} file - Multer file object
   * @returns {Promise<{ imageUrl: string, filename: string, publicId: string | null }>}
   */
  async uploadImage(file) {
    if (this.provider === 'cloudinary') {
      try {
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
          throw new Error('Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are missing.');
        }

        // Upload to Cloudinary with auto-format and auto-quality optimization
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'creative_voting_images',
          resource_type: 'image',
          transformation: [
            { quality: 'auto', fetch_format: 'auto' }
          ]
        });

        // Clean up temporary disk file
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

        return {
          imageUrl: result.secure_url,
          filename: file.originalname,
          publicId: result.public_id
        };
      } catch (err) {
        // Clean up local temp file on error to prevent disk clutter
        if (file.path && fs.existsSync(file.path)) {
          try { fs.unlinkSync(file.path); } catch (_) {}
        }
        console.error('Cloudinary upload error:', err.message);
        throw new Error(`Cloudinary upload failed: ${err.message}`);
      }
    }

    // Local Disk Provider
    const imageUrl = `/uploads/${file.filename}`;
    return {
      imageUrl,
      filename: file.filename,
      publicId: null
    };
  }

  /**
   * Delete an image
   * @param {string} imageUrl 
   * @param {string|null} publicId 
   */
  async deleteImage(imageUrl, publicId = null) {
    if (this.provider === 'cloudinary') {
      try {
        let targetPublicId = publicId;
        if (!targetPublicId && imageUrl && imageUrl.includes('cloudinary.com')) {
          const parts = imageUrl.split('/');
          const uploadIdx = parts.indexOf('upload');
          if (uploadIdx !== -1) {
            const pathParts = parts.slice(uploadIdx + 2);
            const fullName = pathParts.join('/');
            targetPublicId = fullName.substring(0, fullName.lastIndexOf('.')) || fullName;
          }
        }

        if (targetPublicId) {
          await cloudinary.uploader.destroy(targetPublicId);
          console.log(`☁️ Cloudinary asset deleted: ${targetPublicId}`);
        }
      } catch (err) {
        console.warn(`Failed to delete Cloudinary asset (${publicId || imageUrl}):`, err.message);
      }
      return;
    }

    // Local Disk Provider
    if (imageUrl) {
      const filename = path.basename(imageUrl);
      const filePath = path.join(this.localUploadDir, filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.warn(`Failed to delete local file ${filePath}:`, err.message);
        }
      }
    }
  }

  /**
   * Resolve public image URL
   */
  getImageUrl(url) {
    return url;
  }
}

module.exports = new StorageService();
