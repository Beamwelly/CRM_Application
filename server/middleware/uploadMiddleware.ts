import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

// Define storage location and filename generation
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/logos'); // Adjusted path relative to middleware file
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${extension}`);
  }
});

// File filter (optional: restrict to image types)
const imageFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  console.log("[Multer Filter] Checking file:", { name: file.originalname, mimetype: file.mimetype }); // Log file info
  if (file.mimetype.startsWith('image/')) {
    console.log("[Multer Filter] Accepting file.");
    cb(null, true);
  } else {
    console.log("[Multer Filter] Rejecting file: Not an image.");
    // Pass an error to indicate rejection due to type
    cb(new Error('Only image files are allowed!'));
  }
};

// Configure multer instance
const uploadLogo = multer({
  storage: logoStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Example: 5MB limit
});

export { uploadLogo }; 