resource "aws_api_gateway_rest_api" "pdm_mock" {
  name        = "${var.project}-${var.environment}-pdm-mock-api"
  description = "PDM Mock API for testing integration with Patient Data Manager"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name        = "${var.project}-${var.environment}-pdm-mock-api"
    Project     = var.project
    Environment = var.environment
    Component   = local.component
  }
}

resource "aws_api_gateway_resource" "resource" {
  rest_api_id = aws_api_gateway_rest_api.pdm_mock.id
  parent_id   = aws_api_gateway_rest_api.pdm_mock.root_resource_id
  path_part   = "resource"
}

resource "aws_api_gateway_resource" "resource_id" {
  rest_api_id = aws_api_gateway_rest_api.pdm_mock.id
  parent_id   = aws_api_gateway_resource.resource.id
  path_part   = "{id}"
}

resource "aws_api_gateway_method" "create_resource" {
  rest_api_id   = aws_api_gateway_rest_api.pdm_mock.id
  resource_id   = aws_api_gateway_resource.resource.id
  http_method   = "POST"
  authorization = "AWS_IAM"
}

resource "aws_api_gateway_integration" "create_resource" {
  rest_api_id = aws_api_gateway_rest_api.pdm_mock.id
  resource_id = aws_api_gateway_resource.resource.id
  http_method = aws_api_gateway_method.create_resource.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = module.pdm_mock_api.lambda_invoke_arn
}

resource "aws_api_gateway_method" "get_resource" {
  rest_api_id   = aws_api_gateway_rest_api.pdm_mock.id
  resource_id   = aws_api_gateway_resource.resource_id.id
  http_method   = "GET"
  authorization = "AWS_IAM"
}

resource "aws_api_gateway_integration" "get_resource" {
  rest_api_id = aws_api_gateway_rest_api.pdm_mock.id
  resource_id = aws_api_gateway_resource.resource_id.id
  http_method = aws_api_gateway_method.get_resource.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = module.pdm_mock_api.lambda_invoke_arn
}

resource "aws_lambda_permission" "pdm_mock_api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.pdm_mock_api.lambda_function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_api_gateway_rest_api.pdm_mock.execution_arn}/*/*"
}

resource "aws_api_gateway_deployment" "pdm_mock" {
  depends_on = [
    aws_api_gateway_integration.create_resource,
    aws_api_gateway_integration.get_resource,
  ]

  rest_api_id = aws_api_gateway_rest_api.pdm_mock.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.resource.id,
      aws_api_gateway_resource.resource_id.id,
      aws_api_gateway_method.create_resource.id,
      aws_api_gateway_method.get_resource.id,
      aws_api_gateway_integration.create_resource.id,
      aws_api_gateway_integration.get_resource.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}
resource "aws_api_gateway_stage" "pdm_mock" {
  deployment_id = aws_api_gateway_deployment.pdm_mock.id
  rest_api_id   = aws_api_gateway_rest_api.pdm_mock.id
  stage_name    = var.environment

  xray_tracing_enabled = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.pdm_mock_api_gateway.arn
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
    Name        = "${var.project}-${var.environment}-pdm-mock-api-stage"
    Project     = var.project
    Environment = var.environment
    Component   = local.component
  }
}
resource "aws_cloudwatch_log_group" "pdm_mock_api_gateway" {
  name              = "/aws/apigateway/${var.project}-${var.environment}-pdm-mock-api"
  retention_in_days = var.log_retention_in_days
  kms_key_id        = module.kms.key_arn

  tags = {
    Name        = "${var.project}-${var.environment}-pdm-mock-api-logs"
    Project     = var.project
    Environment = var.environment
    Component   = local.component
  }
}
output "pdm_mock_api_endpoint" {
  description = "The base URL of the PDM Mock API"
  value       = aws_api_gateway_stage.pdm_mock.invoke_url
}

output "pdm_mock_api_id" {
  description = "The ID of the PDM Mock API Gateway"
  value       = aws_api_gateway_rest_api.pdm_mock.id
}
