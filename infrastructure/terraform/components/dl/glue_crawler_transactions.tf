resource "aws_glue_crawler" "transactions" {
  name          = "${local.csi}-transactions-crawler"
  database_name = aws_glue_catalog_database.reporting.name
  role          = aws_iam_role.glue_crawler.arn

  schedule = "cron(0 * * * ? *)" # Run every hour

  catalog_target {
    database_name = aws_glue_catalog_database.reporting.name
    tables        = [aws_glue_catalog_table.transactions.name]
  }

  schema_change_policy {
    delete_behavior = "LOG"
    update_behavior = "LOG"
  }

  recrawl_policy {
    recrawl_behavior = "CRAWL_EVERYTHING"
  }

  configuration = jsonencode({
    Version = 1.0
    Grouping = {
      TableGroupingPolicy = "CombineCompatibleSchemas"
    }
    CrawlerOutput = {
      Partitions = {
        AddOrUpdateBehavior = "InheritFromTable"
      }
      Tables = {
        AddOrUpdateBehavior = "MergeNewColumns"
      }
    }
  })
}

resource "aws_iam_role" "glue_crawler" {
  name               = "${local.csi}-glue-crawler"
  description        = "Role for Glue Crawler to access S3 and Glue Catalog"
  assume_role_policy = data.aws_iam_policy_document.glue_crawler_assume_role.json
}

data "aws_iam_policy_document" "glue_crawler_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["glue.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role_policy_attachment" "glue_crawler_service" {
  role       = aws_iam_role.glue_crawler.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole"
}

data "aws_iam_policy_document" "glue_crawler_policy" {
  statement {
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:ListBucket",
    ]

    resources = [
      aws_s3_bucket.reporting.arn,
      "${aws_s3_bucket.reporting.arn}/${local.firehose_output_path_prefix}/*"
    ]
  }

  statement {
    effect = "Allow"

    actions = [
      "kms:Decrypt",
      "kms:DescribeKey",
    ]

    resources = [
      module.kms.key_arn
    ]
  }
}

resource "aws_iam_role_policy" "glue_crawler" {
  name   = "${local.csi}-glue-crawler"
  role   = aws_iam_role.glue_crawler.id
  policy = data.aws_iam_policy_document.glue_crawler_policy.json
}
