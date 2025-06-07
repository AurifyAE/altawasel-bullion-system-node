import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

// Load environment variables if not already loaded
dotenv.config();

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});


export const deleteS3File = async (key) => {
  try {
    if (!key) {
      throw new Error("S3 key is required for deletion");
    }

    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    });

    const result = await s3Client.send(deleteCommand);
    return {
      success: true,
      message: `File deleted successfully: ${key}`,
      result,
    };
  } catch (error) {
    console.error(`Error deleting file from S3: ${error.message}`);
    return {
      success: false,
      message: `Failed to delete file: ${error.message}`,
      error,
    };
  }
};


export const deleteMultipleS3Files = async (keys) => {
  try {
    if (!Array.isArray(keys) || keys.length === 0) {
      throw new Error("Valid array of S3 keys is required for deletion");
    }

    const results = await Promise.allSettled(
      keys.map(key => deleteS3File(key))
    );

    const successful = results.filter(result => result.status === 'fulfilled' && result.value.success);
    const failed = results.filter(result => result.status === 'rejected' || !result.value.success);

    return {
      success: failed.length === 0,
      message: `Deleted ${successful.length} of ${keys.length} files`,
      successful: successful.map(result => result.value),
      failed: failed.map(result => 
        result.status === 'rejected' 
          ? { reason: result.reason } 
          : result.value
      ),
    };
  } catch (error) {
    console.error(`Error in bulk S3 deletion: ${error.message}`);
    return {
      success: false,
      message: `Failed to process deletion request: ${error.message}`,
      error,
    };
  }
};