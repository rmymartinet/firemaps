import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type MediaKind = "image" | "video";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} n’est pas configurée.`);
  return value;
}

export function getR2Config() {
  return {
    accessKeyId: required("R2_ACCESS_KEY_ID"),
    accountId: required("R2_ACCOUNT_ID"),
    bucket: required("R2_BUCKET_NAME"),
    imagePrefix: process.env.R2_IMAGE_PREFIX?.trim() || "images",
    publicUrl: required("R2_PUBLIC_URL").replace(/\/+$/, ""),
    secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    videoPrefix: process.env.R2_VIDEO_PREFIX?.trim() || "videos",
  };
}

function createR2Client() {
  const config = getR2Config();
  return new S3Client({
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    region: "auto",
    // Since AWS SDK v3.729, optional checksums are added to PUT signatures by
    // default. R2 then receives the checksum of the empty presigning payload
    // instead of the browser file. Only sign checksums when the API requires it.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

export function createCommunityMediaKey(kind: MediaKind, userId: string, extension: string) {
  const config = getR2Config();
  const prefix = kind === "image" ? config.imagePrefix : config.videoPrefix;
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 128);
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  if (!safeUserId || !safeExtension) throw new Error("Clé de média invalide.");
  return `${prefix}/${safeUserId}/${crypto.randomUUID()}.${safeExtension}`;
}

export async function createR2UploadUrl(key: string, contentType: string, expiresIn = 300) {
  const config = getR2Config();
  const client = createR2Client();
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: config.bucket,
      ContentType: contentType,
      Key: key,
    }),
    { expiresIn },
  );
  return {
    publicUrl: `${config.publicUrl}/${key.split("/").map(encodeURIComponent).join("/")}`,
    uploadUrl,
  };
}

export async function verifyR2Object(key: string) {
  const config = getR2Config();
  return createR2Client().send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
}

export async function deleteR2Object(key: string) {
  const config = getR2Config();
  await createR2Client().send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}
