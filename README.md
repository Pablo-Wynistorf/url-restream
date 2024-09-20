# Deployment

## Initialize and Deploy

Clone this repo:
```bash
git clone https://github.com/Pablo-Wynistorf/url-restream.git
```
Then go to /src and run:
```bash
sam build

# Set variables
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
S3_BUCKET_NAME="url-restream-$ACCOUNT_ID"
REGION="us-east-1"

# Create the S3 bucket
aws s3api create-bucket --bucket "$S3_BUCKET_NAME" --region "$REGION"

# Deploy the SAM application
sam deploy --template-file template.yml --stack-name urlRestreamStack --capabilities CAPABILITY_IAM --region "$REGION" --s3-bucket "$S3_BUCKET_NAME"
```
