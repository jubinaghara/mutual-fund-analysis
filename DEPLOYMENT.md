# Deployment Guide - AWS S3 Static Website Hosting

This guide will help you deploy the India Mutual Fund Analysis application to AWS S3 as a static website.

## Prerequisites

1. AWS Account
2. AWS CLI installed and configured (optional, but recommended)
3. Built application files (from `npm run build`)

## Step 1: Build the Application

```bash
npm install
npm run build
```

This will create a `dist` folder with all the production-ready files.

## Step 2: Create S3 Bucket

### Using AWS Console:

1. Go to AWS S3 Console
2. Click "Create bucket"
3. Enter a unique bucket name (e.g., `india-mf-analysis`)
4. Choose your preferred AWS region
5. **Uncheck** "Block all public access" (we need public access for website hosting)
6. Acknowledge the warning
7. Click "Create bucket"

### Using AWS CLI:

```bash
aws s3 mb s3://india-mf-analysis --region us-east-1
```

## Step 3: Configure Bucket for Static Website Hosting

### Using AWS Console:

1. Select your bucket
2. Go to "Properties" tab
3. Scroll to "Static website hosting"
4. Click "Edit"
5. Enable "Static website hosting"
6. Set:
   - **Index document**: `index.html`
   - **Error document**: `index.html` (for SPA routing)
7. Click "Save changes"
8. Note the "Bucket website endpoint" URL (you'll need this)

### Using AWS CLI:

```bash
aws s3 website s3://india-mf-analysis \
  --index-document index.html \
  --error-document index.html
```

## Step 4: Set Bucket Policy for Public Access

### Using AWS Console:

1. Go to "Permissions" tab
2. Scroll to "Bucket policy"
3. Click "Edit"
4. Add the following policy (replace `YOUR-BUCKET-NAME`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

5. Click "Save changes"

### Using AWS CLI:

Save the policy to a file `bucket-policy.json` and run:

```bash
aws s3api put-bucket-policy --bucket india-mf-analysis --policy file://bucket-policy.json
```

## Step 5: Upload Files

### Using AWS Console:

1. Go to your bucket
2. Click "Upload"
3. Click "Add files"
4. Select all files from the `dist` folder
5. Click "Upload"

### Using AWS CLI:

```bash
aws s3 sync dist/ s3://india-mf-analysis --delete
```

The `--delete` flag removes files from S3 that are no longer in the dist folder.

## Step 6: Access Your Website

Your website will be available at:
```
http://YOUR-BUCKET-NAME.s3-website-REGION.amazonaws.com
```

Example:
```
http://india-mf-analysis.s3-website-us-east-1.amazonaws.com
```

## Optional: Set Up CloudFront (Recommended)

CloudFront provides:
- HTTPS/SSL
- Better performance (CDN)
- Custom domain support
- Lower latency

### Steps:

1. Go to AWS CloudFront Console
2. Click "Create distribution"
3. Set:
   - **Origin Domain**: Select your S3 bucket (website endpoint, not REST endpoint)
   - **Origin Path**: Leave empty
   - **Viewer Protocol Policy**: Redirect HTTP to HTTPS
   - **Default Root Object**: `index.html`
4. Click "Create distribution"
5. Wait for deployment (5-10 minutes)
6. Access via CloudFront URL or custom domain

## Optional: Custom Domain

1. Get a domain (Route 53 or external)
2. Create SSL certificate in AWS Certificate Manager
3. Configure CloudFront to use the certificate
4. Add CNAME record pointing to CloudFront distribution

## Updating the Website

When you make changes:

1. Build again: `npm run build`
2. Upload again: `aws s3 sync dist/ s3://YOUR-BUCKET-NAME --delete`
3. If using CloudFront, invalidate the cache:
   ```bash
   aws cloudfront create-invalidation --distribution-id YOUR-DIST-ID --paths "/*"
   ```

## Security Considerations

- The bucket policy allows public read access (required for static hosting)
- Consider using CloudFront with WAF for additional security
- Enable S3 bucket versioning for backup
- Set up CloudWatch alarms for monitoring

## Cost Estimation

- S3 Storage: ~$0.023 per GB/month
- S3 Requests: ~$0.0004 per 1,000 requests
- CloudFront: ~$0.085 per GB (first 10 TB)
- Total for small-medium traffic: < $10/month

## Troubleshooting

### CORS Issues
If you encounter CORS errors with the API, you may need to configure CORS on the S3 bucket or use a proxy.

### 403 Forbidden
- Check bucket policy is correct
- Verify public access is enabled
- Ensure files are uploaded correctly

### 404 Errors
- Verify `index.html` is in the root
- Check error document is set to `index.html`
- Clear browser cache

## Support

For issues with:
- **AWS S3**: Check AWS documentation
- **Application**: Check README.md
- **API**: Verify MFAPI.in is accessible

