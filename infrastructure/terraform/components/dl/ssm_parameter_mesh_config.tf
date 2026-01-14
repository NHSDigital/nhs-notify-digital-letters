# MESH Configuration SSM Parameter
resource "aws_ssm_parameter" "mesh_config" {
  name        = "${local.ssm_mesh_prefix}/config"
  description = "MESH configuration"
  type        = "SecureString"


  value = var.enable_mock_mesh ? jsonencode({
    mesh_endpoint         = local.mock_mesh_endpoint
    mesh_mailbox          = "mock-mailbox"
    mesh_mailbox_password = "mock-password"
    mesh_shared_key       = "mock-shared-key"
  }) : jsonencode({
    mesh_endpoint         = "UNSET"
    mesh_mailbox          = "UNSET"
    mesh_mailbox_password = "UNSET"
    mesh_shared_key       = "UNSET"
  })

  tags = merge(local.default_tags, {
    Backup = "true"
    Description = "MESH configuration"
  })

  lifecycle {
    ignore_changes = [
      value
    ]
  }
}

# MESH Client Certificate SSM Parameter
resource "aws_ssm_parameter" "mesh_client_cert" {
  name        = "${local.ssm_mesh_prefix}/client-cert"
  description = "MESH client certificate"
  type        = "SecureString"
  value       = var.enable_mock_mesh ? "mock-cert" : "UNSET"

  tags = merge(local.default_tags, {
    Backup = "true"
    Description = "MESH client certificate"
  })

  lifecycle {
    ignore_changes = [
      value
    ]
  }
}

# MESH Client Private Key SSM Parameter
resource "aws_ssm_parameter" "mesh_client_key" {
  name        = "${local.ssm_mesh_prefix}/client-key"
  description = "MESH client private key"
  type        = "SecureString"
  value       = var.enable_mock_mesh ? "mock-key" : "UNSET"

  tags = merge(local.default_tags, {
    Backup = "true"
    Description = "MESH client private key"
  })

  lifecycle {
    ignore_changes = [
      value
    ]
  }
}
