'''
 Copyright (C) 2019 Maged Mokhtar <mmokhtar <at> petasan.org>
 Copyright (C) 2019 PetaSAN www.petasan.org


 This program is free software; you can redistribute it and/or
 modify it under the terms of the GNU Affero General Public License
 as published by the Free Software Foundation

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 GNU Affero General Public License for more details.
'''

from PetaSAN.core.cluster.configuration import configuration
from PetaSAN.core.common.cmd import *
from PetaSAN.core.entity.cluster import NodeInfo
import json
import argparse
from PetaSAN.core.common.log import logger



parser = argparse.ArgumentParser(description='This is a script that will start up the configured consul client.')
join = ''

for node in configuration().get_remote_nodes_config(""):
    join= join + " -retry-join {} ".format(node.backend_1_ip)

logger.info("consul start up string {}".format(join))
str_start_command = "consul agent -config-dir /opt/petasan/config/etc/consul.d/client "

str_start_command = str(str_start_command)+ join+' >/dev/null 2>&1 &'

subprocess.Popen(str_start_command, shell=True)