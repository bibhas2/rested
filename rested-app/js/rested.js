"use strict";

var remote = require('remote')
const electron = remote.require('electron');
// Module to control application life.
const app = electron.app;
const clipboard = electron.clipboard;
var fs = require('fs')
var url = require('url');
var http = require('http');
var Menu = remote.require('menu')
var MenuItem = remote.require('menu-item')
var jsonfile = require('jsonfile');
//window.$ = window.jQuery = require('jquery');

//require("../bower_components/jquery.splitter/js/jquery.splitter-0.20.0.js");
var template = [
  {
      label: app.getName(),
      submenu: [
        {
          label: 'About ' + name,
          role: 'about'
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: function() { app.quit(); }
        },
      ]
    },
    {
      label: "Edit",
      submenu: [
          { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
          { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
          { type: "separator" },
          { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
          { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
          { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
          { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }
      ]
    }
];

var menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

// Build our new menu
var menu = new Menu()
menu.append(new MenuItem({
  label: 'Open developer tool',
  click: function() {
    remote.getCurrentWindow().webContents.openDevTools();
  }
}))
menu.append(new MenuItem({
  label: 'More Info...',
  click: function() {
    // Trigger an alert when menu item is clicked
    alert('Here is more information')
  }
}))

// Add the listener
document.addEventListener('DOMContentLoaded', function () {
  // document.querySelector('.js-context-menu').addEventListener('click', function (event) {
  //   menu.popup(remote.getCurrentWindow());
  // })
  document.addEventListener('contextmenu', function (event) {
    menu.popup(remote.getCurrentWindow());
  })
})

angular.module("RestedApp", ['ui.codemirror'])
.controller("MainController", function($scope, $sce) {
  this.responseBodyFormat = "pretty";
  this.sidebarTab = "saved";
  this.requestEditorOptions = {
    lineWrapping : true,
    lineNumbers: true,
    theme: 'eclipse',
    mode: ''
  };
  this.responseEditorOptions = {
    lineWrapping : true,
    lineNumbers: true,
    theme: 'eclipse',
    mode: ''
  };
  this.requestContentType = "";
  this.request = {
    url: "",
    body: "",
    contentType: "",
    method: "GET",
    headers: {}
  };
  this.response = {
    headers: {},
    responseText: ""
  }
  this.ongoingRequest = undefined;

  var textTypesTable = [
    ["application/xml", "xml"],
    ["application/json", "javascript"],
    ["text/html", "xml"],
    ["text/json", "javascript"]
  ];

  this.showBodyTypeMenu = function() {
    var event = document.createEvent("MouseEvents");
    event.initMouseEvent("mousedown", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    document.getElementById("bodyTypeSelect").dispatchEvent(event);
  }

  this.commitRequest = function() {
    var u = url.parse(this.request.url);

    //Fill in the protocol
    if (u.protocol === null) {
      this.request.url = "http://" + this.request.url;
      u = url.parse(this.request.url);
    }

    //console.log(u);
    if (this.request.contentType.length > 0) {
      this.request.headers["content-type"] = this.request.contentType;
    } else {
      delete this.request.headers["content-type"];
    }
    if (this.request.body.length > 0) {
      this.request.headers["content-length"] = this.request.body.length;
    } else {
      delete this.request.headers["content-length"];
    }

    var httpOptions = {
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port,
      path: u.path,
      method: this.request.method,
      headers: this.request.headers
    }

    this.response.responseText = "";
    this.responseEditorOptions.mode = "";

    this.ongoingRequest = http.request(httpOptions, (res) => {
      //Save the headers
      this.response.headers = res.headers;

      //Accumulate response body for textual data only.
      let contentType = res.headers["content-type"];

      textTypesTable.some(typeItem => {
        if (contentType === undefined) {
          return true; //Break out.
        }

        if (contentType.startsWith(typeItem[0])) {
          this.responseEditorOptions.mode = typeItem[1];
          res.setEncoding("utf8"); //Convert text to utf-8.
          res.on('data', (chunk) => {
            this.response.responseText += chunk;
          });
          return true;
        }

        return false;
      });


      res.on('end', () => {
        this.ongoingRequest = undefined;
        //console.log(res);
        $scope.$apply();
      });
    });

    this.ongoingRequest.on('error', (e) => {
      console.log(`problem with request: ${e.message}`);
      this.ongoingRequest = undefined;
      $scope.$apply();
    });

    // write data to request body
    if (this.request.body.length > 0) {
      req.write(postData);
    }

    this.ongoingRequest.end();
  }

  this.init = function() {

  }

  this.init(); //Initialize the controller.
});
