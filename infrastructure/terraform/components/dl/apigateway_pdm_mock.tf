resource "aws_api_gateway_rest_api" "pdm_mock" {
  count = local.deploy_pdm_mock ? 1 : 0

  name        = "${var.project}-${var.environment}-pdm-mock-lambda"
  description = "PDM Mock API for testing integration with Patient Data Manager"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name        = "${var.project}-${var.environment}-pdm-mock-lambda"
    Project     = var.project
    Environment = var.environment
    Component   = local.component
  }
}

resource "aws_api_gateway_resource" "patient_data_manager" {
  count = local.deploy_pdm_mock ? 1 : 0

  rest_api_id = aws_api_gateway_rest_api.pdm_mock[0].id
  parent_id   = aws_api_gateway_rest_api.pdm_mock[0].root_resource_id
  path_part   = "patient-data-manager"
}

resource "aws_api_gateway_resource" "fhir" {
  count = local.deploy_pdm_mock ? 1 : 0

  rest_api_id = aws_api_gateway_rest_api.pdm_mock[0].id
  parent_id   = aws_api_gateway_resource.patient_data_manager[0].id
  path_part   = "FHIR"
}

resource "aws_api_gateway_resource" "r4" {
  count = local.deploy_pdm_mock ? 1 : 0

  rest_api_id = aws_api_gateway_rest_api.pdm_mock[0].id
  parent_id   = aws_api_gateway_resource.fhir[0].id
  path_part   = "R4"
}

resource "aws_api_gateway_resource" "document_reference" {
  count = local.deploy_pdm_mock ? 1 : 0

  rest_api_id = aws_api_gateway_rest_api.pdm_mock[0].id
  parent_id   = aws_api_gateway_resource.r4[0].id
  path_part   = "DocumentReference"
}

resource "aws_api_gateway_resource" "document_reference_id" {
  count = local.deploy_pdm_mock ? 1 : 0

  rest_api_id = aws_api_gateway_rest_api.pdm_mock[0].id
  parent_id   = aws_api_gateway_resource.document_reference[0].id
  path_part   = "{id}"
}

resource "aws_api_gateway_method" "create_document_reference" {
  count = local.deploy_pdm_mock ? 1 : 0

  rest_api_id   = aws_api_gateway_rest_api.pdm_mock[0].id
  resource_id   = aws_api_gateway_resource.document_reference[0].id
  http_method   = "POST"
  authorization = "AWS_IAM"
}

resource "aws_api_gateway_integration" "create_document_reference" {
  count = local.deploy_pdm_mock ? 1 : 0

  rest_api_id = aws_api_gateway_rest_api.pdm_mock[0].id
  resource_id = aws_api_gateway_resource.document_reference[0].id
  http_method = aws_api_gateway_method.create_document_reference[0].http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = module.pdm_mock_lambda[0].function_invoke_arn
}

resource "aws_api_gateway_method" "get_document_reference" {
  count = local.deploy_pdm_mock ? 1 : 0

  rest_api_id   = aws_api_gateway_rest_api.pdm_mock[0].id
  resource_id   = aws_api_gateway_resource.document_reference_id[0].id
  http_method   = "GET"
  authorization = "AWS_IAM"
}

resource "aws_api_gateway_integration" "get_document_reference" {
  count = local.deploy_pdm_mock ? 1 : 0

  rest_api_id = aws_api_gateway_rest_api.pdm_mock[0].id
  resource_id = aws_api_gateway_resource.document_reference_id[0].id
  http_method = aws_api_gateway_method.get_document_reference[0].http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = module.pdm_mock_lambda[0].function_invoke_arn
}

resource "aws_lambda_permission" "pdm_mock_lambda_gateway" {
  count = local.deploy_pdm_mock ? 1 : 0

  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.pdm_mock_lambda[0].function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_api_gateway_rest_api.pdm_mock[0].execution_arn}/*/*"
}

resource "aws_api_gateway_deployment" "pdm_mock" {
  count = local.deploy_pdm_mock ? 1 : 0

  depends_on = [
    aws_api_gateway_integration.create_document_reference,
    aws_api_gateway_integration.get_document_reference,
  ]

  rest_api_id = aws_api_gateway_rest_api.pdm_mock[0].id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.patient_data_manager[0].id,
      aws_api_gateway_resource.fhir[0].id,
      aws_api_gateway_resource.r4[0].id,
      aws_api_gateway_resource.document_reference[0].id,
      aws_api_gateway_resource.document_reference_id[0].id,
      aws_api_gateway_method.create_document_reference[0].id,
      aws_api_gateway_method.get_document_reference[0].id,
      aws_api_gateway_integration.create_document_reference[0].id,
      aws_api_gateway_integration.get_document_reference[0].id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}
resource "aws_api_gateway_stage" "pdm_mock" {
  count = local.deploy_pdm_mock ? 1 : 0

  deployment_id = aws_api_gateway_deployment.pdm_mock[0].id
  rest_api_id   = aws_api_gateway_rest_api.pdm_mock[0].id
  stage_name    = var.environment

  xray_tracing_enabled = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.pdm_mock_lambda_gateway[0].arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      caller         = "$context.identity.caller"
      user           = "$context.identity.user"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }

  tags = {
    Name        = "${var.project}-${var.environment}-pdm-mock-lambda-stage"
    Project     = var.project
    Environment = var.environment
    Component   = local.component
  }
}

resource "aws_cloudwatch_log_group" "pdm_mock_lambda_gateway" {
  count = local.deploy_pdm_mock ? 1 : 0

  name              = "/aws/apigateway/${var.project}-${var.environment}-pdm-mock-lambda"
  retention_in_days = var.log_retention_in_days
  kms_key_id        = module.kms.key_arn

  tags = {
    Name        = "${var.project}-${var.environment}-pdm-mock-lambda-logs"
    Project     = var.project
    Environment = var.environment
    Component   = local.component
  }
}

output "pdm_mock_lambda_endpoint" {
  description = "The base URL of the PDM Mock Lambda (null when not deployed)"
  value       = local.deploy_pdm_mock ? aws_api_gateway_stage.pdm_mock[0].invoke_url : null
}

output "pdm_mock_lambda_id" {
  description = "The ID of the PDM Mock Lambda API Gateway (null when not deployed)"
  value       = local.deploy_pdm_mock ? aws_api_gateway_rest_api.pdm_mock[0].id : null
}
