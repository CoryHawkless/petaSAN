#!/usr/bin/python
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

import argparse
import sys

from PetaSAN.core.ceph.ceph_osd import *
from PetaSAN.core.cluster.configuration import configuration
from PetaSAN.core.ceph import ceph_osd
from PetaSAN.core.common.enums import DiskUsage
from PetaSAN.core.common.messages import gettext
from PetaSAN.core.common.smart import Smart
from PetaSAN.core.consul.base import BaseAPI
from PetaSAN.core.ceph import ceph_disk_lib


class Prepare(object):
    @staticmethod
    def parser():
        parser = argparse.ArgumentParser(add_help=True)
        subparser = parser.add_subparsers()

        subp_node_list = subparser.add_parser('disk-list')
        subp_node_list.set_defaults(func=node_disk_list_json)
        subp_node_list.add_argument(
            '-pid',
            help='Process id or running job.', required=True
        )

        subp_delete_osd = subparser.add_parser('delete-osd')
        subp_delete_osd.set_defaults(func=delete_osd)
        subp_delete_osd.add_argument(
            '-id',
            help='Osd id.', required=True
        )
        subp_delete_osd.add_argument(
            '-disk_name',
            help='disk name.', required=True
        )

        subp_add_osd = subparser.add_parser('add-osd')
        subp_add_osd.set_defaults(func=add_osd)
        subp_add_osd.add_argument(
            '-disk_name',
            help='Disk name that will add to ceph osds.', required=True
        )
        subp_add_osd.add_argument('-journal', help='Journal disk name.', default="")

        subp_update_role = subparser.add_parser('update-role')
        subp_update_role.set_defaults(func=update_role)
        subp_update_role.add_argument(
            '-is_storage',
            help='Update role of storage service.Set argument to -1 to avoid this argument from update this role',
            required=True
        )
        subp_update_role.add_argument(
            '-is_iscsi',
            help='Update role of iscsi service.Set argument to -1 to avoid this argument from update this role. ',
            required=True
        )
        subp_update_role.add_argument(
            '-is_backup',
            help='Update role of backup service.Set argument to -1 to avoid this argument from update this role. ',
            required=True
        )

        subp_node_log = subparser.add_parser('node-log')
        subp_node_log.set_defaults(func=get_log)

        subp_disk_health = subparser.add_parser('disk-health')
        subp_disk_health.set_defaults(func=node_disk_health)

        subp_add_journal = subparser.add_parser('add-journal')
        subp_add_journal.set_defaults(func=add_journal)
        subp_add_journal.add_argument(
            '-disk_name',
            help='Disk name that will add to ceph journal.', required=True
        )

        subp_disk_avail_space = subparser.add_parser('disk-avail-space')
        subp_disk_avail_space.set_defaults(func=disk_avail_space)
        subp_disk_avail_space.add_argument(
            '-disk_name',
            help='Disk name that will get its free space.', required=True
        )

        subp_valid_journal = subparser.add_parser('valid-journal')
        subp_valid_journal.set_defaults(func=get_valid_journal)

        subp_delete_journal = subparser.add_parser('delete-journal')
        subp_delete_journal.set_defaults(func=delete_journal)
        subp_delete_journal.add_argument(
            '-disk_name',
            help='Disk name that will format.', required=True
        )

        args = parser.parse_args()

        return args


__output_split_text = "##petasan##"


def main_catch(func, args):
    try:
        func(args)

    except Exception as e:
        logger.exception(e.message)
        logger.error("Error while run command.")


def main(argv):
    args = Prepare().parser()
    main_catch(args.func, args)


def node_disk_list_json(args):
    print (json.dumps([o.get_dict() for o in ceph_disk_lib.get_full_disk_list(args.pid)]))


def node_disk_health(args):
    health_test = Smart().get_overall_health()

    print(json.dumps(health_test))


def delete_osd(args):
    try:

        ceph_osd.delete_osd_from_crush_map(int(args.id))
        ceph_osd.delete_osd(int(args.id), args.disk_name)

    except Exception as ex:
        pass


def add_osd(args):
    try:
        di = ceph_disk_lib.get_disk_info(args.disk_name)

        if di.usage == DiskUsage.osd:
            print (__output_split_text)
            print (gettext('core_scripts_admin_add_osd_disk_is_osd_err'))
            return

        if not ceph_disk_lib.clean_disk(args.disk_name):
            print (__output_split_text)
            print (gettext('core_scripts_admin_add_osd_cleaning_err'))
            return

        journal = str(args.journal)
        if journal == "":
            logger.info("User didn't select a journal for disk {}, so the journal will be on the same disk.".format(
                args.disk_name))
        elif journal == "auto":
            logger.info("Auto select journal for disk {}.".format(args.disk_name))
            journal = ceph_disk_lib.get_valid_journal()
            if journal is None:
                print (__output_split_text)
                print (gettext('core_scripts_admin_add_osd_journal_err'))
                logger.error(gettext('core_scripts_admin_add_osd_journal_err'))
                return
            logger.info(
                "User selected Auto journal, selected device is {} disk for disk {}.".format(journal, args.disk_name))
        else:
            ji = ceph_disk_lib.get_disk_info(journal)
            if ji is None or ji.usage != DiskUsage.journal:
                print (__output_split_text)
                print (gettext('core_scripts_admin_osd_adding_err'))
                logger.info("User selected journal {} does not exist or is not a valid journal.".format(journal))
                return

            if len(ji.linked_osds) == 0:
                ceph_disk_lib.clean_disk(journal)

            logger.info("User selected journal {} disk for disk {}.".format(journal, args.disk_name))

        if not ceph_disk_lib.prepare_osd(args.disk_name, journal):
            print (__output_split_text)
            print (gettext('core_scripts_admin_osd_adding_err'))
            return

        ceph_disk_lib.wait_for_osd_up(args.disk_name)

    except Exception as ex:
        err = "Cannot add osd for disk {} , Exception is {}".format(args.disk_name, ex.message)
        logger.error(err)
        print (err)
        print (__output_split_text)
        print (gettext('core_scripts_admin_add_osd_exception'))


def get_log(args):
    with open(ConfigAPI().get_log_file_path(), 'r') as f:
        print f.read()


def update_role(args):
    logger.info("Update roles.")
    config_api = ConfigAPI()
    try:
        cluster_config = configuration()
        node_info = cluster_config.get_node_info();
        is_dirty = False

        if str(args.is_storage) == '-1' and str(args.is_iscsi) == '-1':
            return
        if str(args.is_storage) == "1":
            if not node_info.is_storage:
                logger.info("Update roles 1.")
                node_info.is_storage = True
                cluster_config.update_node_info(node_info)
                is_dirty = True
                logger.info("Update node storage role to true")

        else:
            # ToDO
            pass

        if str(args.is_backup) == "1":
            if not node_info.is_backup:
                node_info.is_backup = True
                cluster_config.update_node_info(node_info)
                is_dirty = True
                logger.info("Update node backup role to true")
        else:
            # ToDO
            pass

        if str(args.is_iscsi) == "1":
            if not node_info.is_iscsi:
                node_info.is_iscsi = True
                cluster_config.update_node_info(node_info)
                is_dirty = True
                logger.info("Update node iscsi role to true")

                path = config_api.get_service_files_path()
                logger.info("Starting PetaSAN service")
                cmd = "python {}{} >/dev/null 2>&1 &".format(path, config_api.get_petasan_service())
                exec_command(cmd)
        else:
            # ToDO
            pass

        if is_dirty:
            consul_base_api = BaseAPI()

            consul_base_api.write_value(config_api.get_consul_nodes_path() + cluster_config.get_node_name(),
                                        cluster_config.get_node_info().write_json())
            print 1

    except Exception as ex:
        logger.exception(ex.message)
        print -1

    return


def add_journal(args):
    try:
        di = ceph_disk_lib.get_disk_info(args.disk_name)

        if di is None:
            print (__output_split_text)
            print (gettext('core_scripts_admin_journal_adding_err'))
            logger.error("The disk does not exits.")
            return

        if di.usage == DiskUsage.osd or di.usage == DiskUsage.journal or di.usage == DiskUsage.system:
            print (__output_split_text)
            print (gettext('core_scripts_admin_add_journal_disk_on_use_err'))
            return

        if not ceph_disk_lib.clean_disk(args.disk_name):
            print (__output_split_text)
            print (gettext('core_scripts_admin_journal_adding_err'))
            return

        if not ceph_disk_lib.add_journal(args.disk_name):
            print (__output_split_text)
            print (gettext('core_scripts_admin_journal_adding_err'))
            return

        return

    except Exception as ex:
        err = "Cannot add journal for disk {} , Exception is {}".format(args.disk_name, ex.message)
        logger.error(err)
        print (err)
        print (__output_split_text)
        print (gettext('core_scripts_admin_add_journal_exception'))


def delete_journal(args):
    try:
        di = ceph_disk_lib.get_disk_info(args.disk_name)

        if di is None or di.usage != DiskUsage.journal:
            print (__output_split_text)
            print (gettext('core_scripts_admin_delete_journal_err'))
            return

        if not ceph_disk_lib.clean_disk(args.disk_name):
            print (__output_split_text)
            print (gettext('core_scripts_admin_delete_journal_err'))
            return

        return

    except Exception as ex:
        logger.exception(ex)
        print (__output_split_text)
        print (gettext('core_scripts_admin_delete_journal_err'))
        return


# --------------------------------new code---------------------------------------------
def disk_avail_space(args):
    disk_free_space = ceph_disk_lib.disk_avail_space(args.disk_name)
    print(json.dumps(disk_free_space))


def get_valid_journal(args):
    valid_journal = ceph_disk_lib.get_valid_journal(clean=False)
    if valid_journal is None:
        print(json.dumps("None"))
    print(json.dumps(valid_journal))


if __name__ == '__main__':
    main(sys.argv[1:])

