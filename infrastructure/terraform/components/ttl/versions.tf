terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.16"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }

  }

  required_version = ">= 1.10.1"
}
