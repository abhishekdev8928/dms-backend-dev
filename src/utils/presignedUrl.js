import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../config/s3Client.js";

const createPresignedUrlWithClient = async ({ key, mimeType }) => {
  const command = new PutObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
  });

  // URL expires in 1 hour
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
};

export default createPresignedUrlWithClient;
