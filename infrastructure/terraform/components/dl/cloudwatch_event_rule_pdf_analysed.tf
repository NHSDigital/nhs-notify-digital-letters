resource "aws_cloudwatch_event_rule" "pdf_analysed" {
  name           = "${local.csi}-pdf-analysed"
  description    = "PDF Analysed event rule"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    "detail" : {
      "type" : [
        "uk.nhs.notify.digital.letters.pdf.analysed.v1"
      ],
    }
  })
}

resource "aws_cloudwatch_event_target" "pdf-analysed-print-sender-target" {
  rule           = aws_cloudwatch_event_rule.pdf_analysed.name
  arn            = module.print_sender.sqs_queue_arn
  event_bus_name = aws_cloudwatch_event_bus.main.name
}
