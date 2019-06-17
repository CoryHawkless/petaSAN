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

var journalDiskList = [];
var linked_osds = [];
var isGetDiskListRequestFinish = true;

function bindTable() {
    $('#diskBody').empty();
}

function drawRows(diskData) {
    if (diskData['error_message'] != "" || diskData['error_message'].length > 0) {
        $('#error').show();
        $('#errText').text(diskData['error_message']);
        process_id = 0;
    }

    var diskSSD = 0;
    var diskUsed = 0;
    var diskStatus = 0;
    var journalName = "";

    if (diskData['is_ssd'] == 1) {
        diskSSD = "Yes";
    }
    else {
        diskSSD = "No";
    }
    if (diskData['usage'] == 0) {
        diskUsed = "OSD" + diskData['osd_id'];
        if(diskData.hasOwnProperty('linked_journal')) {
            journalName = diskData['linked_journal'];
        }
    }
    else if (diskData['usage'] == 1) {
        diskUsed = "System";
    }
    else if (diskData['usage'] == 2) {
        diskUsed = "Mounted";
    }
    else if (diskData['usage'] == 3) {
        diskUsed = "Journal";
        $('#journal_disk').append('<option value="' + diskData['name'] + '">' + diskData['name'] + '</option>');
        linked_osds = [];
        for(var i = 0; i <  diskData['linked_osds'].length; i++){
             linked_osds.push(diskData['linked_osds'][i]);
        }
    }
    else if (diskData['usage'] == -1) {
        diskUsed = "No";
    }

    if (diskData['status'] == 0) {
        diskStatus = "<span  class='badge bg-stop'>Down</span>";
    }
    else if (diskData['status'] == 1) {
        diskStatus = "<span class='badge bg-started'>Up</span>";
    }
    else if (diskData['status'] == 2) {
        isProcessing = true;
        diskStatus = " <span class='badge bg-pending'>Adding</span>";
    }
    else if (diskData['status'] == 4) {
        isProcessing = true;
        diskStatus = " <span class='badge bg-pending'>Adding</span>";
    }
    else if (diskData['status'] == 3) {
        isProcessing = true;
        diskStatus = " <span class='badge bg-pending'>Deleting</span>";
    }
    else if (diskData['status'] == -1) {
        diskStatus = "";
    }



    data_table.row.add([diskData['name'], diskData['size'], diskData['type'], diskSSD, diskData['vendor'], diskData['model'], diskData['serial'], diskData['smart_test'], diskUsed, diskStatus, journalName,  drawActions(diskData['usage'], diskData['status'], diskData['osd_id'], diskData['name'])]).draw();
    if (isProcessing == false) {
        process_id = 0;
    }
}

function drawActions(disk_Used, disk_Status, disk_osd_id, disk_name) {

    if (disk_name == "") {
        disk_name = "not_set";
    }

    var action = "";
    var actionAddJournal = "";
    if ((disk_Used == -1 || disk_Used == 2) && disk_Status == -1) { //in case: disk not use, not mounted, and no status
        //add_journal default case
        var url_add_journal_action_final = (url_add_journal_action.slice(0, -1)) + '/' + disk_name;
        actionAddJournal = "<div title='Add journal' class='btn-group'> <form action=" + url_add_journal_action_final + " method='post'> <button type='submit' onclick=\"return doAddJournal('" + disk_name + "');\" id='add_journal' class='btn btn-default'> <i class='fa fa-plus'></i> J </button> </form> </div>";


        if (journalDiskList.length == 0) { //add osd
            var url_add_action_final = (url_add_action.slice(0, -1)) + '/' + disk_name;
            action = "<div title='Add OSD' class='btn-group'> <form action=" + url_add_action_final + " method='post'> <button type='submit' onclick=\"return doAdd('" + disk_name + "');\" id='add_btn' class='btn btn-default'> <i class='fa fa-plus'></i></button>&nbsp; </form> </div>";
        }
        else if (journalDiskList.length > 0) { //add osd_with_journal
            var url_add_with_journal_action_final = (url_add_with_journal_action.slice(0, -1)) + '/' + disk_name;
            action = "<div title='Add OSD with journal' class='btn-group'>" + "<button type='submit' onclick=\"return addOsdJournalSettings('" + url_add_with_journal_action_final + "','" + disk_name + "',);\" id='add_with_journal' class='btn btn-default' data-toggle='modal' data-target='#myModal'> <i class='fa fa-plus'></i></button>&nbsp;</div>";
        }
        action = action + actionAddJournal;
    }

    if ((disk_Used == 0 && disk_Status == 0) || (disk_Used == 0 && disk_Status == -1)) {
        var url_delete_action_final = url_delete_action.slice(0, -2) + '/' + disk_name + '/' + disk_osd_id;
        action = "<div title='Delete OSD' class='btn-group'> <form action=" + url_delete_action_final + " method='post'> <button type='submit' onclick=\"return doDelete('" + disk_name + "');\" id='delete_btn' class='btn btn-default'> <i class='fa fa-remove'></i> </button> </form> </div>";
    }
    //in case old journal from previous cluster
    //no osds linked to exist journal it means they are old from previous installation so show delete journal option
    //delete is  the same as add action that node has a storage role

    if (disk_Used == 3 && node_storage_role == "True") {
        if (linked_osds.length == 0) {
            var url_delete_journal_action_final = url_delete_journal_action.slice(0, -1) + '/' + disk_name;
            action = "<div title='Delete journal' class='btn-group'> <form action=" + url_delete_journal_action_final + " method='post'> <button type='submit' onclick=\"return doDeleteJournal('" + disk_name + "');\" id='delete_journal' class='btn btn-default'> <i class='fa fa-remove'></i> J </button> </form> </div>";
        }
    }
    return action;
}

function getDiskList() {
    isProcessing = false;
    if (isGetDiskListRequestFinish == false){ //for optimization, to prevent request hang and don't make ajax request only if it finished
        return;
    }
    isGetDiskListRequestFinish = false;
    $.ajax({
        url: "/node/list/get_all_disk/" + node_name + "/" + process_id,
        type: "get",
        success: function (disk_ls) {
            if (disk_ls.indexOf('Sign in') != -1) {
                window.location.href = loginUrl;
            }
            isGetDiskListRequestFinish = true;
            journalDiskList = [];
            data_table.clear().draw();
            $('#journal_disk').empty();
            $('#journal_disk').append('<option value="auto">Auto</option>');
            bindTable();
            $("#size").text("");
            $('#img').hide();
            $('#diskBody').show();
            var diskData = JSON.parse(disk_ls);
            //loop to check if there is journal before draw rows to solve issue
            // of return before draw all table rows loop of disk list and have no journal
            for (var i = 0; i < diskData.length; i++) {
                if (diskData[i]['usage'] == 3) { //disk journal
                    journalDiskList.push(diskData[i]['name']);
                }
            }

            for (var i = 0; i < diskData.length; i++) {
                drawRows(diskData[i]);
                //console.log(diskData[i].name+"\n");
            }

            $("#size").text("Showing 1 to " + diskData.length + " of " + diskData.length + " entries");
        },
        error: function () {
            isGetDiskListRequestFinish = true;

        }
    });
}

var messages = $("#messages").val().split("#");
var node_storage_message = $("#node_storage_role_message").val();
var node_manage_osd_message = $("#node_manage_osd_warning_message").val();
var node_journal_message  = $("#journal_mesg").val().split("#");

$(document).ready(function () {
    $('#diskBody').hide();
    $('#img').show();
    getDiskList();
    setInterval("getDiskList()", 20000);
});

function doAdd(osd_name) {
    if (isProcessing == false) {
        if (node_storage_role == "True") {
            var final_message = messages[0].replace('$', osd_name);
            var confirm_add = confirm(final_message);
            if (confirm_add == true) {
                isProcessing = true;
                return true;
            } else {
                return false;
            }
        } else {
            alert(node_storage_message);
            return false;
        }
    } else {
        alert(node_manage_osd_message);
        return false;
    }
}

function doAddJournal(disk_name) {//used in html
    if (isProcessing == false) {
        if (node_storage_role == "True") {
            var final_message = node_journal_message[0].replace('$', disk_name);
            var confirm_add = confirm(final_message);
            if (confirm_add == true) {
                isProcessing = true;
                return true;
            } else {
                return false;
            }
        } else {
            alert(node_storage_message);
            return false;
        }
    } else {
        alert(node_journal_message);
        return false;
    }
}

function doAddOsdJournal(){
    return doAdd($('#disk_name').val());
}

function addOsdJournalSettings(url, disk_name){//used in html
    $("#osd_form").attr("action", url);
    $("#disk_name").val(disk_name);
}

function doDelete(osd_name) {//used in html
    if (isProcessing == false) {
        var final_message;
        if (osd_name != "not_set") {
            final_message = messages[1].replace('$', osd_name);
        } else {
            final_message = messages[1].replace('$', "");
        }
        var confirm_delete = confirm(final_message);
        if (confirm_delete == true) {
            isProcessing = true;
            return true;
        } else {
            return false;
        }
    } else {
        alert(node_manage_osd_message);
        return false;
    }
}

function doDeleteJournal(disk_name) {//used in html
    if (isProcessing == false) {

        var final_message;
        if (disk_name != "not_set") {
            final_message = node_journal_message[1].replace('$', disk_name);
        } else {
            final_message = node_journal_message[1].replace('$', "");
        }
        var confirm_delete = confirm(final_message);
        if (confirm_delete == true) {
            isProcessing = true;
            return true;
        } else {
            return false;
        }
    } else {
        alert(node_journal_message);
        return false;
    }
}

function hide_journal_option (){
    $('#lbl_journal_disk').hide();
    $('#journal_disk').hide();
}

function show_journal_option(){
    $('#lbl_journal_disk').show()
    $('#journal_disk').show();
}
