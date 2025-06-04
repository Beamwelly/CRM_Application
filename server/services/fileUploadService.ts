// server/services/fileUploadService.ts
import fs from 'fs/promises'; // Import Node.js filesystem module with promises
import path from 'path';
import multer from 'multer';

// Define the base path for local uploads.
// __dirname is server/services, so ../../uploads points to the root uploads folder.
const LOCAL_UPLOADS_BASE_PATH = path.join(__dirname, '../../uploads');

console.log(`[FileUploadService] Local uploads will be saved to: ${LOCAL_UPLOADS_BASE_PATH}`);

/**
 * Ensures a directory exists, creating it if necessary.
 * @param dirPath The path to the directory.
 */
const ensureDirectoryExists = async (dirPath: string) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    // console.log(`[FileUploadService] Ensured directory exists: ${dirPath}`);
  } catch (error) {
    // console.error(`[FileUploadService] Error ensuring directory ${dirPath}:`, error);
    throw new Error(`Failed to create directory for uploads: ${dirPath}`);
  }
};


/**
 * Uploads a file buffer to the local filesystem.
 * (Previously uploadFileToS3, now adapted for local storage)
 * @param file Express.Multer.File object
 * @param destinationPath Path within the local uploads directory (e.g., 'logos/', 'recordings/')
 * @returns Promise<string> The local URL path of the uploaded file (e.g., '/uploads/logos/filename.ext').
 */
export const uploadFileToS3 = async ( // Keeping name for now to reduce refactoring, but it's local.
  file: Express.Multer.File,
  destinationPath: string = 'general/' // Default to a 'general' subfolder if not specified
): Promise<string> => {
  if (!file || !file.buffer || !file.originalname) {
    throw new Error("Invalid file data provided for local upload.");
  }

  // Ensure the destination path within uploads exists
  const targetDirectory = path.join(LOCAL_UPLOADS_BASE_PATH, destinationPath);
  await ensureDirectoryExists(targetDirectory);

  const fileExtension = path.extname(file.originalname);
  const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${fileExtension}`;
  const localFilePath = path.join(targetDirectory, uniqueFilename);

  try {
    await fs.writeFile(localFilePath, file.buffer);
    console.log(`[FileUploadService] File uploaded locally successfully. Path: ${localFilePath}`);
    
    // Return a URL path relative to the server root that can be used to serve the file
    // Assuming express.static('/uploads', uploadsPath) is set up in server.ts
    // and uploadsPath maps to LOCAL_UPLOADS_BASE_PATH's parent effectively.
    // The URL should be /uploads/destinationPath/uniqueFilename
    const relativeUrlPath = path.join('/uploads', destinationPath, uniqueFilename).replace(/\\\\/g, '/');
    return relativeUrlPath;
  } catch (error) {
    console.error('[FileUploadService] Error uploading file locally:', error);
    throw new Error('Failed to upload file locally.');
  }
};

// Configure Multer for memory storage (to get file buffer)
export const multerMemoryStorage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Example: 10MB file size limit
  },
  fileFilter: (req, file, cb) => {
    // Example: Accept only images for now. Modify if other types are needed.
    // if (file.mimetype.startsWith('image/')) {
    //   cb(null, true);
    // } else {
    //   console.warn(`[FileUploadService] Multer rejected file: ${file.originalname} due to mimetype: ${file.mimetype}`);
    //   cb(new Error('Not an image! Please upload only images.'));
    // }
    // For now, let's allow any file type as the original didn't restrict beyond example.
    // If specific restrictions are needed, they can be added here.
    cb(null, true); 
  },
});