# Deployment

## Initialize and Deploy

Clone this repo:
```bash
git clone https://github.com/Pablo-Wynistorf/url-restream.git
```

Install node modules:
```bash
cd src
npm install
```

Deploy the application using SAM:
Note: Keep in mind that npm, aws cli and samcli has to be installed on your system
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

## Cleanup

Just run these two commands:

```bash
# Set variables
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
S3_BUCKET_NAME="url-restream-$ACCOUNT_ID"
REGION="us-east-1"

# Delete SAM Stack
aws cloudformation delete-stack --stack-name urlRestreamStack --region "$REGION"

# Delete S3 Bucket
aws s3 rm s3://${S3_BUCKET_NAME} --recursive
aws s3api delete-bucket --bucket $S3_BUCKET_NAME --region $REGION
```
