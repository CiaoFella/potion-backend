import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../config/config";

const s3Client = new S3Client({
  region: config.awsRegion,
  credentials: {
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey,
  },
});

export const uploadFile = async (
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> => {
  const uploadParams = {
    Bucket: config.s3BucketName,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimeType,
  };

  await s3Client.send(new PutObjectCommand(uploadParams));
  return fileName;
};

export const getSignedDownloadUrl = async (
  fileName: string,
  fileType: string
): Promise<string> => {
  try {
    // Check if the object exists and log its metadata
    const headResult = await s3Client.send(
      new HeadObjectCommand({
        Bucket: config.s3BucketName,
        Key: fileName,
      })
    );

    const command = new GetObjectCommand({
      Bucket: config.s3BucketName,
      Key: fileName,
      ResponseContentDisposition: "attachment", // Changed from 'inline'
      ResponseContentType: "application/octet-stream", // Use a generic type
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log("Generated signed URL:", url);
    return url;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw error;
  }
};
