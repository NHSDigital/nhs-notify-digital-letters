resource "aws_glue_catalog_database" "reporting" {
  name        = "${local.csi}-reporting"
  description = "Reporting database for ${var.environment}"
}
