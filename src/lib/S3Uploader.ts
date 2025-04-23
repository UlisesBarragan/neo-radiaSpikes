import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const REGION = import.meta.env.VITE_AWS_REGION!;
const BUCKET = import.meta.env.VITE_AWS_BUCKET!;
const ACCESS_KEY = import.meta.env.VITE_AWS_ACCESS_KEY!;
const SECRET_KEY = import.meta.env.VITE_AWS_SECRET_KEY!;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
});

export const uploadToS3 = async (file: Blob, fileName: string): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: fileName,
    Body: file, // está bien como Blob en browser
    ACL: "public-read",
    ContentType: file.type || "application/octet-stream",
  });

  await s3.send(command);

  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${fileName}`;
};