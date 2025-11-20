"""lambda handler for mesh poll application"""

from boto3 import client
from .client_lookup import ClientLookup
from .config import Config, log
from .processor import MeshMessageProcessor


def handler(_, context):
    """lambda handler for mesh poll application"""
    with Config() as config:
        processor = MeshMessageProcessor(
            config=config,
            client_lookup=ClientLookup(client('ssm'), config, log),
            mesh_client=config.mesh_client,
            get_remaining_time_in_millis=context.get_remaining_time_in_millis,
            log=log,
            polling_metric=config.polling_metric)

        processor.process_messages()
