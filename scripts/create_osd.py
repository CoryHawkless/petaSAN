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

from PetaSAN.core.config.api import ConfigAPI
from PetaSAN.core.entity.cluster import PreConfigStorageDisks
from flask import json
import sys
from time import sleep, time
from PetaSAN.core.ceph.ceph_disk_lib import *
from PetaSAN.core.common.cmd import *
from PetaSAN.core.common.log import logger
from PetaSAN.core.cluster.configuration import configuration
from PetaSAN.core.entity.status import StatusReport
from PetaSAN.core.ceph import ceph_osd, ceph_disk_lib

def __get_pre_config_disks():
    disks = PreConfigStorageDisks()

    try:
        with open(ConfigAPI().get_node_pre_config_disks(), 'r') as f:
            data = json.load(f)
            disks.load_json(json.dumps(data))
            return disks
    except:
        return disks

#print subprocess.call("ceph-disk prepare --cluster ceph --zap-disk --fs-type xfs /dev/sdj /dev/sdh",shell=True)
cluster_name = configuration().get_cluster_info().name
status = StatusReport()

status.success = False

try:
    node_name = configuration().get_node_info().name
    if configuration().get_node_info().is_storage:
        disks = __get_pre_config_disks()

        if len(disks.journals) > 0:
            for d in disks.journals:
                ceph_disk_lib.clean_disk(d)
                add_journal(d)

        journal = ""
        for disk_name in disks.osds:
            ceph_disk_lib.clean_disk(disk_name)
            if len(disks.journals) == 0:
                journal = ""
            elif len(disks.journals) > 0:
                journal = get_valid_journal(journal_list=disks.journals)
                if journal is None:
                    status.failed_tasks.append("core_scripts_admin_add_osd_journal_err")
                    break

            if not ceph_disk_lib.prepare_osd(disk_name,journal) :
                status.failed_tasks.append(
                    "scripts_create_osd_disk_prepare_failure_node" + "%" + str(disk_name) + "%" + str(node_name))
            else:
                logger.info("Successfully executed ceph-disk prepare for {}".format(disk_name))

            # wait_for_osd_up(disk_name)

        status.success = True

    else:
        status.success = True
except Exception as ex:
    if not status.success:
        status.failed_tasks.append("scripts_create_osd_disk_failure_node" + "%" + str(node_name))

sys.stdout.write("{} /report/".format(node_name))
sys.stdout.write(status.write_json())
sys.stdout.flush()
sys.stdout.close()

if status.success:
    sys.exit(0)
else:
    sys.exit(-1)
