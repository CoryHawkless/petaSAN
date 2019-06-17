/*
 Copyright (C) 2019 Maged Mokhtar <mmokhtar <at> petasan.org>
 Copyright (C) 2019 PetaSAN www.petasan.org


 This program is free software; you can redistribute it and/or
 modify it under the terms of the GNU Affero General Public License
 as published by the Free Software Foundation

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 GNU Affero General Public License for more details.
 */

var is_finished = true

$(document).ready(function () {
    $("#nodes_storage_lbl").text(messages.nodes_storage_message);
});

$("#run_test").click(function () {
    // pool //
    var pool = $("#pool").val();

    var test = $("#test").val();
    var threads_no = $("#threads").val();
    var duration = $("#duration").val();
    var clients = $("#clients");
    var clients_value = $("#clients").val();
    var clients_total_size = $('#clients > option').length;

    // check pool //
    if(pool == null)
    {
        $("#lbl_pool").text(messages.add_pool_lbl_name_empty);
        clients.closest('.form-group').addClass('has-error');
        clients.focus();
    }
    else
    {
        if (clients_value == null)
        {
            $("#lbl_clients").text(messages.ui_admin_benchmark_clients_empty);
            clients.closest('.form-group').addClass('has-error');
            clients.focus();
        }
        else if (clients_value.length == clients_total_size)
        {
            $("#lbl_clients").text(messages.ui_admin_benchmark_clients_full);
            clients.closest('.form-group').addClass('has-error');
            clients.focus();
        }
        else
        {
            clients.closest('.form-group').removeClass('has-error');
            $("#lbl_clients").html("Clients:" + "<font color='red'>*</font>");
            var clientsList = '';
            for (var i = 0; i < clients_value.length; i++) {
                clientsList += clients_value[i];
                if (i != clients_value.length - 1) {
                    clientsList += ',';
                }
            }
            $("#error_div").hide();
            $("#message_error").empty();
            $("#run_btn").hide();
            $("#img").show();
            $('#cluster_table tr td').parents('tr').remove();
            $('#write_table tr td').parents('tr').remove();
            $('#read_table tr td').parents('tr').remove();
            $('#cluster_title').empty();
            $("#results").hide();
            if (test == 2) {
                $('#cluster_title').append('Cluster IOPS');
            } else {
                $('#cluster_title').append('Cluster Throughput');
            }
            $.ajax({
                url: "/benchmark/run",
                type: "get",
                data: {
                    // add pool //
                    pool: pool,
                    test: test,
                    threads_no: threads_no,
                    duration: duration,
                    clients: clientsList
                },
                success: function (response) {
                    if (response.indexOf('Sign in') != -1) {
                        window.location.href = loginUrl;
                    }
                    process_id = JSON.parse(response);
                    if (process_id != -1) {
                        interval = setInterval("check_test_is_complete(process_id)", 5000);
                    } else {
                        $("#message_error").empty();
                        $("#message_error").append(messages.run_test_error);
                        $("#error_div").show();
                        $("#img").hide();
                        $("#run_btn").show();
                    }
                },
                error: function () {
                }
            });
        } // if client

    } // if pool != null

});

function check_test_is_complete(process_id) {
    var result;
    if (is_finished == false)
            {
                console.log("wait")
                return
            }
    is_finished = false

    $.ajax({
        url: "/benchmark/check/" + process_id,
        type: "get",
        success: function (response) {
            if (response.indexOf('Sign in') != -1) {
                window.location.href = loginUrl;
            }
            result = JSON.parse(response);
            if (result == true) {
                clearInterval(interval);
                get_test_report(process_id);
            }
            is_finished = true
        },
        error: function () {
        }
    });
}

function get_test_report(process_id) {
    var report;
    $.ajax({
        url: "/benchmark/report/" + process_id,
        type: "get",
        success: function (response) {
            if (response.indexOf('Sign in') != -1) {
                window.location.href = loginUrl;
            }
            report = JSON.parse(response);
            if (report == "-2") {
                $("#message_error").empty();
                $("#message_error").append(messages.test_report_none);
                $("#error_div").show();
                $("#img").hide();
                $("#run_btn").show();
            } else {
                $("#run_btn").show();
                $("#img").hide();
                $("#results").show();
                report_result = report;
                show_report_results(report);
            }
        },
        error: function () {
        }
    });
}

function show_report_results(data) {
    var write, read;
    if ($("#test").val() == 2) {
        write = data['write_iops'];
        read = data['read_iops'];
    } else {
        write = parseInt(data['write_throughput']) + ' MB/s';
        read = parseInt(data['read_throughput']) + ' MB/s';
    }
    $('#cluster_table').append('<tr><td>' + write + '</td><td>' + read + '</td></tr>');
    var write_nodes = data['write_nodes'];
    for (var i = 0; i < write_nodes.length; i++) {
        var node_write_data = 'w,' + i;
        var node_name = write_nodes[i]['node_name'];
        var memory_util = parseInt(write_nodes[i]['ram']['%memused']);
        var cpu_avg = parseInt(write_nodes[i]['cpu_avg']);
        var cpu_max = parseInt(write_nodes[i]['cpu_max']);
        var network_avg = parseInt(write_nodes[i]['iface_avg']);
        var network_max = parseInt(write_nodes[i]['iface_max']);
        var disk_avg = parseInt(write_nodes[i]['osd_disk_avg']);
        var disk_max = parseInt(write_nodes[i]['osd_disk_max']);
        var journal_disk_avg = parseInt(write_nodes[i]['journal_disk_avg']);
        var journal_disk_max = parseInt(write_nodes[i]['journal_disk_max']);
        $('#write_table').append('<tr><td>' + node_name + '</td><td>' + memory_util + '</td>' +
            '<td>' + cpu_avg + '</td><td>' + cpu_max + '</td>' +
            '<td>' + network_avg + '</td><td>' + network_max + '</td>' +
            '<td>' + journal_disk_avg + '</td><td>' + journal_disk_max + '</td>' +
            '<td>' + disk_avg + '</td><td>' + disk_max + '</td>' +
            '<td><button type="button" class="btn btn-default" data-toggle="modal" data-target="#modal-default" ' +
            'onclick="return get_report_details(\'' + node_write_data + '\');">Show Details</button></td></tr>');
    }
    var read_nodes = data['read_nodes'];
    for (var i = 0; i < read_nodes.length; i++) {
        var node_read_data = 'r,' + i;
        var node_name = read_nodes[i]['node_name'];
        var memory_util = parseInt(read_nodes[i]['ram']['%memused']);
        var cpu_avg = parseInt(read_nodes[i]['cpu_avg']);
        var cpu_max = parseInt(read_nodes[i]['cpu_max']);
        var network_avg = parseInt(read_nodes[i]['iface_avg']);
        var network_max = parseInt(read_nodes[i]['iface_max']);
        var disk_avg = parseInt(read_nodes[i]['osd_disk_avg']);
        var disk_max = parseInt(read_nodes[i]['osd_disk_max']);
        var journal_disk_avg = parseInt(read_nodes[i]['journal_disk_avg']);
        var journal_disk_max = parseInt(read_nodes[i]['journal_disk_avg']);
        $('#read_table').append('<tr><td>' + node_name + '</td><td>' + memory_util + '</td>' +
            '<td>' + cpu_avg + '</td><td>' + cpu_max + '</td>' +
            '<td>' + network_avg + '</td><td>' + network_max + '</td>' +
            '<td>' + journal_disk_avg + '</td><td>' + journal_disk_max + '</td>' +
            '<td>' + disk_avg + '</td><td>' + disk_max + '</td>' +
            '<td><button type="button" class="btn btn-default" data-toggle="modal" data-target="#modal-default" ' +
            'onclick="return get_report_details(\'' + node_read_data + '\');">Show Details</button></td></tr>');
    }
}

function get_report_details(data) {
    var element, node_name;
    var res = data.split(",");
    if (res[0] == "r") {
        element = 'read_nodes';
        node_name = report_result[element][res[1]]['node_name'];
        $("#modal_title").text(node_name + " Read Resource Load Details");
    } else {
        element = 'write_nodes';
        node_name = report_result[element][res[1]]['node_name'];
        $("#modal_title").text(node_name + " Write Resource Load Details");
    }
    $("#modal_body").empty();
    $("#modal_body").append("<div class='col-md-12' style='padding-bottom: 15px;'><div class='box-header'><h3 class='box-title'>Memory</h3></div>" +
        "<div class='table-responsive'><table class='table table-bordered tbl_custom'><tbody>" +
        "<tr style='background-color: #d6d3d3;'><th>kbmemfree</th><th>kbmemused</th><th>kbbuffers</th>" +
        "<th>kbcached</th><th>kbcommit</th><th>%commit</th>" +
        "<th>kbactive</th><th>kbinact</th><th>kbdirty</th><th>%util</th></tr>" +
        "<tr><td>" + parseInt(report_result[element][res[1]]['ram']['kbmemfree']) + "</td><td>" + parseInt(report_result[element][res[1]]['ram']['kbmemused']) + "</td>" +
        "<td>" + parseInt(report_result[element][res[1]]['ram']['kbbuffers']) + "</td><td>" + parseInt(report_result[element][res[1]]['ram']['kbcached']) + "</td>" +
        "<td>" + parseInt(report_result[element][res[1]]['ram']['kbcommit']) + "</td><td>" + parseInt(report_result[element][res[1]]['ram']['%commit']) + "</td>" +
        "<td>" + parseInt(report_result[element][res[1]]['ram']['kbactive']) + "</td><td>" + parseInt(report_result[element][res[1]]['ram']['kbinact']) + "</td>" +
        "<td>" + parseInt(report_result[element][res[1]]['ram']['kbdirty']) + "</td><td>" + parseInt(report_result[element][res[1]]['ram']['%memused']) + "</td></tr></tbody></table></div></div>");

    $("#modal_body").append("<div class='col-md-12' style='padding-bottom: 15px;'><div class='box-header'><h3 class='box-title'>CPUs</h3></div>" +
        "<div class='table-responsive'><table id='cpus_table' class='table table-bordered tbl_custom'><tbody>" +
        "<tr style='background-color: #d6d3d3;'><th>CPU</th><th>%user</th><th>%nice</th>" +
        "<th>%system</th><th>%iowait</th><th>%steal</th><th>%util</th></tr></tbody></table></div></div>");
    var cpus = report_result[element][res[1]]['cpus'];
    for (var i = 0; i < cpus.length; i++) {
        $("#cpus_table").append("<tr><td>" + cpus[i]['CPU'] + "</td><td>" + parseInt(cpus[i]['%user']) + "</td>" +
            "<td>" + parseInt(cpus[i]['%nice']) + "</td><td>" + parseInt(cpus[i]['%system']) + "</td>" +
            "<td>" + parseInt(cpus[i]['%iowait']) + "</td><td>" + parseInt(cpus[i]['%steal']) + "</td>" +
            "<td>" + parseInt(100 - parseInt(cpus[i]['%idle'])) + "</td></tr>");
    }

    $("#modal_body").append("<div class='col-md-12' style='padding-bottom: 15px;'><div class='box-header'><h3 class='box-title'>Network Interfaces</h3></div>" +
        "<div class='table-responsive'><table id='iface_table' class='table table-bordered tbl_custom'><tbody>" +
        "<tr style='background-color: #d6d3d3;'><th>Interface</th><th>rxpck/s</th><th>txpck/s</th>" +
        "<th>rxkB/s</th><th>txkB/s</th><th>rxcmp/s</th><th>txcmp/s</th><th>rxmcst/s</th><th>%util</th></tr></tbody></table></div></div>");
    var ifaces = report_result[element][res[1]]['ifaces'];
    for (var i = 0; i < ifaces.length; i++) {
        $("#iface_table").append("<tr><td>" + ifaces[i]['IFACE'] + "</td><td>" + parseInt(ifaces[i]['rxpck/s']) + "</td>" +
            "<td>" + parseInt(ifaces[i]['txpck/s']) + "</td><td>" + parseInt(ifaces[i]['rxkB/s']) + "</td>" +
            "<td>" + parseInt(ifaces[i]['txkB/s']) + "</td><td>" + parseInt(ifaces[i]['rxcmp/s']) + "</td>" +
            "<td>" + parseInt(ifaces[i]['txcmp/s']) + "</td><td>" + parseInt(ifaces[i]['rxmcst/s']) + "</td>" +
            "<td>" + parseInt(ifaces[i]['%ifutil']) + "</td></tr>");
    }

    $("#modal_body").append("<div class='col-md-12' style='padding-bottom: 15px;'><div class='box-header'><h3 class='box-title'>Disks</h3></div>" + "<div class='box-header' id='journal_dev'><h5 class='box-title'>Journals</h5></div>" +
        "<div class='table-responsive'><table id='journal_disk_table' class='table table-bordered tbl_custom'><tbody>" +
        "<tr style='background-color: #d6d3d3;'><th>Disk</th><th>tps</th><th>rd_sec/s</th>" +
        "<th>wr_sec/s</th><th>avgrq-sz</th><th>avgqu-sz</th><th>await</th><th>svctm</th><th>%util</th></tr></tbody></table></div>" +
        "<div class='box-header'><h5 class='box-title'>OSDs</h5></div>" +
        "<div class='table-responsive'><table id='disk_table' class='table table-bordered tbl_custom'><tbody>" +
        "<tr style='background-color: #d6d3d3;'><th>Disk</th><th>tps</th><th>rd_sec/s</th>" +
        "<th>wr_sec/s</th><th>avgrq-sz</th><th>avgqu-sz</th><th>await</th><th>svctm</th><th>%util</th></tr></tbody></table></div></div>");
    var disks = report_result[element][res[1]]['osd_disks'];
    for (var i = 0; i < disks.length; i++) {
        $("#disk_table").append("<tr><td>" + disks[i]['DEV'] + "</td><td>" + parseInt(disks[i]['tps']) + "</td>" +
            "<td>" + parseInt(disks[i]['rd_sec/s']) + "</td><td>" + parseInt(disks[i]['wr_sec/s']) + "</td>" +
            "<td>" + parseInt(disks[i]['avgrq-sz']) + "</td><td>" + parseInt(disks[i]['avgqu-sz']) + "</td>" +
            "<td>" + parseInt(disks[i]['await']) + "</td><td>" + parseInt(disks[i]['svctm']) + "</td>" +
            "<td>" + parseInt(disks[i]['%util']) + "</td></tr>");
    }

    var journal_disks = report_result[element][res[1]]['journal_disks'];
    for (var i = 0; i < journal_disks.length; i++) {
        $("#journal_disk_table").append("<tr><td>" + journal_disks[i]['DEV'] + "</td><td>" + parseInt(journal_disks[i]['tps']) + "</td>" +
            "<td>" + parseInt(journal_disks[i]['rd_sec/s']) + "</td><td>" + parseInt(journal_disks[i]['wr_sec/s']) + "</td>" +
            "<td>" + parseInt(journal_disks[i]['avgrq-sz']) + "</td><td>" + parseInt(journal_disks[i]['avgqu-sz']) + "</td>" +
            "<td>" + parseInt(journal_disks[i]['await']) + "</td><td>" + parseInt(journal_disks[i]['svctm']) + "</td>" +
            "<td>" + parseInt(journal_disks[i]['%util']) + "</td></tr>");

    }

    if (journal_disks.length <= 0) {
        $("#journal_dev").hide();
        $("#journal_disk_table").hide();
    }
}

