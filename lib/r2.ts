
import "server-only";

import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;
const endpoint = process.env.R2_ENDPOINT;

if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucketName ||
    !endpoint
) {
    throw new Error("Не заданы переменные окружения Cloudflare R2");
}

export const R2_BUCKET = bucketName;

export const r2 = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});

export async function createUploadUrl(
    key: string,
    contentType: string
) {
    const command = new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        ContentType: contentType,
    });

    return getSignedUrl(r2, command, {
        expiresIn: 300,
    });
}

export async function createDownloadUrl(key: string) {
    const command = new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
    });

    return getSignedUrl(r2, command, {
        expiresIn: 60,
    });
}

export async function deleteR2Object(key: string) {
    await r2.send(
        new DeleteObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
        })
    );
}

export async function getR2ObjectInfo(key: string) {
    return r2.send(
        new HeadObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
        })
    );
}
