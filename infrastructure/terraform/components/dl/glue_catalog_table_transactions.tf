resource "aws_glue_catalog_table" "transactions" {
  name          = "transaction_history"
  description   = "transaction history for ${var.environment}"
  database_name = aws_glue_catalog_database.reporting.name

  table_type = "EXTERNAL_TABLE"

  storage_descriptor {
    location = "s3://${aws_s3_bucket.reporting.bucket}/${local.firehose_output_path_prefix}/reporting/parquet/transaction_history"

    input_format  = "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat"
    output_format = "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat"

    ser_de_info {
      serialization_library = "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
    }

    # additional columns must be added at the end of the list
    columns {
      name = "messagereference"
      type = "string"
    }
    columns {
      name = "pagecount"
      type = "int"
    }
    columns {
      name = "supplierid"
      type = "string"
    }
    columns {
      name = "time"
      type = "string"
    }
    columns {
      name = "type"
      type = "string"
    }
  }

  partition_keys {
    name = "senderid"
    type = "string"
  }

  partition_keys {
    name = "__year"
    type = "int"
  }
  partition_keys {
    name = "__month"
    type = "int"
  }
  partition_keys {
    name = "__day"
    type = "int"
  }

  parameters = {
    EXTERNAL              = "TRUE"
    "parquet.compression" = "SNAPPY"
  }
}

resource "aws_glue_partition_index" "transaction_data" {
  database_name = aws_glue_catalog_database.reporting.name
  table_name    = aws_glue_catalog_table.transactions.name

  partition_index {
    index_name = "data"
    keys       = ["senderid", "__year", "__month", "__day"]
  }

  timeouts {
    create = "60m"
    delete = "60m"
  }
}
