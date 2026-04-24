
# Per-component test observer queues
# Each queue subscribes to a filtered subset of Digital Letters events,
# reducing queue depth per test and eliminating contention between spec files.

locals {
  test_observer_queues = {
    mesh        = "uk.nhs.notify.digital.letters.mesh.inbox.message."
    pdm         = "uk.nhs.notify.digital.letters.pdm.resource."
    messages    = "uk.nhs.notify.digital.letters.messages.request."
    print       = "uk.nhs.notify.digital.letters.print."
    queue-items = "uk.nhs.notify.digital.letters.queue.item."
    reporting   = "uk.nhs.notify.digital.letters.reporting."
  }
}

module "sqs_test_observer_queues" {
  for_each = local.test_observer_queues

  source = "https://github.com/NHSDigital/nhs-notify-shared-modules/releases/download/3.0.6/terraform-sqs.zip"

  aws_account_id             = var.aws_account_id
  component                  = local.component
  environment                = var.environment
  project                    = var.project
  region                     = var.region
  name                       = "test-observer-${each.key}"
  sqs_kms_key_arn            = module.kms.key_arn
  visibility_timeout_seconds = var.sqs_visibility_timeout_seconds
  create_dlq                 = false
  max_receive_count          = var.sqs_max_receive_count
  sqs_policy_overload        = data.aws_iam_policy_document.sqs_test_observer_queues[each.key].json
}

data "aws_iam_policy_document" "sqs_test_observer_queues" {
  for_each = local.test_observer_queues

  statement {
    sid    = "AllowEventBridgeToSendMessage"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }

    actions = ["sqs:SendMessage"]

    resources = [
      "arn:aws:sqs:${var.region}:${var.aws_account_id}:${local.csi}-test-observer-${each.key}-queue"
    ]

    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = [aws_cloudwatch_event_rule.test_observer[each.key].arn]
    }
  }
}

resource "aws_cloudwatch_event_rule" "test_observer" {
  for_each = local.test_observer_queues

  name           = "${local.csi}-test-observer-${each.key}"
  description    = "Event rule for test observer queue: ${each.key}"
  event_bus_name = aws_cloudwatch_event_bus.main.name

  event_pattern = jsonencode({
    "detail" : {
      "type" : [{
        "prefix" : each.value
      }]
    }
  })
}

resource "aws_cloudwatch_event_target" "test_observer_sqs_queues" {
  for_each = local.test_observer_queues

  rule           = aws_cloudwatch_event_rule.test_observer[each.key].name
  target_id      = "test-observer-${each.key}-sqs-target"
  arn            = module.sqs_test_observer_queues[each.key].sqs_queue_arn
  event_bus_name = aws_cloudwatch_event_bus.main.name
}
