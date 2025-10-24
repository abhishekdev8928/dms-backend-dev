import { config as conf } from "dotenv";
conf();

const _config = {
  port: process.env.PORT || 3200,
  env: process.env.NODE_ENV,
  databaseUrl: process.env.MONGO_DB_URL,

  aws: {
    accessKeyId: process.env.USER_ACCESS_KEY,
    secretAccessKey: process.env.USER_SECRET_KEY,
    bucketName: process.env.BUCKET_NAME,
    region: process.env.BUCKET_REGION,
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

export const config = Object.freeze(_config);
