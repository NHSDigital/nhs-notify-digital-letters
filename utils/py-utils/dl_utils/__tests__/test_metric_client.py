import json
from unittest.mock import Mock, patch
from dl_utils.metric_client import Metric


@patch('builtins.print')
@patch('time.time', Mock(return_value=1234567890))
def test_metric(mock_print):

    m2 = Metric(name='Test_alarm_1',
                namespace='test_alarm_namespace_1',
                dimensions={"Environment": 'de-test1'})
    m2.record(56)

    mock_print.assert_called_once()

    arg = mock_print.call_args[0][0]

    assert json.loads(arg) == {
        "_aws": {
            "Timestamp": 1234567890000,
            "CloudWatchMetrics": [{
                "Namespace": "test_alarm_namespace_1",
                "Dimensions": [
                    ["Environment"]
                ],
                "Metrics": [
                    {
                        "Name": "Test_alarm_1",
                        "Unit": "Count",
                    }
                ]
            }],
        },
        "Environment": "de-test1",
        "Test_alarm_1": 56,
    }
