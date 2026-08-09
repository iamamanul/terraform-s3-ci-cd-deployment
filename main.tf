terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  backend "s3" {
    bucket = "state-file-store-bucket-8484"
    key    = "backend.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "random_id" "rand_id" {
  byte_length = 8
}

resource "aws_s3_bucket" "mywebapp-bucket" {
  bucket = "mywebapp-bucket-${random_id.rand_id.hex}"
}

#  Disable S3 block public access so we can apply a public bucket policy
resource "aws_s3_bucket_public_access_block" "example" {
  bucket = aws_s3_bucket.mywebapp-bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Add depends_on to ensure policy is attached *after* access block is removed
resource "aws_s3_bucket_policy" "mywebapp" {
  bucket = aws_s3_bucket.mywebapp-bucket.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid       = "PublicReadGetObject",
        Effect    = "Allow",
        Principal = "*",
        Action    = "s3:GetObject",
        Resource  = "${aws_s3_bucket.mywebapp-bucket.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.example]
}

resource "aws_s3_bucket_website_configuration" "mywebapp" {
  bucket = aws_s3_bucket.mywebapp-bucket.id

  index_document {
    suffix = "index.html"
  }
}

resource "aws_s3_object" "index_html" {
  bucket       = aws_s3_bucket.mywebapp-bucket.bucket
  source       = "./index.html"
  key          = "index.html"
  content_type = "text/html"
  etag         = filemd5("./index.html")
  //etag is used to check if the file has changed and needs to be updated inside. 
  //source is not enough to check if the file has changed. so we use etag to check if the file has changed or not.  
}

resource "aws_s3_object" "styles_css" {
  bucket       = aws_s3_bucket.mywebapp-bucket.bucket
  source       = "./styles.css"
  key          = "styles.css"
  content_type = "text/css"
  etag         = filemd5("./styles.css")
}

resource "aws_s3_object" "script_js" {
  bucket       = aws_s3_bucket.mywebapp-bucket.bucket
  source       = "./script.js"
  key          = "script.js"
  content_type = "application/javascript"
  etag         = filemd5("./script.js")
}

resource "aws_s3_object" "image_png" {
  bucket       = aws_s3_bucket.mywebapp-bucket.bucket
  source       = "./Amanul Hasan.jpg"
  key          = "Amanul Hasan.jpg"
  content_type = "image/jpg"
  etag         = filemd5("./Amanul Hasan.jpg")
}

output "name" {
  value = aws_s3_bucket_website_configuration.mywebapp.website_endpoint
}
