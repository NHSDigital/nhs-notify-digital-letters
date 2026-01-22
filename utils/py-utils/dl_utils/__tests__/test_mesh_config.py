import pytest
import os
from unittest.mock import Mock, patch, MagicMock
from dl_utils.mesh_config import (
    BaseMeshConfig,
    InvalidMeshEndpointError,
    InvalidEnvironmentVariableError
)


class TestBaseMeshConfig:
    """Test suite for BaseMeshConfig class"""

    @pytest.fixture
    def mock_ssm(self):
        """Mock SSM client"""
        ssm = Mock()
        ssm.get_parameter.return_value = {
            'Parameter': {
                'Value': '{"mesh_endpoint": "TEST", "mesh_mailbox": "test_mailbox", '
                        '"mesh_mailbox_password": "test_password", "mesh_shared_key": "test_key"}'
            }
        }
        return ssm

    @pytest.fixture
    def mock_s3(self):
        """Mock S3 client"""
        return Mock()

    @pytest.fixture
    def env_vars(self):
        """Setup required environment variables"""
        return {
            'ENVIRONMENT': 'test',
            'SSM_MESH_PREFIX': '/test/mesh'
        }

    def test_init_without_required_env_vars(self, mock_ssm, mock_s3):
        """Test initialization fails without required environment variables"""

        class TestConfig(BaseMeshConfig):
            _REQUIRED_ENV_VAR_MAP = {
                'environment': 'ENVIRONMENT',
                'ssm_mesh_prefix': 'SSM_MESH_PREFIX'
            }

        with pytest.raises(InvalidEnvironmentVariableError) as exc_info:
            TestConfig(ssm=mock_ssm, s3_client=mock_s3)

        assert 'Required environment variables' in str(exc_info.value)

    def test_init_with_required_env_vars(self, mock_ssm, mock_s3, env_vars):
        """Test successful initialization with required environment variables"""

        class TestConfig(BaseMeshConfig):
            _REQUIRED_ENV_VAR_MAP = {
                'environment': 'ENVIRONMENT',
                'ssm_mesh_prefix': 'SSM_MESH_PREFIX'
            }

        with patch.dict(os.environ, env_vars):
            config = TestConfig(ssm=mock_ssm, s3_client=mock_s3)
            assert config.environment == 'test'
            assert config.ssm_mesh_prefix == '/test/mesh'

    def test_optional_env_vars_use_mesh_mock(self, mock_ssm, mock_s3, env_vars):
        """Test optional USE_MESH_MOCK environment variable"""

        class TestConfig(BaseMeshConfig):
            _REQUIRED_ENV_VAR_MAP = {}

        env_with_mock = {**env_vars, 'USE_MESH_MOCK': 'true'}

        with patch.dict(os.environ, env_with_mock, clear=True):
            config = TestConfig(ssm=mock_ssm, s3_client=mock_s3)
            assert config.use_mesh_mock is True

    def test_optional_env_vars_use_mesh_mock_false(self, mock_ssm, mock_s3, env_vars):
        """Test USE_MESH_MOCK set to false"""

        class TestConfig(BaseMeshConfig):
            _REQUIRED_ENV_VAR_MAP = {}

        env_with_mock = {**env_vars, 'USE_MESH_MOCK': 'false'}

        with patch.dict(os.environ, env_with_mock, clear=True):
            config = TestConfig(ssm=mock_ssm, s3_client=mock_s3)
            assert config.use_mesh_mock is False

    @patch('dl_utils.mesh_config.mesh_client')
    def test_lookup_endpoint_valid(self, mock_mesh_client, mock_ssm, mock_s3):
        """Test lookup_endpoint with valid endpoint"""

        class TestConfig(BaseMeshConfig):
            _REQUIRED_ENV_VAR_MAP = {}

        mock_mesh_client.TEST_ENDPOINT = 'https://test.endpoint'

        config = TestConfig(ssm=mock_ssm, s3_client=mock_s3)
        result = config.lookup_endpoint('TEST')

        assert result == 'https://test.endpoint'


    @patch('dl_utils.mesh_config.MockMeshClient')
    def test_build_mesh_client_mock(self, mock_mesh_client_class, mock_ssm, mock_s3):
        """Test build_mesh_client with USE_MESH_MOCK=true"""

        class TestConfig(BaseMeshConfig):
            _REQUIRED_ENV_VAR_MAP = {}

        config = TestConfig(ssm=mock_ssm, s3_client=mock_s3)
        config.use_mesh_mock = True
        config.mesh_endpoint = 'https://mock.endpoint'
        config.mesh_mailbox = 'test_mailbox'

        result = config.build_mesh_client()

        mock_mesh_client_class.assert_called_once()
        assert result is not None
