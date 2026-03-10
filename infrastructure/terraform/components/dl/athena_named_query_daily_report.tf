resource "aws_athena_named_query" "daily_report" {
  name      = "daily_report"
  workgroup = aws_athena_workgroup.reporting.id
  database  = aws_glue_catalog_database.reporting.name
  query     = file("${path.module}/scripts/sql/reports/daily_report.sql")
}
