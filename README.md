# Deployment

## Initialize and Deploy

Clone this repo:
```bash
git clone https://github.com/Pablo-Wynistorf/url-restream.git
cd url-restream
```

Install node modules:
```bash
npm install --prefix ./src
```

Deploy the application using SAM:
Note: Keep in mind that npm, aws cli and samcli has to be installed on your system
```bash
sam build

# Set variables
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
RANDOM_STRING=$(openssl rand -base64 6 | tr -dc 'a-z0-9' | head -c 6)
S3_BUCKET_NAME="url-restream-$ACCOUNT_ID-$RANDOM_STRING"
AWS_DEFAULT_REGION="us-east-1"

# Create the S3 bucket
aws s3 mb s3://$S3_BUCKET_NAME

# Deploy the SAM application
sam deploy --template-file template.yml --stack-name urlRestreamStack --capabilities CAPABILITY_IAM --s3-bucket "$S3_BUCKET_NAME"
```

## Cleanup

Just run these two commands:

```bash
# Set variables
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
RANDOM_STRING=$(openssl rand -base64 6 | tr -dc 'a-z0-9' | head -c 6)
S3_BUCKET_NAME="url-restream-$ACCOUNT_ID-$RANDOM_STRING"
AWS_DEFAULT_REGION="us-east-1"

# Delete SAM Stack
aws cloudformation delete-stack --stack-name urlRestreamStack

# Delete S3 Bucket
aws s3 rb s3://$S3_BUCKET_NAME --force
```
