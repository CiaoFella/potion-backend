export const config = {
  port: process.env.PORT || 3000,
  baseURL: ((process.env.NODE_ENV || "DEV") == "DEV") ? "https://dev-api.go-potion.com" : "https://api.go-potion.com",
  frontURL: ((process.env.NODE_ENV || "DEV") == "DEV") ? "https://dev.go-potion.com" : "https://go-potion.com",
  jwtSecret: process.env.JWT_SECRET as string,
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  awsRegion: process.env.AWS_REGION as string,
  s3BucketName: process.env.S3_BUCKET_NAME as string,
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY as string,
  resendApiKey: process.env.RESEND_API_KEY as string,
  emailFrom: process.env.EMAIL_FROM as string,
  facebookGraph: process.env.FACEBOOK_GRAPH as string,

  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
};
