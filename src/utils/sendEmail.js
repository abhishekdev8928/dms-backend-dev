import nodemailer from "nodemailer";
import { config } from "../config/config.js";

export const sendEmail = async (to, subject, text) => {
  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: false,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });

  await transporter.sendMail({
    from: `"Document Management System" <${config.smtp.user}>`,
    to,
    subject,
    text,
  });
};
