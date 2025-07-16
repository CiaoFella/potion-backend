import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { config } from "../config/config";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  credentials: {
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey,
  },
  region: config.awsRegion,
});

export const directDownload = async (req: any, res: any) => {
  const { fileName } = req.params;

  try {
    const command = new GetObjectCommand({
      Bucket: config.s3BucketName,
      Key: fileName,
    });

    const { Body, ContentType } = await s3.send(command);
    
    res.setHeader('Content-Type', ContentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Stream the file directly from S3 to client
    (Body as NodeJS.ReadableStream).pipe(res);
  } catch (error) {
    console.error("Download error:", error);
    res.status(404).json({ error: "File not found" });
  }
};

export const generateDownloadUrl = async (req: any, res: any) => {
  const { fileName } = req.params;

  try {
    const command = new GetObjectCommand({
      Bucket: config.s3BucketName,
      Key: fileName,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    res.json({ url });
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "Failed to generate download link" });
  }
};

export default directDownload;
