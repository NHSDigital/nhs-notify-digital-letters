resource "aws_dynamodb_table" "ttl" {
  name         = "${local.csi}-ttl"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  deletion_protection_enabled = var.enable_dynamodb_delete_protection

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "dateOfExpiry"
    type = "S"
  }

  attribute {
    name = "ttl"
    type = "N"
  }

  ttl {
    enabled        = true
    attribute_name = "ttl"
  }

  global_secondary_index {
    name            = "dateOfExpiryIndex"
    hash_key        = "dateOfExpiry"
    projection_type = "ALL"
    range_key       = "ttl"
  }

  stream_enabled   = true
  stream_view_type = "OLD_IMAGE"

  tags = local.default_tags
}
